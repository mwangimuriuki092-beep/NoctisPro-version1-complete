#!/bin/bash

# =============================================================================
# NoctisPro PACS - Docker Deployment with Tailscale
# =============================================================================
# This script deploys NoctisPro PACS using Docker with Tailscale networking
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TAILNET_HOSTNAME="${TAILNET_HOSTNAME:-noctispro}"
TAILSCALE_AUTH_KEY="${TAILSCALE_AUTH_KEY:-}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -base64 32)}"
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
    
    log "Prerequisites check complete!"
}

# Setup environment file
setup_environment() {
    log "Setting up environment configuration..."
    
    # Create .env file if it doesn't exist
    if [[ ! -f .env ]]; then
        log "Creating .env file..."
        
        cat > .env << EOF
# NoctisPro PACS Docker Configuration with Tailscale - Public Network Access

# Tailscale Configuration for Public Access
TAILSCALE_AUTH_KEY=${TAILSCALE_AUTH_KEY}
TAILNET_HOSTNAME=${TAILNET_HOSTNAME}

# Application Configuration
DEBUG=False
SECRET_KEY=${SECRET_KEY}

# Database Configuration
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Build Configuration
BUILD_TARGET=production

# Network Configuration - Public Access through Tailnet
NETWORK_MODE=public
USE_TAILNET=true

# Security Settings - Public Network Compatible
ALLOWED_HOSTS=${TAILNET_HOSTNAME},*.ts.net,100.*,*

# AI Configuration
ENABLE_AI_PROCESSING=true

# Logging Level
LOG_LEVEL=INFO

# Public Access Configuration
PUBLIC_NETWORK_ACCESS=true
TAILNET_PUBLIC_MODE=true
EOF
        
        log "Environment file created successfully!"
        info "You can edit .env to customize settings"
    else
        info "Using existing .env file"
    fi
}

# Deploy with Docker
deploy_docker() {
    log "Deploying NoctisPro PACS with Docker and Tailscale..."
    
    # Pull latest images
    log "Pulling Docker images..."
    docker-compose pull || docker compose pull
    
    # Build application
    log "Building NoctisPro application..."
    docker-compose build || docker compose build
    
    # Start services
    log "Starting services..."
    docker-compose up -d || docker compose up -d
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    # Check service health
    log "Checking service health..."
    docker-compose ps || docker compose ps
    
    log "Docker deployment complete!"
}

# Show access information
show_access_info() {
    log "Deployment Status:"
    echo
    
    # Check Tailscale status
    info "=== Tailscale Status ==="
    docker exec noctis_tailscale tailscale status 2>/dev/null || warn "Tailscale container not accessible"
    
    # Get Tailscale IP
    TAILSCALE_IP=$(docker exec noctis_tailscale tailscale ip -4 2>/dev/null || echo "")
    
    echo
    info "=== Public Network Access Information ==="
    if [[ -n "$TAILSCALE_IP" ]]; then
        echo -e "${GREEN}🌐 Public Application URL: http://$TAILSCALE_IP:8080${NC}"
        echo -e "${GREEN}🌐 Public Hostname URL: http://$TAILNET_HOSTNAME:8080${NC}"
        echo -e "${GREEN}👤 Admin Login: admin / admin123${NC}"
        echo -e "${GREEN}📊 Public Admin Panel: http://$TAILSCALE_IP:8080/admin/${NC}"
        echo -e "${GREEN}🏥 Public Worklist: http://$TAILSCALE_IP:8080/worklist/${NC}"
        echo -e "${GREEN}🤖 Public AI Dashboard: http://$TAILSCALE_IP:8080/ai/${NC}"
        echo -e "${GREEN}🔬 Public DICOM Viewer: http://$TAILSCALE_IP:8080/dicom-viewer/${NC}"
        echo -e "${GREEN}🗄️  Public Database: $TAILSCALE_IP:5432${NC}"
        echo -e "${GREEN}🔄 Public Redis: $TAILSCALE_IP:6379${NC}"
        echo -e "${GREEN}🏥 Public DICOM Port: $TAILSCALE_IP:11112${NC}"
    else
        echo -e "${YELLOW}⚠️  Tailscale IP not available yet. Services may still be starting.${NC}"
        echo -e "${BLUE}ℹ️  Check status: docker exec noctis_tailscale tailscale status${NC}"
        echo -e "${BLUE}ℹ️  Get IP: docker exec noctis_tailscale tailscale ip -4${NC}"
    fi
    
    echo
    info "=== Container Management ==="
    echo "View logs:        docker-compose logs -f"
    echo "Stop services:    docker-compose down"
    echo "Restart:          docker-compose restart"
    echo "Update:           docker-compose pull && docker-compose up -d"
    echo "Tailscale status: docker exec noctis_tailscale tailscale status"
    echo "Tailscale IP:     docker exec noctis_tailscale tailscale ip -4"
}

# Main function
main() {
    log "🚀 NoctisPro PACS Docker Deployment with Tailscale"
    echo "=" * 60
    
    check_root
    check_prerequisites
    setup_environment
    deploy_docker
    
    echo
    log "=== Deployment Complete! ==="
    show_access_info
    
    echo
    log "🎉 NoctisPro PACS deployed successfully with Docker and Tailscale!"
    log "🔗 Your medical imaging system is now publicly accessible via your Tailnet"
    log "🌐 All services are now available on the public network through Tailscale"
    
    echo
    info "Next Steps:"
    echo "1. Wait for Tailscale authentication if needed"
    echo "2. Access the application via the public URLs shown above"
    echo "3. Login with admin / admin123"
    echo "4. Upload DICOM studies to test AI analysis"
    echo "5. Check AI dashboard at /ai/"
    echo "6. Connect external DICOM devices to public DICOM port"
    echo "7. Access database and Redis from external applications if needed"
    
    if [[ -z "$TAILSCALE_AUTH_KEY" ]]; then
        echo
        warn "⚠️  No Tailscale auth key provided. You may need to authenticate manually:"
        info "Run: docker exec -it noctis_tailscale tailscale up --hostname=$TAILNET_HOSTNAME"
    fi
}

# Run main function
main "$@"