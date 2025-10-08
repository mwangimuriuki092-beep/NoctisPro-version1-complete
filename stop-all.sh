#!/bin/bash
# Stop all NoctisPro PACS services

echo "🛑 Stopping NoctisPro PACS..."

# Stop development services
if docker-compose -f docker-compose.dev.yml ps -q 2>/dev/null | grep -q .; then
    echo "Stopping development services..."
    docker-compose -f docker-compose.dev.yml down
fi

# Stop production services
if docker-compose -f docker-compose.prod.yml ps -q 2>/dev/null | grep -q .; then
    echo "Stopping production services..."
    docker-compose -f docker-compose.prod.yml down
fi

echo "✅ All services stopped"