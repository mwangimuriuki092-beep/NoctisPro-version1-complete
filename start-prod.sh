#!/bin/bash
# Start NoctisPro PACS in Production Mode

set -e

echo "🚀 Starting NoctisPro PACS - Production Mode"
echo "================================================"

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo "❌ ERROR: .env.prod not found!"
    echo "   Create it from .env.prod.example and configure your production settings"
    exit 1
fi

# Check critical environment variables
source .env.prod

if [ "$SECRET_KEY" = "CHANGE_THIS_TO_RANDOM_50_CHAR_STRING" ]; then
    echo "❌ ERROR: SECRET_KEY not configured in .env.prod"
    exit 1
fi

if [ "$POSTGRES_PASSWORD" = "CHANGE_PASSWORD" ]; then
    echo "❌ ERROR: POSTGRES_PASSWORD not configured in .env.prod"
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs backups config/nginx/ssl

# Check SSL certificates
if [ ! -f config/nginx/ssl/fullchain.pem ] || [ ! -f config/nginx/ssl/privkey.pem ]; then
    echo "⚠️  WARNING: SSL certificates not found in config/nginx/ssl/"
    echo "   For HTTPS, you need to place your SSL certificates there"
    echo "   Continue without HTTPS? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        exit 1
    fi
fi

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose -f docker-compose.prod.yml pull

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.prod.yml up --build -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 15

# Run migrations
echo "🔄 Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T django python manage.py migrate --noinput

# Collect static files
echo "📦 Collecting static files..."
docker-compose -f docker-compose.prod.yml exec -T django python manage.py collectstatic --noinput

# Show status
echo ""
echo "✅ NoctisPro PACS is running in production mode!"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "🌐 Access Points:"
echo "   - Web Interface:   https://${DOMAIN_NAME}"
echo "   - DICOM SCP:       ${DOMAIN_NAME}:11112"
echo ""
echo "📝 Logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f [service]"
echo ""
echo "🔒 Security Checklist:"
echo "   ✓ Check firewall rules"
echo "   ✓ Verify SSL certificates"
echo "   ✓ Review database backups"
echo "   ✓ Check log rotation"
echo ""