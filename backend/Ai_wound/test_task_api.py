import requests
import json

BASE_URL = "http://localhost:8000/nurse_page/tasks/"
# Assuming we can bypass auth for a moment if we use a mock or similar, 
# but real testing requires a token.
# Let's try to see if there are any obvious validation errors by looking at the serializer/model again.

def test_create_task():
    # Use the data format from the frontend
    data = {
        "title": "Test Task",
        "description": "Test Description",
        "due_time": "Today, 05:00 PM",
        "priority": "High",
        "patient": None
    }
    print(f"Testing creation with data: {data}")
    # This won't work without a token, but it's a reminder of what the payload looks like.
    
if __name__ == "__main__":
    test_create_task()
