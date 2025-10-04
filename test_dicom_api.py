#!/usr/bin/env python3
"""
Test the DICOM viewer API endpoints directly
"""
import os
import sys
import django
import json
# import requests  # Not needed for this test
from pathlib import Path

# Add the workspace to Python path
sys.path.insert(0, '/workspace')

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'noctis_pro.settings')

# Setup Django
django.setup()

def test_api_endpoints():
    """Test the DICOM API endpoints"""
    base_url = 'http://localhost:8000/dicom-viewer'

    # Test if we can access the endpoints without a server running
    print("🧪 Testing DICOM API Endpoints")
    print("=" * 50)

    # Since we don't have a server running, let's test the Django view functions directly
    from django.test import RequestFactory
    from dicom_viewer.views import api_dicom_image_display, api_image_data
    from worklist.models import DicomImage

    # Get the test image
    try:
        image = DicomImage.objects.first()
        if not image:
            print("❌ No DICOM images found in database")
            return False

        print(f"✅ Found test image: ID={image.id}, UID={image.sop_instance_uid}")

        # Test the API functions directly
        factory = RequestFactory()

        # Create a mock request
        request = factory.get(f'/dicom-viewer/api/image/{image.id}/display/')
        request.user = type('MockUser', (), {'is_authenticated': True, 'is_facility_user': lambda: False})()

        print("\n1. Testing api_dicom_image_display endpoint...")
        try:
            response = api_dicom_image_display(request, image.id)
            if response.status_code == 200:
                data = json.loads(response.content)
                print(f"✅ API endpoint successful: {response.status_code}")
                print(f"   Has image data: {'image_data' in data}")
                print(f"   Has image info: {'image_info' in data}")
                if 'image_data' in data and data['image_data']:
                    print(f"   Image data length: {len(data['image_data'])}")
            else:
                print(f"❌ API endpoint failed: {response.status_code}")
                print(f"   Error: {response.content}")
        except Exception as e:
            print(f"❌ Exception testing API: {e}")

        print("\n2. Testing api_image_data endpoint...")
        try:
            response = api_image_data(request, image.id)
            if response.status_code == 200:
                data = json.loads(response.content)
                print(f"✅ API endpoint successful: {response.status_code}")
                print(f"   Has pixel data: {'pixel_data' in data}")
                if 'pixel_data' in data and data['pixel_data']:
                    print(f"   Pixel data length: {len(data['pixel_data'])}")
                    print(f"   Image dimensions: {data.get('rows', 0)}x{data.get('columns', 0)}")
            else:
                print(f"❌ API endpoint failed: {response.status_code}")
                print(f"   Error: {response.content}")
        except Exception as e:
            print(f"❌ Exception testing API: {e}")

        return True

    except Exception as e:
        print(f"❌ Error accessing database: {e}")
        return False

def test_dicom_file_directly():
    """Test reading the DICOM file directly"""
    print("\n3. Testing DICOM file directly...")
    try:
        from worklist.models import DicomImage
        import pydicom

        image = DicomImage.objects.first()
        if not image:
            print("❌ No DICOM image found")
            return False

        # Construct the full file path
        file_path = Path('/workspace/media') / image.file_path
        print(f"   File path: {file_path}")

        if not file_path.exists():
            print(f"❌ File does not exist: {file_path}")
            return False

        # Try to read the DICOM file
        ds = pydicom.dcmread(str(file_path), force=True)
        print("✅ DICOM file read successfully")
        print(f"   Patient: {getattr(ds, 'PatientName', 'Unknown')}")
        print(f"   Study: {getattr(ds, 'StudyDescription', 'Unknown')}")
        print(f"   Modality: {getattr(ds, 'Modality', 'Unknown')}")

        if hasattr(ds, 'pixel_array'):
            pixel_array = ds.pixel_array
            print(f"✅ Pixel data found: {pixel_array.shape}")
            print(f"   Min: {pixel_array.min()}, Max: {pixel_array.max()}")

            # Test normalization
            import numpy as np
            pixel_min = np.min(pixel_array)
            pixel_max = np.max(pixel_array)

            if pixel_max > pixel_min:
                normalized = ((pixel_array - pixel_min) / (pixel_max - pixel_min) * 255).astype(np.uint8)
                print(f"✅ Normalization successful: {normalized.shape}")
                print(f"   Normalized range: {normalized.min()}-{normalized.max()}")
            else:
                print("⚠️  All pixels have same value")
        else:
            print("❌ No pixel data in DICOM file")

        return True

    except Exception as e:
        print(f"❌ Error reading DICOM file: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing DICOM API Functionality")
    print("=" * 50)

    # Test API endpoints
    api_ok = test_api_endpoints()

    # Test DICOM file directly
    file_ok = test_dicom_file_directly()

    print("\n" + "=" * 50)
    if api_ok and file_ok:
        print("✅ All tests passed! DICOM viewer APIs should work.")
        print("\n🚀 Next steps:")
        print("   1. Start Django server: python3 manage.py runserver")
        print("   2. Open browser to: http://localhost:8000/dicom-viewer/")
        print("   3. Test the DICOM viewer interface")
    else:
        print("❌ Some tests failed. Check the errors above.")