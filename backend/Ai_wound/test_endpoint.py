import requests

def test_headers(url, name):
    print(f"Testing {name}: {url}")
    try:
        # Test OPTIONS
        r_opt = requests.options(url, headers={
            'Origin': 'https://woundanalysis.netlify.app',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type'
        })
        print(f"  OPTIONS Status: {r_opt.status_code}")
        print(f"  OPTIONS CORS Origin: {r_opt.headers.get('Access-Control-Allow-Origin')}")
        
        # Test POST
        r_post = requests.post(url, json={'email':'lakshman@hospital.com', 'password':'wrong'})
        print(f"  POST Status: {r_post.status_code}")
        print(f"  POST Version: {r_post.headers.get('X-Debug-Version')}")
        print(f"  POST CORS Origin: {r_post.headers.get('Access-Control-Allow-Origin')}")
    except Exception as e:
        print(f"  Error: {e}")
    print("-" * 20)

if __name__ == "__main__":
    test_headers("http://localhost:8000/patient/api/auth/login/", "LOCAL")
    test_headers("https://wound-analysis-cl7c.onrender.com/patient/api/auth/login/", "LIVE")
    
    # Also test the version endpoint directly
    print("Testing Version Endpoint:")
    try:
        r_ver = requests.get("https://wound-analysis-cl7c.onrender.com/version/")
        print(f"  Status: {r_ver.status_code}")
        print(f"  Content: {r_ver.text[:50]}")
    except Exception as e:
        print(f"  Error: {e}")
