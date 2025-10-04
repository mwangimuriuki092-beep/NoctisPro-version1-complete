#!/usr/bin/env python3
"""
Create a proper DICOM file with correct pixel data format
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

def create_proper_dicom():
    """Create a proper DICOM file with correct pixel data"""
    print("🏗️ Creating proper DICOM file...")

    # Create file meta dataset
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = '1.2.840.10008.5.1.4.1.1.2'  # CT Image Storage
    file_meta.MediaStorageSOPInstanceUID = '1.2.3.4.5.6.7.8.9.10.12'  # Different UID
    file_meta.ImplementationClassUID = '1.2.3.4.5.6.7.8.9.10.11.12'
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    # Create dataset
    ds = Dataset()
    ds.file_meta = file_meta
    ds.is_implicit_VR = False
    ds.is_little_endian = True

    # Required DICOM tags
    ds.SOPClassUID = '1.2.840.10008.5.1.4.1.1.2'  # CT Image Storage
    ds.SOPInstanceUID = '1.2.3.4.5.6.7.8.9.10.12'
    ds.StudyInstanceUID = '1.2.3.4.5.6.7.8.9.10'
    ds.SeriesInstanceUID = '1.2.3.4.5.6.7.8.9.11'

    # Patient information
    ds.PatientName = 'Test^Patient'
    ds.PatientID = 'TEST001'
    ds.PatientBirthDate = '19800101'
    ds.PatientSex = 'M'

    # Study information
    ds.StudyID = 'TEST_STUDY_001'
    ds.StudyDate = datetime.now().strftime('%Y%m%d')
    ds.StudyTime = datetime.now().strftime('%H%M%S')
    ds.StudyDescription = 'Test Study for DICOM Viewer'
    ds.AccessionNumber = 'ACC001'

    # Series information
    ds.SeriesNumber = 1
    ds.SeriesDescription = 'Test Series'
    ds.Modality = 'CT'

    # Image information
    ds.InstanceNumber = 1
    ds.ImageType = ['ORIGINAL', 'PRIMARY']

    # Pixel data information - Use explicit little endian format
    rows, cols = 256, 256  # Smaller for testing
    ds.Rows = rows
    ds.Columns = cols
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = 'MONOCHROME2'
    ds.BitsAllocated = 16  # Use 16-bit for better compatibility
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 0  # Unsigned

    # Generate test pixel data (16-bit)
    pixel_array = np.zeros((rows, cols), dtype=np.uint16)

    # Create a visible test pattern
    for i in range(rows):
        for j in range(cols):
            # Create intensity based on position
            intensity = int((i / rows + j / cols) * 32767)  # Use half of 16-bit range
            pixel_array[i, j] = intensity

    # Set pixel data as raw bytes
    ds.PixelData = pixel_array.tobytes()

    # Windowing information
    ds.WindowCenter = 16384  # Middle of 16-bit range
    ds.WindowWidth = 32768   # Full 16-bit range

    # Save the DICOM file
    output_path = '/workspace/media/test_dicom_proper.dcm'
    ds.save_as(output_path)

    print(f"✅ Created proper DICOM file: {output_path}")
    print(f"   Pixel data size: {len(pixel_array.tobytes())} bytes")
    print(f"   Image dimensions: {rows}x{cols}")
    print(f"   Bits: {ds.BitsAllocated}")
    print(f"   Pixel range: {pixel_array.min()}-{pixel_array.max()}")

    # Verify it works
    ds_test = pydicom.dcmread(output_path, force=True)
    if hasattr(ds_test, 'pixel_array'):
        arr = ds_test.pixel_array
        print(f"✅ Verification successful: {arr.shape}")
        print(f"   Pixel range: {arr.min()}-{arr.max()}")

        # Test processing like the API does
        pixel_array_processed = arr.copy()

        # Apply rescale slope and intercept if present
        if hasattr(ds_test, 'RescaleSlope') and hasattr(ds_test, 'RescaleIntercept'):
            pixel_array_processed = pixel_array_processed * ds_test.RescaleSlope + ds_test.RescaleIntercept

        # Normalize to 8-bit for display
        pixel_min = np.min(pixel_array_processed)
        pixel_max = np.max(pixel_array_processed)

        if pixel_max > pixel_min:
            pixel_array_8bit = ((pixel_array_processed - pixel_min) / (pixel_max - pixel_min) * 255).astype(np.uint8)
            print(f"✅ 8-bit conversion successful: {pixel_array_8bit.min()}-{pixel_array_8bit.max()}")
        else:
            pixel_array_8bit = np.zeros_like(pixel_array_processed, dtype=np.uint8)
            print("⚠️ All pixels have same value")

        return output_path
    else:
        print("❌ Verification failed: still no pixel_array")
        return None

if __name__ == "__main__":
    dicom_path = create_proper_dicom()

    if dicom_path:
        print("\n✅ Proper DICOM file created successfully!")
        print("   The DICOM viewer should now be able to display the image.")
    else:
        print("\n❌ Failed to create proper DICOM file")