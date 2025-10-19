# NoctisPro PACS - Production Deployment Guide

This guide covers the complete production deployment of NoctisPro PACS using Docker Compose with monitoring, backups, and security best practices.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Service Profiles](#service-profiles)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Monitoring Setup](#monitoring-setup)
7. [Backup & Recovery](#backup--recovery)
8. [Performance Tuning](#performance-tuning)
9. [Security Hardening](#security-hardening)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance](#maintenance)

---

## Prerequisites

### System Requirements

**Minimum:**
- CPU: 4 cores
- RAM: 8GB
- Storage: 100GB SSD
- OS: Ubuntu 22.04 LTS or similar

**Recommended:**
- CPU: 8+ cores
- RAM: 16GB+
- Storage: 500GB+ SSD (for DICOM files)
- OS: Ubuntu 22.04 LTS

### Software Requirements

```bash
# Docker
Docker Engine 24.0+
Docker Compose 2.20+

# Optional
certbot (for SSL certificates)
```

### Installation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

---

## Quick Start

### 1. Clone and Configure

```bash
# Clone repository
git clone <repository-url>
cd noctispro

# Copy environment template
cp .env.prod .env

# Edit configuration (IMPORTANT: Set all passwords and secrets!)
nano .env
```

### 2. Generate Secrets

```bash
# Generate Django secret key
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Generate strong passwords (use different passwords for each service)
openssl rand -base64 32  # PostgreSQL password
openssl rand -base64 32  # Redis password
openssl rand -base64 32  # Grafana admin password
```

### 3. Create Data Directories

```bash
# Create required directories
mkdir -p data/{postgres,redis,media,static}
mkdir -p backups/{postgres,medical}
mkdir -p logs/{nginx,celery,ai,dicom,backup}
mkdir -p ssl

# Set permissions
sudo chown -R $USER:$USER data backups logs
chmod -R 755 data backups logs
```

### 4. Start Services

```bash
# Basic deployment (core services only)
docker compose -f docker-compose.prod.yaml up -d

# With monitoring
docker compose -f docker-compose.prod.yaml --profile monitoring up -d

# With backups
docker compose -f docker-compose.prod.yaml --profile backup up -d

# Full deployment (all features)
docker compose -f docker-compose.prod.yaml --profile monitoring --profile backup --profile ssl up -d
```

### 5. Initial Setup

```bash
# Create superuser
docker compose -f docker-compose.prod.yaml exec django python manage.py createsuperuser

# Check service health
docker compose -f docker-compose.prod.yaml ps
docker compose -f docker-compose.prod.yaml logs -f django

# Access the application
# HTTP: http://your-domain.com
# HTTPS: https://your-domain.com (after SSL setup)
```

---

## Detailed Setup

### Environment Variables

Edit `.env` and configure all required variables:

**Critical Variables:**
```bash
# Security (MUST CHANGE!)
SECRET_KEY=<your-generated-secret-key>
POSTGRES_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
GRAFANA_ADMIN_PASSWORD=<strong-password>

# Domain
DOMAIN_NAME=your-domain.com
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
ADMIN_EMAIL=admin@your-domain.com
```

### Network Configuration

The deployment uses three isolated networks:

1. **noctispro_frontend** - Public-facing services (Nginx, DICOM SCP)
2. **noctispro_backend** - Internal services (Database, Redis, Django)
3. **noctispro_monitoring** - Monitoring services (Prometheus, Grafana)

### Volume Configuration

All data is persisted in the following volumes:

```
./data/
├── postgres/     # Database files
├── redis/        # Redis persistence
├── media/        # DICOM files and uploads
└── static/       # Static assets

./backups/
├── postgres/     # Database backups
└── medical/      # Medical data backups
```

**Important:** For production, mount these directories on:
- Fast SSDs for `data/`
- Separate backup volume/disk for `backups/`
- Consider using named volumes with backup solutions

---

## Service Profiles

Docker Compose profiles allow selective service activation:

### Core Services (Always Active)

- `postgres` - PostgreSQL database
- `redis` - Redis cache/broker
- `django` - Main application
- `dicom_scp` - DICOM receiver
- `nginx` - Web server
- `celery_worker` - Background tasks
- `celery_beat` - Scheduled tasks
- `ai_worker` - AI processing

### Optional Profiles

#### Monitoring Stack

```bash
docker compose -f docker-compose.prod.yaml --profile monitoring up -d
```

Includes:
- `prometheus` - Metrics collection (http://localhost:9090)
- `grafana` - Visualization (http://localhost:3000)
- `node_exporter` - System metrics
- `postgres_exporter` - Database metrics
- `redis_exporter` - Cache metrics

#### Backup Service

```bash
docker compose -f docker-compose.prod.yaml --profile backup up -d
```

Includes:
- `backup` - Automated backup service

#### SSL Management

```bash
docker compose -f docker-compose.prod.yaml --profile ssl up -d
```

Includes:
- `certbot` - Let's Encrypt SSL certificates

---

## SSL/TLS Configuration

### Option 1: Let's Encrypt (Recommended)

```bash
# 1. Ensure DNS points to your server
# 2. Set DOMAIN_NAME and ADMIN_EMAIL in .env
# 3. Start with SSL profile
docker compose -f docker-compose.prod.yaml --profile ssl up -d

# 4. Obtain certificate
docker compose -f docker-compose.prod.yaml run --rm certbot \
  certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@your-domain.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com \
  -d www.your-domain.com

# 5. Restart Nginx
docker compose -f docker-compose.prod.yaml restart nginx
```

### Option 2: Self-Signed Certificate

```bash
# Generate self-signed certificate
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem \
  -subj "/CN=your-domain.com"

# Update Nginx configuration to use self-signed cert
# Restart services
docker compose -f docker-compose.prod.yaml restart nginx
```

### Option 3: Existing Certificate

```bash
# Copy your certificates
cp your-cert.pem ssl/fullchain.pem
cp your-key.pem ssl/privkey.pem

# Set proper permissions
chmod 600 ssl/privkey.pem
chmod 644 ssl/fullchain.pem

# Restart Nginx
docker compose -f docker-compose.prod.yaml restart nginx
```

---

## Monitoring Setup

### Access Grafana

1. Navigate to `http://localhost:3000` (or configure reverse proxy)
2. Login with credentials from `.env`:
   - Username: `admin` (or `GRAFANA_ADMIN_USER`)
   - Password: `GRAFANA_ADMIN_PASSWORD`

### Import Dashboards

```bash
# Access Grafana
# Go to Dashboards → Import
# Import these popular dashboards by ID:

# 1. Node Exporter Full (ID: 1860)
# 2. PostgreSQL Database (ID: 9628)
# 3. Redis Dashboard (ID: 11835)
# 4. Docker Container & Host Metrics (ID: 893)
```

### Prometheus Targets

Access Prometheus at `http://localhost:9090`:

- Django: `http://django:8000/metrics`
- PostgreSQL: `postgres_exporter:9187`
- Redis: `redis_exporter:9121`
- Node: `node_exporter:9100`

### Alert Configuration

Create alerting rules in `deployment/prometheus/alerts.yml`:

```yaml
groups:
  - name: noctispro_alerts
    interval: 30s
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[2m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
```

---

## Backup & Recovery

### Automated Backups

Backup service runs automatically when enabled:

```bash
docker compose -f docker-compose.prod.yaml --profile backup up -d
```

**Configuration in `.env`:**
```bash
BACKUP_SCHEDULE=0 2 * * *      # Daily at 2 AM
BACKUP_RETENTION_DAYS=30       # Keep 30 days
```

### Manual Backups

#### Database Backup

```bash
# Backup
docker compose -f docker-compose.prod.yaml exec postgres \
  pg_dump -U postgres noctis_pro | gzip > backups/postgres/manual-$(date +%Y%m%d-%H%M%S).sql.gz

# Restore
gunzip < backups/postgres/backup.sql.gz | \
docker compose -f docker-compose.prod.yaml exec -T postgres \
  psql -U postgres noctis_pro
```

#### Media Files Backup

```bash
# Backup media files
tar -czf backups/media-$(date +%Y%m%d).tar.gz data/media/

# Restore
tar -xzf backups/media-20240101.tar.gz -C data/
```

#### Full System Backup

```bash
# Stop services (optional but recommended)
docker compose -f docker-compose.prod.yaml stop

# Backup all data
tar -czf backups/full-backup-$(date +%Y%m%d).tar.gz \
  data/ \
  .env \
  config/ \
  deployment/

# Restart services
docker compose -f docker-compose.prod.yaml start
```

### Disaster Recovery

```bash
# 1. Restore data directories
tar -xzf backups/full-backup-20240101.tar.gz

# 2. Restore .env file
# Ensure all credentials match the backup

# 3. Restore database
docker compose -f docker-compose.prod.yaml up -d postgres
gunzip < backups/postgres/backup.sql.gz | \
  docker compose -f docker-compose.prod.yaml exec -T postgres \
  psql -U postgres noctis_pro

# 4. Start all services
docker compose -f docker-compose.prod.yaml up -d

# 5. Verify
docker compose -f docker-compose.prod.yaml ps
docker compose -f docker-compose.prod.yaml logs
```

---

## Performance Tuning

### Database Optimization

Edit `deployment/postgres/postgresql.conf.production`:

```ini
# Memory
shared_buffers = 2GB              # 25% of RAM
effective_cache_size = 6GB        # 75% of RAM
work_mem = 16MB                   # Per operation
maintenance_work_mem = 512MB

# Connections
max_connections = 100

# Checkpoints
checkpoint_completion_target = 0.9
wal_buffers = 16MB
```

### Redis Optimization

Edit `deployment/redis/redis.conf`:

```ini
# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

### Gunicorn Workers

In `.env`:

```bash
# Formula: (2 × CPU_cores) + 1
GUNICORN_WORKERS=9        # For 4-core system
GUNICORN_THREADS=4        # Threads per worker
```

### Celery Concurrency

```bash
# Number of concurrent tasks
CELERY_CONCURRENCY=4      # Match CPU cores
```

### Resource Limits

Adjust in `docker-compose.prod.yaml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
    reservations:
      cpus: '2'
      memory: 2G
```

---

## Security Hardening

### 1. Network Security

```bash
# Use firewall (UFW example)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 11112/tcp   # DICOM
sudo ufw enable
```

### 2. Secure Passwords

```bash
# Generate strong passwords
openssl rand -base64 32

# Use different passwords for:
# - PostgreSQL
# - Redis
# - Django SECRET_KEY
# - Grafana admin
```

### 3. SSL/TLS

- Use Let's Encrypt certificates
- Enable HTTPS redirect
- Set `SECURE_SSL_REDIRECT=true`

### 4. Container Security

```bash
# Run security scan
docker scan noctispro_django_prod

# Update images regularly
docker compose -f docker-compose.prod.yaml pull
docker compose -f docker-compose.prod.yaml up -d
```

### 5. Database Security

```ini
# Only allow localhost connections (default)
ports:
  - "127.0.0.1:5432:5432"

# Use strong authentication
# Regular backups
# Encrypted backups
```

### 6. Regular Updates

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker compose -f docker-compose.prod.yaml pull
docker compose -f docker-compose.prod.yaml up -d

# Update application
git pull
docker compose -f docker-compose.prod.yaml build
docker compose -f docker-compose.prod.yaml up -d
```

---

## Troubleshooting

### Check Service Status

```bash
# View all services
docker compose -f docker-compose.prod.yaml ps

# View logs
docker compose -f docker-compose.prod.yaml logs -f django
docker compose -f docker-compose.prod.yaml logs -f postgres
docker compose -f docker-compose.prod.yaml logs -f nginx

# Check health
docker compose -f docker-compose.prod.yaml exec django python manage.py check
```

### Common Issues

#### Database Connection Errors

```bash
# Check PostgreSQL is running
docker compose -f docker-compose.prod.yaml ps postgres

# Check credentials in .env
# Verify DATABASE_URL format

# Test connection
docker compose -f docker-compose.prod.yaml exec postgres \
  psql -U postgres -d noctis_pro -c "SELECT 1;"
```

#### Nginx 502 Bad Gateway

```bash
# Check Django is running
docker compose -f docker-compose.prod.yaml ps django

# Check Django health endpoint
docker compose -f docker-compose.prod.yaml exec django \
  curl -f http://localhost:8000/api/health/

# Check Nginx logs
docker compose -f docker-compose.prod.yaml logs nginx
```

#### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker resources
docker system prune -a --volumes

# Check large files
du -sh data/* backups/*

# Implement retention policies
```

#### High Memory Usage

```bash
# Check container stats
docker stats

# Reduce resource limits in docker-compose.prod.yaml
# Reduce worker/thread counts in .env
```

### Performance Issues

```bash
# Check system resources
htop
df -h
iostat -x 1

# Check database performance
docker compose -f docker-compose.prod.yaml exec postgres \
  psql -U postgres -d noctis_pro -c "SELECT * FROM pg_stat_activity;"

# Check Redis performance
docker compose -f docker-compose.prod.yaml exec redis \
  redis-cli --no-auth-warning -a "${REDIS_PASSWORD}" INFO stats
```

---

## Maintenance

### Daily Tasks

```bash
# Check service health
docker compose -f docker-compose.prod.yaml ps

# Check logs for errors
docker compose -f docker-compose.prod.yaml logs --tail=100

# Monitor disk space
df -h
```

### Weekly Tasks

```bash
# Verify backups
ls -lh backups/postgres/
ls -lh backups/medical/

# Check security updates
apt list --upgradable

# Review monitoring dashboards
```

### Monthly Tasks

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker compose -f docker-compose.prod.yaml pull
docker compose -f docker-compose.prod.yaml up -d

# Test disaster recovery
# Verify backup integrity
# Review security logs
```

### Quarterly Tasks

```bash
# Security audit
# Performance review
# Capacity planning
# Update documentation
```

---

## Support & Resources

### Documentation

- Django: https://docs.djangoproject.com/
- Docker: https://docs.docker.com/
- PostgreSQL: https://www.postgresql.org/docs/
- Nginx: https://nginx.org/en/docs/

### Monitoring

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

### Logs

```bash
# Application logs
tail -f logs/gunicorn-access.log
tail -f logs/gunicorn-error.log

# Celery logs
tail -f logs/celery/worker.log

# Nginx logs
tail -f logs/nginx/access.log
tail -f logs/nginx/error.log
```

### Contact

For issues or questions, please open an issue on the project repository.

---

## License

[Your License Here]

---

**Last Updated:** $(date +%Y-%m-%d)
