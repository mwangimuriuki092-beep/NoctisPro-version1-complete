# NoctisPro PACS - Medical Imaging System

A comprehensive Django-based Picture Archiving and Communication System (PACS) for medical imaging with AI analysis capabilities.

## 🚀 Deployment Options

NoctisPro PACS offers multiple deployment configurations to suit different needs:

### 1. 🌐 Internet Access with HTTPS (Recommended for Production)
**Best for**: Production environments, multi-location access, DICOM device integration
```bash
export DOMAIN_NAME="pacs.yourdomain.com"
export ADMIN_EMAIL="admin@yourdomain.com"
./deploy_internet_https.sh
```
- ✅ Public internet access via HTTPS
- ✅ Let's Encrypt SSL certificates
- ✅ Production-grade security
- ✅ DICOM device connectivity
- ✅ Multi-user access from anywhere

### 2. 🔒 Private Network via Tailscale
**Best for**: Secure private networks, remote teams, VPN-like access
```bash
export TAILSCALE_AUTH_KEY="your-tailscale-key"
export TAILNET_HOSTNAME="noctispro"
./deploy_docker_tailscale.sh
```
- ✅ Zero-trust network access
- ✅ End-to-end encryption
- ✅ No public IP required
- ✅ Easy multi-device access
- ✅ Built-in authentication

### 3. 🏠 Local Development
**Best for**: Development, testing, single-machine setups
```bash
./deploy_noctispro.sh
```
- ✅ Quick local setup
- ✅ Development-friendly
- ✅ No external dependencies
- ✅ Ideal for testing

## Quick Deployment (Ubuntu Server 24.04)

### Internet HTTPS Deployment
```bash
# Set your domain and email
export DOMAIN_NAME="pacs.yourdomain.com"
export ADMIN_EMAIL="admin@yourdomain.com"

# Deploy with HTTPS
./deploy_internet_https.sh
```

### Tailscale Private Network Deployment
```bash
# With Tailscale auth key for automated setup
TAILSCALE_AUTH_KEY=your_auth_key TAILNET_HOSTNAME=noctispro ./deploy_docker_tailscale.sh

# Or manual Docker deployment
cp .env.docker .env
# Edit .env with your Tailscale auth key
docker-compose up -d
```

The deployment script will automatically:
- ✅ Install all system dependencies
- ✅ Set up Python virtual environment
- ✅ Install Python requirements (handling problematic packages)
- ✅ Configure secure Tailscale network access (Tailnet)
- ✅ Set up Django database and migrations
- ✅ Collect static files
- ✅ Create admin superuser (admin/admin123)
- ✅ Create systemd services
- ✅ Start the application

### Access Information

#### Tailnet Access (Secure Private Network via Tailscale):
- **Application URL**: http://noctispro:8080 (or via Tailscale IP)
- **Admin Login**: admin / admin123
- **Admin Panel**: http://noctispro:8080/admin/
- **Worklist**: http://noctispro:8080/worklist/
- **AI Dashboard**: http://noctispro:8080/ai/
- **DICOM Viewer**: http://noctispro:8080/dicom-viewer/

### Management Commands

#### Native Deployment:
```bash
# Use the management script
./manage_noctispro.sh start     # Start services
./manage_noctispro.sh stop      # Stop services
./manage_noctispro.sh restart   # Restart services
./manage_noctispro.sh status    # Check status
./manage_noctispro.sh logs      # View logs

# Or use systemctl directly
sudo systemctl start noctispro
sudo systemctl stop noctispro
sudo systemctl restart noctispro
sudo journalctl -f -u noctispro

# Tailscale management
tailscale status
tailscale ip -4
```

#### Docker Deployment:
```bash
# Container management
docker-compose up -d           # Start all services
docker-compose down            # Stop all services
docker-compose restart         # Restart services
docker-compose logs -f         # View logs
docker-compose ps              # Check status

# Tailscale management in Docker
docker exec noctis_tailscale tailscale status
docker exec noctis_tailscale tailscale ip -4
docker exec -it noctis_tailscale tailscale up --hostname=noctispro

# Application management
docker exec noctis_web python manage.py migrate
docker exec noctis_web python manage.py collectstatic --noinput
docker exec noctis_web python manage.py setup_working_ai_models
```

### AI Analysis Setup

#### Native Deployment:
```bash
# Setup AI models and start processing
python setup_ai_system.py

# Or manually:
python manage.py setup_working_ai_models
python manage.py process_ai_analyses --continuous
```

#### Docker Deployment:
```bash
# AI setup is automatic in Docker
# AI processor runs as a separate container
# Check AI status:
docker-compose logs ai_processor
```

**AI Features:**
- **Automatic Analysis**: AI analyzes all uploaded DICOM studies
- **Real-time Processing**: Background processing of pending analyses
- **Quality Assessment**: Technical parameter validation and image quality metrics
- **Report Generation**: Automated preliminary reports with confidence scores
- **Dashboard**: View AI results at `/ai/` endpoint

## Features
- 🏥 **Medical Imaging**: DICOM viewer with support for CT, MR, CR, DX, US, XA
- 🤖 **AI Analysis**: Real-time automated medical image analysis
  - DICOM metadata analysis and validation
  - Image quality assessment and statistics
  - Hounsfield unit calibration checking (CT)
  - Automatic report generation
  - Technical parameter validation
- 📊 **Worklist Management**: Patient and study management
- 👥 **User Management**: Role-based access control
- 📱 **Responsive Design**: Works on desktop and mobile
- 🔒 **Security**: HTTPS, authentication, and authorization
- 📈 **Reports**: Comprehensive reporting system with AI integration
- 💬 **Communication**: Built-in chat system
- 🔔 **Notifications**: Real-time alerts and notifications

## Architecture
- **Backend**: Django 5.2+ with REST API
- **Database**: SQLite (default) or PostgreSQL
- **Frontend**: Modern responsive web interface
- **Image Processing**: PyDICOM, SimpleITK, OpenCV
- **AI/ML**: PyTorch, scikit-learn, transformers
- **Deployment**: Gunicorn + Ngrok for internet access

## Directory Structure
```
├── accounts/           # User management
├── admin_panel/        # Administrative interface
├── ai_analysis/        # AI/ML analysis modules
├── chat/              # Communication system
├── dicom_viewer/       # Medical image viewer
├── notifications/      # Alert system
├── reports/           # Reporting system
├── worklist/          # Patient/study management
├── templates/         # HTML templates
├── static/            # Static files (CSS, JS, images)
├── media/             # Uploaded files and DICOM images
└── noctis_pro/        # Django project settings
```

## Requirements
- Ubuntu Server 24.04 (recommended)
- Python 3.12+
- 4GB+ RAM
- 10GB+ storage
- Internet connection for ngrok tunnel

## Support
For issues or questions, check the logs:
```bash
sudo journalctl -f -u noctispro -u noctispro-ngrok
```

## License
This is a medical imaging system. Please ensure compliance with local healthcare regulations and data protection laws.