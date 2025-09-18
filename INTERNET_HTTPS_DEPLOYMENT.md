# NoctisPro PACS - Internet Deployment with HTTPS

This guide shows how to deploy NoctisPro PACS for public internet access with HTTPS encryption using Let's Encrypt SSL certificates.

## Prerequisites

- **Domain Name**: You must own a domain name that points to your server
- **Public Server**: Server with a public IP address accessible from the internet
- **Docker Engine 20.10+**
- **Docker Compose v2.0+**
- **Open Ports**: 80 (HTTP), 443 (HTTPS), 11112 (DICOM)
- **Email Address**: For SSL certificate registration

## Quick Start

### 1. Domain Setup

Before deployment, ensure:
- Your domain (e.g., `pacs.yourdomain.com`) points to your server's public IP
- DNS propagation is complete (check with `nslookup pacs.yourdomain.com`)
- Ports 80 and 443 are open in your firewall

### 2. Environment Configuration

```bash
# Set required environment variables
export DOMAIN_NAME="pacs.yourdomain.com"
export ADMIN_EMAIL="admin@yourdomain.com"

# Optional: Set custom passwords (recommended)
export POSTGRES_PASSWORD="your_secure_db_password"
export REDIS_PASSWORD="your_secure_redis_password"
```

### 3. Deploy with HTTPS

```bash
# Clone repository
git clone <repository-url>
cd noctispro-pacs

# Deploy with internet access and HTTPS
./deploy_internet_https.sh
```

## Manual Deployment Steps

### 1. Install Docker (if needed)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again, then verify
docker --version
docker-compose --version
```

### 2. Configure Environment

```bash
# Create environment file
cat > .env << EOF
# Domain Configuration
DOMAIN_NAME=pacs.yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Network Configuration
USE_HTTPS=true
INTERNET_ACCESS=true
USE_TAILNET=false

# Application Configuration
DEBUG=False
SECRET_KEY=$(openssl rand -base64 50)

# Database Configuration
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

# Security Settings
ALLOWED_HOSTS=pacs.yourdomain.com,www.pacs.yourdomain.com,localhost,127.0.0.1
EOF
```

### 3. Deploy Services

```bash
# Start core services
docker-compose up -d db redis

# Start web application
docker-compose up -d web ai_processor dicom_receiver

# Start Nginx
docker-compose up -d nginx

# Generate SSL certificates
docker-compose --profile ssl run --rm certbot
```

## SSL Certificate Management

### Initial Certificate Generation

```bash
# Generate certificates for your domain
docker-compose --profile ssl run --rm certbot
```

### Certificate Renewal

```bash
# Manual renewal
./ssl-renew.sh

# Setup automatic renewal (recommended)
crontab -e
# Add this line to renew certificates twice daily:
0 12 * * * /path/to/noctispro-pacs/ssl-renew.sh
```

### Certificate Status Check

```bash
# Check certificate validity
docker-compose exec nginx openssl x509 -in /etc/letsencrypt/live/$DOMAIN_NAME/cert.pem -text -noout

# Check Nginx configuration
docker-compose exec nginx nginx -t
```

## Network Architecture

### Internet Access Configuration

1. **Public Network**: Services accessible from internet via HTTPS
2. **Internal Network**: Database and Redis isolated from internet
3. **HTTPS Termination**: Nginx handles SSL/TLS encryption
4. **Load Balancing**: Nginx proxies requests to Django application

### Port Configuration

- **Port 80**: HTTP (redirects to HTTPS, Let's Encrypt challenges)
- **Port 443**: HTTPS (main application access)
- **Port 11112**: DICOM receiver (public access for medical devices)
- **Ports 5432, 6379**: Database and Redis (internal only)

## Security Features

### HTTPS Security

- **TLS 1.2/1.3**: Modern encryption protocols
- **HSTS**: HTTP Strict Transport Security enabled
- **Perfect Forward Secrecy**: ECDHE cipher suites
- **OCSP Stapling**: Certificate validation optimization

### Application Security

- **CSRF Protection**: Cross-site request forgery prevention
- **XSS Protection**: Cross-site scripting prevention
- **Content Security Policy**: Strict content loading policies
- **Rate Limiting**: DDoS and brute force protection
- **Secure Headers**: Comprehensive security headers

### Network Security

- **Internal Networks**: Database isolated from internet
- **Firewall Ready**: Compatible with UFW, FirewallD
- **Authentication Required**: All endpoints require login
- **Session Security**: Secure session management

## Access Information

After successful deployment:

- **Main Application**: `https://yourdomain.com`
- **Admin Panel**: `https://yourdomain.com/admin/`
- **DICOM Receiver**: `yourdomain.com:11112`
- **Default Login**: `admin` / `admin123` (change immediately!)

## Management Commands

### Container Management

```bash
# View all services
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Restart services
docker-compose restart [service_name]

# Stop all services
docker-compose down

# Update and restart
docker-compose pull && docker-compose up -d
```

### Application Management

```bash
# Django management commands
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py collectstatic --noinput
docker-compose exec web python manage.py createsuperuser

# Database backup
docker-compose exec db pg_dump -U noctis_user noctis_pro > backup.sql

# View application logs
docker-compose logs -f web ai_processor
```

### SSL Management

```bash
# Renew certificates
./ssl-renew.sh

# Check certificate expiration
docker-compose exec nginx openssl x509 -in /etc/letsencrypt/live/$DOMAIN_NAME/cert.pem -enddate -noout

# Test SSL configuration
docker-compose exec nginx nginx -t
```

## Firewall Configuration

### UFW (Ubuntu)

```bash
# Allow required ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 11112/tcp # DICOM

# Enable firewall
sudo ufw enable
```

### FirewallD (CentOS/RHEL)

```bash
# Allow required ports
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=11112/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

### Common Issues

1. **SSL Certificate Generation Failed**
   ```bash
   # Check domain DNS resolution
   nslookup yourdomain.com
   
   # Check if port 80 is accessible
   curl -I http://yourdomain.com/.well-known/acme-challenge/test
   
   # Retry certificate generation
   docker-compose --profile ssl run --rm certbot
   ```

2. **Site Not Accessible**
   ```bash
   # Check Nginx status
   docker-compose ps nginx
   
   # Check Nginx logs
   docker-compose logs nginx
   
   # Test Nginx configuration
   docker-compose exec nginx nginx -t
   ```

3. **Database Connection Issues**
   ```bash
   # Check database status
   docker-compose ps db
   
   # Test database connection
   docker-compose exec web python manage.py dbshell
   ```

### Performance Optimization

1. **Scale Workers**
   ```bash
   # Edit docker-compose.yml
   # Change: --workers 4 to --workers 8
   docker-compose up -d web
   ```

2. **Enable Caching**
   ```bash
   # Redis is already configured for session and cache storage
   # Monitor Redis usage
   docker-compose exec redis redis-cli info memory
   ```

3. **Monitor Resources**
   ```bash
   # Check container resource usage
   docker stats
   
   # Check disk usage
   docker system df
   ```

## Backup and Recovery

### Automated Backup Script

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p backups

# Database backup
docker-compose exec -T db pg_dump -U noctis_user noctis_pro > backups/db_backup_$DATE.sql

# Media files backup
docker run --rm -v noctispro_media_files:/data -v $(pwd)/backups:/backup alpine tar czf /backup/media_backup_$DATE.tar.gz /data

# SSL certificates backup
docker run --rm -v noctispro_letsencrypt_certs:/data -v $(pwd)/backups:/backup alpine tar czf /backup/ssl_backup_$DATE.tar.gz /data

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh
```

### Recovery Process

```bash
# Restore database
docker-compose exec -T db psql -U noctis_user noctis_pro < backups/db_backup_YYYYMMDD_HHMMSS.sql

# Restore media files
docker run --rm -v noctispro_media_files:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/media_backup_YYYYMMDD_HHMMSS.tar.gz -C /

# Restore SSL certificates
docker run --rm -v noctispro_letsencrypt_certs:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/ssl_backup_YYYYMMDD_HHMMSS.tar.gz -C /
```

## Production Best Practices

### Security Checklist

- [ ] Change default admin password
- [ ] Configure proper user accounts and roles
- [ ] Set up SSL certificate auto-renewal
- [ ] Configure firewall rules
- [ ] Enable fail2ban for SSH protection
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Backup encryption keys

### Monitoring Setup

```bash
# Setup log rotation
sudo logrotate -d /etc/logrotate.d/docker-containers

# Monitor certificate expiration
echo "0 6 * * * certbot certificates" | crontab -

# Setup system monitoring
docker run -d --name watchtower -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower
```

### Maintenance Schedule

- **Daily**: Check service health, review access logs
- **Weekly**: Update container images, check SSL certificate status
- **Monthly**: Full system backup, security audit
- **Quarterly**: Penetration testing, dependency updates

## Advantages of Internet HTTPS Deployment

1. **Global Access**: Accessible from anywhere with internet
2. **Medical Device Integration**: DICOM devices can connect directly
3. **Secure Communication**: End-to-end HTTPS encryption
4. **Professional Setup**: Production-ready configuration
5. **Compliance Ready**: HIPAA/GDPR compatible security
6. **Scalable**: Can handle multiple concurrent users
7. **Maintainable**: Easy updates and monitoring

Your NoctisPro PACS system is now running securely on the internet with HTTPS encryption, ready for professional medical imaging operations!