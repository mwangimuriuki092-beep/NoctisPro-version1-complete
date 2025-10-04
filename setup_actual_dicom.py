#!/usr/bin/env python3
"""
Setup script for using actual DICOM images in the Noctis Pro PACS system
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

def create_sample_dicom_structure():
    """Create a sample directory structure for DICOM files"""
    print("🏗️ Creating sample DICOM directory structure...")

    # Create directories for different types of DICOM data
    sample_dirs = [
        '/workspace/dicom_samples/ct_scan',
        '/workspace/dicom_samples/mri_brain',
        '/workspace/dicom_samples/xray_chest',
        '/workspace/dicom_samples/ultrasound',
        '/workspace/dicom_samples/mammography'
    ]

    for dir_path in sample_dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        print(f"  ✅ Created: {dir_path}")

    print("\n📁 Sample directory structure created!")
    print("📍 Place your actual DICOM files in these directories or subdirectories")
    print("💡 Examples:")
    print("   - /workspace/dicom_samples/ct_scan/patient001/study001/series001/")
    print("   - /workspace/dicom_samples/mri_brain/patient002/study002/")

    return sample_dirs

def show_upload_options():
    """Show all available options for uploading DICOM files"""
    print("\n" + "="*60)
    print("🚀 DICOM UPLOAD OPTIONS")
    print("="*60)

    print("\n1️⃣  WEB INTERFACE (Recommended)")
    print("   📍 URL: http://localhost:8000/worklist/upload/")
    print("   ✅ Features:")
    print("      • Drag & drop DICOM files or folders")
    print("      • No size limits")
    print("      • Real-time progress tracking")
    print("      • Metadata assignment (priority, facility, clinical info)")
    print("      • Automatic study/series/patient creation")

    print("\n2️⃣  COMMAND LINE IMPORT")
    print("   💻 Usage: python3 manage.py import_dicom <directory_path>")
    print("   ✅ Features:")
    print("      • Batch import from directory")
    print("      • Recursive scanning (--recursive flag)")
    print("      • Dry run mode (--dry-run)")
    print("      • Validation only mode (--validate-only)")
    print("      • Facility assignment (--facility)")
    print("   📝 Example:")
    print("      python3 manage.py import_dicom /path/to/dicom/files --recursive")

    print("\n3️⃣  DIRECTORY LOADER API")
    print("   🔗 Endpoint: POST /dicom-viewer/load-directory/")
    print("   📨 Payload: {'directory_path': '/path/to/dicom/files'}")
    print("   ✅ Features:")
    print("      • Real-time scanning progress")
    print("      • Large dataset support")
    print("      • Timeout and depth limits for safety")

    print("\n4️⃣  DICOM RECEIVER (For PACS networks)")
    print("   📡 Script: dicom_receiver.py")
    print("   ✅ Features:")
    print("      • DICOM C-STORE SCP server")
    print("      • Automatic import of received studies")
    print("      • Network-based DICOM transfer")

def test_current_dicom_files():
    """Test any existing DICOM files in the system"""
    print("\n🔍 SCANNING FOR EXISTING DICOM FILES")
    print("="*60)

    # Check the media directory
    media_dicom_path = Path('/workspace/media/dicom')
    if media_dicom_path.exists():
        dicom_files = list(media_dicom_path.rglob('*.dcm'))
        print(f"📁 Found {len(dicom_files)} DICOM files in media directory:")

        for dcm_file in dicom_files[:5]:  # Show first 5
            try:
                import pydicom
                ds = pydicom.dcmread(str(dcm_file), force=True)

                patient_name = getattr(ds, 'PatientName', 'Unknown')
                modality = getattr(ds, 'Modality', 'Unknown')
                study_desc = getattr(ds, 'StudyDescription', 'Unknown')

                print(f"   📋 {dcm_file.name}")
                print(f"      Patient: {patient_name}")
                print(f"      Modality: {modality}")
                print(f"      Study: {study_desc}")

                if hasattr(ds, 'pixel_array'):
                    arr = ds.pixel_array
                    print(f"      ✅ Has pixel data: {arr.shape}")
                else:
                    print("      ❌ No pixel data")

            except Exception as e:
                print(f"   ❌ Error reading {dcm_file.name}: {e}")

        if len(dicom_files) > 5:
            print(f"   ... and {len(dicom_files) - 5} more files")

    # Check for DICOM files in other locations
    other_locations = [
        '/workspace/dicom_samples',
        '/tmp',
        '/home'
    ]

    for location in other_locations:
        if Path(location).exists():
            dicom_files = list(Path(location).rglob('*.dcm'))
            if dicom_files:
                print(f"\n📁 Found {len(dicom_files)} DICOM files in {location}")
                for dcm_file in dicom_files[:3]:
                    print(f"   📋 {dcm_file}")

def show_next_steps():
    """Show what to do next"""
    print("\n" + "="*60)
    print("🎯 NEXT STEPS")
    print("="*60)

    print("\n1️⃣  OBTAIN ACTUAL DICOM FILES")
    print("   💡 Sources for test DICOM files:")
    print("      • Medical imaging equipment")
    print("      • PACS systems")
    print("      • Sample datasets from imaging conferences")
    print("      • Anonymized patient data (with proper consent)")
    print("      • Public medical imaging datasets")

    print("\n2️⃣  PLACE DICOM FILES")
    print("   📂 Recommended structure:")
    print("      /workspace/dicom_samples/")
    print("      ├── ct_scan/patient001/study001/series001/")
    print("      ├── mri_brain/patient002/study002/")
    print("      └── xray_chest/patient003/study003/")

    print("\n3️⃣  IMPORT DICOM FILES")
    print("   Choose one of the methods above:")
    print("   • Web interface (easiest)")
    print("   • Command line (most control)")
    print("   • Directory loader API")

    print("\n4️⃣  VERIFY IMPORT")
    print("   • Check database: python3 manage.py shell")
    print("   • Test API endpoints")
    print("   • Open DICOM viewer: http://localhost:8000/dicom-viewer/")

    print("\n5️⃣  START USING")
    print("   • Browse studies in worklist")
    print("   • View images in DICOM viewer")
    print("   • Use advanced features (windowing, measurements, etc.)")

def create_sample_dicom_workflow():
    """Create a sample workflow script"""
    workflow_script = '''#!/bin/bash
# Sample workflow for importing DICOM files

echo "🚀 Starting DICOM Import Workflow"

# 1. Create sample directory structure
echo "📁 Creating directory structure..."
mkdir -p /workspace/dicom_samples/{ct_scan,mri_brain,xray_chest,ultrasound}

# 2. Place your DICOM files in these directories
echo "📂 Place your DICOM files in: /workspace/dicom_samples/"
echo "   Example: /workspace/dicom_samples/ct_scan/patient001/"

# 3. Import using command line (replace with your directory)
# echo "💻 Importing DICOM files..."
# python3 manage.py import_dicom /workspace/dicom_samples/ct_scan --recursive

# 4. Or use web interface
echo "🌐 Open web interface for upload:"
echo "   http://localhost:8000/worklist/upload/"

echo "✅ Workflow setup complete!"
'''

    with open('/workspace/dicom_import_workflow.sh', 'w') as f:
        f.write(workflow_script)

    os.chmod('/workspace/dicom_import_workflow.sh', 0o755)
    print("✅ Created workflow script: /workspace/dicom_import_workflow.sh")

if __name__ == "__main__":
    print("🏥 NOCTIS PRO PACS - ACTUAL DICOM SETUP")
    print("="*60)

    # Create sample directory structure
    sample_dirs = create_sample_dicom_structure()

    # Show upload options
    show_upload_options()

    # Test existing DICOM files
    test_current_dicom_files()

    # Create workflow script
    create_sample_dicom_workflow()

    # Show next steps
    show_next_steps()

    print("\n" + "="*60)
    print("🎉 SETUP COMPLETE!")
    print("="*60)
    print("✅ Ready to work with actual DICOM images!")
    print("✅ Multiple import methods available")
    print("✅ Sample directory structure created")
    print("✅ Workflow script generated")
    print("\n🚀 Start using actual medical imaging data!")