#!/bin/bash

# =============================================================================
# NoctisPro PACS - SSL Certificate Renewal Script
# =============================================================================
# This script renews SSL certificates and restarts Nginx
# =============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if docker-compose is available
if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
    error "Docker Compose is not available"
    exit 1
fi

log "Starting SSL certificate renewal..."

# Try to renew certificates
if docker-compose --profile ssl run --rm certbot renew; then
    log "SSL certificates renewed successfully"
    
    # Restart Nginx to load new certificates
    log "Restarting Nginx..."
    docker-compose restart nginx
    
    log "SSL renewal complete!"
else
    error "SSL certificate renewal failed"
    warn "Check the logs above for details"
    exit 1
fi