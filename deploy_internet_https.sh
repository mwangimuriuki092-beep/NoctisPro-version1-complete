#!/bin/bash

# =============================================================================
# NoctisPro PACS - Internet Deployment with HTTPS
# =============================================================================
# This script deploys NoctisPro PACS for public internet access with HTTPS
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN_NAME="${DOMAIN_NAME:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -base64 32)}"
REDIS_PASSWORD="${REDIS_PASSWORD:-$(openssl rand -base64 32)}"
SECRET_KEY="${SECRET_KEY:-$(openssl rand -base64 50)}"

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons."
        error "Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Validate domain name
validate_domain() {
    if [[ -z "$DOMAIN_NAME" ]]; then
        error "Domain name is required for internet deployment."
        error "Please set DOMAIN_NAME environment variable."
        echo
        info "Example: export DOMAIN_NAME=pacs.yourdomain.com"
        exit 1
    fi
    
    if [[ -z "$ADMIN_EMAIL" ]]; then
        error "Admin email is required for SSL certificate generation."
        error "Please set ADMIN_EMAIL environment variable."
        echo
        info "Example: export ADMIN_EMAIL=admin@yourdomain.com"
        exit 1
    fi
    
    log "Domain: $DOMAIN_NAME"
    log "Admin Email: $ADMIN_EMAIL"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker >/dev/null 2>&1; then
        error "Docker is not installed. Please install Docker first."
        info "Install Docker: curl -fsSL https://get.docker.com | sh"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if user is in docker group
    if ! groups | grep -q docker; then
        warn "User is not in docker group. You may need to use sudo for Docker commands."
        info "Add user to docker group: sudo usermod -aG docker \$USER"
        info "Then logout and login again."
    fi
    
    # Check if ports are available
    if sudo netstat -tlnp | grep -q ":80 "; then
        warn "Port 80 is already in use. Please stop the service using it."
    fi
    
    if sudo netstat -tlnp | grep -q ":443 "; then
        warn "Port 443 is already in use. Please stop the service using it."
    fi
    
    log "Prerequisites check complete!"
}

# Setup environment file
setup_environment() {
    log "Setting up environment configuration for internet access..."
    
    # Create .env file
    log "Creating .env file for internet deployment..."
    
    cat > .env << EOF
# NoctisPro PACS Internet Configuration with HTTPS

# Domain Configuration
DOMAIN_NAME=${DOMAIN_NAME}
ADMIN_EMAIL=${ADMIN_EMAIL}

# Network Configuration
USE_HTTPS=true
INTERNET_ACCESS=true
USE_TAILNET=false

# Application Configuration
DEBUG=False
SECRET_KEY=${SECRET_KEY}

# Database Configuration
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}

# Build Configuration
BUILD_TARGET=production

# Security Settings
ALLOWED_HOSTS=${DOMAIN_NAME},www.${DOMAIN_NAME},localhost,127.0.0.1

# AI Configuration
ENABLE_AI_PROCESSING=true

# Logging Level
LOG_LEVEL=INFO

# SSL Configuration
SSL_ENABLED=true
FORCE_HTTPS=true
EOF
    
    log "Environment file created successfully!"
    info "Configuration saved to .env"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates with Let's Encrypt..."
    
    # Start nginx first for initial setup
    log "Starting Nginx for SSL certificate generation..."
    docker-compose up -d nginx
    
    # Wait for nginx to be ready
    sleep 10
    
    # Generate SSL certificates
    log "Generating SSL certificates for $DOMAIN_NAME..."
    docker-compose --profile ssl run --rm certbot
    
    if [[ $? -eq 0 ]]; then
        log "SSL certificates generated successfully!"
    else
        warn "SSL certificate generation failed. You may need to:"
        info "1. Ensure your domain points to this server"
        info "2. Check firewall settings (ports 80 and 443)"
        info "3. Run: docker-compose --profile ssl run --rm certbot"
    fi
}

# Deploy with Docker
deploy_docker() {
    log "Deploying NoctisPro PACS for internet access with HTTPS..."
    
    # Pull latest images
    log "Pulling Docker images..."
    docker-compose pull || docker compose pull
    
    # Build application
    log "Building NoctisPro application..."
    docker-compose build || docker compose build
    
    # Start core services first
    log "Starting database and Redis..."
    docker-compose up -d db redis
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 30
    
    # Start web application
    log "Starting web application..."
    docker-compose up -d web ai_processor dicom_receiver
    
    # Start nginx
    log "Starting Nginx with HTTPS..."
    docker-compose up -d nginx
    
    # Wait for services to be ready
    log "Waiting for all services to start..."
    sleep 30
    
    # Check service health
    log "Checking service health..."
    docker-compose ps || docker compose ps
    
    log "Internet deployment complete!"
}

# Setup SSL certificate renewal
setup_ssl_renewal() {
    log "Setting up SSL certificate auto-renewal..."
    
    # Create renewal script
    cat > ssl-renew.sh << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script
docker-compose --profile ssl run --rm certbot renew
docker-compose restart nginx
EOF
    
    chmod +x ssl-renew.sh
    
    # Add to crontab (optional)
    info "SSL renewal script created: ssl-renew.sh"
    info "To setup automatic renewal, add to crontab:"
    info "0 12 * * * /path/to/ssl-renew.sh"
}

# Show access information
show_access_info() {
    log "Deployment Status:"
    echo
    
    # Check service status
    info "=== Service Status ==="
    docker-compose ps || docker compose ps
    
    echo
    info "=== Internet Access Information ==="
    echo -e "${GREEN}🌐 Website URL: https://$DOMAIN_NAME${NC}"
    echo -e "${GREEN}🌐 Alternative URL: https://www.$DOMAIN_NAME${NC}"
    echo -e "${GREEN}👤 Admin Login: admin / admin123${NC}"
    echo -e "${GREEN}📊 Admin Panel: https://$DOMAIN_NAME/admin/${NC}"
    echo -e "${GREEN}🏥 Worklist: https://$DOMAIN_NAME/worklist/${NC}"
    echo -e "${GREEN}🤖 AI Dashboard: https://$DOMAIN_NAME/ai/${NC}"
    echo -e "${GREEN}🔬 DICOM Viewer: https://$DOMAIN_NAME/dicom-viewer/${NC}"
    echo -e "${GREEN}🏥 DICOM Port: $DOMAIN_NAME:11112${NC}"
    
    echo
    info "=== SSL Certificate Status ==="
    if docker-compose exec -T nginx ls /etc/letsencrypt/live/$DOMAIN_NAME/ >/dev/null 2>&1; then
        echo -e "${GREEN}✅ SSL certificates installed${NC}"
        echo -e "${GREEN}📜 Certificate path: /etc/letsencrypt/live/$DOMAIN_NAME/${NC}"
    else
        echo -e "${YELLOW}⚠️  SSL certificates not found${NC}"
        echo -e "${BLUE}ℹ️  Run: docker-compose --profile ssl run --rm certbot${NC}"
    fi
    
    echo
    info "=== Container Management ==="
    echo "View logs:        docker-compose logs -f"
    echo "Stop services:    docker-compose down"
    echo "Restart:          docker-compose restart"
    echo "Update:           docker-compose pull && docker-compose up -d"
    echo "SSL renewal:      ./ssl-renew.sh"
    echo "SSL status:       docker-compose exec nginx nginx -t"
}

# Setup firewall
setup_firewall() {
    log "Checking firewall configuration..."
    
    if command -v ufw >/dev/null 2>&1; then
        info "UFW firewall detected. Recommended rules:"
        echo "sudo ufw allow 80/tcp   # HTTP (for Let's Encrypt)"
        echo "sudo ufw allow 443/tcp  # HTTPS"
        echo "sudo ufw allow 11112/tcp # DICOM"
        echo "sudo ufw allow 22/tcp   # SSH"
        echo
        warn "Please configure firewall rules manually if needed."
    elif command -v firewall-cmd >/dev/null 2>&1; then
        info "FirewallD detected. Recommended rules:"
        echo "sudo firewall-cmd --permanent --add-port=80/tcp"
        echo "sudo firewall-cmd --permanent --add-port=443/tcp"
        echo "sudo firewall-cmd --permanent --add-port=11112/tcp"
        echo "sudo firewall-cmd --reload"
        echo
        warn "Please configure firewall rules manually if needed."
    else
        warn "No firewall detected. Ensure ports 80, 443, and 11112 are open."
    fi
}

# Main function
main() {
    log "🚀 NoctisPro PACS Internet Deployment with HTTPS"
    echo "=" * 60
    
    check_root
    validate_domain
    check_prerequisites
    setup_environment
    setup_firewall
    deploy_docker
    setup_ssl
    setup_ssl_renewal
    
    echo
    log "=== Deployment Complete! ==="
    show_access_info
    
    echo
    log "🎉 NoctisPro PACS deployed successfully for internet access!"
    log "🌐 Your medical imaging system is now accessible via HTTPS"
    log "🔒 SSL certificates are configured for secure access"
    
    echo
    info "Next Steps:"
    echo "1. Access your system at https://$DOMAIN_NAME"
    echo "2. Login with admin / admin123"
    echo "3. Change the default admin password immediately"
    echo "4. Configure DICOM devices to connect to $DOMAIN_NAME:11112"
    echo "5. Upload DICOM studies to test the system"
    echo "6. Monitor logs with: docker-compose logs -f"
    echo "7. Setup SSL certificate auto-renewal in crontab"
    
    echo
    warn "Security Reminders:"
    echo "• Change default admin password immediately"
    echo "• Configure proper user accounts and permissions"
    echo "• Regularly update the system: docker-compose pull"
    echo "• Monitor access logs for suspicious activity"
    echo "• Keep SSL certificates up to date"
    echo "• Configure firewall rules appropriately"
}

# Run main function
main "$@"