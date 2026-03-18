import requests
import os

url = "http://localhost:8001/api/predict"
# Use a sample image from the backend media if possible, or any valid jpg
image_path = r"d:\wound care\wound_analysis\backend\Ai_wound\media\assessment_images\test_wound.jpg"

# Create a dummy image if not exists
if not os.path.exists(image_path):
    import cv2
    import numpy as np
    dummy_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    os.makedirs(os.path.dirname(image_path), exist_ok=True)
    cv2.imwrite(image_path, dummy_img)

with open(image_path, "rb") as f:
    files = {"image": ("test.jpg", f, "image/jpeg")}
    response = requests.post(url, files=files)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
