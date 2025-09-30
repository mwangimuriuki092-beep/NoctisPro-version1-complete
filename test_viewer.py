#!/usr/bin/env python3
"""
Test the DICOM viewer API endpoints
"""

import requests
from requests.auth import HTTPBasicAuth

# Base URL
base_url = "http://localhost:8080"

# Create a session
session = requests.Session()

# Login
print("Logging in...")
login_url = f"{base_url}/login/"
# First get the CSRF token
response = session.get(login_url)
if response.status_code == 200:
    print("Got login page")
    
# Now login
login_data = {
    'username': 'admin',
    'password': 'admin123',
    'csrfmiddlewaretoken': session.cookies.get('csrftoken', ''),
}
response = session.post(login_url, data=login_data, allow_redirects=False)
print(f"Login response: {response.status_code}")

# Test study data endpoint
print("\nTesting study data endpoint...")
study_url = f"{base_url}/dicom-viewer/api/study/1/data/"
response = session.get(study_url)
print(f"Study data response: {response.status_code}")
if response.status_code == 200:
    import json
    data = response.json()
    print(f"Study data: {json.dumps(data, indent=2)[:500]}...")

# Test image data endpoint
print("\nTesting image data endpoint...")
image_url = f"{base_url}/dicom-viewer/api/image/1/data/professional/"
response = session.get(image_url)
print(f"Image data response: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Image has dataUrl: {'dataUrl' in data}")
    print(f"Image has url: {'url' in data}")
    if 'dataUrl' in data:
        print(f"DataUrl length: {len(data['dataUrl'])}")
    print(f"Image dimensions: {data.get('width', 'N/A')}x{data.get('height', 'N/A')}")

# Test series images endpoint
print("\nTesting series images endpoint...")
series_url = f"{base_url}/dicom-viewer/series/1/images/"
response = session.get(series_url)
print(f"Series images response: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Number of images in series: {len(data.get('images', []))}")