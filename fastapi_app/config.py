"""
FastAPI Configuration
Loads settings from environment variables and Django settings
"""

import os
from typing import List
from pydantic_settings import BaseSettings

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
    ]
    
    # Django integration
    DJANGO_SECRET_KEY: str = os.getenv("DJANGO_SECRET_KEY", "")
    
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
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
