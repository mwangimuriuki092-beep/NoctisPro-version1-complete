#!/usr/bin/env python3
"""
Create a test DICOM file for testing the DICOM viewer
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

def create_test_dicom():
    """Create a simple test DICOM file"""
    # Create file meta dataset
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = '1.2.840.10008.5.1.4.1.1.2'  # CT Image Storage
    file_meta.MediaStorageSOPInstanceUID = '1.2.3.4.5.6.7.8.9.10.11'
    file_meta.ImplementationClassUID = '1.2.3.4.5.6.7.8.9.10.11.12'

    # Create dataset
    ds = Dataset()
    ds.file_meta = file_meta
    ds.is_implicit_VR = False
    ds.is_little_endian = True

    # Required DICOM tags
    ds.SOPClassUID = '1.2.840.10008.5.1.4.1.1.2'  # CT Image Storage
    ds.SOPInstanceUID = '1.2.3.4.5.6.7.8.9.10.11'
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

    # Pixel data information
    rows, cols = 512, 512
    ds.Rows = rows
    ds.Columns = cols
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = 'MONOCHROME2'
    ds.BitsAllocated = 8
    ds.BitsStored = 8
    ds.HighBit = 7
    ds.PixelRepresentation = 0
    ds.PixelData = None  # Will be set below

    # Windowing information
    ds.WindowCenter = 128
    ds.WindowWidth = 256

    # Generate test pixel data (simple gradient pattern)
    pixel_array = np.zeros((rows, cols), dtype=np.uint8)

    # Create a simple test pattern
    for i in range(rows):
        for j in range(cols):
            # Create a gradient with some structure
            pixel_array[i, j] = ((i // 32 + j // 32) * 32) % 256

    # Set pixel data
    ds.PixelData = pixel_array.tobytes()

    # Save the DICOM file
    output_path = '/workspace/media/test_dicom.dcm'
    ds.save_as(output_path)

    print(f"✅ Created test DICOM file: {output_path}")
    print(f"   Size: {pixel_array.shape}")
    print(f"   Patient: {ds.PatientName}")
    print(f"   Study: {ds.StudyDescription}")

    return output_path

def import_test_dicom_to_db(dicom_path):
    """Import the test DICOM into the database"""
    from django.core.files import File
    from worklist.models import Study, Series, DicomImage, Patient, Modality
    from accounts.models import Facility

    try:
        # Read the DICOM file (force=True)
        ds = pydicom.dcmread(dicom_path, force=True)

        # Get or create facility
        facility, _ = Facility.objects.get_or_create(
            name='Test Facility',
            defaults={'address': 'Test Address', 'phone': '123-456-7890'}
        )

        # Get or create patient
        patient, _ = Patient.objects.get_or_create(
            patient_id=ds.PatientID,
            defaults={
                'first_name': 'Test',
                'last_name': 'Patient',
                'date_of_birth': '1980-01-01',
                'gender': 'M'
            }
        )

        # Get or create modality
        modality, _ = Modality.objects.get_or_create(
            code=ds.Modality,
            defaults={'name': 'Computed Tomography', 'is_active': True}
        )

        # Get or create study
        study, _ = Study.objects.get_or_create(
            study_instance_uid=ds.StudyInstanceUID,
            defaults={
                'patient': patient,
                'facility': facility,
                'modality': modality,
                'accession_number': ds.AccessionNumber,
                'study_description': ds.StudyDescription,
                'study_date': datetime.now(),
                'status': 'completed',
                'priority': 'normal'
            }
        )

        # Get or create series
        series, _ = Series.objects.get_or_create(
            series_instance_uid=ds.SeriesInstanceUID,
            defaults={
                'study': study,
                'series_number': ds.SeriesNumber,
                'series_description': ds.SeriesDescription,
                'modality': ds.Modality,
                'body_part': 'Test Body Part'
            }
        )

        # Copy file to media directory with proper structure
        media_dir = Path('/workspace/media/dicom/images')
        media_dir.mkdir(parents=True, exist_ok=True)

        # Create organized directory structure
        patient_dir = media_dir / f"patient_{patient.patient_id}"
        study_dir = patient_dir / f"study_{study.id}_{datetime.now().strftime('%Y%m%d')}"
        series_dir = study_dir / f"series_{series.series_number}_{series.modality}"
        series_dir.mkdir(parents=True, exist_ok=True)

        # Copy the file
        import shutil
        dest_path = series_dir / f"{ds.SOPInstanceUID}.dcm"
        shutil.copy2(dicom_path, dest_path)

        # Create DicomImage record
        image = DicomImage.objects.create(
            sop_instance_uid=ds.SOPInstanceUID,
            series=series,
            instance_number=ds.InstanceNumber,
            file_path=str(dest_path.relative_to(Path('/workspace/media'))),
            file_size=os.path.getsize(dest_path),
            processed=True
        )

        print(f"✅ Imported DICOM into database: ID={image.id}")
        print(f"   File path: {image.file_path}")

        return image

    except Exception as e:
        print(f"❌ Error importing DICOM to database: {e}")
        return None

if __name__ == "__main__":
    print("🧪 Creating Test DICOM File")
    print("=" * 50)

    # Create test DICOM
    dicom_path = create_test_dicom()

    # Import to database (with force=True)
    print("\n📥 Importing to Database...")
    image = import_test_dicom_to_db(dicom_path)

    if image:
        print("\n✅ Test DICOM created and imported successfully!")
        print(f"   Image ID: {image.id}")
        print(f"   SOP UID: {image.sop_instance_uid}")
    else:
        print("\n❌ Failed to create or import test DICOM")