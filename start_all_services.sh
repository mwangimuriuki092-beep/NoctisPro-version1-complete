#!/bin/bash
# Start all NoctisPro PACS services (Django, FastAPI, Rust)

echo "==================================="
echo "NoctisPro PACS - Starting All Services"
echo "==================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p media/dicom_files
mkdir -p logs

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✓${NC} Virtual environment activated"
fi

# Set environment variables
export DJANGO_SETTINGS_MODULE=noctis_pro.settings
export PYTHONPATH=/workspace:$PYTHONPATH

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠${NC} Port $1 is already in use"
        return 1
    else
        return 0
    fi
}

# Start Django (Port 8000)
echo ""
echo -e "${BLUE}Starting Django server (Port 8000)...${NC}"
if check_port 8000; then
    nohup python manage.py runserver 0.0.0.0:8000 > logs/django.log 2>&1 &
    DJANGO_PID=$!
    echo -e "${GREEN}✓${NC} Django started (PID: $DJANGO_PID)"
    echo "  - URL: http://localhost:8000"
    echo "  - Admin: http://localhost:8000/admin/"
    echo "  - Logs: logs/django.log"
else
    echo "  Skipping Django..."
fi

# Start FastAPI (Port 8001)
echo ""
echo -e "${BLUE}Starting FastAPI server (Port 8001)...${NC}"
if check_port 8001; then
    nohup uvicorn fastapi_app.main:app --host 0.0.0.0 --port 8001 > logs/fastapi.log 2>&1 &
    FASTAPI_PID=$!
    echo -e "${GREEN}✓${NC} FastAPI started (PID: $FASTAPI_PID)"
    echo "  - URL: http://localhost:8001"
    echo "  - Docs: http://localhost:8001/api/v1/docs"
    echo "  - Logs: logs/fastapi.log"
else
    echo "  Skipping FastAPI..."
fi

# Start Rust DICOM SCP (Port 11112)
echo ""
echo -e "${BLUE}Starting Rust DICOM SCP (Port 11112)...${NC}"
if [ -f "dicom_scp_server/target/release/dicom_scp_server" ]; then
    if check_port 11112; then
        cd dicom_scp_server
        nohup ./target/release/dicom_scp_server > ../logs/rust_scp.log 2>&1 &
        RUST_PID=$!
        cd ..
        echo -e "${GREEN}✓${NC} Rust SCP started (PID: $RUST_PID)"
        echo "  - Port: 11112"
        echo "  - Logs: logs/rust_scp.log"
    else
        echo "  Skipping Rust SCP..."
    fi
else
    echo -e "${YELLOW}⚠${NC} Rust SCP binary not found. Build it first with:"
    echo "  cd dicom_scp_server && cargo build --release"
fi

# Save PIDs to file
cat > .service_pids << EOF
DJANGO_PID=${DJANGO_PID:-}
FASTAPI_PID=${FASTAPI_PID:-}
RUST_PID=${RUST_PID:-}
EOF

echo ""
echo "==================================="
echo -e "${GREEN}All services started!${NC}"
echo "==================================="
echo ""
echo "Service URLs:"
echo "  Django:  http://localhost:8000"
echo "  FastAPI: http://localhost:8001/api/v1/docs"
echo "  Rust:    Port 11112 (DICOM SCP)"
echo ""
echo "To stop all services, run: ./stop_all_services.sh"
echo "To view logs: tail -f logs/*.log"
echo ""

# Wait a bit and check if services are running
sleep 2
echo "Service status:"
if ps -p ${DJANGO_PID:-0} > /dev/null 2>&1; then
    echo -e "  Django:  ${GREEN}Running${NC}"
else
    echo -e "  Django:  ${YELLOW}Not running${NC}"
fi
if ps -p ${FASTAPI_PID:-0} > /dev/null 2>&1; then
    echo -e "  FastAPI: ${GREEN}Running${NC}"
else
    echo -e "  FastAPI: ${YELLOW}Not running${NC}"
fi
if ps -p ${RUST_PID:-0} > /dev/null 2>&1; then
    echo -e "  Rust:    ${GREEN}Running${NC}"
else
    echo -e "  Rust:    ${YELLOW}Not running${NC}"
fi
