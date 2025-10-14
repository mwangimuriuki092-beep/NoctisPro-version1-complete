"""
FastAPI Configuration - Production Ready
Loads settings from environment variables and Django settings
"""

import os
from typing import List
from pydantic_settings import BaseSettings
import secrets

class Settings(BaseSettings):
    """Application settings"""
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Server
    HOST: str = os.getenv("FASTAPI_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("FASTAPI_PORT", "8001"))
    
    # Database (shared with Django)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://noctispro:noctispro@localhost/noctispro"
    )
    
    # Redis (shared with Django)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:8000",  # Django dev server
        "http://localhost:3000",  # React dev server (if any)
        "http://127.0.0.1:8000",
        "https://pacs.yourdomain.com",  # Production domain
    ]
    
    # Django integration
    DJANGO_SECRET_KEY: str = os.getenv("DJANGO_SECRET_KEY", "")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", DJANGO_SECRET_KEY or secrets.token_urlsafe(32))
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    
    # File storage
    MEDIA_ROOT: str = os.getenv("MEDIA_ROOT", "/workspace/media")
    DICOM_STORAGE_PATH: str = os.path.join(MEDIA_ROOT, "dicom_files")
    
    # AI Models
    AI_MODEL_PATH: str = os.getenv("AI_MODEL_PATH", "/workspace/models")
    
    # Rust SCP Server
    RUST_SCP_HOST: str = os.getenv("RUST_SCP_HOST", "localhost")
    RUST_SCP_PORT: int = int(os.getenv("RUST_SCP_PORT", "11112"))
    
    # Performance
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB
    WORKER_COUNT: int = int(os.getenv("FASTAPI_WORKERS", "4"))
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "1000"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # seconds
    
    # Caching
    CACHE_ENABLED: bool = os.getenv("CACHE_ENABLED", "True").lower() == "true"
    CACHE_TTL_DEFAULT: int = int(os.getenv("CACHE_TTL_DEFAULT", "3600"))  # 1 hour
    CACHE_TTL_IMAGES: int = int(os.getenv("CACHE_TTL_IMAGES", "1800"))  # 30 minutes
    CACHE_TTL_METADATA: int = int(os.getenv("CACHE_TTL_METADATA", "7200"))  # 2 hours
    
    # Security
    ENABLE_CORS: bool = os.getenv("ENABLE_CORS", "True").lower() == "true"
    ENABLE_RATE_LIMITING: bool = os.getenv("ENABLE_RATE_LIMITING", "True").lower() == "true"
    REQUIRE_AUTHENTICATION: bool = os.getenv("REQUIRE_AUTHENTICATION", "False").lower() == "true"
    
    # Monitoring
    ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "True").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Production optimization
    WORKERS: int = int(os.getenv("WORKERS", "4"))
    MAX_CONNECTIONS: int = int(os.getenv("MAX_CONNECTIONS", "100"))
    KEEP_ALIVE: int = int(os.getenv("KEEP_ALIVE", "5"))
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
