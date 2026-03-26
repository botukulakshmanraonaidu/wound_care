import requests
import json
import os

def test_ml_api():
    url = "http://localhost:8001/api/predict"
    img_path = r"d:\wound project\wound_analysis\backend\Ai_wound\media\wound_images\full\wound_0_full_8ucvkvO.jpg"
    
    if not os.path.exists(img_path):
        print(f"Error: Image {img_path} not found.")
        return

    # NO ROI (Automatic Detection)
    editor_metadata = None

    print(f"Calling ML API at {url} AUTOMATICALLY...")
    with open(img_path, 'rb') as f:
        files = {'image': (os.path.basename(img_path), f, 'image/jpeg')}
        data = {'editor_metadata': json.dumps(editor_metadata)}
        
        try:
            response = requests.post(url, files=files, data=data, timeout=120)
            if response.status_code == 200:
                result = response.json()
                print("✅ Success! ML Response:")
                print(json.dumps(result, indent=2))
                
                # Verify key fields
                required_fields = ['wound_type', 'severity', 'wound_area_cm2', 'tissue_composition']
                for field in required_fields:
                    if field in result:
                        print(f"Found {field}: {result[field]}")
                    else:
                        print(f"❌ Missing field: {field}")
            else:
                print(f"❌ API Error: {response.status_code}")
                print(response.text)
        except Exception as e:
            print(f"💥 Request failed: {e}")

if __name__ == "__main__":
    test_ml_api()
