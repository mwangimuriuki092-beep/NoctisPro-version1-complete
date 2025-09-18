# NoctisPro PACS - Docker Deployment with Tailscale

This guide shows how to deploy NoctisPro PACS using Docker containers with Tailscale for secure networking.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- Tailscale account
- Ubuntu/Debian/RHEL/CentOS (or any Docker-supported OS)

## Quick Start

### 1. Install Docker (if not already installed)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again, then verify
docker --version
docker-compose --version
```

### 2. Deploy NoctisPro with Tailscale

```bash
# Clone repository
git clone <repository-url>
cd noctispro-pacs

# Quick deployment
./deploy_docker_tailscale.sh
```

### 3. Manual Configuration (Alternative)

```bash
# Copy environment template
cp .env.docker .env

# Edit .env file with your settings
nano .env
```

Required settings in `.env`:
```bash
# Tailscale Configuration
TAILSCALE_AUTH_KEY=tskey-auth-xxxxx-your-auth-key
TAILNET_HOSTNAME=noctispro

# Database Password
POSTGRES_PASSWORD=your_secure_password

# Application Secret
SECRET_KEY=your_django_secret_key
```

### 4. Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Container Architecture

### Services Overview

1. **`tailscale`** - Tailscale networking container
   - Provides secure Tailnet access
   - Handles authentication and networking
   - Shares network with web application

2. **`web`** - Django application container
   - Main NoctisPro PACS application
   - DICOM viewer and worklist
   - Accessible via Tailnet

3. **`ai_processor`** - AI analysis container
   - Background AI processing
   - Automatic DICOM analysis
   - Report generation

4. **`db`** - PostgreSQL database
   - Stores all application data
   - Only accessible internally

5. **`redis`** - Redis cache/message broker
   - Session storage
   - Background task queue

### Network Configuration

- **Tailscale Container**: Uses `host` network mode for VPN functionality
- **Web Application**: Shares network with Tailscale container
- **Database/Redis**: Internal network only (127.0.0.1)
- **External Access**: Only via Tailnet (secure by default)

## Access Information

After deployment, access your system via:

- **Tailnet IP**: `http://[tailscale-ip]:8080`
- **Hostname**: `http://noctispro:8080` (if MagicDNS enabled)
- **Admin Login**: `admin` / `admin123`

Get your Tailscale IP:
```bash
docker exec noctis_tailscale tailscale ip -4
```

## Management Commands

### Container Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart services
docker-compose restart

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f web
docker-compose logs -f ai_processor
docker-compose logs -f tailscale

# Check container status
docker-compose ps

# Update containers
docker-compose pull
docker-compose up -d
```

### Tailscale Management

```bash
# Check Tailscale status
docker exec noctis_tailscale tailscale status

# Get Tailscale IP
docker exec noctis_tailscale tailscale ip -4

# Reconnect Tailscale (if needed)
docker exec -it noctis_tailscale tailscale up --hostname=noctispro

# View Tailscale logs
docker-compose logs tailscale
```

### Application Management

```bash
# Database migrations
docker exec noctis_web python manage.py migrate

# Collect static files
docker exec noctis_web python manage.py collectstatic --noinput

# Create admin user
docker exec -it noctis_web python manage.py createsuperuser

# Setup AI models
docker exec noctis_web python manage.py setup_working_ai_models

# Django shell
docker exec -it noctis_web python manage.py shell

# Check AI analysis status
docker exec noctis_web python manage.py process_ai_analyses
```

### Database Management

```bash
# Database backup
docker exec noctis_db pg_dump -U noctis_user noctis_pro > backup.sql

# Database restore
docker exec -i noctis_db psql -U noctis_user noctis_pro < backup.sql

# Access database shell
docker exec -it noctis_db psql -U noctis_user -d noctis_pro
```

## Configuration

### Environment Variables

Key environment variables in `.env`:

```bash
# Tailscale
TAILSCALE_AUTH_KEY=tskey-auth-xxxxx    # Required for auto-auth
TAILNET_HOSTNAME=noctispro             # Hostname in Tailnet

# Security
SECRET_KEY=your_django_secret_key      # Django secret key
POSTGRES_PASSWORD=secure_password      # Database password

# Application
DEBUG=False                            # Production mode
BUILD_TARGET=production                # Docker build target

# Optional
CUSTOM_DOMAIN=pacs.yourdomain.com      # Custom domain if using
```

### Tailscale Authentication

#### Option 1: Auth Key (Recommended)
```bash
# Get auth key from Tailscale admin console
# Add to .env file:
TAILSCALE_AUTH_KEY=tskey-auth-xxxxx-your-key
```

#### Option 2: Manual Authentication
```bash
# Start containers without auth key
docker-compose up -d

# Authenticate manually
docker exec -it noctis_tailscale tailscale up --hostname=noctispro

# Follow the authentication URL provided
```

## Security Features

### Tailnet Security Benefits

1. **Zero Trust Network**: Only authorized devices can access
2. **End-to-End Encryption**: All traffic encrypted automatically
3. **No Public Exposure**: No ports exposed to internet
4. **Identity-Based Access**: User-based authentication
5. **Audit Logging**: All access logged in Tailscale admin

### Container Security

1. **Isolated Networks**: Services communicate only as needed
2. **Non-Root Containers**: Applications run as non-privileged users
3. **Read-Only Filesystems**: Where applicable
4. **Resource Limits**: CPU and memory limits enforced
5. **Health Checks**: Automatic service monitoring

## Troubleshooting

### Common Issues

1. **Tailscale Not Connecting**
   ```bash
   # Check Tailscale container logs
   docker-compose logs tailscale
   
   # Restart Tailscale container
   docker-compose restart tailscale
   
   # Manual authentication
   docker exec -it noctis_tailscale tailscale up --hostname=noctispro
   ```

2. **Web Application Not Accessible**
   ```bash
   # Check web container health
   docker-compose ps
   
   # View web container logs
   docker-compose logs web
   
   # Check if services are ready
   docker exec noctis_web curl -f http://localhost:8080/health/
   ```

3. **Database Connection Issues**
   ```bash
   # Check database container
   docker-compose logs db
   
   # Test database connection
   docker exec noctis_db pg_isready -U noctis_user -d noctis_pro
   ```

4. **AI Analysis Not Working**
   ```bash
   # Check AI processor logs
   docker-compose logs ai_processor
   
   # Restart AI processor
   docker-compose restart ai_processor
   
   # Setup AI models manually
   docker exec noctis_web python manage.py setup_working_ai_models
   ```

### Performance Tuning

1. **Scale Workers**
   ```bash
   # Edit docker-compose.yml
   # Change: --workers 4 to --workers 8
   docker-compose up -d
   ```

2. **Resource Limits**
   ```yaml
   # Add to service in docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 2G
         cpus: '1.0'
   ```

3. **Volume Optimization**
   ```bash
   # Use named volumes for better performance
   # Already configured in docker-compose.yml
   ```

## Backup and Recovery

### Automated Backup

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec noctis_db pg_dump -U noctis_user noctis_pro > backups/db_backup_$DATE.sql
docker run --rm -v noctispro_media_files:/data -v $(pwd)/backups:/backup alpine tar czf /backup/media_backup_$DATE.tar.gz /data
echo "Backup completed: $DATE"
EOF

chmod +x backup.sh
./backup.sh
```

### Recovery

```bash
# Restore database
docker exec -i noctis_db psql -U noctis_user noctis_pro < backups/db_backup_YYYYMMDD_HHMMSS.sql

# Restore media files
docker run --rm -v noctispro_media_files:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/media_backup_YYYYMMDD_HHMMSS.tar.gz -C /
```

## Production Deployment

### Recommended Configuration

1. **Use auth key for unattended deployment**
2. **Set strong passwords**
3. **Enable automatic backups**
4. **Monitor container health**
5. **Use dedicated server/VM**

### Example Production `.env`:

```bash
# Production Tailscale Configuration
TAILSCALE_AUTH_KEY=tskey-auth-xxxxx-production-key
TAILNET_HOSTNAME=pacs-prod

# Security
DEBUG=False
SECRET_KEY=very_long_random_secret_key_for_production
POSTGRES_PASSWORD=very_secure_database_password

# Performance
BUILD_TARGET=production
LOG_LEVEL=INFO

# Domain (if using custom domain)
CUSTOM_DOMAIN=pacs.yourcompany.com
```

## Advantages of Docker + Tailscale

1. **Easy Deployment**: Single command deployment
2. **Portable**: Runs anywhere Docker is supported
3. **Secure**: Private network access only
4. **Scalable**: Easy to scale individual services
5. **Maintainable**: Container updates and rollbacks
6. **Isolated**: Services isolated from host system
7. **Professional**: Production-ready configuration

Your NoctisPro PACS system is now running securely in Docker containers, accessible only via your private Tailnet!