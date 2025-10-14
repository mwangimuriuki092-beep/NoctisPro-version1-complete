"""
Pydantic Schemas for API Request/Response
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Health Check
class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    services: Dict[str, str]

# DICOM Schemas
class DicomMetadata(BaseModel):
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    study_date: Optional[str] = None
    study_time: Optional[str] = None
    modality: Optional[str] = None
    study_description: Optional[str] = None
    series_description: Optional[str] = None
    instance_number: Optional[int] = None
    number_of_frames: Optional[int] = 1
    rows: Optional[int] = None
    columns: Optional[int] = None
    
class DicomUploadResponse(BaseModel):
    success: bool
    message: str
    study_id: Optional[int] = None
    metadata: Optional[DicomMetadata] = None

class DicomParseRequest(BaseModel):
    file_path: str

class DicomParseResponse(BaseModel):
    success: bool
    metadata: Optional[DicomMetadata] = None
    error: Optional[str] = None

# AI Analysis Schemas
class AIAnalysisRequest(BaseModel):
    study_id: int
    model_type: str = "general"
    priority: str = "normal"

class AIAnalysisResponse(BaseModel):
    analysis_id: int
    status: str
    findings: Optional[List[str]] = None
    confidence: Optional[float] = None
    created_at: datetime

class AIAnalysisStatus(BaseModel):
    analysis_id: int
    status: str
    progress: int = Field(ge=0, le=100)
    message: Optional[str] = None

# Viewer Schemas
class ImageFrame(BaseModel):
    frame_number: int
    width: int
    height: int
    data: str  # base64 encoded image data

class ViewerSessionRequest(BaseModel):
    study_id: int
    preset: Optional[str] = "default"

class ViewerSessionResponse(BaseModel):
    session_id: str
    study_id: int
    total_frames: int
    metadata: DicomMetadata

# Error Response
class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)
