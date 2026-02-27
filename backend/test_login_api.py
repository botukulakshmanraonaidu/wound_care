import requests
import sys

def test_login(url):
    print(f"\n--- Testing URL: {url} ---")
    try:
        response = requests.post(f"{url}/patient/api/auth/login/", json={
            "email": "lakshman@hospital.com",
            "password": "lakshman@123"
        }, headers={'Origin': 'https://woundanalysis.netlify.app'}, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login("https://wound-care.onrender.com")
    test_login("https://wound-analysis.onrender.com")
