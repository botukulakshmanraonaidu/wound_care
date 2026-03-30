import cv2
import numpy as np
import tensorflow as tf
# matplotlib is only needed for visualize_result(), imported lazily to avoid
# crashing on headless servers (Render, Docker) that have no display backend.

class WoundAnalyzer:
    def __init__(self, classifier_path="models/wound_classifier.keras", segmentation_path="models/wound_segmentation_model.h5"):
        # Load models
        print("Loading models...")
        import os, json
        self.classifier = tf.keras.models.load_model(classifier_path)
        self.segmenter = tf.keras.models.load_model(segmentation_path)
        
        # Determine base directory for models
        model_dir = os.path.dirname(classifier_path)
        classes_path = os.path.join(model_dir, "classes.json")
        
        self.classes = ["Abrasions", "Bruises", "Burns", "Cut", "Laceration"]
        if os.path.exists(classes_path):
            with open(classes_path, "r") as f:
                self.classes = json.load(f)
                
        print("Models loaded successfully.")
        
    def preprocess_image(self, image_path, target_size=(224, 224), max_dimension=1024):
        """Reads image, caps resolution for memory safety, and prepares it for models."""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image at {image_path}")
            
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # --- MEMORY SAFETY: Downscale massive images before high-res analysis ---
        h, w = img.shape[:2]
        if max(h, w) > max_dimension:
            scale = max_dimension / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            print(f"📉 Resizing high-res image from {w}x{h} to {new_w}x{new_h} for memory safety...")
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

        original_img = img.copy()
        
        # Resize for model input format (standard 224x224 for most TF classifiers)
        img_resized = cv2.resize(img, target_size)
        
        # Normalize
        img_normalized = img_resized.astype('float32') / 255.0
        
        # Expand dims for batch size (1, W, H, C)
        img_batch = np.expand_dims(img_normalized, axis=0)
        
        return original_img, img_normalized, img_batch
        
    def analyze_wound(self, image_path, pixel_to_cm_ratio=0.0264, editor_metadata=None):
        """
        Runs the full AI pipeline on the wound image with ROI constraints.
        """
        # 1. Preprocess
        original_img, img_normalized, img_batch = self.preprocess_image(image_path)
        h, w = original_img.shape[:2]
        
        user_mask_224 = None
        user_mask_hr = None
        
        # 2. Extract ROI if User Boundary is provided
        if editor_metadata and editor_metadata.get('boundary_coordinates'):
            try:
                pts = np.array([[p['x'], p['y']] for p in editor_metadata['boundary_coordinates']], dtype=np.int32)
                if len(pts) >= 3:
                     # Create High-Res User Mask
                     user_mask_hr = np.zeros((h, w), dtype=np.uint8)
                     cv2.fillPoly(user_mask_hr, [pts], 255)
                     
                     # Create Low-Res (224) User Mask for AI model input
                     user_mask_224 = cv2.resize(user_mask_hr, (224, 224))
                     user_mask_224 = (user_mask_224 > 127).astype(np.uint8) * 255
                     
                     # STEP: Isolate ROI in the AI input
                     # We black out everything outside the user-defined boundary
                     mask_3ch = np.stack([user_mask_224]*3, axis=-1) / 255.0
                     img_batch[0] = img_batch[0] * mask_3ch
            except Exception as e:
                print(f"⚠️ Error handling manual ROI: {e}")

        # 3. AI Inference (Now ROI-Aware)
        # Classification
        preds = self.classifier.predict(img_batch, verbose=0)[0]
        class_idx = np.argmax(preds)
        confidence = float(preds[class_idx])
        wound_type = self.classes[class_idx]
        
        # Segmentation
        segmentation_mask = self.segmenter.predict(img_batch, verbose=0)[0]
        ai_mask_224 = (segmentation_mask > 0.5).astype(np.uint8) * 255
        
        # 4. Final Mask Construction (ROI Constraint)
        if user_mask_224 is not None:
            # INTERSECTION: AI discovery MUST be within User Boundary
            final_mask_224 = cv2.bitwise_and(ai_mask_224, ai_mask_224, mask=user_mask_224)
            # FALLBACK: If AI finds nothing inside the ROI, use the full ROI boundary
            if np.sum(final_mask_224) < 10: 
                final_mask_224 = user_mask_224
        else:
            final_mask_224 = ai_mask_224

        # Resize for high-res analysis
        final_mask = cv2.resize(final_mask_224, (w, h))
        final_mask = (final_mask > 127).astype(np.uint8) * 255

        # 5. Measurements from Final Constrained Mask
        contours, _ = cv2.findContours(final_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            wound_area_pixels = cv2.contourArea(largest_contour)
            bx, by, bw, bh = cv2.boundingRect(largest_contour)
            wound_width_px = bw
            wound_height_px = bh
        else:
            wound_area_pixels = 0
            wound_width_px = 0
            wound_height_px = 0

        # Pixel to CM² and Dimension Conversion
        area_cm2 = round(float(wound_area_pixels) * (pixel_to_cm_ratio ** 2), 2)
        wound_length_cm = round(float(wound_height_px) * pixel_to_cm_ratio, 1)
        wound_width_cm = round(float(wound_width_px) * pixel_to_cm_ratio, 1)

        # 6. Premium Tissue Analysis (Pixel Analysis Flow within Final ROI)
        # Step: Extract Only Wound Pixels
        wound_pixels_img = cv2.bitwise_and(original_img, original_img, mask=final_mask)
        
        # --- NEW: ADVANCED PREPROCESSING ---
        # A. Noise removal
        blur = cv2.GaussianBlur(wound_pixels_img, (5, 5), 0)
        
        # B. Contrast improvement (LAB space with CLAHE)
        lab = cv2.cvtColor(blur, cv2.COLOR_RGB2LAB)
        l_chan, a_chan, b_chan = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        l_chan = clahe.apply(l_chan)
        enhanced_lab = cv2.merge((l_chan, a_chan, b_chan))
        enhanced_rgb = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)
        
        # C. Feature Extraction (Texture/Edges)
        gray = cv2.cvtColor(enhanced_rgb, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_mask = cv2.bitwise_and(edges, edges, mask=final_mask)
        
        # D. Convert Color Space (RGB to HSV for analysis)
        hsv = cv2.cvtColor(enhanced_rgb, cv2.COLOR_RGB2HSV)
        
        # --- NEW: ADAPTIVE THRESHOLDS based on ROI stats ---
        # Calculate mean brightness (Value) in ROI to shift black/dark thresholds
        roi_v_mean = np.mean(hsv[:,:,2][final_mask > 0]) if np.any(final_mask > 0) else 128
        dynamic_black_upper = min(80, int(roi_v_mean * 0.5))
        
        # Tissue Color Ranges
        red_lower = np.array([0, 50, 40])
        red_upper = np.array([15, 255, 255])
        yellow_lower = np.array([18, 30, 40])
        yellow_upper = np.array([40, 255, 255])
        black_lower = np.array([0, 0, 0])
        black_upper = np.array([180, 255, dynamic_black_upper])
        
        # Create Tissue Masks
        red_mask = cv2.inRange(hsv, red_lower, red_upper)
        yellow_mask = cv2.inRange(hsv, yellow_lower, yellow_upper)
        black_mask = cv2.inRange(hsv, black_lower, black_upper)
        
        # Count Pixels inside final ROI
        total_wound_px = np.sum(final_mask > 0)
        
        if total_wound_px > 0:
            # Masking with ROI to ensure we stay inside boundary
            gran_mask_final = cv2.bitwise_and(red_mask, red_mask, mask=final_mask)
            slough_mask_final = cv2.bitwise_and(yellow_mask, yellow_mask, mask=final_mask)
            necro_mask_final = cv2.bitwise_and(black_mask, black_mask, mask=final_mask)
            
            # --- HYBRID LOGIC: Refine based on Texture ---
            # Necrotic tissue usually has lower texture than dark granulation/crust
            # Slough has lower edge density than dry epithelial
            necro_px_raw = np.sum(necro_mask_final > 0)
            necro_edge_px = np.sum(cv2.bitwise_and(edge_mask, edge_mask, mask=necro_mask_final) > 0)
            # If high edge density in a "black" area, it might just be shadow/crust, not deep necrosis
            necro_factor = 1.0 if (necro_px_raw == 0 or (necro_edge_px / necro_px_raw < 0.1)) else 0.7
            
            gran_px = np.sum(gran_mask_final > 0)
            slough_px = np.sum(slough_mask_final > 0)
            necro_px = int(necro_px_raw * necro_factor)
            
            gran_pct = int((gran_px / total_wound_px) * 100)
            slough_pct = int((slough_px / total_wound_px) * 100)
            necro_pct = int((necro_px / total_wound_px) * 100)
            epi_pct = max(0, 100 - (gran_pct + slough_pct + necro_pct))
            
            # --- CONFIDENCE SCORING ---
            # Ratio of color-matched pixels to total ROI area gives a "detection quality" metric
            base_confidence = min(0.98, (gran_px + slough_px + necro_px + (total_wound_px * 0.1)) / total_wound_px)
            
            tissue_data = {
                "granulation": gran_pct, 
                "slough": slough_pct,
                "necrotic": necro_pct, 
                "epithelial": epi_pct,
                "composition_confidence": round(base_confidence, 2)
            }
        else:
            tissue_data = {"granulation": 0, "slough": 0, "necrotic": 0, "epithelial": 0, "composition_confidence": 0}

        # 7. Depth Estimation Heuristic
        base_depth = 0.2
        if wound_type in ["Laceration", "Surgical Wounds"]: base_depth = 0.5
        elif wound_type == "Burns": base_depth = 0.3
        
        bad_tissue_pct = tissue_data["slough"] + tissue_data["necrotic"]
        wound_depth_cm = round(base_depth + (bad_tissue_pct / 100.0 * 1.5), 1)

        # 8. Severity
        severity = "Low"
        if area_cm2 >= 15 or wound_depth_cm >= 2.0 or bad_tissue_pct >= 40: severity = "High"
        elif area_cm2 >= 5 or wound_depth_cm >= 0.8 or bad_tissue_pct >= 15: severity = "Medium"
        
        results = {
            "wound_type": wound_type,
            "severity": severity,
            "confidence": round(confidence, 4),
            "wound_area_cm2": area_cm2,
            "wound_length_cm": wound_length_cm,
            "wound_width_cm": wound_width_cm,
            "wound_depth_cm": wound_depth_cm,
            "tissue_composition": tissue_data
        }
        
        return results, img_normalized, final_mask_224
        
    def visualize_result(self, image_normalized, mask_binary, results, output_path='result_overlay.png'):
        """Displays original image, segmentation overlay, and prediction results."""
        import matplotlib
        matplotlib.use('Agg')  # Non-interactive backend — safe on headless servers
        import matplotlib.pyplot as plt

        plt.figure(figsize=(15, 5))
        
        # Orig Image
        plt.subplot(1, 3, 1)
        plt.title("Original Image")
        plt.imshow(image_normalized)
        plt.axis('off')
        
        # Mask
        plt.subplot(1, 3, 2)
        plt.title("Detected Wound Boundary")
        plt.imshow(mask_binary.squeeze(), cmap='gray')
        plt.axis('off')
        
        # Overlay
        plt.subplot(1, 3, 3)
        plt.title(f"Overlay\n{results['wound_type']} ({results['confidence']*100:.2f}%)\nArea: {results['wound_area_cm2']}cm²\nSeverity: {results['severity']}")
        
        # Create red mask overlay
        mask_rgb = np.zeros_like(image_normalized)
        mask_rgb[:,:,0] = mask_binary.squeeze() / 255.0 # Red channel only 
        
        overlay = cv2.addWeighted(image_normalized, 0.7, mask_rgb, 0.3, 0)
        plt.imshow(overlay)
        plt.axis('off')
        plt.savefig(output_path)
        print(f"Visualization saved as {output_path}")
        # plt.show()
