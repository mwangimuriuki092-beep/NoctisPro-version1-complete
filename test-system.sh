#!/bin/bash
# Test NoctisPro PACS System

echo "🧪 Testing NoctisPro PACS System"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are running
echo "1. Checking Docker services..."
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓${NC} Docker services are running"
else
    echo -e "${RED}✗${NC} Docker services are not running"
    echo "   Run: ./start-dev.sh or ./start-prod.sh"
    exit 1
fi
echo ""

# Test PostgreSQL
echo "2. Testing PostgreSQL..."
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL is ready"
else
    echo -e "${RED}✗${NC} PostgreSQL is not ready"
fi
echo ""

# Test Redis
echo "3. Testing Redis..."
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Redis is ready"
else
    echo -e "${RED}✗${NC} Redis is not ready"
fi
echo ""

# Test Django
echo "4. Testing Django..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✓${NC} Django is responding (HTTP $HTTP_CODE)"
else
    echo -e "${RED}✗${NC} Django is not responding (HTTP $HTTP_CODE)"
fi
echo ""

# Test DICOM SCP
echo "5. Testing DICOM SCP Server..."
if command -v echoscu &> /dev/null; then
    if echoscu -v localhost 11112 -aec RUST_SCP 2>&1 | grep -q "successfully"; then
        echo -e "${GREEN}✓${NC} DICOM SCP is responding"
    else
        echo -e "${YELLOW}⚠${NC} DICOM SCP test inconclusive"
    fi
else
    echo -e "${YELLOW}⚠${NC} echoscu not installed, skipping DICOM test"
    echo "   Install with: sudo apt-get install dcmtk"
fi
echo ""

# Test database connectivity
echo "6. Testing database connectivity..."
if docker-compose exec -T django python -c "import django; django.setup(); from django.db import connection; connection.ensure_connection(); print('OK')" 2>/dev/null | grep -q "OK"; then
    echo -e "${GREEN}✓${NC} Django can connect to database"
else
    echo -e "${RED}✗${NC} Django cannot connect to database"
fi
echo ""

# Check storage directory
echo "7. Checking storage..."
if docker-compose exec -T django test -d /app/media/dicom_files && echo "OK" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Storage directory exists"
    # Count files
    FILE_COUNT=$(docker-compose exec -T django find /app/media/dicom_files -name "*.dcm" 2>/dev/null | wc -l)
    echo "   DICOM files: $FILE_COUNT"
else
    echo -e "${YELLOW}⚠${NC} Storage directory check inconclusive"
fi
echo ""

# Summary
echo "================================="
echo "📊 System Status Summary"
echo "================================="
docker-compose ps
echo ""
echo "✅ Testing complete!"
echo ""
echo "Next steps:"
echo "  - View logs: docker-compose logs -f"
echo "  - Access web: http://localhost:8000"
echo "  - Send DICOM: storescu localhost 11112 -aec RUST_SCP file.dcm"
echo ""