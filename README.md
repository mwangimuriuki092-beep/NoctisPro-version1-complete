# NoctisPro PACS - Medical Imaging System

A comprehensive Django-based Picture Archiving and Communication System (PACS) for medical imaging with AI analysis capabilities.

## Quick Deployment (Ubuntu Server 24.04)

### One-Command Deployment

#### Option 1: Ngrok Deployment (Default)
```bash
./deploy_noctispro.sh
```

#### Option 2: Tailnet Deployment (Recommended for Production)
```bash
USE_TAILNET=true TAILNET_HOSTNAME=noctispro ./deploy_noctispro.sh
```

Or with Tailscale auth key for automated setup:
```bash
USE_TAILNET=true TAILSCALE_AUTH_KEY=your_auth_key TAILNET_HOSTNAME=noctispro ./deploy_noctispro.sh
```

The deployment script will automatically:
- ✅ Install all system dependencies
- ✅ Set up Python virtual environment
- ✅ Install Python requirements (handling problematic packages)
- ✅ Configure network access (ngrok or Tailscale)
- ✅ Set up Django database and migrations
- ✅ Collect static files
- ✅ Create admin superuser (admin/admin123)
- ✅ Create systemd services
- ✅ Start the application

### Access Information

#### Ngrok Deployment:
- **Application URL**: https://mallard-shining-curiously.ngrok-free.app
- **Admin Login**: admin / admin123
- **Admin Panel**: https://mallard-shining-curiously.ngrok-free.app/admin/
- **Worklist**: https://mallard-shining-curiously.ngrok-free.app/worklist/

#### Tailnet Deployment:
- **Application URL**: http://noctispro:8080 (or via Tailscale IP)
- **Admin Login**: admin / admin123
- **Admin Panel**: http://noctispro:8080/admin/
- **Worklist**: http://noctispro:8080/worklist/

### Management Commands
```bash
# Use the management script
./manage_noctispro.sh start     # Start services
./manage_noctispro.sh stop      # Stop services
./manage_noctispro.sh restart   # Restart services
./manage_noctispro.sh status    # Check status
./manage_noctispro.sh logs      # View logs
./manage_noctispro.sh url       # Show application URL

# Or use systemctl directly
sudo systemctl start noctispro noctispro-ngrok
sudo systemctl stop noctispro noctispro-ngrok
sudo systemctl restart noctispro noctispro-ngrok
sudo journalctl -f -u noctispro -u noctispro-ngrok
```

## Features
- 🏥 **Medical Imaging**: DICOM viewer with support for CT, MR, CR, DX, US, XA
- 🤖 **AI Analysis**: Automated medical image analysis
- 📊 **Worklist Management**: Patient and study management
- 👥 **User Management**: Role-based access control
- 📱 **Responsive Design**: Works on desktop and mobile
- 🔒 **Security**: HTTPS, authentication, and authorization
- 📈 **Reports**: Comprehensive reporting system
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