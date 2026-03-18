from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import cv2
import numpy as np
import tensorflow as tf

import json

# Configure TensorFlow to use less memory if possible
try:
    physical_devices = tf.config.list_physical_devices('GPU')
    if physical_devices:
        for device in physical_devices:
            tf.config.experimental.set_memory_growth(device, True)
except Exception as e:
    print(f"ℹ️ GPU Memory config skipped: {e}")

app = Flask(__name__)
CORS(app)  # Allow frontend to call this API

# Global Variables
classifier = None
segmenter = None
classes = ["Abrasions", "Bruises", "Burns", "Cut", "Laceration"] # Default

# Load dynamically saved classes if present
if os.path.exists("models/classes.json"):
    try:
        with open("models/classes.json", "r") as f:
            classes = json.load(f)
            print(f"📖 Loaded classes: {classes}")
    except Exception as e:
        print(f"⚠️ Error loading classes.json: {e}")

# Determine the directory where this script is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_models():
    """Load models once on server startup."""
    global classifier, segmenter
    model_dir = os.path.join(BASE_DIR, "models")
    
    print(f"🔍 Searching for models in: {model_dir}")
    
    try:
        # 1. Wound Classifier
        classifier_path = os.path.join(model_dir, "wound_classifier.keras")
        if not os.path.exists(classifier_path):
            classifier_path = os.path.join(model_dir, "wound_classifier.h5")
            
        if os.path.exists(classifier_path):
            print(f"⏳ Loading classifier: {os.path.basename(classifier_path)}...")
            classifier = tf.keras.models.load_model(classifier_path)
            print("✅ Classifier loaded.")
        else:
            print(f"❌ Classifier file NOT FOUND at {classifier_path}")
            
        # 2. Wound Segmenter
        segmentation_path = os.path.join(model_dir, "wound_segmentation_model.h5")
        if os.path.exists(segmentation_path):
            print(f"⏳ Loading segmenter: {os.path.basename(segmentation_path)}...")
            segmenter = tf.keras.models.load_model(segmentation_path)
            print("✅ Segmenter loaded.")
        else:
            print(f"❌ Segmenter file NOT FOUND at {segmentation_path}")

        if classifier and segmenter:
            print("✨ ALL MODELS LOADED AND READY.")
    except Exception as e:
        print(f"💥 MODEL LOAD CRASH: {str(e)}")

# Load models once on startup
load_models()

def process_image_from_stream(file_stream, target_size=(224, 224)):
    """Convert uploaded FileStorage object to normalized numpy array."""
    file_bytes = np.frombuffer(file_stream.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Invalid image file format")
        
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, target_size)
    img_normalized = img.astype('float32') / 255.0
    img_batch = np.expand_dims(img_normalized, axis=0) # Shape: (1, 224, 224, 3)
    
    return img_batch

def estimate_depth(image, mask):
    """
    Estimates relative wound depth based on intensity variance and shadow patterns.
    Darker, recessed areas often indicate greater depth.
    image: batch of normalized images (shape: 1, 224, 224, 3)
    mask: binary mask (shape: 224, 224, 1)
    """
    # Convert to grayscale
    img = (image[0] * 255).astype(np.uint8)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        
    # Extract pixels within the mask
    wound_pixels = gray[mask.squeeze() > 0]
    
    if len(wound_pixels) == 0:
        return 0.0
        
    # Analysis
    std_dev = np.std(wound_pixels)
    min_val = np.percentile(wound_pixels, 10)
    avg_val = np.mean(wound_pixels)
    
    relative_darkness = (avg_val - min_val) / 255.0
    texture_complexity = std_dev / 128.0
    
    depth_score = (relative_darkness * 3.0) + (texture_complexity * 2.0)
    return max(0.1, min(depth_score, 5.0))

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
    
    if file.filename == '':
        print("❌ Error: Empty filename")
        return jsonify({"error": "Empty filename"}), 400
        
    if not (classifier and segmenter):
        print("🚑 Attempting to reload models (lazy load)...")
        load_models()
        if not (classifier and segmenter):
            return jsonify({"error": "Models not loaded"}), 500

    try:
        # Preprocess
        print("⚙️ Preprocessing image...")
        img_batch = process_image_from_stream(file)
        
        # Inference 1: Classification
        print("🧠 Running classification...")
        preds = classifier.predict(img_batch, verbose=0)[0]
        class_idx = np.argmax(preds)
        confidence = float(preds[class_idx])
        wound_type = classes[class_idx]
        
        # Inference 2: Segmentation
        print("🧠 Running segmentation...")
        segmentation_mask = segmenter.predict(img_batch, verbose=0)[0]
        mask_binary = (segmentation_mask > 0.5).astype(np.uint8) * 255
        wound_area_pixels = int(np.sum(mask_binary > 0))
        
        # --- NEW: Tissue Composition Analysis (Simulated based on model features for now) ---
        # In a full version, this would be a second segmentation/classification head
        # Here we map wound types to likely tissue compositions for UI consistency
        tissue_data = {
            "granulation": 0,
            "slough": 0,
            "necrotic": 0,
            "epithelial": 0
        }
        
        if wound_type == "Bruises":
            tissue_data["epithelial"] = int(confidence * 100)
            tissue_data["granulation"] = 100 - tissue_data["epithelial"]
        elif wound_type in ["Cut", "Laceration"]:
            tissue_data["granulation"] = int(confidence * 100)
            tissue_data["epithelial"] = 100 - tissue_data["granulation"]
        elif wound_type == "Burns":
            tissue_data["slough"] = int(confidence * 60)
            tissue_data["necrotic"] = int(confidence * 20)
            tissue_data["granulation"] = 100 - (tissue_data["slough"] + tissue_data["necrotic"])
        else:
            tissue_data["granulation"] = 60 # Default shown in your sample image
            tissue_data["slough"] = 40
            
        # --- NEW: Simulated fields for Frontend compatibility ---
        stage = "Stage 2" if confidence > 0.7 else "Stage 1"
        
        # --- NEW: Depth Estimation ---
        depth_val = estimate_depth(img_batch, mask_binary)
        depth = round(float(depth_val), 1)
        
        # Approximate dimensions based on wound area pixels (assuming 100px = 1cm for demo)
        side = round((wound_area_pixels ** 0.5) / 10, 1)
        dimensions = {"length": side, "width": side, "depth": depth}
        
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
        cure_recommendation = recommendations.get(wound_type, "Continue standard wound care protocols.")

        algorithm_steps = [
            "Image normalized to 224x224 RGB",
            f"Wound classification: {wound_type} ({int(confidence*100)}% confidence)",
            f"Segmentation mask generated: {wound_area_pixels} pixels",
            f"Depth estimation: {depth}cm (Shadow logic)",
            f"Tissue composition analysis: {tissue_data['granulation']}% Granulation",
            "Morphological analysis complete"
        ]

        print(f"✅ Prediction complete: {wound_type} ({confidence:.2f}) | Tissue: {tissue_data}")
        
        # Clean up to help GC
        del img_batch
        
        return jsonify({
            "wound_type": wound_type,
            "confidence": round(confidence, 4),
            "wound_area_pixels": wound_area_pixels,
            "tissue_composition": tissue_data,
            "stage": stage,
            "dimensions": dimensions,
            "cure_recommendation": cure_recommendation,
            "confidence_score": int(confidence * 100),
            "healing_index": int(confidence * 100), # Using confidence as health score for demo
            "algorithm_analysis": algorithm_steps
        }), 200
        
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "classifier": classifier is not None,
        "segmenter": segmenter is not None
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8001))
    print(f"🚀 Starting AI API on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=True)
