#!/bin/bash
# Stop all NoctisPro PACS services

echo "Stopping all NoctisPro PACS services..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Read PIDs if file exists
if [ -f ".service_pids" ]; then
    source .service_pids
    
    # Stop Django
    if [ -n "$DJANGO_PID" ] && ps -p $DJANGO_PID > /dev/null 2>&1; then
        kill $DJANGO_PID
        echo -e "${GREEN}✓${NC} Stopped Django (PID: $DJANGO_PID)"
    fi
    
    # Stop FastAPI
    if [ -n "$FASTAPI_PID" ] && ps -p $FASTAPI_PID > /dev/null 2>&1; then
        kill $FASTAPI_PID
        echo -e "${GREEN}✓${NC} Stopped FastAPI (PID: $FASTAPI_PID)"
    fi
    
    # Stop Rust
    if [ -n "$RUST_PID" ] && ps -p $RUST_PID > /dev/null 2>&1; then
        kill $RUST_PID
        echo -e "${GREEN}✓${NC} Stopped Rust SCP (PID: $RUST_PID)"
    fi
    
    rm .service_pids
fi

# Also kill by port if PIDs don't work
pkill -f "manage.py runserver"
pkill -f "uvicorn fastapi_app"
pkill -f "dicom_scp_server"

echo "All services stopped."
