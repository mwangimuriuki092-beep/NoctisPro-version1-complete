"""
Health Check Endpoints
"""

from fastapi import APIRouter
from datetime import datetime
import logging

from fastapi_app.models.schemas import HealthResponse
from fastapi_app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint
    Returns status of all services
    """
    services = {
        "fastapi": "healthy",
        "django": "healthy",  # TODO: Actually check Django
        "database": "healthy",  # TODO: Actually check database
        "redis": "healthy",  # TODO: Actually check Redis
        "rust_scp": "healthy",  # TODO: Actually check Rust SCP
    }
    
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.now(),
        services=services
    )

@router.get("/ping")
async def ping():
    """Simple ping endpoint"""
    return {"message": "pong"}
