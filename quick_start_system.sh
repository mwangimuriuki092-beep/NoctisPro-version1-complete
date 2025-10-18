#!/bin/bash

###############################################################################
# NoctisPro PACS - Quick Start Script
# Starts all necessary services for DICOM receiving and viewing
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Print header
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      NoctisPro PACS - Quick Start                            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print status messages
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed or not in PATH"
    exit 1
fi

print_status "Python 3 found: $(python3 --version)"

# Check for virtual environment
if [ -d "venv" ]; then
    print_info "Activating virtual environment..."
    source venv/bin/activate
elif [ -d ".venv" ]; then
    print_info "Activating virtual environment..."
    source .venv/bin/activate
else
    print_warning "No virtual environment found. Using system Python."
fi

# Create necessary directories
print_info "Creating required directories..."
mkdir -p media/dicom/received
mkdir -p media/dicom/thumbnails
mkdir -p media/dicom/professional
mkdir -p logs
mkdir -p backups
print_status "Directories created"

# Check if required packages are installed
print_info "Checking Python dependencies..."
if python3 -c "import django" 2>/dev/null; then
    print_status "Django is installed"
else
    print_error "Django is not installed. Please run: pip install -r requirements.txt"
    exit 1
fi

# Run system health check
print_info "Running system health check..."
echo ""
python3 verify_system_health.py
HEALTH_CHECK_STATUS=$?
echo ""

if [ $HEALTH_CHECK_STATUS -ne 0 ]; then
    print_warning "Some health checks failed, but continuing..."
else
    print_status "All health checks passed!"
fi

# Function to check if a port is in use
check_port() {
    local port=$1
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check if services are already running
print_info "Checking for running services..."

DJANGO_PORT=8000
FASTAPI_PORT=8001
DICOM_PORT=11112

# Start DICOM Receiver
echo ""
print_info "Starting DICOM Receiver Service..."
if check_port $DICOM_PORT; then
    print_warning "DICOM Receiver already running on port $DICOM_PORT"
else
    print_info "Starting DICOM Receiver on port $DICOM_PORT..."
    nohup python3 dicom_receiver.py --port $DICOM_PORT --aet NOCTIS_SCP > logs/dicom_receiver.log 2>&1 &
    DICOM_PID=$!
    sleep 2
    
    if ps -p $DICOM_PID > /dev/null; then
        print_status "DICOM Receiver started (PID: $DICOM_PID)"
        echo $DICOM_PID > logs/dicom_receiver.pid
    else
        print_error "Failed to start DICOM Receiver. Check logs/dicom_receiver.log"
    fi
fi

# Start Django/Daphne Server
echo ""
print_info "Starting Django Web Server..."
if check_port $DJANGO_PORT; then
    print_warning "Django server already running on port $DJANGO_PORT"
else
    # Check if daphne is available, otherwise use runserver
    if command -v daphne &> /dev/null; then
        print_info "Starting Daphne ASGI server on port $DJANGO_PORT..."
        nohup daphne -b 0.0.0.0 -p $DJANGO_PORT noctis_pro.asgi:application > logs/django.log 2>&1 &
        DJANGO_PID=$!
    else
        print_info "Starting Django development server on port $DJANGO_PORT..."
        nohup python3 manage.py runserver 0.0.0.0:$DJANGO_PORT > logs/django.log 2>&1 &
        DJANGO_PID=$!
    fi
    sleep 3
    
    if ps -p $DJANGO_PID > /dev/null; then
        print_status "Django server started (PID: $DJANGO_PID)"
        echo $DJANGO_PID > logs/django.pid
    else
        print_error "Failed to start Django server. Check logs/django.log"
    fi
fi

# Start FastAPI Server (optional)
echo ""
print_info "Starting FastAPI Server..."
if check_port $FASTAPI_PORT; then
    print_warning "FastAPI server already running on port $FASTAPI_PORT"
else
    if command -v uvicorn &> /dev/null; then
        print_info "Starting FastAPI on port $FASTAPI_PORT..."
        cd fastapi_app
        nohup uvicorn main:app --host 0.0.0.0 --port $FASTAPI_PORT > ../logs/fastapi.log 2>&1 &
        FASTAPI_PID=$!
        cd ..
        sleep 2
        
        if ps -p $FASTAPI_PID > /dev/null; then
            print_status "FastAPI server started (PID: $FASTAPI_PID)"
            echo $FASTAPI_PID > logs/fastapi.pid
        else
            print_warning "Failed to start FastAPI server. Check logs/fastapi.log"
        fi
    else
        print_warning "uvicorn not found. Skipping FastAPI server."
    fi
fi

# Print summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                         Services Started Successfully!                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
print_status "DICOM Receiver: Port $DICOM_PORT (AET: NOCTIS_SCP)"
print_status "Django Web App: http://localhost:$DJANGO_PORT"
print_status "FastAPI: http://localhost:$FASTAPI_PORT (if started)"
echo ""
print_info "Logs are available in: $SCRIPT_DIR/logs/"
print_info "  - dicom_receiver.log"
print_info "  - django.log"
print_info "  - fastapi.log"
echo ""
print_info "To stop services, run: ./stop_all_services.sh"
print_info "To view logs, run: tail -f logs/*.log"
echo ""

# Show how to test
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                          Quick Testing Guide                                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
print_info "1. Access the web interface:"
echo "   http://localhost:$DJANGO_PORT"
echo ""
print_info "2. Send test DICOM images (using DCMTK):"
echo "   storescu localhost $DICOM_PORT -aec NOCTIS_SCP -aet TEST_SCU image.dcm"
echo ""
print_info "3. View API documentation:"
echo "   http://localhost:$FASTAPI_PORT/api/v1/docs"
echo ""
print_info "4. Check system status:"
echo "   python3 verify_system_health.py"
echo ""

# Show running processes
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                           Running Processes                                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ -f "logs/dicom_receiver.pid" ]; then
    DICOM_PID=$(cat logs/dicom_receiver.pid)
    if ps -p $DICOM_PID > /dev/null 2>&1; then
        echo -e "${GREEN}DICOM Receiver${NC} (PID: $DICOM_PID) - Running"
    fi
fi

if [ -f "logs/django.pid" ]; then
    DJANGO_PID=$(cat logs/django.pid)
    if ps -p $DJANGO_PID > /dev/null 2>&1; then
        echo -e "${GREEN}Django Server${NC} (PID: $DJANGO_PID) - Running"
    fi
fi

if [ -f "logs/fastapi.pid" ]; then
    FASTAPI_PID=$(cat logs/fastapi.pid)
    if ps -p $FASTAPI_PID > /dev/null 2>&1; then
        echo -e "${GREEN}FastAPI Server${NC} (PID: $FASTAPI_PID) - Running"
    fi
fi

echo ""
print_status "System is ready to receive and display DICOM images!"
echo ""
