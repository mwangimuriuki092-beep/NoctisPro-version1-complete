"""
DICOM Viewer Endpoints
High-performance image streaming and viewer support
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
import logging
import os
import pydicom
import numpy as np
from io import BytesIO
from PIL import Image

from asgiref.sync import sync_to_async
from django.apps import apps

from fastapi_app.models.schemas import ViewerSessionRequest, ViewerSessionResponse
from fastapi_app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/session", response_model=ViewerSessionResponse)
async def create_viewer_session(request: ViewerSessionRequest):
    """
    Create a viewer session for a study
    Returns session info and metadata
    """
    try:
        DicomStudy = apps.get_model('dicom_viewer', 'DicomStudy')
        
        @sync_to_async
        def get_study_info():
            study = DicomStudy.objects.get(id=request.study_id)
            
            # Get number of instances/frames
            total_frames = study.dicominstance_set.count() if hasattr(study, 'dicominstance_set') else 1
            
            return {
                "study": study,
                "total_frames": total_frames
            }
        
        info = await get_study_info()
        study = info["study"]
        
        # Generate session ID
        import uuid
        session_id = str(uuid.uuid4())
        
        return ViewerSessionResponse(
            session_id=session_id,
            study_id=study.id,
            total_frames=info["total_frames"],
            metadata={
                "patient_id": study.patient_id,
                "patient_name": study.patient_name,
                "study_date": study.study_date,
                "modality": study.modality,
            }
        )
        
    except Exception as e:
        logger.error(f"Error creating viewer session: {e}")
        raise HTTPException(status_code=404, detail="Study not found")

@router.get("/image/{study_id}/{frame_number}")
async def get_image_frame(study_id: int, frame_number: int = 0):
    """
    Get a specific image frame
    Returns JPEG image for fast rendering
    """
    try:
        # TODO: This is a simplified version
        # In production, you'd want to cache images, handle window/level, etc.
        
        DicomStudy = apps.get_model('dicom_viewer', 'DicomStudy')
        
        @sync_to_async
        def get_study():
            return DicomStudy.objects.get(id=study_id)
        
        study = await get_study()
        
        # Find DICOM file
        # This is simplified - you'd get the actual file path from database
        study_dir = os.path.join(settings.DICOM_STORAGE_PATH, f"study_{study_id}")
        
        if not os.path.exists(study_dir):
            raise HTTPException(status_code=404, detail="Study files not found")
        
        # Get first DICOM file (simplified)
        dicom_files = [f for f in os.listdir(study_dir) if f.endswith('.dcm')]
        if not dicom_files:
            raise HTTPException(status_code=404, detail="No DICOM files found")
        
        dicom_path = os.path.join(study_dir, dicom_files[0])
        
        # Read DICOM
        ds = pydicom.dcmread(dicom_path)
        
        # Get pixel data
        pixel_array = ds.pixel_array
        
        # Normalize to 8-bit
        pixel_array = pixel_array - pixel_array.min()
        pixel_array = (pixel_array / pixel_array.max() * 255).astype(np.uint8)
        
        # Convert to PIL Image
        image = Image.fromarray(pixel_array)
        
        # Convert to JPEG
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=90)
        buffer.seek(0)
        
        return StreamingResponse(buffer, media_type="image/jpeg")
        
    except Exception as e:
        logger.error(f"Error fetching image frame: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail=str(e))

@router.websocket("/ws/{study_id}")
async def websocket_viewer(websocket: WebSocket, study_id: int):
    """
    WebSocket endpoint for real-time viewer updates
    Allows for interactive window/level adjustments, etc.
    """
    await websocket.accept()
    
    try:
        while True:
            # Receive commands from client
            data = await websocket.receive_json()
            
            command = data.get("command")
            
            if command == "get_frame":
                frame_number = data.get("frame", 0)
                # TODO: Send frame data
                await websocket.send_json({
                    "type": "frame",
                    "frame_number": frame_number,
                    "data": "base64_encoded_image_data"
                })
                
            elif command == "adjust_wl":
                window = data.get("window", 400)
                level = data.get("level", 40)
                # TODO: Apply window/level and send updated frame
                await websocket.send_json({
                    "type": "frame_updated",
                    "window": window,
                    "level": level
                })
                
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": "Unknown command"
                })
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for study {study_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        await websocket.close()
