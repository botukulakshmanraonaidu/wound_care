from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import cv2
import numpy as np
import json
import tempfile
import traceback

app = Flask(__name__)
# Explicitly whitelist all origins and methods so CORS headers are sent even
# on error responses (403 / 500) — browsers reject responses without the header.
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

@app.after_request
def add_cors_headers(response):
    """Ensure CORS headers are present on every response, including error pages."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# Global Variables (Initialized on first request)
classes = None
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
analyzer = None

def get_analyzer():
    global analyzer, classes
    if analyzer is None:
        print("🧠 FIRST RUN: Initializing AI Environment...")
        
        # 1. Load Classes (Lazy)
        classes = ["Abrasions", "Bruises", "Burns", "Cut", "Laceration"]
        classes_path = os.path.join(BASE_DIR, "models", "classes.json")
        if os.path.exists(classes_path):
            try:
                with open(classes_path, "r") as f:
                    classes = json.load(f)
                    print(f"📖 Loaded classes metadata: {classes}")
            except Exception as e:
                print(f"⚠️ Error loading classes.json: {e}")

        # 2. Load Models & TensorFlow
        try:
            import tensorflow as tf
            # Configure TensorFlow to use less memory
            try:
                physical_devices = tf.config.list_physical_devices('GPU')
                if physical_devices:
                    for device in physical_devices:
                        tf.config.experimental.set_memory_growth(device, True)
            except Exception as e:
                print(f"ℹ️ GPU Memory config skipped: {e}")

            # Determine weights paths
            classifier_path = os.path.join(BASE_DIR, "models", "wound_classifier.keras")
            if not os.path.exists(classifier_path):
                classifier_path = os.path.join(BASE_DIR, "models", "wound_classifier.h5")
            
            segmentation_path = os.path.join(BASE_DIR, "models", "wound_segmentation_model.h5")
            
            from analysis.wound_analyzer import WoundAnalyzer
            analyzer = WoundAnalyzer(
                classifier_path=classifier_path,
                segmentation_path=segmentation_path
            )
            print("✅ AI Analyzer Loaded Successfully.")
        except Exception as e:
            print(f"💥 ANALYZER LOAD CRASH: {str(e)}")
            raise e
    return analyzer

@app.route('/', methods=['GET'])
def root_check():
    """Default health check."""
    return jsonify({"status": "active", "service": "mediwound-ai-api"}), 200

@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Main API Endpoint for Wound Inference.
    """
    print("📥 Received inference request...")
    
    if 'image' not in request.files:
        print("❌ Error: No image in request")
        return jsonify({"error": "No image file provided"}), 400
        
    file = request.files['image']
    
    # Capture Editor Metadata (ROI/Coordinators)
    editor_data = None
    if 'editor_metadata' in request.form:
        try:
            editor_data = json.loads(request.form['editor_metadata'])
        except json.JSONDecodeError:
            print("⚠️ Warning: Could not decode editor_metadata JSON.")
    
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
        
    analyzer_instance = get_analyzer()
    if not analyzer_instance:
        return jsonify({"error": "AI Analyzer not initialized"}), 500

    try:
        # Save to temp file
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        tmp.close() # Close it so file.save can open it on Windows
        file.save(tmp.name)
        tmp_path = tmp.name

        # Run Core AI Algorithm (Handles Type, Severity, Dimensions, Composition)
        print("🧠 Running AI Analysis via WoundAnalyzer...")
        results, _, _ = analyzer_instance.analyze_wound(tmp_path, editor_metadata=editor_data)
        
        # Cleanup
        os.remove(tmp_path)
        
        # Legacy compatibility: Map confidence to confidence_score
        results["confidence_score"] = int(results["confidence"] * 100)
        results["healing_index"] = results["confidence_score"]
        
        # Legacy compatibility: dimensions
        results["dimensions"] = {
            "length": results["wound_length_cm"],
            "width": results["wound_width_cm"],
            "depth": results["wound_depth_cm"]
        }
        
        # Recommendations
        recommendations = {
            "Abrasions": "Clean with saline and apply a non-adherent dressing.",
            "Bruises": "Apply cold compress and monitor for change in color/size.",
            "Burns": "Use silver sulfadiazine or hydrogel dressings; maintain hydration.",
            "Cut": "Clean thoroughly, apply topical antibiotic, and secure with adhesive strips.",
            "Laceration": "May require sutures or surgical glue if deep; otherwise normal cleaning.",
            "Diabetic Wounds": "Pressure offloading and strict glucose control is essential.",
            "Pressure Wounds": "Reposition patient frequently and use specialized support surfaces.",
            "Surgical Wounds": "Monitor for signs of infection; keep the area dry as per surgeon's order.",
            "Venous Wounds": "Compression therapy is key to healing venous leg ulcers."
        }
        results["cure_recommendation"] = recommendations.get(results["wound_type"], "Continue standard wound care protocols.")

        # Algorithm analysis steps
        results["algorithm_analysis"] = [
            "Image normalized to 224x224 RGB",
            f"Wound classification: {results['wound_type']} ({results['confidence_score']}% confidence)",
            f"Tissue analysis: {results['tissue_composition']['granulation']}% Granulation",
            f"Severity assessment: {results['severity']}",
            "Morphological analysis complete"
        ]

        print(f"✅ Prediction complete: {results['wound_type']} | Severity: {results['severity']}")
        
        return jsonify(results), 200
        
    except Exception as e:
        error_msg = traceback.format_exc()
        with open(os.path.join(BASE_DIR, "error.log"), "a") as f:
            f.write(f"\n--- Error at {json.dumps(editor_data) if editor_data else 'No ROI'} ---\n")
            f.write(error_msg + "\n")
        print(f"❌ Prediction error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "analyzer_initialized": analyzer is not None
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8001))
    print(f"🚀 Starting AI API on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
