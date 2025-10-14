"""
Error Handling for Production
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class APIError(Exception):
    """Base API Error"""
    def __init__(self, message: str, status_code: int = 500, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class DicomProcessingError(APIError):
    """DICOM Processing Error"""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, status_code=422, details=details)

class NotFoundError(APIError):
    """Resource Not Found Error"""
    def __init__(self, message: str = "Resource not found", details: dict = None):
        super().__init__(message, status_code=404, details=details)

class AuthenticationError(APIError):
    """Authentication Error"""
    def __init__(self, message: str = "Authentication failed", details: dict = None):
        super().__init__(message, status_code=401, details=details)

async def api_error_handler(request: Request, exc: APIError):
    """Handle custom API errors"""
    logger.error(f"API Error: {exc.message} - Details: {exc.details}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "details": exc.details,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url),
        }
    )

async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    logger.warning(f"Validation Error: {exc.errors()}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "details": exc.errors(),
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url),
        }
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions"""
    logger.warning(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url),
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    
    # Don't expose internal errors in production
    error_message = "Internal server error"
    if not request.app.state.settings.get("ENVIRONMENT") == "production":
        error_message = str(exc)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": error_message,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url),
        }
    )
