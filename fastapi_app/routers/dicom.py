"""
DICOM Processing Endpoints
High-performance DICOM parsing and processing

PRODUCTION VERSION - Includes all production endpoints from dicom_production.py
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Optional
import logging
import os
import pydicom
from datetime import datetime

from asgiref.sync import sync_to_async
from django.apps import apps

from fastapi_app.models.schemas import (
    DicomUploadResponse,
    DicomParseResponse,
    DicomMetadata
)
from fastapi_app.dependencies import get_current_user
from fastapi_app.config import settings

# Import production endpoints
from fastapi_app.routers import dicom_production

logger = logging.getLogger(__name__)
router = APIRouter()

# Include production DICOM viewer endpoints
router.include_router(dicom_production.router, tags=["dicom-viewer"])

@router.post("/upload", response_model=DicomUploadResponse)
async def upload_dicom(
    file: UploadFile = File(...),
    user = Depends(get_current_user)
):
    """
    Upload and process a DICOM file
    Fast async upload with immediate metadata extraction
    """
    try:
        # Save uploaded file temporarily
        temp_path = os.path.join(
            settings.DICOM_STORAGE_PATH,
            f"temp_{datetime.now().timestamp()}_{file.filename}"
        )
        
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)
        
        # Save file
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Parse DICOM
        ds = pydicom.dcmread(temp_path)
        
        # Extract metadata
        metadata = DicomMetadata(
            patient_id=getattr(ds, 'PatientID', None),
            patient_name=str(getattr(ds, 'PatientName', '')),
            study_date=getattr(ds, 'StudyDate', None),
            study_time=getattr(ds, 'StudyTime', None),
            modality=getattr(ds, 'Modality', None),
            study_description=getattr(ds, 'StudyDescription', None),
            series_description=getattr(ds, 'SeriesDescription', None),
            instance_number=getattr(ds, 'InstanceNumber', None),
            rows=getattr(ds, 'Rows', None),
            columns=getattr(ds, 'Columns', None),
        )
        
        # Create study in Django database
        DicomStudy = apps.get_model('dicom_viewer', 'DicomStudy')
        
        @sync_to_async
        def create_study():
            study, created = DicomStudy.objects.get_or_create(
                patient_id=metadata.patient_id,
                study_date=metadata.study_date,
                defaults={
                    'patient_name': metadata.patient_name,
                    'modality': metadata.modality,
                    'description': metadata.study_description or '',
                }
            )
            return study.id
        
        study_id = await create_study()
        
        # Move file to permanent location
        final_path = os.path.join(
            settings.DICOM_STORAGE_PATH,
            f"study_{study_id}",
            file.filename
        )
        os.makedirs(os.path.dirname(final_path), exist_ok=True)
        os.rename(temp_path, final_path)
        
        return DicomUploadResponse(
            success=True,
            message="DICOM file uploaded successfully",
            study_id=study_id,
            metadata=metadata
        )
        
    except Exception as e:
        logger.error(f"DICOM upload error: {e}", exc_info=True)
        # Clean up temp file if exists
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/parse", response_model=DicomParseResponse)
async def parse_dicom(file_path: str):
    """
    Parse DICOM file and extract metadata
    Fast metadata extraction without database operations
    """
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Parse DICOM
        ds = pydicom.dcmread(file_path)
        
        # Extract metadata
        metadata = DicomMetadata(
            patient_id=getattr(ds, 'PatientID', None),
            patient_name=str(getattr(ds, 'PatientName', '')),
            study_date=getattr(ds, 'StudyDate', None),
            study_time=getattr(ds, 'StudyTime', None),
            modality=getattr(ds, 'Modality', None),
            study_description=getattr(ds, 'StudyDescription', None),
            series_description=getattr(ds, 'SeriesDescription', None),
            instance_number=getattr(ds, 'InstanceNumber', None),
            rows=getattr(ds, 'Rows', None),
            columns=getattr(ds, 'Columns', None),
        )
        
        return DicomParseResponse(
            success=True,
            metadata=metadata
        )
        
    except Exception as e:
        logger.error(f"DICOM parse error: {e}", exc_info=True)
        return DicomParseResponse(
            success=False,
            error=str(e)
        )

@router.get("/studies/{study_id}/metadata")
async def get_study_metadata(study_id: int):
    """
    Get metadata for a specific study
    Fast read-only access to study information
    """
    try:
        DicomStudy = apps.get_model('dicom_viewer', 'DicomStudy')
        
        @sync_to_async
        def get_study():
            return DicomStudy.objects.get(id=study_id)
        
        study = await get_study()
        
        return {
            "study_id": study.id,
            "patient_id": study.patient_id,
            "patient_name": study.patient_name,
            "study_date": study.study_date,
            "modality": study.modality,
            "description": study.description,
        }
        
    except Exception as e:
        logger.error(f"Error fetching study metadata: {e}")
        raise HTTPException(status_code=404, detail="Study not found")
