"""
Background tasks for AI analysis processing
"""

import logging
from django.utils import timezone
from .ai_processor import process_ai_analysis
from .models import AIAnalysis

logger = logging.getLogger(__name__)


def process_pending_analyses():
    """Process all pending AI analyses"""
    pending_analyses = AIAnalysis.objects.filter(status='pending').order_by('created_at')
    
    processed_count = 0
    failed_count = 0
    
    for analysis in pending_analyses[:10]:  # Process max 10 at a time
        logger.info(f"Processing AI analysis {analysis.id} for study {analysis.study.accession_number}")
        
        try:
            success = process_ai_analysis(analysis.id)
            if success:
                processed_count += 1
                logger.info(f"Successfully processed analysis {analysis.id}")
            else:
                failed_count += 1
                logger.error(f"Failed to process analysis {analysis.id}")
        except Exception as e:
            failed_count += 1
            logger.error(f"Exception processing analysis {analysis.id}: {e}")
    
    if processed_count > 0 or failed_count > 0:
        logger.info(f"AI analysis batch complete: {processed_count} processed, {failed_count} failed")
    
    return processed_count, failed_count


def cleanup_old_analyses():
    """Clean up old failed or completed analyses"""
    from datetime import timedelta
    
    # Delete failed analyses older than 7 days
    cutoff_date = timezone.now() - timedelta(days=7)
    
    old_failed = AIAnalysis.objects.filter(
        status='failed',
        created_at__lt=cutoff_date
    )
    
    deleted_count = old_failed.count()
    if deleted_count > 0:
        old_failed.delete()
        logger.info(f"Cleaned up {deleted_count} old failed AI analyses")
    
    return deleted_count