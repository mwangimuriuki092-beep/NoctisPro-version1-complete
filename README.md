# NoctisPro PACS - Medical Imaging System

A comprehensive Django-based Picture Archiving and Communication System (PACS) for medical imaging with AI analysis capabilities.

---

## 🚀 Quick Start - Production Deployment

### Docker on Ubuntu Server 22.04 (Recommended)

The fastest and most reliable way to deploy in production:

```bash
# Clone repository
git clone <repository-url> /opt/noctispro
cd /opt/noctispro

# Deploy with Docker
sudo chmod +x deploy_production_docker.sh
sudo ./deploy_production_docker.sh
```

**Access the system at**: `http://your-server-ip`
- **Username**: admin
- **Password**: admin123 (⚠️ change immediately!)

📚 **Full Documentation**: See [DOCKER_DEPLOYMENT_UBUNTU_22.04.md](./DOCKER_DEPLOYMENT_UBUNTU_22.04.md)

---

## 🎯 Deployment Options

### 1. 🐳 Docker Production (Recommended)
**Best for**: Production environments, scalability, easy management

```bash
sudo ./deploy_production_docker.sh
```

- ✅ PostgreSQL database
- ✅ Redis caching
- ✅ Automated backups
- ✅ AI processing worker
- ✅ Health monitoring
- ✅ Easy updates and maintenance

**Full Guide**: [DOCKER_DEPLOYMENT_UBUNTU_22.04.md](./DOCKER_DEPLOYMENT_UBUNTU_22.04.md)

### 2. 🌐 Internet HTTPS Access
**Best for**: Public access, multi-location teams

```bash
export DOMAIN_NAME="pacs.yourdomain.com"
export ADMIN_EMAIL="admin@yourdomain.com"
sudo ./deploy_internet_https.sh
```

- ✅ Let's Encrypt SSL certificates
- ✅ Public internet access
- ✅ DICOM device connectivity
- ✅ Production security

### 3. 🔒 Tailscale Private Network
**Best for**: Secure private networks, VPN-like access

```bash
export TAILSCALE_AUTH_KEY="your-key"
export TAILNET_HOSTNAME="noctispro"
sudo ./deploy_docker_tailscale.sh
```

- ✅ Zero-trust networking
- ✅ End-to-end encryption
- ✅ No public IP needed
- ✅ Built-in authentication

### 4. 🏠 Local Development
**Best for**: Development, testing, single-machine

```bash
./deploy_noctispro.sh
```

- ✅ Quick setup
- ✅ No Docker required
- ✅ Development-friendly

---

## 📋 System Requirements

- **OS**: Ubuntu Server 22.04 LTS (recommended) or 24.04
- **RAM**: 4GB minimum, 8GB+ recommended
- **Storage**: 20GB minimum, 100GB+ for production
- **CPU**: 2+ cores recommended

---

## 🛠️ Management Commands

### Docker Deployment

```bash
# Start/stop services
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml down

# View logs
docker compose -f docker-compose.production.yml logs -f

# Run Django commands
docker exec -it noctispro-web python manage.py <command>

# Create backup
docker exec -it noctispro-web python manage.py create_medical_backup --type manual
```

### Native Deployment

```bash
# Service management
sudo systemctl start noctispro
sudo systemctl stop noctispro
sudo systemctl status noctispro

# View logs
sudo journalctl -f -u noctispro
```

---

## 🤖 AI Analysis Features

The system includes built-in AI analysis capabilities:

- **Automatic Analysis**: Analyzes all uploaded DICOM studies
- **Real-time Processing**: Background AI processing
- **Quality Assessment**: Technical parameter validation
- **Report Generation**: Automated preliminary reports
- **Dashboard**: View results at `/ai/` endpoint

AI processing runs automatically in Docker deployments via the `ai-worker` container.

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

## 📖 Documentation

- **[Docker Deployment Guide](./DOCKER_DEPLOYMENT_UBUNTU_22.04.md)** - Complete production deployment guide
- **[Ubuntu 22.04 Deployment](./UBUNTU_22_04_DEPLOYMENT.md)** - Native installation guide
- **[Advanced Guides](./docs/)** - Additional documentation and guides

---

## 🆘 Support & Troubleshooting

### Check System Health

```bash
# Docker deployment
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs -f

# Native deployment
sudo systemctl status noctispro
sudo journalctl -f -u noctispro
```

### Common Issues

1. **Services won't start**: Check logs and ensure ports 80, 443 are available
2. **Database errors**: Run migrations with `python manage.py migrate`
3. **Static files not loading**: Run `python manage.py collectstatic --noinput`
4. **AI analysis not working**: Check ai-worker logs or restart the service

See [DOCKER_DEPLOYMENT_UBUNTU_22.04.md](./DOCKER_DEPLOYMENT_UBUNTU_22.04.md) for detailed troubleshooting.

---

## ⚖️ License & Compliance

This is a medical imaging system. Ensure compliance with:

- HIPAA (if in US)
- GDPR (if handling EU patient data)  
- Local healthcare regulations
- Data protection laws

**⚠️ IMPORTANT**: This system is for healthcare professionals. Ensure proper training and certification before clinical use.

---

## 🎓 Quick Reference

### First Time Setup

1. Deploy using one of the methods above
2. Access web interface at `http://your-server-ip`
3. Login with admin/admin123
4. **Change the admin password immediately**
5. Create additional users via Admin Panel
6. Upload sample DICOM files to test

### Production Checklist

- [ ] Changed default passwords
- [ ] Configured SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Configured automated backups
- [ ] Created non-admin users
- [ ] Tested DICOM upload and viewing
- [ ] Tested AI analysis
- [ ] Set up monitoring

See [DOCKER_DEPLOYMENT_UBUNTU_22.04.md](./DOCKER_DEPLOYMENT_UBUNTU_22.04.md) for complete production checklist.

---

**Ready to deploy?** Start with [DOCKER_DEPLOYMENT_UBUNTU_22.04.md](./DOCKER_DEPLOYMENT_UBUNTU_22.04.md) 🚀