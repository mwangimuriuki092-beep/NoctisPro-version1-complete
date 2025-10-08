#!/bin/bash
# Start NoctisPro PACS in Development Mode

set -e

echo "🚀 Starting NoctisPro PACS - Development Mode"
echo "================================================"

# Check if .env.dev exists
if [ ! -f .env.dev ]; then
    echo "⚠️  .env.dev not found. Creating from example..."
    cp .env.dev.example .env.dev
    echo "✅ Created .env.dev - Please edit it with your settings"
fi

# Load environment variables
export $(cat .env.dev | grep -v '^#' | xargs)

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Show status
echo ""
echo "✅ NoctisPro PACS is starting!"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.dev.yml ps
echo ""
echo "🌐 Access Points:"
echo "   - Django Web:      http://localhost:8000"
echo "   - DICOM SCP:       localhost:11112"
echo "   - PostgreSQL:      localhost:5432"
echo "   - Redis:           localhost:6379"
echo ""
echo "📝 Logs:"
echo "   docker-compose -f docker-compose.dev.yml logs -f [service]"
echo ""
echo "🛑 Stop:"
echo "   docker-compose -f docker-compose.dev.yml down"
echo ""