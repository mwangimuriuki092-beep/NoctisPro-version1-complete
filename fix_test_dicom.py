#!/usr/bin/env python3
"""
Fix the test DICOM file to ensure it has proper pixel data
"""
import os
import sys
import django
from pathlib import Path
import numpy as np
import pydicom
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, ImplicitVRLittleEndian, ExplicitVRBigEndian
from datetime import datetime

# Add the workspace to Python path
sys.path.insert(0, '/workspace')

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'noctis_pro.settings')

# Setup Django
django.setup()

def fix_test_dicom():
    """Fix the test DICOM file with proper pixel data"""
    print("🔧 Fixing test DICOM file...")

    # Read the existing file
    input_path = '/workspace/media/test_dicom.dcm'
    if not os.path.exists(input_path):
        print(f"❌ Input file not found: {input_path}")
        return False

    ds = pydicom.dcmread(input_path, force=True)

    # Generate proper pixel data
    rows, cols = 512, 512
    pixel_array = np.zeros((rows, cols), dtype=np.uint8)

    # Create a visible test pattern
    for i in range(rows):
        for j in range(cols):
            # Create a checkerboard pattern with different intensities
            if (i // 32 + j // 32) % 2 == 0:
                pixel_array[i, j] = 64   # Dark gray
            else:
                pixel_array[i, j] = 192  # Light gray

    # Add some structure (like a cross)
    center_x, center_y = rows // 2, cols // 2
    for i in range(max(0, center_x - 20), min(rows, center_x + 20)):
        pixel_array[i, center_y] = 255  # White line
    for j in range(max(0, center_y - 20), min(cols, center_y + 20)):
        pixel_array[center_x, j] = 255  # White line

    # Set proper pixel data
    ds.Rows = rows
    ds.Columns = cols
    ds.PixelData = pixel_array.tobytes()

    # Ensure required tags are set
    ds.BitsAllocated = 8
    ds.BitsStored = 8
    ds.HighBit = 7
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = 'MONOCHROME2'
    ds.PixelRepresentation = 0

    # Windowing
    ds.WindowCenter = 128
    ds.WindowWidth = 256

    # Save the fixed file
    ds.save_as(input_path)

    print(f"✅ Fixed DICOM file: {input_path}")
    print(f"   Pixel data size: {len(pixel_array.tobytes())} bytes")
    print(f"   Image dimensions: {rows}x{cols}")

    # Verify it works
    ds_test = pydicom.dcmread(input_path, force=True)
    if hasattr(ds_test, 'pixel_array'):
        arr = ds_test.pixel_array
        print(f"✅ Verification successful: {arr.shape}")
        print(f"   Pixel range: {arr.min()}-{arr.max()}")
        return True
    else:
        print("❌ Verification failed: still no pixel_array")
        return False

if __name__ == "__main__":
    success = fix_test_dicom()

    if success:
        print("\n✅ DICOM file fixed successfully!")
        print("   The DICOM viewer should now be able to display the image.")
    else:
        print("\n❌ Failed to fix DICOM file")