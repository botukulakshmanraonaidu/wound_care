# MediWound AI Pipeline

This is a complete Python deep learning pipeline for wound image analysis intended for a clinical assessment application. It consists of Image Preprocessing, a Wound Classification built with MobileNetV2 Transfer Learning, and a Wound Segmentation Model using U-Net architecture. 

## Features
- Downloads dataset automatically from Google Drive
- Handles Preprocessing (Resizing to 224x224, Normalization, Data Augmentation splits)
- Classifies wounds as (Abrasion, Bruise, Burn, Cut, Laceration)
- Generates segmentation masks to calculate wound area
- Outputs structured comprehensive JSON results.

## Requirements
To install requirements:
```bash
pip install -r requirements.txt
```

## How to use

1. **Train Classifier**
   This script will download your `.zip` from Google Drive, unpack it, split images for validation, and train the MobileNetV2 wound classifier.
   ```bash
   python train_classifier.py
   ```

2. **Train Segmentation Model**
   Trains your wound segmentation model using U-Net. (Note: Generates a placeholder thresholding mask automatically if actual masks aren't mapped or provided in the dataset yet). 
   ```bash
   python train_segmentation.py
   ```

3. **Inference (Single Image Analysis)**
   Test your trained pipeline against a single specific image (the model file needs to have been saved in the `models/` directory first). 
   ```bash
   python predict_wound.py --image dataset/Cut/some_image_path.jpg
   ```
   *Expected Output JSON:*
   ```json
   {
       "wound_type": "Burn",
       "confidence": 0.92,
       "wound_area_pixels": 5400
   }
   ```
   This will also attempt to display a Visual Overlay of the segmentation boundary in matplotlib.
