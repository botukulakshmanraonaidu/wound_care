import os
import django
from django.conf import settings
from django.test import RequestFactory
from corsheaders.middleware import CorsMiddleware

def test_cors():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Ai_wound.settings')
    # Force DEBUG=False for this test
    os.environ['DEBUG'] = 'False'
    django.setup()
    
    factory = RequestFactory()
    # Simulate preflight OPTIONS request
    request = factory.options(
        '/patient/api/auth/login/',
        HTTP_ORIGIN='https://woundanalysis.netlify.app',
        HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
        HTTP_ACCESS_CONTROL_REQUEST_HEADERS='content-type'
    )
    
    # Mocking the get_response to return a simple response if middleware doesn't intercept
    def get_response(req):
        from django.http import HttpResponse
        return HttpResponse("OK")
    
    middleware = CorsMiddleware(get_response)
    response = middleware(request)
    
    print(f"Status: {response.status_code}")
    print("Headers:")
    for key, value in response.items():
        print(f"{key}: {value}")

if __name__ == "__main__":
    test_cors()
