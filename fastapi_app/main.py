"""
FastAPI Main Application
High-performance API endpoints for NoctisPro PACS
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
import sys

# Add Django project to path to access models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'noctis_pro.settings')

import django
django.setup()

from fastapi_app.routers import dicom, ai, viewer, health
from fastapi_app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="NoctisPro PACS API",
    description="High-performance API for medical imaging and AI analysis",
    version="1.0.0",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(dicom.router, prefix="/api/v1/dicom", tags=["dicom"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])
app.include_router(viewer.router, prefix="/api/v1/viewer", tags=["viewer"])

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting NoctisPro FastAPI server...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Django integration: Active")
    logger.info(f"Database: {settings.DATABASE_URL[:20]}...")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down NoctisPro FastAPI server...")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.DEBUG else "An error occurred"
        }
    )

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "NoctisPro PACS FastAPI Server",
        "version": "1.0.0",
        "docs": "/api/v1/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
