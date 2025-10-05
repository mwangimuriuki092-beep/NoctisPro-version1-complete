"""
Signal handlers for automatic AI analysis triggering
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from worklist.models import Study, DicomImage
from .models import AIModel, AIAnalysis
from .ai_processor import ai_processor
import threading
import logging
from django.db import transaction
import time

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Study)
def trigger_automatic_ai_analysis(sender, instance, created, **kwargs):
    """
    Automatically trigger AI analysis when a new study is created/uploaded
    """
    if not created:
        return
    
    try:
        # Get available AI models for this modality
        available_models = AIModel.objects.filter(
            is_active=True,
            modality__in=[instance.modality.code, 'ALL']
        )
        
        if not available_models.exists():
            logger.info(f"No AI models available for modality {instance.modality.code}")
            return
        
        # Create AI analyses for all available models
        analyses_created = []
        for model in available_models:
            # Check if analysis already exists
            existing = AIAnalysis.objects.filter(
                study=instance,
                ai_model=model
            ).first()
            
            if existing:
                continue
            
            # Create new automatic analysis
            analysis = AIAnalysis.objects.create(
                study=instance,
                ai_model=model,
                priority='normal',
                status='pending',
                auto_generated=True
            )
            analyses_created.append(analysis)
        
        if analyses_created:
            logger.info(f"Created {len(analyses_created)} automatic AI analyses for study {instance.accession_number}")
            
            # Start processing in background after a short delay to allow DICOM images to be uploaded
            threading.Timer(
                30.0,  # Wait 30 seconds for DICOM upload to complete
                start_automatic_analysis,
                args=(analyses_created,)
            ).start()
        
    except Exception as e:
        logger.error(f"Error creating automatic AI analysis for study {instance.accession_number}: {e}")


@receiver(post_save, sender=DicomImage)
def check_study_ready_for_analysis(sender, instance, created, **kwargs):
    """
    Check if study has enough images to start AI analysis
    """
    if not created:
        return
    
    try:
        study = instance.series.study
        
        # Check if we have pending automatic analyses
        pending_analyses = AIAnalysis.objects.filter(
            study=study,
            status='pending',
            auto_generated=True
        )
        
        if not pending_analyses.exists():
            return
        
        # Check if study has sufficient images (at least 5 images)
        total_images = study.get_image_count()
        
        if total_images >= 5:
            logger.info(f"Study {study.accession_number} has {total_images} images, starting AI analysis")
            
            # Start analysis immediately
            threading.Thread(
                target=start_automatic_analysis,
                args=(list(pending_analyses),),
                daemon=True
            ).start()
    
    except Exception as e:
        logger.error(f"Error checking study readiness for analysis: {e}")


def start_automatic_analysis(analyses):
    """
    Start automatic AI analysis for the given analyses with database lock handling
    """
    for analysis in analyses:
        try:
            # Use database transaction with retry logic for SQLite locks
            max_retries = 3
            retry_delay = 1.0
            
            for attempt in range(max_retries):
                try:
                    with transaction.atomic():
                        # Check if analysis is still pending
                        analysis.refresh_from_db()
                        if analysis.status != 'pending':
                            continue
                        
                        # Check if study has images
                        if analysis.study.get_image_count() == 0:
                            logger.warning(f"Study {analysis.study.accession_number} has no images, skipping analysis")
                            continue
                        
                        logger.info(f"Starting automatic AI analysis for study {analysis.study.accession_number}")
                        
                        # Process the analysis
                        success = ai_processor.process_analysis(analysis)
                        
                        if success:
                            logger.info(f"Automatic AI analysis completed for study {analysis.study.accession_number}")
                        else:
                            logger.error(f"Automatic AI analysis failed for study {analysis.study.accession_number}")
                        
                        break  # Success, exit retry loop
                        
                except Exception as db_error:
                    if "database is locked" in str(db_error).lower() and attempt < max_retries - 1:
                        logger.warning(f"Database locked, retrying in {retry_delay}s (attempt {attempt + 1}/{max_retries})")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    else:
                        raise db_error
        
        except Exception as e:
            logger.error(f"Error in automatic analysis processing for study {analysis.study.accession_number}: {e}")


def setup_automatic_ai_models():
    """
    Setup default AI models for automatic analysis if they don't exist
    """
    try:
        default_models = [
            {
                'name': 'AutoAnalyzer CT',
                'version': '1.0',
                'model_type': 'classification',
                'modality': 'CT',
                'description': 'Automatic CT analysis for preliminary screening',
                'model_file_path': 'builtin://metadata_analyzer',
                'is_active': True,
                'is_trained': True
            },
            {
                'name': 'AutoAnalyzer MR',
                'version': '1.0',
                'model_type': 'classification',
                'modality': 'MR',
                'description': 'Automatic MR analysis for preliminary screening',
                'model_file_path': 'builtin://metadata_analyzer',
                'is_active': True,
                'is_trained': True
            },
            {
                'name': 'AutoAnalyzer XR',
                'version': '1.0',
                'model_type': 'classification',
                'modality': 'XR',
                'description': 'Automatic X-ray analysis for preliminary screening',
                'model_file_path': 'builtin://metadata_analyzer',
                'is_active': True,
                'is_trained': True
            },
            {
                'name': 'Universal Preliminary Analyzer',
                'version': '1.0',
                'model_type': 'report_generation',
                'modality': 'ALL',
                'description': 'Universal preliminary analysis for all modalities',
                'model_file_path': 'builtin://report_generator',
                'is_active': True,
                'is_trained': True
            }
        ]
        
        for model_data in default_models:
            model, created = AIModel.objects.get_or_create(
                name=model_data['name'],
                modality=model_data['modality'],
                defaults=model_data
            )
            
            if created:
                logger.info(f"Created automatic AI model: {model.name}")
        
        logger.info("Automatic AI models setup completed")
        
    except Exception as e:
        logger.error(f"Error setting up automatic AI models: {e}")