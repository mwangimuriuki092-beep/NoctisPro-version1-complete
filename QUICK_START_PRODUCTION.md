# NoctisPro PACS - Production Quick Start Guide

A streamlined guide to get NoctisPro PACS running in production quickly.

## Prerequisites Checklist

- [ ] Ubuntu 22.04 LTS or similar (4+ CPU cores, 8GB+ RAM, 100GB+ storage)
- [ ] Docker 24.0+ installed
- [ ] Docker Compose 2.20+ installed
- [ ] Domain name configured (DNS pointing to server)
- [ ] Firewall configured (ports 80, 443, 11112 open)

## 5-Minute Quick Start

### Step 1: Clone and Configure

```bash
# Clone repository
git clone <repository-url> noctispro
cd noctispro

# Create environment file
cp .env.prod .env
```

### Step 2: Generate Secrets

```bash
# Generate strong passwords
export POSTGRES_PWD=$(openssl rand -base64 32)
export REDIS_PWD=$(openssl rand -base64 32)
export GRAFANA_PWD=$(openssl rand -base64 32)

# Generate Django secret key
export DJANGO_SECRET=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')

# Update .env file
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PWD/" .env
sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PWD/" .env
sed -i "s/GRAFANA_ADMIN_PASSWORD=.*/GRAFANA_ADMIN_PASSWORD=$GRAFANA_PWD/" .env
sed -i "s|SECRET_KEY=.*|SECRET_KEY=$DJANGO_SECRET|" .env

# Set your domain
read -p "Enter your domain name: " DOMAIN
sed -i "s/DOMAIN_NAME=.*/DOMAIN_NAME=$DOMAIN/" .env
sed -i "s/ALLOWED_HOSTS=.*/ALLOWED_HOSTS=$DOMAIN,www.$DOMAIN,localhost,127.0.0.1/" .env

# Set admin email
read -p "Enter admin email: " EMAIL
sed -i "s/ADMIN_EMAIL=.*/ADMIN_EMAIL=$EMAIL/" .env
```

### Step 3: Create Directories

```bash
# Create data and log directories
mkdir -p data/{postgres,redis,media,static}
mkdir -p backups/{postgres,medical}
mkdir -p logs/{nginx,celery,ai,dicom,backup}
mkdir -p ssl

# Set permissions
chmod -R 755 data backups logs
```

### Step 4: Deploy

```bash
# Option A: Using automated script (recommended)
./deploy-production.sh

# Option B: Manual deployment
docker compose -f docker-compose.prod.yaml up -d

# Option C: With monitoring
docker compose -f docker-compose.prod.yaml --profile monitoring up -d

# Option D: Full stack (monitoring + backups + SSL)
docker compose -f docker-compose.prod.yaml --profile monitoring --profile backup --profile ssl up -d
```

### Step 5: Create Admin User

```bash
# Create superuser
docker compose -f docker-compose.prod.yaml exec django python manage.py createsuperuser

# Follow prompts to create admin account
```

### Step 6: Setup SSL (Optional but Recommended)

```bash
# For Let's Encrypt SSL certificate
docker compose -f docker-compose.prod.yaml run --rm certbot \
  certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@yourdomain.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com \
  -d www.yourdomain.com

# Restart Nginx
docker compose -f docker-compose.prod.yaml restart nginx
```

## Access Your System

- **Main Application:** https://yourdomain.com
- **Admin Panel:** https://yourdomain.com/admin
- **DICOM Service:** yourdomain.com:11112 (AE Title: NOCTISPRO_SCP)
- **Monitoring (if enabled):**
  - Prometheus: http://localhost:9090
  - Grafana: http://localhost:3000

## Verify Deployment

```bash
# Check all services are running
docker compose -f docker-compose.prod.yaml ps

# Check logs for errors
docker compose -f docker-compose.prod.yaml logs --tail=50

# Test health endpoint
curl -k https://yourdomain.com/api/health/

# Test DICOM connectivity
telnet yourdomain.com 11112
```

## Common Commands

```bash
# View logs
docker compose -f docker-compose.prod.yaml logs -f [service_name]

# Restart service
docker compose -f docker-compose.prod.yaml restart [service_name]

# Stop all services
docker compose -f docker-compose.prod.yaml down

# Update and restart
docker compose -f docker-compose.prod.yaml pull
docker compose -f docker-compose.prod.yaml up -d

# Backup database
docker compose -f docker-compose.prod.yaml exec postgres \
  pg_dump -U postgres noctis_pro | gzip > backups/postgres/manual-$(date +%Y%m%d).sql.gz

# Restore database
gunzip < backups/postgres/backup.sql.gz | \
  docker compose -f docker-compose.prod.yaml exec -T postgres \
  psql -U postgres noctis_pro
```

## Deployment Profiles

### Core Services (Default)
```bash
docker compose -f docker-compose.prod.yaml up -d
```
Includes: PostgreSQL, Redis, Django, Nginx, Celery, DICOM SCP, AI Worker

### With Monitoring
```bash
docker compose -f docker-compose.prod.yaml --profile monitoring up -d
```
Adds: Prometheus, Grafana, Exporters

### With Backups
```bash
docker compose -f docker-compose.prod.yaml --profile backup up -d
```
Adds: Automated backup service

### With SSL Management
```bash
docker compose -f docker-compose.prod.yaml --profile ssl up -d
```
Adds: Certbot for SSL certificates

### Full Stack
```bash
docker compose -f docker-compose.prod.yaml \
  --profile monitoring \
  --profile backup \
  --profile ssl \
  up -d
```
Everything enabled

## Resource Requirements by Deployment Type

| Deployment | CPU Cores | RAM | Storage |
|-----------|-----------|-----|---------|
| Core Only | 4 | 8GB | 100GB |
| + Monitoring | 6 | 12GB | 150GB |
| Full Stack | 8 | 16GB | 200GB |

## Security Checklist

- [ ] Strong passwords set in `.env`
- [ ] `.env` file not committed to git
- [ ] Firewall configured (UFW/iptables)
- [ ] SSL/TLS enabled
- [ ] Regular backups configured
- [ ] Monitoring alerts configured
- [ ] System updates scheduled

## Maintenance

### Daily
```bash
# Check service health
docker compose -f docker-compose.prod.yaml ps

# Check disk space
df -h
```

### Weekly
```bash
# Verify backups exist
ls -lh backups/postgres/

# Check for updates
docker compose -f docker-compose.prod.yaml pull
```

### Monthly
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker compose -f docker-compose.prod.yaml pull
docker compose -f docker-compose.prod.yaml up -d

# Review logs for anomalies
docker compose -f docker-compose.prod.yaml logs --since 24h | grep ERROR
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker compose -f docker-compose.prod.yaml logs [service_name]

# Check resource usage
docker stats

# Verify configuration
docker compose -f docker-compose.prod.yaml config
```

### Database Connection Errors
```bash
# Test database connection
docker compose -f docker-compose.prod.yaml exec postgres \
  psql -U postgres -d noctis_pro -c "SELECT 1;"

# Check database logs
docker compose -f docker-compose.prod.yaml logs postgres
```

### Out of Disk Space
```bash
# Check usage
du -sh data/* backups/*

# Clean old Docker resources
docker system prune -a --volumes

# Implement retention policies
# Edit BACKUP_RETENTION_DAYS in .env
```

### 502 Bad Gateway
```bash
# Check Django is running
docker compose -f docker-compose.prod.yaml ps django

# Test Django directly
docker compose -f docker-compose.prod.yaml exec django \
  curl http://localhost:8000/api/health/

# Check Nginx logs
docker compose -f docker-compose.prod.yaml logs nginx
```

## Performance Tuning

### For High Load (adjust in .env)
```bash
GUNICORN_WORKERS=9              # (2 × CPU_cores) + 1
GUNICORN_THREADS=4              # 2-4 threads per worker
CELERY_CONCURRENCY=8            # Match CPU cores
```

### For Limited Resources
```bash
GUNICORN_WORKERS=3
GUNICORN_THREADS=2
CELERY_CONCURRENCY=2
```

## Getting Help

1. Check logs: `docker compose -f docker-compose.prod.yaml logs`
2. Review documentation: See `PRODUCTION_DEPLOYMENT.md`
3. Check GitHub issues: [Project Issues]
4. Contact support: [Support Email/Link]

## Next Steps

1. ✅ Configure DICOM modalities in admin panel
2. ✅ Import Grafana dashboards (IDs: 1860, 9628, 11835)
3. ✅ Configure backup retention policies
4. ✅ Set up alerting (email/SMS/Slack)
5. ✅ Test disaster recovery procedure
6. ✅ Document your specific configuration
7. ✅ Train users on the system

## Additional Resources

- Full Documentation: `PRODUCTION_DEPLOYMENT.md`
- Docker Compose Reference: `docker-compose.prod.yaml`
- Environment Variables: `.env.prod` (template)
- Monitoring Guide: See monitoring section in main docs

---

**Need more details?** See the comprehensive `PRODUCTION_DEPLOYMENT.md` guide.

**Questions?** Open an issue on GitHub or contact support.
