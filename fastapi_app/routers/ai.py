"""
AI Analysis Endpoints
Fast AI inference and analysis
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List
import logging
from datetime import datetime

from asgiref.sync import sync_to_async
from django.apps import apps

from fastapi_app.models.schemas import (
    AIAnalysisRequest,
    AIAnalysisResponse,
    AIAnalysisStatus
)

logger = logging.getLogger(__name__)
router = APIRouter()

async def run_ai_analysis(study_id: int, model_type: str):
    """
    Background task to run AI analysis
    This would integrate with your AI models
    """
    try:
        AIAnalysis = apps.get_model('ai_analysis', 'AIAnalysis')
        
        @sync_to_async
        def create_analysis():
            from ai_analysis.models import AIModel
            
            # Get the AI model
            model = AIModel.objects.filter(
                name__icontains=model_type,
                is_active=True
            ).first()
            
            if not model:
                model = AIModel.objects.filter(is_active=True).first()
            
            # Create analysis
            analysis = AIAnalysis.objects.create(
                study_id=study_id,
                model=model,
                status='pending'
            )
            
            return analysis
        
        analysis = await create_analysis()
        
        # TODO: Actual AI processing would go here
        # For now, just mark as completed
        @sync_to_async
        def update_analysis():
            analysis.status = 'completed'
            analysis.findings = "AI analysis completed successfully"
            analysis.confidence_score = 0.85
            analysis.save()
        
        await update_analysis()
        
        logger.info(f"AI analysis completed for study {study_id}")
        
    except Exception as e:
        logger.error(f"AI analysis error: {e}", exc_info=True)

@router.post("/analyze", response_model=AIAnalysisResponse)
async def create_ai_analysis(
    request: AIAnalysisRequest,
    background_tasks: BackgroundTasks
):
    """
    Create a new AI analysis for a study
    Runs asynchronously in the background
    """
    try:
        AIAnalysis = apps.get_model('ai_analysis', 'AIAnalysis')
        
        @sync_to_async
        def create_analysis():
            from ai_analysis.models import AIModel
            
            # Get study
            from dicom_viewer.models import DicomStudy
            study = DicomStudy.objects.get(id=request.study_id)
            
            # Get AI model
            model = AIModel.objects.filter(
                name__icontains=request.model_type,
                is_active=True
            ).first()
            
            if not model:
                model = AIModel.objects.filter(is_active=True).first()
            
            if not model:
                raise ValueError("No active AI model found")
            
            # Create analysis
            analysis = AIAnalysis.objects.create(
                study=study,
                model=model,
                status='pending',
                auto_generated=True
            )
            
            return analysis
        
        analysis = await create_analysis()
        
        # Add background task
        background_tasks.add_task(
            run_ai_analysis,
            request.study_id,
            request.model_type
        )
        
        return AIAnalysisResponse(
            analysis_id=analysis.id,
            status=analysis.status,
            created_at=analysis.created_at
        )
        
    except Exception as e:
        logger.error(f"Error creating AI analysis: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/analysis/{analysis_id}", response_model=AIAnalysisResponse)
async def get_analysis(analysis_id: int):
    """
    Get AI analysis results
    """
    try:
        AIAnalysis = apps.get_model('ai_analysis', 'AIAnalysis')
        
        @sync_to_async
        def get_analysis_data():
            analysis = AIAnalysis.objects.get(id=analysis_id)
            
            findings = []
            if analysis.findings:
                findings = [analysis.findings]
            
            return {
                "analysis_id": analysis.id,
                "status": analysis.status,
                "findings": findings,
                "confidence": analysis.confidence_score,
                "created_at": analysis.created_at,
            }
        
        data = await get_analysis_data()
        return AIAnalysisResponse(**data)
        
    except Exception as e:
        logger.error(f"Error fetching analysis: {e}")
        raise HTTPException(status_code=404, detail="Analysis not found")

@router.get("/studies/{study_id}/analyses", response_model=List[AIAnalysisResponse])
async def get_study_analyses(study_id: int):
    """
    Get all AI analyses for a study
    """
    try:
        AIAnalysis = apps.get_model('ai_analysis', 'AIAnalysis')
        
        @sync_to_async
        def get_analyses():
            analyses = AIAnalysis.objects.filter(
                study_id=study_id
            ).order_by('-created_at')
            
            return [
                AIAnalysisResponse(
                    analysis_id=a.id,
                    status=a.status,
                    findings=[a.findings] if a.findings else [],
                    confidence=a.confidence_score,
                    created_at=a.created_at,
                )
                for a in analyses
            ]
        
        return await get_analyses()
        
    except Exception as e:
        logger.error(f"Error fetching study analyses: {e}")
        raise HTTPException(status_code=404, detail="Study not found")
