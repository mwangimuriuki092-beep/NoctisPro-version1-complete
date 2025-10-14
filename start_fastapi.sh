#!/bin/bash
# Start FastAPI server for NoctisPro PACS

echo "Starting FastAPI server..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Set environment variables
export DJANGO_SETTINGS_MODULE=noctis_pro.settings
export PYTHONPATH=/workspace:$PYTHONPATH

# Start FastAPI with uvicorn
uvicorn fastapi_app.main:app \
    --host 0.0.0.0 \
    --port 8001 \
    --reload \
    --log-level info \
    --workers 1

# For production, use:
# uvicorn fastapi_app.main:app --host 0.0.0.0 --port 8001 --workers 4
