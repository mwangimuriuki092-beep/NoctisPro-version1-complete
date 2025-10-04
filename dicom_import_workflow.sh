#!/bin/bash
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
