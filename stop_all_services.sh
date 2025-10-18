#!/bin/bash

###############################################################################
# NoctisPro PACS - Stop All Services
# Gracefully stops all running services
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      NoctisPro PACS - Stopping Services                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Function to stop a service by PID file
stop_service() {
    local service_name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            print_info "Stopping $service_name (PID: $pid)..."
            kill $pid
            sleep 2
            
            # Check if process is still running
            if ps -p $pid > /dev/null 2>&1; then
                print_info "Force stopping $service_name..."
                kill -9 $pid
                sleep 1
            fi
            
            if ! ps -p $pid > /dev/null 2>&1; then
                print_status "$service_name stopped"
                rm -f "$pid_file"
            else
                print_error "Failed to stop $service_name"
            fi
        else
            print_info "$service_name not running (stale PID file removed)"
            rm -f "$pid_file"
        fi
    else
        print_info "$service_name PID file not found"
    fi
}

# Stop DICOM Receiver
stop_service "DICOM Receiver" "logs/dicom_receiver.pid"

# Stop Django Server
stop_service "Django Server" "logs/django.pid"

# Stop FastAPI Server
stop_service "FastAPI Server" "logs/fastapi.pid"

# Also try to kill by process name (in case PID files are missing)
echo ""
print_info "Checking for orphaned processes..."

# Kill any remaining dicom_receiver processes
if pgrep -f "dicom_receiver.py" > /dev/null; then
    print_info "Found orphaned DICOM receiver processes..."
    pkill -f "dicom_receiver.py"
    sleep 1
    print_status "Cleaned up DICOM receiver processes"
fi

# Kill any remaining Django processes
if pgrep -f "manage.py runserver" > /dev/null; then
    print_info "Found orphaned Django processes..."
    pkill -f "manage.py runserver"
    sleep 1
    print_status "Cleaned up Django processes"
fi

# Kill any remaining Daphne processes
if pgrep -f "daphne.*noctis_pro" > /dev/null; then
    print_info "Found orphaned Daphne processes..."
    pkill -f "daphne.*noctis_pro"
    sleep 1
    print_status "Cleaned up Daphne processes"
fi

# Kill any remaining FastAPI processes
if pgrep -f "uvicorn.*fastapi_app" > /dev/null; then
    print_info "Found orphaned FastAPI processes..."
    pkill -f "uvicorn.*fastapi_app"
    sleep 1
    print_status "Cleaned up FastAPI processes"
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                         All Services Stopped                                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
print_status "All NoctisPro PACS services have been stopped"
echo ""
print_info "To start services again, run: ./quick_start_system.sh"
echo ""
