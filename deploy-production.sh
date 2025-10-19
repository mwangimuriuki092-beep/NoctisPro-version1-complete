#!/bin/bash
#
# NoctisPro PACS - Production Deployment Script
# This script automates the deployment of NoctisPro PACS in production
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              NoctisPro PACS Production Setup              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command_exists docker compose; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

print_success "Docker and Docker Compose are installed"

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    
    if [ -f .env.prod ]; then
        cp .env.prod .env
        print_info ".env file created from .env.prod template"
        print_warning "IMPORTANT: Edit .env file and set all required passwords and secrets!"
        echo ""
        echo "Required configuration:"
        echo "  - POSTGRES_PASSWORD"
        echo "  - REDIS_PASSWORD"
        echo "  - SECRET_KEY"
        echo "  - GRAFANA_ADMIN_PASSWORD"
        echo "  - DOMAIN_NAME"
        echo "  - ADMIN_EMAIL"
        echo ""
        read -p "Press Enter after you've configured .env file..."
    else
        print_error ".env.prod template not found!"
        exit 1
    fi
else
    print_success ".env file found"
fi

# Load environment variables
source .env

# Validate critical environment variables
print_info "Validating configuration..."

MISSING_VARS=()

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "CHANGE_ME_TO_STRONG_PASSWORD" ]; then
    MISSING_VARS+=("POSTGRES_PASSWORD")
fi

if [ -z "$REDIS_PASSWORD" ] || [ "$REDIS_PASSWORD" = "CHANGE_ME_TO_STRONG_PASSWORD" ]; then
    MISSING_VARS+=("REDIS_PASSWORD")
fi

if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "CHANGE_ME_TO_RANDOM_SECRET_KEY" ]; then
    MISSING_VARS+=("SECRET_KEY")
fi

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    print_error "The following environment variables need to be configured:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Generate strong passwords with:"
    echo "  openssl rand -base64 32"
    echo ""
    echo "Generate Django secret key with:"
    echo "  python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
    exit 1
fi

print_success "Configuration validated"

# Create required directories
print_info "Creating data directories..."

mkdir -p data/{postgres,redis,media,static}
mkdir -p backups/{postgres,medical}
mkdir -p logs/{nginx,celery,ai,dicom,backup}
mkdir -p ssl

print_success "Directories created"

# Set permissions
print_info "Setting permissions..."
chmod -R 755 data backups logs
print_success "Permissions set"

# Ask user about deployment options
echo ""
echo "Deployment Options:"
echo "  1. Core services only (Django, PostgreSQL, Redis, Nginx, Celery)"
echo "  2. Core + Monitoring (includes Prometheus, Grafana)"
echo "  3. Core + Backups (includes automated backup service)"
echo "  4. Full deployment (Core + Monitoring + Backups + SSL)"
echo ""
read -p "Select deployment option [1-4]: " DEPLOY_OPTION

PROFILES=""
case $DEPLOY_OPTION in
    1)
        print_info "Deploying core services only..."
        ;;
    2)
        print_info "Deploying with monitoring..."
        PROFILES="--profile monitoring"
        ;;
    3)
        print_info "Deploying with backups..."
        PROFILES="--profile backup"
        ;;
    4)
        print_info "Deploying full stack..."
        PROFILES="--profile monitoring --profile backup --profile ssl"
        ;;
    *)
        print_warning "Invalid option. Deploying core services only..."
        ;;
esac

# Pull latest images
print_info "Pulling latest Docker images..."
docker compose -f docker-compose.prod.yaml pull

# Build custom images
print_info "Building custom images..."
docker compose -f docker-compose.prod.yaml build --no-cache

# Start services
print_info "Starting services..."
docker compose -f docker-compose.prod.yaml $PROFILES up -d

# Wait for services to be ready
print_info "Waiting for services to be ready..."
sleep 10

# Check service health
print_info "Checking service health..."
docker compose -f docker-compose.prod.yaml ps

# Create superuser
echo ""
read -p "Would you like to create a Django superuser now? [y/N]: " CREATE_SUPERUSER
if [[ $CREATE_SUPERUSER =~ ^[Yy]$ ]]; then
    docker compose -f docker-compose.prod.yaml exec django python manage.py createsuperuser
fi

# SSL Certificate setup
if [ "$DEPLOY_OPTION" = "4" ]; then
    echo ""
    read -p "Would you like to obtain SSL certificate from Let's Encrypt? [y/N]: " OBTAIN_SSL
    if [[ $OBTAIN_SSL =~ ^[Yy]$ ]]; then
        print_info "Obtaining SSL certificate..."
        
        if [ -z "$DOMAIN_NAME" ] || [ "$DOMAIN_NAME" = "your-domain.com" ]; then
            print_error "Please set DOMAIN_NAME in .env file first!"
        else
            docker compose -f docker-compose.prod.yaml run --rm certbot \
                certonly --webroot \
                --webroot-path=/var/www/certbot \
                --email ${ADMIN_EMAIL:-admin@$DOMAIN_NAME} \
                --agree-tos \
                --no-eff-email \
                -d $DOMAIN_NAME \
                -d www.$DOMAIN_NAME
            
            print_info "Restarting Nginx..."
            docker compose -f docker-compose.prod.yaml restart nginx
            print_success "SSL certificate obtained and configured"
        fi
    fi
fi

# Display access information
echo ""
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           NoctisPro PACS Deployment Complete!             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo "Access Information:"
echo "===================="
echo ""
echo "Main Application:"
echo "  HTTP:  http://${DOMAIN_NAME:-localhost}"
echo "  HTTPS: https://${DOMAIN_NAME:-localhost}"
echo ""
echo "DICOM Service:"
echo "  Host: ${DOMAIN_NAME:-localhost}"
echo "  Port: ${DICOM_PORT:-11112}"
echo "  AE Title: ${DICOM_AE_TITLE:-NOCTISPRO_SCP}"
echo ""

if [ "$DEPLOY_OPTION" = "2" ] || [ "$DEPLOY_OPTION" = "4" ]; then
    echo "Monitoring:"
    echo "  Prometheus: http://localhost:9090"
    echo "  Grafana:    http://localhost:3000"
    echo "    Username: ${GRAFANA_ADMIN_USER:-admin}"
    echo "    Password: (set in .env)"
    echo ""
fi

echo "Useful Commands:"
echo "===================="
echo ""
echo "View logs:"
echo "  docker compose -f docker-compose.prod.yaml logs -f"
echo ""
echo "View service status:"
echo "  docker compose -f docker-compose.prod.yaml ps"
echo ""
echo "Stop services:"
echo "  docker compose -f docker-compose.prod.yaml down"
echo ""
echo "Restart services:"
echo "  docker compose -f docker-compose.prod.yaml restart"
echo ""
echo "Backup database:"
echo "  docker compose -f docker-compose.prod.yaml exec postgres \\"
echo "    pg_dump -U postgres noctis_pro | gzip > backups/postgres/backup-\$(date +%Y%m%d).sql.gz"
echo ""

print_info "For detailed documentation, see PRODUCTION_DEPLOYMENT.md"
print_success "Deployment complete! Your NoctisPro PACS is now running."

exit 0
