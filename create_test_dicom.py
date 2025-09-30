#!/usr/bin/env python3
"""
Create a test DICOM file for testing the viewer
"""

import numpy as np
import pydicom
from pydicom.dataset import Dataset, FileDataset
from pydicom.uid import generate_uid
from datetime import datetime
import os

def create_test_dicom():
    # Create a simple test image (256x256 gradient)
    rows = 256
    cols = 256
    
    # Create a gradient image
    image = np.zeros((rows, cols), dtype=np.uint16)
    for i in range(rows):
        for j in range(cols):
            # Create a circular pattern
            center_x, center_y = rows // 2, cols // 2
            distance = np.sqrt((i - center_x)**2 + (j - center_y)**2)
            image[i, j] = int(min(distance * 100, 65535))
    
    # File meta info
    file_meta = pydicom.Dataset()
    file_meta.MediaStorageSOPClassUID = '1.2.840.10008.5.1.4.1.1.2'  # CT Image Storage
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    file_meta.ImplementationClassUID = generate_uid()
    file_meta.TransferSyntaxUID = pydicom.uid.ExplicitVRLittleEndian
    
    # Create the FileDataset
    ds = FileDataset(None, {}, file_meta=file_meta, preamble=b"\0" * 128)
    
    # Add required DICOM elements
    ds.PatientName = "Test^Patient"
    ds.PatientID = "TEST001"
    ds.PatientBirthDate = "19800101"
    ds.PatientSex = "M"
    
    # Study
    ds.StudyInstanceUID = generate_uid()
    ds.StudyDate = datetime.now().strftime('%Y%m%d')
    ds.StudyTime = datetime.now().strftime('%H%M%S')
    ds.StudyDescription = "Test Study"
    ds.AccessionNumber = "TEST" + datetime.now().strftime('%Y%m%d%H%M%S')
    
    # Series
    ds.SeriesInstanceUID = generate_uid()
    ds.SeriesNumber = 1
    ds.SeriesDescription = "Test Series"
    ds.Modality = "CT"
    
    # Image
    ds.SOPClassUID = '1.2.840.10008.5.1.4.1.1.2'  # CT Image Storage
    ds.SOPInstanceUID = generate_uid()
    ds.InstanceNumber = 1
    
    # Image pixel data
    ds.Rows = rows
    ds.Columns = cols
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 0  # unsigned
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelSpacing = [1.0, 1.0]
    ds.SliceThickness = 5.0
    
    # Window/Level
    ds.WindowCenter = 32768
    ds.WindowWidth = 65536
    ds.RescaleIntercept = -1024
    ds.RescaleSlope = 1
    
    # Set pixel data
    ds.PixelData = image.tobytes()
    
    # Save the file
    output_dir = "/workspace/media/test_dicom"
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "test_image.dcm")
    
    ds.save_as(output_file, write_like_original=False)
    print(f"Created test DICOM file: {output_file}")
    
    return output_file

if __name__ == "__main__":
    create_test_dicom()