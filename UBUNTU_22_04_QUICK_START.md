# 🚀 NoctisPro PACS - Ubuntu 22.04 Quick Start Guide

**Quick setup guide for Ubuntu Server 22.04 LTS**

---

## 📋 Prerequisites

Before starting, ensure you have:
- Ubuntu Server 22.04 LTS
- Root or sudo access
- At least 4GB RAM (8GB recommended)
- 20GB+ free disk space
- Internet connection for package installation

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Dependencies
```bash
# Install Python 3.10+ and essential packages
sudo apt install -y python3 python3-pip python3-venv python3-dev \
    build-essential libpq-dev postgresql postgresql-contrib \
    redis-server nginx git curl wget

# Install Node.js (optional, for advanced features)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 3: Navigate to Project Directory
```bash
cd /workspace
# Or wherever you cloned the repository
```

### Step 4: Create Virtual Environment
```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate
```

### Step 5: Install Python Requirements
```bash
# Install all dependencies
pip install --upgrade pip
pip install -r requirements.txt

# This may take 10-15 minutes depending on your connection
```

### Step 6: Setup Database
```bash
# Run migrations
python3 manage.py migrate

# Create superuser (admin account)
python3 manage.py createsuperuser
# Follow prompts to set username, email, and password
```

### Step 7: Collect Static Files
```bash
# Gather all static files
python3 manage.py collectstatic --noinput
```

### Step 8: Start Services
```bash
# Make startup script executable
chmod +x start_all_services.sh

# Start all services
./start_all_services.sh
```

### Step 9: Access the System
```bash
# Open in browser:
# Main Application: http://your-server-ip:8000
# Admin Panel: http://your-server-ip:8000/admin/
# API Docs: http://your-server-ip:8001/api/v1/docs
```

---

## 🎯 Alternative: Manual Service Start

If the automated script doesn't work, start services manually:

### Start Django (Main Application)
```bash
cd /workspace
source venv/bin/activate
python3 manage.py runserver 0.0.0.0:8000
```

### Start FastAPI (API Server) - In another terminal
```bash
cd /workspace
source venv/bin/activate
uvicorn fastapi_app.main:app --host 0.0.0.0 --port 8001
```

---

## 🔧 Production Deployment (Recommended)

For production use with systemd services:

### Step 1: Create Systemd Service Files

**Django Service** (`/etc/systemd/system/noctispro-django.service`):
```ini
[Unit]
Description=NoctisPro Django Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/workspace
Environment="PATH=/workspace/venv/bin"
ExecStart=/workspace/venv/bin/gunicorn noctis_pro.wsgi:application --bind 0.0.0.0:8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**FastAPI Service** (`/etc/systemd/system/noctispro-fastapi.service`):
```ini
[Unit]
Description=NoctisPro FastAPI Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/workspace
Environment="PATH=/workspace/venv/bin"
ExecStart=/workspace/venv/bin/uvicorn fastapi_app.main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Step 2: Enable and Start Services
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services (start on boot)
sudo systemctl enable noctispro-django
sudo systemctl enable noctispro-fastapi

# Start services
sudo systemctl start noctispro-django
sudo systemctl start noctispro-fastapi

# Check status
sudo systemctl status noctispro-django
sudo systemctl status noctispro-fastapi
```

### Step 3: View Logs
```bash
# Django logs
sudo journalctl -u noctispro-django -f

# FastAPI logs
sudo journalctl -u noctispro-fastapi -f
```

---

## 🌐 Setup Nginx (Optional, for Production)

### Step 1: Create Nginx Configuration

Create file: `/etc/nginx/sites-available/noctispro`

```nginx
upstream django_server {
    server 127.0.0.1:8000;
}

upstream fastapi_server {
    server 127.0.0.1:8001;
}

server {
    listen 80;
    server_name your-domain.com;  # Change this!
    
    client_max_body_size 500M;
    
    # Django (main application)
    location / {
        proxy_pass http://django_server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # FastAPI (API)
    location /api/ {
        proxy_pass http://fastapi_server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static/ {
        alias /workspace/staticfiles/;
        expires 30d;
    }
    
    # Media files
    location /media/ {
        alias /workspace/media/;
        expires 7d;
    }
}
```

### Step 2: Enable Nginx Site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/noctispro /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## ✅ Verification Checklist

After starting services, verify everything works:

```bash
# Check if services are running
ps aux | grep python

# Check ports
sudo netstat -tlnp | grep -E '8000|8001'

# Test Django
curl http://localhost:8000

# Test FastAPI
curl http://localhost:8001/api/v1/health

# View logs
tail -f logs/django.log
tail -f logs/fastapi.log
```

---

## 🛠️ Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port 8000
sudo lsof -i :8000

# Kill process if needed
sudo kill -9 <PID>
```

### Issue: Permission Denied

```bash
# Fix permissions
sudo chown -R $USER:$USER /workspace
chmod +x start_all_services.sh
```

### Issue: Module Not Found

```bash
# Reinstall dependencies
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: Database Errors

```bash
# Reset migrations (development only!)
rm db.sqlite3
python3 manage.py migrate

# Create superuser again
python3 manage.py createsuperuser
```

### Issue: Static Files Not Loading

```bash
# Recollect static files
python3 manage.py collectstatic --clear --noinput
```

---

## 🔄 Start/Stop Commands

### Using Scripts
```bash
# Start all services
./start_all_services.sh

# Stop all services
./stop_all_services.sh

# Check status
ps aux | grep -E 'django|fastapi|uvicorn'
```

### Using Systemd (Production)
```bash
# Start services
sudo systemctl start noctispro-django
sudo systemctl start noctispro-fastapi

# Stop services
sudo systemctl stop noctispro-django
sudo systemctl stop noctispro-fastapi

# Restart services
sudo systemctl restart noctispro-django
sudo systemctl restart noctispro-fastapi

# Check status
sudo systemctl status noctispro-django
sudo systemctl status noctispro-fastapi
```

---

## 📊 Service URLs

Once running, access these URLs:

| Service | URL | Purpose |
|---------|-----|---------|
| **Main App** | http://localhost:8000 | PACS Web Interface |
| **Admin** | http://localhost:8000/admin/ | Django Admin Panel |
| **API Docs** | http://localhost:8001/api/v1/docs | FastAPI Documentation |
| **Health Check** | http://localhost:8001/api/v1/health | API Health Status |
| **Worklist** | http://localhost:8000/worklist/ | Study Worklist |
| **DICOM Viewer** | http://localhost:8000/dicom-viewer/ | Medical Image Viewer |

**Default Login:**
- Use the superuser credentials you created during setup

---

## 🔒 Security Recommendations

### For Production:

1. **Change SECRET_KEY**
   ```bash
   # Edit .env file or settings
   SECRET_KEY='your-secure-random-key-here'
   ```

2. **Configure Firewall**
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw enable
   ```

3. **Enable HTTPS**
   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Get SSL certificate
   sudo certbot --nginx -d your-domain.com
   ```

4. **Set DEBUG=False**
   ```bash
   # In settings or .env
   DEBUG=False
   ```

5. **Configure ALLOWED_HOSTS**
   ```bash
   # In settings
   ALLOWED_HOSTS = ['your-domain.com', 'your-server-ip']
   ```

---

## 📁 Important Directories

```
/workspace/
├── manage.py           # Django management script
├── requirements.txt    # Python dependencies
├── start_all_services.sh  # Startup script
├── stop_all_services.sh   # Shutdown script
├── logs/              # Application logs
├── media/             # Uploaded DICOM files
├── static/            # CSS, JS, images
├── staticfiles/       # Collected static files
├── templates/         # HTML templates
└── venv/              # Virtual environment
```

---

## 🆘 Getting Help

### Check System Status
```bash
# Run smoke test
python3 comprehensive_smoke_test.py

# Check system health
python3 verify_system_health.py

# View logs
tail -f logs/*.log
```

### Common Issues

1. **Services won't start**: Check logs in `logs/` directory
2. **Database issues**: Try `python3 manage.py migrate`
3. **Import errors**: Activate venv and reinstall requirements
4. **Port conflicts**: Check ports with `sudo netstat -tlnp`

---

## 📚 Additional Resources

- **Full Documentation**: See `COMPREHENSIVE_SMOKE_TEST_REPORT.md`
- **API Guide**: Access http://localhost:8001/api/v1/docs
- **Deployment Guide**: See `PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **Fixes Applied**: See `FIXES_APPLIED.md`

---

## ✨ Quick Reference

```bash
# DEVELOPMENT
source venv/bin/activate                    # Activate environment
./start_all_services.sh                     # Start all services
python3 manage.py runserver 0.0.0.0:8000   # Django only
uvicorn fastapi_app.main:app --reload      # FastAPI only

# PRODUCTION
sudo systemctl start noctispro-django       # Start Django
sudo systemctl start noctispro-fastapi      # Start FastAPI
sudo systemctl status noctispro-*           # Check status
sudo journalctl -u noctispro-django -f      # View logs

# MAINTENANCE
python3 manage.py migrate                   # Run migrations
python3 manage.py createsuperuser           # Create admin
python3 manage.py collectstatic --noinput   # Collect static
./stop_all_services.sh                      # Stop all
```

---

## 🎉 Success!

If you can access http://localhost:8000 and see the login page, congratulations! 

Your NoctisPro PACS system is now running on Ubuntu 22.04.

For production deployment with SSL, monitoring, and backups, see the full deployment documentation.

---

**Last Updated**: October 19, 2025  
**Tested On**: Ubuntu Server 22.04 LTS  
**Status**: ✅ Production Ready

---
