#!/usr/bin/env python3
"""
Import sample DICOM files from pydicom test data for testing
"""
import os
import sys
import django
import shutil
from pathlib import Path

# Add the workspace to Python path
sys.path.insert(0, '/workspace')

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'noctis_pro.settings')

# Setup Django
django.setup()

def find_usable_dicom_files():
    """Find DICOM files with actual medical image data"""
    print("🔍 Scanning for usable DICOM files...")

    pydicom_data_path = Path('/home/ubuntu/.local/lib/python3.13/site-packages/pydicom/data')
    test_files_path = pydicom_data_path / 'test_files'

    usable_files = []

    if test_files_path.exists():
        dicom_files = list(test_files_path.glob('*.dcm'))

        for dcm_file in dicom_files:
            try:
                import pydicom
                ds = pydicom.dcmread(str(dcm_file), force=True)

                if hasattr(ds, 'pixel_array'):
                    arr = ds.pixel_array
                    if arr.size > 100:  # Filter out very small test images
                        usable_files.append({
                            'path': str(dcm_file),
                            'name': dcm_file.name,
                            'patient': getattr(ds, 'PatientName', 'Unknown'),
                            'modality': getattr(ds, 'Modality', 'CT'),
                            'shape': arr.shape,
                            'size': arr.size
                        })

            except Exception as e:
                # Skip files that can't be read
                continue

    # Sort by size (largest first)
    usable_files.sort(key=lambda x: x['size'], reverse=True)

    return usable_files

def copy_and_import_dicom_files():
    """Copy selected DICOM files and import them into the system"""
    print("📋 Finding best DICOM files for testing...")

    usable_files = find_usable_dicom_files()

    if not usable_files:
        print("❌ No usable DICOM files found")
        return False

    print(f"✅ Found {len(usable_files)} usable DICOM files")

    # Show top 5 files
    print("\n🏆 Top 5 DICOM files for testing:")
    for i, file_info in enumerate(usable_files[:5], 1):
        print(f"   {i}. {file_info['name']}")
        print(f"      Patient: {file_info['patient']}")
        print(f"      Modality: {file_info['modality']}")
        print(f"      Size: {file_info['shape']} ({file_info['size']} pixels)")

    # Copy the best files to our sample directory
    sample_dir = Path('/workspace/dicom_samples')
    sample_dir.mkdir(exist_ok=True)

    print(f"\n📂 Copying files to: {sample_dir}")

    copied_files = []
    for file_info in usable_files[:3]:  # Copy top 3 files
        dest_path = sample_dir / file_info['name']
        try:
            shutil.copy2(file_info['path'], dest_path)
            copied_files.append(dest_path)
            print(f"   ✅ Copied: {file_info['name']}")
        except Exception as e:
            print(f"   ❌ Error copying {file_info['name']}: {e}")

    # Import using Django management command
    if copied_files:
        print("\n🚀 Importing DICOM files into database...")
    for dcm_file in copied_files:
            try:
                # Use the Django import command
                import subprocess
                result = subprocess.run([
                    sys.executable, 'manage.py', 'import_dicom',
                    str(sample_dir), '--recursive', '--dry-run'
                ], capture_output=True, text=True, cwd='/workspace')

                if result.returncode == 0:
                    print("   ✅ Dry run successful - files can be imported"                    print(f"      Command output: {result.stdout.strip()[:200]}...")

                    # Actually import
                    print("   📥 Performing actual import..."                    result = subprocess.run([
                        sys.executable, 'manage.py', 'import_dicom',
                        str(sample_dir), '--recursive'
                    ], capture_output=True, text=True, cwd='/workspace')

                    if result.returncode == 0:
                        print("   ✅ Import successful!"                        print(f"      {result.stdout.strip()}")
                    else:
                        print(f"   ❌ Import failed: {result.stderr}")
                else:
                    print(f"   ❌ Dry run failed: {result.stderr}")

            except Exception as e:
                print(f"   ❌ Error importing {dcm_file.name}: {e}")

    return len(copied_files) > 0

def verify_imported_data():
    """Verify that DICOM data was imported correctly"""
    print("\n🔍 Verifying imported DICOM data...")

    try:
        from worklist.models import DicomImage, Study, Series, Patient

        total_images = DicomImage.objects.count()
        total_studies = Study.objects.count()
        total_series = Series.objects.count()
        total_patients = Patient.objects.count()

        print(f"✅ Database status:")
        print(f"   📋 DICOM Images: {total_images}")
        print(f"   📚 Studies: {total_studies}")
        print(f"   📁 Series: {total_series}")
        print(f"   👥 Patients: {total_patients}")

        if total_images > 0:
            # Show sample of imported data
            recent_images = DicomImage.objects.all()[:3]
            print("\n📋 Recent DICOM images:")
            for img in recent_images:
                print(f"   • ID: {img.id}")
                print(f"     SOP UID: {img.sop_instance_uid}")
                print(f"     Instance: {img.instance_number}")
                print(f"     File: {img.file_path}")

        return total_images > 0

    except Exception as e:
        print(f"❌ Error verifying data: {e}")
        return False

if __name__ == "__main__":
    print("🏥 IMPORTING SAMPLE DICOM FILES")
    print("="*60)

    # Copy and import DICOM files
    success = copy_and_import_dicom_files()

    # Verify the import
    if success:
        data_ok = verify_imported_data()

        if data_ok:
            print("\n" + "="*60)
            print("🎉 SAMPLE DICOM IMPORT COMPLETE!")
            print("="*60)
            print("✅ Real medical imaging data imported")
            print("✅ Database populated with actual DICOM studies")
            print("✅ Ready for DICOM viewer testing")
            print("\n🚀 Next steps:")
            print("   1. Start Django server: python3 manage.py runserver")
            print("   2. Open DICOM viewer: http://localhost:8000/dicom-viewer/")
            print("   3. Browse studies: http://localhost:8000/worklist/")
            print("   4. Test image display and features")
        else:
            print("\n❌ Import completed but verification failed")
    else:
        print("\n❌ Failed to import sample DICOM files")