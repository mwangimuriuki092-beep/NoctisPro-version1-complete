#!/usr/bin/env python3
"""
Simple test script to verify DICOM viewer functionality
"""
import os
import sys
import django
from pathlib import Path

# Add the workspace to Python path
sys.path.insert(0, '/workspace')

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'noctis_pro.settings')

# Setup Django
try:
    django.setup()
    print("✅ Django setup successful")
except Exception as e:
    print(f"❌ Django setup failed: {e}")
    sys.exit(1)

# Now import Django modules
try:
    import pydicom
    from PIL import Image
    import numpy as np
    from io import BytesIO
    import base64
    from worklist.models import DicomImage
    print("✅ Imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

def test_dicom_file():
    """Test loading and processing a DICOM file"""
    # Find the DICOM file
    dicom_path = "/workspace/media/dicom/professional/SYN-a223b318-3ea3-4a5d-9c15-080b4e951afe/SYN-SER-9f076a7b-935c-4ad9-b848-cfe142d04bdc/SYN-SOP-eb71ead6-44a7-4dab-984a-4ce7581fe5d8.dcm"

    if not os.path.exists(dicom_path):
        print(f"❌ DICOM file not found: {dicom_path}")
        return False

    print(f"✅ Found DICOM file: {dicom_path}")

    try:
        # Read DICOM file
        ds = pydicom.dcmread(dicom_path)
        print(f"✅ DICOM read successful")
        print(f"   Patient: {getattr(ds, 'PatientName', 'Unknown')}")
        print(f"   Modality: {getattr(ds, 'Modality', 'Unknown')}")
        print(f"   Study: {getattr(ds, 'StudyDescription', 'Unknown')}")

        # Check if pixel data exists
        if hasattr(ds, 'pixel_array'):
            pixel_array = ds.pixel_array
            print(f"✅ Pixel data found: {pixel_array.shape}")
            print(f"   Min: {pixel_array.min()}, Max: {pixel_array.max()}")

            # Apply rescale slope and intercept for proper display
            if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
                pixel_array = pixel_array * ds.RescaleSlope + ds.RescaleIntercept
                print(f"✅ Applied rescale: slope={ds.RescaleSlope}, intercept={ds.RescaleIntercept}")

            # Normalize to 8-bit for display
            pixel_min = np.min(pixel_array)
            pixel_max = np.max(pixel_array)

            if pixel_max > pixel_min:
                pixel_array = ((pixel_array - pixel_min) / (pixel_max - pixel_min) * 255).astype(np.uint8)
            else:
                pixel_array = np.zeros_like(pixel_array, dtype=np.uint8)

            # Convert to PIL Image
            if len(pixel_array.shape) == 2:
                pil_image = Image.fromarray(pixel_array, mode='L')
            else:
                pil_image = Image.fromarray(pixel_array)

            print(f"✅ PIL Image created: {pil_image.size}")

            # Convert to base64 for web display
            buffer = BytesIO()
            pil_image.save(buffer, format='PNG')
            buffer.seek(0)

            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            print(f"✅ Base64 conversion successful: {len(image_base64)} characters")

            return True
        else:
            print("❌ No pixel data in DICOM file")
            return False

    except Exception as e:
        print(f"❌ Error processing DICOM: {e}")
        return False

def test_database():
    """Test database connectivity"""
    try:
        count = DicomImage.objects.count()
        print(f"✅ Database connection successful")
        print(f"   Total DICOM images in DB: {count}")
        return True
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing DICOM Viewer Functionality")
    print("=" * 50)

    # Test database
    print("\n1. Testing Database Connection...")
    db_ok = test_database()

    # Test DICOM file
    print("\n2. Testing DICOM File Processing...")
    dicom_ok = test_dicom_file()

    print("\n" + "=" * 50)
    if db_ok and dicom_ok:
        print("✅ All tests passed! DICOM viewer should work.")
    else:
        print("❌ Some tests failed. Check the errors above.")