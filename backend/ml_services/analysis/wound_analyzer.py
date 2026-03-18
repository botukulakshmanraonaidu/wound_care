import cv2
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt

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
        
    def preprocess_image(self, image_path, target_size=(224, 224)):
        """Reads image and prepares it for models."""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image at {image_path}")
            
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        original_img = img.copy()
        
        # Resize for model input format
        img_resized = cv2.resize(img, target_size)
        
        # Normalize
        img_normalized = img_resized.astype('float32') / 255.0
        
        # Expand dims for batch size (1, W, H, C)
        img_batch = np.expand_dims(img_normalized, axis=0)
        
        return original_img, img_normalized, img_batch
        
    def analyze_wound(self, image_path, pixel_to_cm_ratio=0.1):
        """
        Runs the full AI pipeline on the wound image: classification and segmentation.
        """
        original_img, img_normalized, img_batch = self.preprocess_image(image_path)
        
        # 1. Classification
        preds = self.classifier.predict(img_batch, verbose=0)[0]
        class_idx = np.argmax(preds)
        confidence = float(preds[class_idx])
        wound_type = self.classes[class_idx]
        
        # 2. Segmentation
        segmentation_mask = self.segmenter.predict(img_batch, verbose=0)[0]
        
        # Thresholding mask
        mask_binary = (segmentation_mask > 0.5).astype(np.uint8) * 255
        
        # Calculate wound area in pixels
        wound_area_pixels = int(np.sum(mask_binary > 0))
        
        # 3. Depth Estimation (Shadow/Texture Analysis)
        depth = self.estimate_depth(img_normalized, mask_binary)
        
        results = {
            "wound_type": wound_type,
            "confidence": round(confidence, 4),
            "wound_area_pixels": wound_area_pixels,
            "depth": round(depth, 2)
        }
        
        return results, img_normalized, mask_binary

    def estimate_depth(self, image, mask):
        """
        Estimates relative wound depth based on intensity variance and shadow patterns.
        Darker, recessed areas often indicate greater depth.
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor((image * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
        else:
            gray = (image * 255).astype(np.uint8)
            
        # Extract pixels within the mask
        wound_pixels = gray[mask.squeeze() > 0]
        
        if len(wound_pixels) == 0:
            return 0.0
            
        # Analysis:
        # 1. Intensity Variance: Deep wounds have more texture/shadow variation
        std_dev = np.std(wound_pixels)
        
        # 2. Minimum Intensity: Deep cavities are often darker
        min_val = np.percentile(wound_pixels, 10) # 10th percentile to avoid pure noise
        avg_val = np.mean(wound_pixels)
        
        # Heuristic: Depth score roughly based on how dark the darks are vs the average
        # and how much variation there is.
        # This is a relative estimate (0-5cm range for UI logic)
        relative_darkness = (avg_val - min_val) / 255.0
        texture_complexity = std_dev / 128.0
        
        depth_score = (relative_darkness * 3.0) + (texture_complexity * 2.0)
        
        # Clamp to realistic range for the demo (e.g., 0.1 to 4.5 cm)
        return max(0.1, min(depth_score, 5.0))
        
    def visualize_result(self, image_normalized, mask_binary, results, output_path='result_overlay.png'):
        """Displays original image, segmentation overlay, and prediction results."""
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
        plt.title(f"Overlay\n{results['wound_type']} ({results['confidence']*100:.2f}%) Area: {results['wound_area_pixels']}px")
        
        # Create red mask overlay
        mask_rgb = np.zeros_like(image_normalized)
        mask_rgb[:,:,0] = mask_binary.squeeze() / 255.0 # Red channel only 
        
        overlay = cv2.addWeighted(image_normalized, 0.7, mask_rgb, 0.3, 0)
        plt.imshow(overlay)
        plt.axis('off')
        plt.savefig(output_path)
        print(f"Visualization saved as {output_path}")
        # plt.show()
