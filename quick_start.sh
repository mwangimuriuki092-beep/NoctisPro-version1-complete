#!/bin/bash

# =============================================================================
# NoctisPro PACS - Quick Start for Ubuntu 22.04
# Minimal setup for immediate testing
# =============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

echo "🚀 NoctisPro PACS - Quick Start"
echo "==============================="

PROJECT_DIR="/workspace"
cd "$PROJECT_DIR"

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3:"
    echo "   sudo apt update && sudo apt install python3 python3-pip python3-venv"
    exit 1
fi

log "✅ Python 3 found: $(python3 --version)"

# Create minimal virtual environment
if [[ ! -d "venv" ]]; then
    log "🐍 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install minimal requirements
log "📦 Installing minimal requirements..."
pip install --upgrade pip

# Install only essential packages for quick testing
pip install \
    Django \
    Pillow \
    django-widget-tweaks \
    python-dotenv \
    djangorestframework \
    django-cors-headers \
    pydicom \
    numpy \
    opencv-python \
    psutil

# Set up Django quickly
log "🔧 Quick Django setup..."
export DJANGO_SETTINGS_MODULE=noctis_pro.settings
export DEBUG=true

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Create admin user if needed
python manage.py shell << 'EOF'
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@test.com', 'admin123')
    print("✅ Admin user created: admin/admin123")
else:
    print("ℹ️ Admin user already exists")
EOF

log "🎯 Quick setup complete!"

echo ""
echo "🎉 NoctisPro PACS Ready for Testing!"
echo "===================================="
echo ""
echo "🚀 Start the server:"
echo "   cd /workspace"
echo "   source venv/bin/activate"
echo "   python manage.py runserver 0.0.0.0:8080"
echo ""
echo "🌐 Then access:"
echo "   • http://localhost:8080"
echo "   • Login: admin / admin123"
echo "   • DICOM Viewer: http://localhost:8080/dicom-viewer/"
echo ""
echo "📋 Test the new features:"
echo "   • Upload a DICOM study in /worklist/"
echo "   • Open it in the DICOM viewer"
echo "   • Test all the toolbar buttons"
echo "   • Press 'Q' for image quality monitor"
echo "   • Try voice commands (enable with Ctrl+V)"
echo "   • Test on mobile/tablet for touch controls"
echo ""
echo "🔧 Development tips:"
echo "   • Check browser console for JavaScript logs"
echo "   • All advanced features are loaded automatically"
echo "   • Error handling will show diagnostics"
echo "   • Quality monitoring shows real-time metrics"
echo ""