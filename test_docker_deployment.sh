#!/bin/bash

# =============================================================================
# NoctisPro PACS - Docker Deployment Test Script
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[TEST] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

log "🧪 Testing NoctisPro Docker Deployment with Tailscale"
echo "=" * 60

# Check if .env exists
if [[ ! -f .env ]]; then
    warn ".env file not found. Creating test configuration..."
    cp .env.docker .env
    
    # Generate test values
    TEST_SECRET=$(openssl rand -base64 32)
    TEST_PASSWORD=$(openssl rand -base64 16)
    
    sed -i "s/your_secret_key_here_change_in_production/$TEST_SECRET/g" .env
    sed -i "s/noctis_secure_password_change_this/$TEST_PASSWORD/g" .env
    
    log "Test .env file created"
fi

# Check Docker
if ! command -v docker >/dev/null 2>&1; then
    error "Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
    error "Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

log "Docker prerequisites OK"

# Build and start services
log "Building and starting services..."
docker-compose down 2>/dev/null || true
docker-compose build
docker-compose up -d

# Wait for services
log "Waiting for services to start..."
sleep 45

# Check service health
log "Checking service health..."

services=("tailscale" "db" "redis" "web" "ai_processor")
for service in "${services[@]}"; do
    if docker-compose ps | grep -q "$service.*Up"; then
        log "✅ $service: Running"
    else
        error "❌ $service: Not running"
        docker-compose logs "$service"
    fi
done

# Test Tailscale connectivity
log "Testing Tailscale connectivity..."
if docker exec noctis_tailscale tailscale status >/dev/null 2>&1; then
    TAILSCALE_IP=$(docker exec noctis_tailscale tailscale ip -4 2>/dev/null || echo "")
    if [[ -n "$TAILSCALE_IP" ]]; then
        log "✅ Tailscale connected: $TAILSCALE_IP"
    else
        warn "⚠️ Tailscale connected but IP not available yet"
    fi
else
    warn "⚠️ Tailscale not authenticated. Manual authentication may be required:"
    echo "   docker exec -it noctis_tailscale tailscale up --hostname=noctispro"
fi

# Test web application
log "Testing web application..."
if docker exec noctis_web curl -f http://localhost:8080/health/ >/dev/null 2>&1; then
    log "✅ Web application: Healthy"
else
    warn "⚠️ Web application health check failed"
    docker-compose logs web | tail -20
fi

# Test database
log "Testing database..."
if docker exec noctis_db pg_isready -U noctis_user -d noctis_pro >/dev/null 2>&1; then
    log "✅ Database: Ready"
else
    error "❌ Database: Not ready"
fi

# Test AI processor
log "Testing AI processor..."
if docker-compose ps | grep -q "ai_processor.*Up"; then
    log "✅ AI Processor: Running"
else
    warn "⚠️ AI Processor: Not running properly"
fi

# Summary
echo
log "🎯 Deployment Test Summary:"
echo "=" * 40

if [[ -n "$TAILSCALE_IP" ]]; then
    echo -e "${GREEN}🌐 Access URL: http://$TAILSCALE_IP:8080${NC}"
    echo -e "${GREEN}🌐 Hostname: http://noctispro:8080${NC}"
else
    echo -e "${YELLOW}🌐 Access: Check Tailscale authentication${NC}"
fi

echo -e "${GREEN}👤 Admin Login: admin / admin123${NC}"
echo -e "${GREEN}📊 Endpoints:${NC}"
echo "   • Worklist: /worklist/"
echo "   • DICOM Viewer: /dicom-viewer/"
echo "   • AI Dashboard: /ai/"
echo "   • Admin Panel: /admin/"

echo
log "🔧 Management Commands:"
echo "   • View logs: docker-compose logs -f"
echo "   • Stop: docker-compose down"
echo "   • Restart: docker-compose restart"
echo "   • Tailscale status: docker exec noctis_tailscale tailscale status"

if [[ -z "$TAILSCALE_AUTH_KEY" ]]; then
    echo
    warn "💡 To avoid manual authentication, set TAILSCALE_AUTH_KEY in .env"
    echo "   Get your auth key from: https://login.tailscale.com/admin/settings/keys"
fi

log "🎉 Docker deployment test complete!"