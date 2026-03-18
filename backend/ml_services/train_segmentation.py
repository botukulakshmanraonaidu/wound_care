import os
import cv2
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from segmentation.model import unet_segmentation_model

def get_placeholder_mask(image, image_size=(224, 224)):
    """
    Since bounding box / pixel-level mask dataset isn't provided, 
    this function generates a rough placeholder mask using Otsu thresholding.
    Replace this with real segmentation masks for production.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)
    _, mask = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Resize and normalize
    mask = cv2.resize(mask, image_size)
    mask = mask.astype(np.float32) / 255.0
    mask = np.expand_dims(mask, axis=-1)
    return mask

def create_segmentation_dataset(dataset_dir="dataset", image_size=(224, 224)):
    """
    Mock dataset generator for segmentation. Loads classification images 
    and generates automated Otsu-threshold masks for training U-Net.
    """
    import json
    # Try finding sub-folder if dataset was extracted there
    if not any(os.path.exists(os.path.join(dataset_dir, c)) for c in ["Abrasions", "Bruises"]):
        if os.path.exists(os.path.join(dataset_dir, "dataset")):
            dataset_dir = os.path.join(dataset_dir, "dataset")

    if os.path.exists("models/classes.json"):
        with open("models/classes.json", "r") as f:
            classes = json.load(f)
    else:
        classes = [d for d in os.listdir(dataset_dir) if os.path.isdir(os.path.join(dataset_dir, d))]
        classes.sort()

    X, Y = [], []
    
    # Try finding sub-folder if dataset was extracted there
    if not any(os.path.exists(os.path.join(dataset_dir, c)) for c in classes):
        if os.path.exists(os.path.join(dataset_dir, "dataset")):
            dataset_dir = os.path.join(dataset_dir, "dataset")

    for class_name in classes:
        class_dir = os.path.join(dataset_dir, class_name)
        if not os.path.exists(class_dir):
            continue
            
        for img_name in os.listdir(class_dir):
            if not img_name.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
                continue
                
            img_path = os.path.join(class_dir, img_name)
            img = cv2.imread(img_path)
            if img is None:
                continue
                
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, image_size)
            
            # Generate placeholder mask
            mask = get_placeholder_mask(img, image_size)
            
            X.append(img.astype('float32') / 255.0)
            Y.append(mask)

    return np.array(X), np.array(Y)

def main():
    print("Loading data and generating placeholder masks...")
    X, Y = create_segmentation_dataset(dataset_dir="dataset")
    
    if len(X) == 0:
        print("Dataset not found. Please run train_classifier.py first to download it.")
        return

    X_train, X_val, y_train, y_val = train_test_split(X, Y, test_size=0.2, random_state=42)
    print(f"Training set: {len(X_train)} samples, Validation set: {len(X_val)} samples.")

    print("\nInitializing U-Net Segmentation Model...")
    model = unet_segmentation_model(input_size=(224, 224, 3))
    
    print("\nTraining U-Net for wound boundary detection...")
    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        batch_size=16,
        epochs=3
    )
    
    # Save model
    models_dir = "models"
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
        
    model_path = os.path.join(models_dir, "wound_segmentation_model.h5")
    model.save(model_path)
    print(f"\nSegmentation Model successfully saved at {model_path}")

if __name__ == "__main__":
    main()
