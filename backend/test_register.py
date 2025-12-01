"""Test registration directly"""
import requests
import time

# Wait for server
time.sleep(2)

# Test registration
try:
    response = requests.post(
        'http://localhost:8000/api/auth/register',
        json={
            'email': 'testuser123@example.com',
            'password': 'password123',
            'full_name': 'Test User 123'
        },
        timeout=5
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
