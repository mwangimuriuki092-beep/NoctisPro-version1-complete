# NoctisPro PACS - Docker Production Deployment Guide
## Ubuntu Server 22.04 LTS

This guide provides complete instructions for deploying NoctisPro PACS in production using Docker on Ubuntu Server 22.04 LTS.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Automated)](#quick-start-automated)
3. [Manual Installation](#manual-installation)
4. [Configuration](#configuration)
5. [Starting the System](#starting-the-system)
6. [Accessing the System](#accessing-the-system)
7. [Management & Maintenance](#management--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Security & Production Hardening](#security--production-hardening)
10. [Backup & Recovery](#backup--recovery)

---

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu Server 22.04 LTS (fresh installation recommended)
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: Minimum 20GB, recommended 100GB+ for DICOM storage
- **CPU**: 2+ cores recommended
- **Network**: Internet connection for initial setup
- **Access**: Root or sudo privileges

### Software Prerequisites

- Docker Engine 24.0+
- Docker Compose V2
- Git

---

## Quick Start (Automated)

The fastest way to deploy NoctisPro PACS in production:

```bash
# Clone the repository
git clone <repository-url> /opt/noctispro
cd /opt/noctispro

# Run the production deployment script
sudo chmod +x deploy_production_docker.sh
sudo ./deploy_production_docker.sh
```

The script will:
- ✅ Install Docker and Docker Compose
- ✅ Configure system settings
- ✅ Set up environment variables
- ✅ Create necessary directories
- ✅ Build and start all services
- ✅ Initialize the database
- ✅ Create admin user (admin/admin123)
- ✅ Start all services with health checks

**Access the system at**: `http://your-server-ip:80`

---

## Manual Installation

### Step 1: Update System

```bash
# Update package lists and upgrade system
sudo apt update && sudo apt upgrade -y

# Install basic utilities
sudo apt install -y curl wget git net-tools vim
```

### Step 2: Install Docker Engine

```bash
# Remove old Docker versions
sudo apt remove -y docker docker-engine docker.io containerd runc

# Install Docker prerequisites
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
sudo docker --version
sudo docker compose version
```

### Step 3: Configure Docker (Post-Installation)

```bash
# Add current user to docker group (avoid using sudo)
sudo usermod -aG docker $USER

# Apply group changes (or log out and back in)
newgrp docker

# Enable Docker to start on boot
sudo systemctl enable docker
sudo systemctl start docker

# Verify Docker is running
sudo systemctl status docker
```

### Step 4: Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/noctispro
sudo chown $USER:$USER /opt/noctispro

# Clone the repository
cd /opt/noctispro
git clone <repository-url> .

# Or if already cloned elsewhere, move it:
# sudo mv /path/to/noctispro /opt/noctispro
```

### Step 5: Configure Environment Variables

```bash
# Create production environment file
cat > .env << EOF
# Django Settings
DEBUG=False
SECRET_KEY=$(openssl rand -base64 32)
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com
DOMAIN_NAME=your-domain.com

# Database Configuration
POSTGRES_DB=noctispro
POSTGRES_USER=noctispro
POSTGRES_PASSWORD=$(openssl rand -base64 16)
DATABASE_URL=postgresql://noctispro:\${POSTGRES_PASSWORD}@db:5432/noctispro

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# Security
USE_HTTPS=True
SECURE_SSL_REDIRECT=False

# Admin Configuration
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@noctispro.local
DJANGO_SUPERUSER_PASSWORD=admin123

# Application Settings
BACKUP_ROOT=/app/backups
MEDIA_ROOT=/app/media
STATIC_ROOT=/app/staticfiles
EOF

# Secure the environment file
chmod 600 .env
```

**⚠️ IMPORTANT**: Change the default passwords in production!

---

## Configuration

### Docker Compose Configuration

The system uses `docker-compose.production.yml` which includes:

1. **PostgreSQL Database** (port 5432)
   - Persistent data storage
   - Health checks enabled
   - Automatic initialization

2. **Redis Cache** (port 6379)
   - Session management
   - Caching layer
   - Background task queue

3. **Web Application** (ports 80, 443)
   - Django + Gunicorn
   - Nginx reverse proxy
   - Auto-scaling workers

4. **Backup Service**
   - Automated daily backups
   - DICOM-compliant archival
   - Retention policies

5. **AI Processing Worker**
   - Continuous AI analysis
   - Background processing
   - Auto-restart on failure

### Port Configuration

Default exposed ports:
- **80** - HTTP (redirects to HTTPS if configured)
- **443** - HTTPS (requires SSL certificates)
- **5432** - PostgreSQL (internal, not exposed by default)
- **6379** - Redis (internal, not exposed by default)
- **11112** - DICOM SCP (optional, for receiving DICOM from modalities)

---

## Starting the System

### Initial Deployment

```bash
cd /opt/noctispro

# Build and start all services
docker compose -f docker-compose.production.yml up -d --build

# Monitor the startup process
docker compose -f docker-compose.production.yml logs -f
```

Wait for all services to be healthy. You should see:
```
✅ Database is ready!
✅ Redis is ready!
🔄 Running database migrations...
👤 Setting up admin user...
📁 Collecting static files...
🤖 Setting up AI models...
🏥 Starting NoctisPro PACS application...
```

### Verify Services

```bash
# Check all containers are running
docker compose -f docker-compose.production.yml ps

# Check service health
docker compose -f docker-compose.production.yml ps | grep healthy

# View logs of specific service
docker compose -f docker-compose.production.yml logs web
docker compose -f docker-compose.production.yml logs db
docker compose -f docker-compose.production.yml logs ai-worker
```

---

## Accessing the System

### Default Access Information

- **Application URL**: `http://your-server-ip`
- **Admin Username**: `admin`
- **Admin Password**: `admin123` (⚠️ Change immediately!)

### Admin Panel

- **URL**: `http://your-server-ip/admin/`
- Login with admin credentials
- Configure system settings, users, and permissions

### Application Features

- **Worklist**: `http://your-server-ip/worklist/` - Patient and study management
- **DICOM Viewer**: `http://your-server-ip/dicom-viewer/` - Medical image viewing
- **AI Dashboard**: `http://your-server-ip/ai/` - AI analysis results
- **Reports**: `http://your-server-ip/reports/` - Medical reports
- **System Monitor**: `http://your-server-ip/admin/monitor/` - System health

### First Steps After Deployment

1. **Change Admin Password**
   ```bash
   docker exec -it noctispro-web python manage.py changepassword admin
   ```

2. **Create Additional Users**
   - Go to Admin Panel → Users → Add User
   - Assign appropriate roles (Doctor, Technician, Admin)

3. **Test DICOM Upload**
   - Go to Worklist → Upload
   - Upload sample DICOM files
   - Verify images appear in viewer

4. **Configure AI Analysis**
   - Already running in background via ai-worker container
   - Check AI Dashboard for results

---

## Management & Maintenance

### Service Management

```bash
# Start all services
docker compose -f docker-compose.production.yml up -d

# Stop all services
docker compose -f docker-compose.production.yml down

# Restart specific service
docker compose -f docker-compose.production.yml restart web

# Stop and remove all containers (keeps data)
docker compose -f docker-compose.production.yml down

# Stop and remove containers + volumes (DELETES ALL DATA!)
docker compose -f docker-compose.production.yml down -v
```

### Viewing Logs

```bash
# View all logs
docker compose -f docker-compose.production.yml logs -f

# View logs for specific service
docker compose -f docker-compose.production.yml logs -f web
docker compose -f docker-compose.production.yml logs -f db
docker compose -f docker-compose.production.yml logs -f ai-worker

# View last 100 lines
docker compose -f docker-compose.production.yml logs --tail=100 web

# Save logs to file
docker compose -f docker-compose.production.yml logs > noctispro-logs.txt
```

### Database Management

```bash
# Access PostgreSQL shell
docker exec -it noctispro-db psql -U noctispro -d noctispro

# Run Django migrations
docker exec -it noctispro-web python manage.py migrate

# Create database backup
docker exec -it noctispro-web python manage.py create_medical_backup --type manual

# Django shell access
docker exec -it noctispro-web python manage.py shell
```

### Updating the Application

```bash
cd /opt/noctispro

# Pull latest code
git pull origin main

# Rebuild and restart services
docker compose -f docker-compose.production.yml up -d --build

# Run migrations
docker exec -it noctispro-web python manage.py migrate

# Collect static files
docker exec -it noctispro-web python manage.py collectstatic --noinput

# Restart services
docker compose -f docker-compose.production.yml restart
```

### System Monitoring

```bash
# View container resource usage
docker stats

# Check container health
docker compose -f docker-compose.production.yml ps

# Check disk usage
docker system df

# View system logs
docker compose -f docker-compose.production.yml logs --tail=50 -f
```

---

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check container logs
docker compose -f docker-compose.production.yml logs web

# Check if ports are already in use
sudo netstat -tulpn | grep -E ':80|:443|:5432|:6379'

# Remove and recreate containers
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d
```

#### 2. Database Connection Errors

```bash
# Check database is running
docker compose -f docker-compose.production.yml ps db

# Check database logs
docker compose -f docker-compose.production.yml logs db

# Reset database (WARNING: DELETES ALL DATA)
docker compose -f docker-compose.production.yml down -v
docker compose -f docker-compose.production.yml up -d
```

#### 3. Static Files Not Loading

```bash
# Recollect static files
docker exec -it noctispro-web python manage.py collectstatic --noinput

# Restart web service
docker compose -f docker-compose.production.yml restart web
```

#### 4. AI Analysis Not Working

```bash
# Check AI worker logs
docker compose -f docker-compose.production.yml logs ai-worker

# Restart AI worker
docker compose -f docker-compose.production.yml restart ai-worker

# Manually trigger AI setup
docker exec -it noctispro-web python manage.py setup_working_ai_models
```

#### 5. Out of Disk Space

```bash
# Clean up Docker resources
docker system prune -a

# Remove unused volumes (BE CAREFUL!)
docker volume prune

# Check disk usage
df -h
docker system df
```

### Health Checks

```bash
# Check all services health
docker compose -f docker-compose.production.yml ps

# Check web application health
curl http://localhost/api/health/

# Check database connection
docker exec -it noctispro-web python manage.py check --database default
```

### Log Locations

Logs are stored in Docker volumes and can be accessed:

```bash
# Application logs
docker exec -it noctispro-web ls -lh /app/logs/

# View specific log file
docker exec -it noctispro-web cat /app/logs/noctis_pro.log

# Backup logs
docker cp noctispro-web:/app/logs/ ./local-logs/
```

---

## Security & Production Hardening

### 1. Change Default Passwords

```bash
# Change admin password
docker exec -it noctispro-web python manage.py changepassword admin

# Update database password in .env
nano .env
# Update POSTGRES_PASSWORD

# Recreate containers with new password
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d
```

### 2. Configure Firewall

```bash
# Install UFW (if not already installed)
sudo apt install -y ufw

# Configure firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 3. SSL/TLS Configuration (HTTPS)

#### Option A: Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Stop services temporarily
docker compose -f docker-compose.production.yml down

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Update docker-compose.production.yml to mount certificates
# Add to web service volumes:
#   - /etc/letsencrypt:/etc/letsencrypt:ro

# Restart services
docker compose -f docker-compose.production.yml up -d

# Set up auto-renewal
echo "0 0 * * * root certbot renew --quiet" | sudo tee -a /etc/crontab
```

#### Option B: Using Self-Signed Certificate (Development/Testing)

```bash
# Create self-signed certificate
sudo mkdir -p /opt/noctispro/ssl
cd /opt/noctispro/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem -out fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"

# Update docker-compose to mount certificates
# Restart services
```

### 4. Secure Environment Variables

```bash
# Secure .env file
chmod 600 /opt/noctispro/.env

# Generate strong SECRET_KEY
DJANGO_SECRET=$(openssl rand -base64 64)
echo "SECRET_KEY=$DJANGO_SECRET" >> .env

# Restart services to apply changes
docker compose -f docker-compose.production.yml restart
```

### 5. Enable Security Headers

The production Nginx configuration includes:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HSTS)

### 6. Regular Security Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
cd /opt/noctispro
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d --build

# Update application code
git pull origin main
docker compose -f docker-compose.production.yml up -d --build
```

---

## Backup & Recovery

### Automated Backups

The system includes automated backup service that runs:
- **Daily**: 2:00 AM (last 7 days retained)
- **Weekly**: Sunday 1:00 AM (last 4 weeks retained)
- **Monthly**: 1st of month (last 12 months retained)

Backups are stored in Docker volume: `backup_data`

### Manual Backup

```bash
# Create immediate backup
docker exec -it noctispro-web python manage.py create_medical_backup --type manual

# Backup entire system (database + media files)
docker exec -it noctispro-backup python manage.py create_medical_backup --type full

# List all backups
docker exec -it noctispro-web python manage.py list_backups
```

### Backup to External Storage

```bash
# Create backup directory on host
sudo mkdir -p /backup/noctispro

# Backup database volume
docker run --rm \
  -v noctispro_postgres_data:/data \
  -v /backup/noctispro:/backup \
  alpine tar czf /backup/postgres-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

# Backup media files
docker run --rm \
  -v noctispro_media_data:/data \
  -v /backup/noctispro:/backup \
  alpine tar czf /backup/media-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

# Backup application backups
docker run --rm \
  -v noctispro_backup_data:/data \
  -v /backup/noctispro:/backup \
  alpine tar czf /backup/backups-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

### Restore from Backup

```bash
# Stop services
docker compose -f docker-compose.production.yml down

# Restore database volume
docker run --rm \
  -v noctispro_postgres_data:/data \
  -v /backup/noctispro:/backup \
  alpine sh -c "cd /data && tar xzf /backup/postgres-TIMESTAMP.tar.gz"

# Restore media files
docker run --rm \
  -v noctispro_media_data:/data \
  -v /backup/noctispro:/backup \
  alpine sh -c "cd /data && tar xzf /backup/media-TIMESTAMP.tar.gz"

# Start services
docker compose -f docker-compose.production.yml up -d
```

### Disaster Recovery

```bash
# 1. Save critical data
docker compose -f docker-compose.production.yml down
docker cp noctispro-db:/var/lib/postgresql/data ./db-backup
docker cp noctispro-web:/app/media ./media-backup

# 2. Backup configuration
cp .env .env.backup
cp docker-compose.production.yml docker-compose.production.yml.backup

# 3. Fresh install on new server
# Follow installation steps above

# 4. Restore data
docker cp ./db-backup noctispro-db:/var/lib/postgresql/data
docker cp ./media-backup noctispro-web:/app/media

# 5. Start services
docker compose -f docker-compose.production.yml up -d
```

---

## Performance Optimization

### 1. Increase Worker Processes

Edit `docker/startup.sh` to increase Gunicorn workers:

```bash
# Default: 4 workers
# For 8GB RAM server: 8 workers
# For 16GB RAM server: 16 workers
--workers 8
```

### 2. Database Tuning

Create `docker/postgresql.conf`:

```ini
# For 8GB RAM server
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 32MB
```

Mount in `docker-compose.production.yml`:

```yaml
volumes:
  - ./docker/postgresql.conf:/etc/postgresql/postgresql.conf
```

### 3. Redis Memory Limit

In `docker-compose.production.yml`:

```yaml
redis:
  command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru
```

### 4. Enable PostgreSQL Connection Pooling

Use PgBouncer for connection pooling (optional advanced setup).

---

## Support & Resources

### Getting Help

1. **Check Logs**: Always check logs first
   ```bash
   docker compose -f docker-compose.production.yml logs -f
   ```

2. **System Health**: Verify all services are healthy
   ```bash
   docker compose -f docker-compose.production.yml ps
   ```

3. **Documentation**: Review this guide and docs/ folder

### Useful Commands Quick Reference

```bash
# Start system
docker compose -f docker-compose.production.yml up -d

# Stop system
docker compose -f docker-compose.production.yml down

# View logs
docker compose -f docker-compose.production.yml logs -f

# Restart service
docker compose -f docker-compose.production.yml restart web

# Execute command in container
docker exec -it noctispro-web <command>

# Access Django shell
docker exec -it noctispro-web python manage.py shell

# Run migrations
docker exec -it noctispro-web python manage.py migrate

# Create backup
docker exec -it noctispro-web python manage.py create_medical_backup --type manual
```

---

## Production Checklist

Before going live, ensure:

- [ ] Changed all default passwords
- [ ] Configured SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Configured automated backups
- [ ] Tested backup and restore procedures
- [ ] Set up monitoring and alerts
- [ ] Configured proper logging
- [ ] Tested DICOM upload and viewing
- [ ] Tested AI analysis functionality
- [ ] Created non-admin user accounts
- [ ] Configured proper DNS records
- [ ] Tested system under load
- [ ] Documented custom configuration
- [ ] Set up regular update schedule
- [ ] Configured external backup storage
- [ ] Tested disaster recovery procedure

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer (Optional)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Nginx Reverse Proxy                       │
│                    (ports 80, 443)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Django + Gunicorn Web App                       │
│         (noctispro-web container)                            │
│  - DICOM Viewer   - Worklist   - Reports                     │
│  - User Management   - Admin Panel                           │
└─────────┬────────────────┬────────────────┬─────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │   Redis     │  │  AI Worker  │
│     DB      │  │   Cache     │  │  Container  │
└─────────────┘  └─────────────┘  └─────────────┘
          │                │                │
          ▼                ▼                ▼
     [Volumes: Persistent Data Storage]
```

---

## License & Compliance

This is a medical imaging system. Ensure compliance with:
- HIPAA (if in US)
- GDPR (if handling EU patient data)
- Local healthcare regulations
- Data protection laws
- Medical device regulations (if applicable)

**⚠️ IMPORTANT**: This system is for healthcare professionals. Ensure proper training and certification before clinical use.

---

## Conclusion

You now have a production-ready NoctisPro PACS system running in Docker on Ubuntu Server 22.04. The system includes:

- ✅ High availability with health checks
- ✅ Automated backups
- ✅ AI-powered image analysis
- ✅ Secure by default
- ✅ Easy maintenance and updates
- ✅ Scalable architecture

For questions or issues, refer to the troubleshooting section or check the logs.

**Happy diagnosing! 🏥**
