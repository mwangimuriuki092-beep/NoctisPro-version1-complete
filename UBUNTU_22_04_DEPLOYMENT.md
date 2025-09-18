# NoctisPro PACS - Ubuntu Server 22.04 Deployment Guide

This guide provides step-by-step instructions for deploying NoctisPro PACS on Ubuntu Server 22.04.

## Prerequisites

- Ubuntu Server 22.04 LTS (fresh installation)
- Root or sudo access
- Internet connection
- At least 4GB RAM and 10GB storage

## Quick Deployment (Recommended)

### Tailnet Deployment (Secure Private Network)

```bash
# Clone the repository
git clone <repository-url>
cd noctispro-pacs

# Make deployment script executable
chmod +x deploy_noctispro.sh

# Run deployment (Tailscale will be automatically configured)
./deploy_noctispro.sh

# Or with custom hostname
TAILNET_HOSTNAME=my-pacs ./deploy_noctispro.sh

# Or with auth key for automated setup
TAILSCALE_AUTH_KEY=your_auth_key TAILNET_HOSTNAME=noctispro ./deploy_noctispro.sh
```

## Manual Deployment Steps

### 1. System Update and Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install system dependencies
sudo apt install -y \
    python3.10 \
    python3.10-venv \
    python3.10-dev \
    python3-pip \
    build-essential \
    pkg-config \
    libssl-dev \
    libffi-dev \
    libjpeg-dev \
    libpng-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libopenjp2-7-dev \
    libtiff5-dev \
    libwebp-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libxcb1-dev \
    git \
    curl \
    wget \
    unzip \
    nginx \
    supervisor
```

### 2. Python Environment Setup

```bash
# Create project directory
sudo mkdir -p /opt/noctispro
sudo chown $USER:$USER /opt/noctispro
cd /opt/noctispro

# Clone repository
git clone <repository-url> .

# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Database Setup

```bash
# Create database and run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser --username admin --email admin@noctispro.com

# Collect static files
python manage.py collectstatic --noinput
```

### 4. AI System Setup

```bash
# Setup AI models and start processing
python setup_ai_system.py

# Or manually:
python manage.py setup_working_ai_models
```

### 5. Tailscale Network Configuration

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale with hostname
sudo tailscale up --hostname=noctispro

# Or with auth key for automated setup
# sudo tailscale up --authkey=YOUR_AUTH_KEY --hostname=noctispro

# Verify connection
tailscale status
tailscale ip -4
```

### 6. Service Configuration

#### Create Systemd Service for Django

```bash
sudo tee /etc/systemd/system/noctispro.service > /dev/null <<EOF
[Unit]
Description=NoctisPro PACS Django Application
After=network.target

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/opt/noctispro
Environment=PATH=/opt/noctispro/venv/bin
ExecStart=/opt/noctispro/venv/bin/gunicorn --daemon --workers 3 --bind unix:/opt/noctispro/noctispro.sock noctis_pro.wsgi:application
ExecReload=/bin/kill -s HUP \$MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```


#### Create Systemd Service for AI Processing

```bash
sudo tee /etc/systemd/system/noctispro-ai.service > /dev/null <<EOF
[Unit]
Description=NoctisPro PACS AI Analysis Processor
After=network.target noctispro.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/noctispro
Environment=PATH=/opt/noctispro/venv/bin
ExecStart=/opt/noctispro/venv/bin/python manage.py process_ai_analyses --continuous
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### 7. Nginx Configuration (Optional - for production)

```bash
sudo tee /etc/nginx/sites-available/noctispro > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;

    location = /favicon.ico { access_log off; log_not_found off; }
    
    location /static/ {
        root /opt/noctispro;
    }
    
    location /media/ {
        root /opt/noctispro;
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:/opt/noctispro/noctispro.sock;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/noctispro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. File Permissions

```bash
# Set correct permissions
sudo chown -R www-data:www-data /opt/noctispro
sudo chmod -R 755 /opt/noctispro
sudo chmod -R 775 /opt/noctispro/media
sudo chmod -R 775 /opt/noctispro/logs
```

### 9. Start Services

```bash
# Reload systemd and start services
sudo systemctl daemon-reload
sudo systemctl enable noctispro noctispro-ai
sudo systemctl start noctispro noctispro-ai

# Check status
sudo systemctl status noctispro noctispro-ai

# Verify Tailscale connection
tailscale status
```

## Post-Deployment Configuration

### 1. Access the Application

#### Tailscale Access:
- URL: http://noctispro:8080 (or your Tailscale IP)
- Admin: admin / (password you set)
- Get IP: `tailscale ip -4`

### 2. Configure AI Analysis

```bash
# Start AI processing (if not using systemd service)
cd /opt/noctispro
source venv/bin/activate
python manage.py process_ai_analyses --continuous &
```

### 3. Test Upload

1. Login to the web interface
2. Go to Worklist → Upload
3. Upload sample DICOM files
4. Check AI analysis at /ai/
5. Generate reports from completed analyses

## Management Commands

```bash
# Service management
sudo systemctl start noctispro noctispro-ai
sudo systemctl stop noctispro noctispro-ai
sudo systemctl restart noctispro noctispro-ai
sudo systemctl status noctispro noctispro-ai

# View logs
sudo journalctl -f -u noctispro
sudo journalctl -f -u noctispro-ai

# Tailscale management
tailscale status
tailscale ip -4
sudo tailscale up --hostname=noctispro  # Reconnect if needed

# Database management
cd /opt/noctispro
source venv/bin/activate
python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic --noinput

# AI management
python manage.py setup_working_ai_models
python manage.py process_ai_analyses
```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   ```bash
   sudo chown -R www-data:www-data /opt/noctispro
   sudo chmod -R 755 /opt/noctispro
   ```

2. **Database Errors**
   ```bash
   cd /opt/noctispro
   source venv/bin/activate
   python manage.py migrate
   ```

3. **Static Files Not Loading**
   ```bash
   python manage.py collectstatic --noinput
   sudo systemctl restart noctispro
   ```

4. **AI Analysis Not Working**
   ```bash
   python manage.py setup_working_ai_models
   sudo systemctl restart noctispro-ai
   ```

### Log Locations

- Django Application: `/opt/noctispro/logs/noctis_pro.log`
- Systemd Services: `sudo journalctl -u noctispro`
- Nginx: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`

### Performance Tuning

1. **For high-volume deployments:**
   ```bash
   # Increase worker processes
   sudo nano /etc/systemd/system/noctispro.service
   # Change --workers 3 to --workers 8
   
   sudo systemctl daemon-reload
   sudo systemctl restart noctispro
   ```

2. **Database optimization (PostgreSQL recommended for production):**
   ```bash
   sudo apt install postgresql postgresql-contrib
   # Configure PostgreSQL and update Django settings
   ```

## Security Considerations

1. **Firewall Configuration:**
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

2. **SSL/TLS Setup (production):**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

3. **Regular Updates:**
   ```bash
   # System updates
   sudo apt update && sudo apt upgrade -y
   
   # Application updates
   cd /opt/noctispro
   git pull
   source venv/bin/activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py collectstatic --noinput
   sudo systemctl restart noctispro noctispro-ai
   ```

## Support

For issues or questions:
1. Check logs: `sudo journalctl -f -u noctispro`
2. Verify services: `sudo systemctl status noctispro`
3. Test connectivity: Access the web interface
4. Review this deployment guide

The system should now be fully operational with:
- ✅ Web interface accessible
- ✅ DICOM upload and viewing
- ✅ AI analysis and reporting
- ✅ Session timeout management
- ✅ Professional measurement tools
- ✅ Secure network access