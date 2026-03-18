import os
import cv2
import numpy as np
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.model_selection import train_test_split

def _find_dataset_dir(base_dir):
    """
    Finds the actual dataset directory where the wound folders are located.
    If it's nested in a 'dataset' subfolder, it navigates into it.
    """
    sub_dir = os.path.join(base_dir, "dataset")
    if os.path.exists(sub_dir) and os.path.isdir(sub_dir):
        # Check if sub_dir contains directories
        sub_dirs = [d for d in os.listdir(sub_dir) if os.path.isdir(os.path.join(sub_dir, d))]
        if len(sub_dirs) > 0:
            return sub_dir
    return base_dir

import json

def load_and_preprocess_dataset(dataset_dir="dataset", image_size=(224, 224), test_size=0.2, random_state=42):
    """
    Dynamically loads wound images from all class folders, resizes, normalizes,
    and splits them into training and validation sets.
    """
    actual_dir = _find_dataset_dir(dataset_dir)
    
    # Detect folders
    potential_classes = [d for d in os.listdir(actual_dir) if os.path.isdir(os.path.join(actual_dir, d))]
    potential_classes.sort()
    
    valid_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff')
    
    X = []
    y = []
    classes = []
    
    print(f"Loading data from {actual_dir} ...")
    total_images_loaded = 0
    class_idx = 0
    
    for class_name in potential_classes:
        class_dir = os.path.join(actual_dir, class_name)
        images_in_class = 0
        current_class_images = []
        
        for img_name in os.listdir(class_dir):
            if not img_name.lower().endswith(valid_extensions):
                continue
                
            img_path = os.path.join(class_dir, img_name)
            img = cv2.imread(img_path)
            if img is None:
                continue
                
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, image_size)
            
            current_class_images.append((img, class_idx))
            images_in_class += 1
            
        if images_in_class > 0:
            for img, idx in current_class_images:
                X.append(img)
                y.append(idx)
            classes.append(class_name)
            total_images_loaded += images_in_class
            class_idx += 1
            print(f" - {class_name}: loaded {images_in_class} images")
            
    # Save the detected classes to JSON so the API can use them
    os.makedirs("models", exist_ok=True)
    with open("models/classes.json", "w") as f:
        json.dump(classes, f)
            
    X = np.array(X, dtype='float32') / 255.0  
    y = np.array(y)
    
    print(f"\nSuccessfully loaded a total of {total_images_loaded} images across {len(classes)} classes.")
    
    # Split dataset
    if total_images_loaded == 0:
        raise ValueError("No images found! Please check your dataset directory.")
        
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=test_size, random_state=random_state, stratify=y)
    print(f"Dataset Split -> Training set: {len(X_train)} samples, Validation set: {len(X_val)} samples.")
    
    return X_train, X_val, y_train, y_val, classes

def get_data_generators(X_train, X_val, y_train, y_val, batch_size=32):
    """
    Creates ImageDataGenerators with augmentation (rotation, zoom, horizontal flip)
    """
    # Data augmentation for training
    train_datagen = ImageDataGenerator(
        rotation_range=20,
        zoom_range=0.15,
        horizontal_flip=True,
        fill_mode="nearest"
    )
    
    # Validation data should not be augmented
    val_datagen = ImageDataGenerator()
    
    train_generator = train_datagen.flow(X_train, y_train, batch_size=batch_size)
    val_generator = val_datagen.flow(X_val, y_val, batch_size=batch_size)
    
    return train_generator, val_generator
