#!/usr/bin/env python3
"""
Simple test to verify DICOM processing works correctly
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
django.setup()

def test_dicom_processing():
    """Test basic DICOM processing without Django views"""
    print("🧪 Testing Basic DICOM Processing")
    print("=" * 50)

    try:
        from worklist.models import DicomImage
        import pydicom
        from PIL import Image
        import numpy as np
        from io import BytesIO
        import base64

        # Get the test image
        image = DicomImage.objects.first()
        if not image:
            print("❌ No DICOM images in database")
            return False

        print(f"✅ Found DICOM image: ID={image.id}")

        # Get the file path
        if hasattr(image.file_path, 'path'):
            file_path = image.file_path.path
        else:
            file_path = str(image.file_path)

        # Construct full path
        if not file_path.startswith('/'):
            file_path = str(Path('/workspace/media') / file_path)

        print(f"   File path: {file_path}")

        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            return False

        # Read DICOM
        ds = pydicom.dcmread(file_path, force=True)
        print("✅ DICOM file read successfully")
        print(f"   Patient: {getattr(ds, 'PatientName', 'Unknown')}")
        print(f"   Modality: {getattr(ds, 'Modality', 'Unknown')}")

        # Process pixel data
        if hasattr(ds, 'pixel_array'):
            pixel_array = ds.pixel_array
            print(f"✅ Pixel data found: {pixel_array.shape}")

            # Apply rescale if needed
            if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
                pixel_array = pixel_array * ds.RescaleSlope + ds.RescaleIntercept
                print(f"✅ Applied rescale: slope={ds.RescaleSlope}, intercept={ds.RescaleIntercept}")

            # Normalize to 8-bit
            pixel_min = np.min(pixel_array)
            pixel_max = np.max(pixel_array)

            if pixel_max > pixel_min:
                pixel_array = ((pixel_array - pixel_min) / (pixel_max - pixel_min) * 255).astype(np.uint8)
            else:
                pixel_array = np.zeros_like(pixel_array, dtype=np.uint8)

            print(f"✅ Normalized pixel data: {pixel_array.min()}-{pixel_array.max()}")

            # Convert to PIL Image
            if len(pixel_array.shape) == 2:
                pil_image = Image.fromarray(pixel_array, mode='L')
            else:
                pil_image = Image.fromarray(pixel_array)

            print(f"✅ Created PIL Image: {pil_image.size}")

            # Convert to base64 (like the API does)
            buffer = BytesIO()
            pil_image.save(buffer, format='PNG')
            buffer.seek(0)

            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            print(f"✅ Base64 conversion successful: {len(image_base64)} characters")

            # Test the data format that the frontend expects
            pixel_data_list = pixel_array.flatten().tolist()
            print(f"✅ Pixel data list created: {len(pixel_data_list)} elements")

            test_data = {
                'pixel_data': pixel_data_list,
                'columns': ds.Columns,
                'rows': ds.Rows,
                'window_center': getattr(ds, 'WindowCenter', 128),
                'window_width': getattr(ds, 'WindowWidth', 256)
            }

            print(f"✅ Test data structure created")
            print(f"   Columns: {test_data['columns']}")
            print(f"   Rows: {test_data['rows']}")
            print(f"   Window center: {test_data['window_center']}")
            print(f"   Window width: {test_data['window_width']}")

            return True

        else:
            print("❌ No pixel data in DICOM file")
            return False

    except Exception as e:
        print(f"❌ Error in DICOM processing: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_dicom_processing()

    print("\n" + "=" * 50)
    if success:
        print("✅ DICOM processing works correctly!")
        print("\n🚀 The DICOM viewer should be able to display images.")
        print("   Start the Django server with: python3 manage.py runserver")
        print("   Open browser to: http://localhost:8000/dicom-viewer/")
    else:
        print("❌ DICOM processing has issues that need to be fixed.")