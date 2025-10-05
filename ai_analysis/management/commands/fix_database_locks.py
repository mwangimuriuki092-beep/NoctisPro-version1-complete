"""
Management command to fix database locking issues and process pending AI analyses
"""

from django.core.management.base import BaseCommand
from django.db import transaction, connection
from django.utils import timezone
from ai_analysis.models import AIAnalysis
from ai_analysis.ai_processor import ai_processor
import logging
import time

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fix database locking issues and process pending AI analyses'

    def add_arguments(self, parser):
        parser.add_argument(
            '--max-analyses',
            type=int,
            default=10,
            help='Maximum number of analyses to process at once'
        )
        parser.add_argument(
            '--retry-failed',
            action='store_true',
            help='Retry failed analyses'
        )
        parser.add_argument(
            '--optimize-db',
            action='store_true',
            help='Optimize database for better performance'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting AI analysis database fix...'))
        
        # Optimize database if requested
        if options['optimize_db']:
            self.optimize_database()
        
        # Process pending analyses
        self.process_pending_analyses(options['max_analyses'])
        
        # Retry failed analyses if requested
        if options['retry_failed']:
            self.retry_failed_analyses(options['max_analyses'])
        
        self.stdout.write(self.style.SUCCESS('AI analysis database fix completed'))

    def optimize_database(self):
        """Optimize SQLite database for better performance"""
        self.stdout.write('Optimizing database...')
        
        try:
            with connection.cursor() as cursor:
                # Enable WAL mode for better concurrency
                cursor.execute("PRAGMA journal_mode=WAL;")
                
                # Set busy timeout to 30 seconds
                cursor.execute("PRAGMA busy_timeout=30000;")
                
                # Optimize synchronous mode
                cursor.execute("PRAGMA synchronous=NORMAL;")
                
                # Increase cache size
                cursor.execute("PRAGMA cache_size=2000;")
                
                # Use memory for temporary storage
                cursor.execute("PRAGMA temp_store=MEMORY;")
                
                # Analyze tables for better query planning
                cursor.execute("ANALYZE;")
                
                # Vacuum database to reclaim space and optimize
                cursor.execute("VACUUM;")
                
            self.stdout.write(self.style.SUCCESS('Database optimization completed'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Database optimization failed: {e}'))

    def process_pending_analyses(self, max_analyses):
        """Process pending AI analyses with proper error handling"""
        self.stdout.write(f'Processing up to {max_analyses} pending analyses...')
        
        # Get pending analyses
        pending_analyses = AIAnalysis.objects.filter(
            status='pending'
        ).select_related('study', 'ai_model').order_by('requested_at')[:max_analyses]
        
        if not pending_analyses:
            self.stdout.write('No pending analyses found')
            return
        
        processed_count = 0
        failed_count = 0
        
        for analysis in pending_analyses:
            try:
                self.stdout.write(f'Processing analysis {analysis.id} for study {analysis.study.accession_number}')
                
                # Process with retry logic
                success = self.process_analysis_with_retry(analysis)
                
                if success:
                    processed_count += 1
                    self.stdout.write(self.style.SUCCESS(f'✅ Analysis {analysis.id} completed'))
                else:
                    failed_count += 1
                    self.stdout.write(self.style.ERROR(f'❌ Analysis {analysis.id} failed'))
                
                # Small delay to prevent overwhelming the system
                time.sleep(0.1)
                
            except Exception as e:
                failed_count += 1
                self.stdout.write(self.style.ERROR(f'❌ Analysis {analysis.id} error: {e}'))
        
        self.stdout.write(self.style.SUCCESS(
            f'Processed {processed_count} analyses, {failed_count} failed'
        ))

    def retry_failed_analyses(self, max_analyses):
        """Retry failed AI analyses"""
        self.stdout.write(f'Retrying up to {max_analyses} failed analyses...')
        
        # Get recent failed analyses (within last 24 hours)
        cutoff_time = timezone.now() - timezone.timedelta(hours=24)
        failed_analyses = AIAnalysis.objects.filter(
            status='failed',
            requested_at__gte=cutoff_time
        ).select_related('study', 'ai_model').order_by('-requested_at')[:max_analyses]
        
        if not failed_analyses:
            self.stdout.write('No recent failed analyses found')
            return
        
        retried_count = 0
        success_count = 0
        
        for analysis in failed_analyses:
            try:
                self.stdout.write(f'Retrying analysis {analysis.id} for study {analysis.study.accession_number}')
                
                # Reset analysis status
                analysis.status = 'pending'
                analysis.error_message = ''
                analysis.started_at = None
                analysis.completed_at = None
                analysis.save()
                
                # Process with retry logic
                success = self.process_analysis_with_retry(analysis)
                
                retried_count += 1
                if success:
                    success_count += 1
                    self.stdout.write(self.style.SUCCESS(f'✅ Retry of analysis {analysis.id} succeeded'))
                else:
                    self.stdout.write(self.style.ERROR(f'❌ Retry of analysis {analysis.id} failed again'))
                
                # Small delay to prevent overwhelming the system
                time.sleep(0.1)
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Retry of analysis {analysis.id} error: {e}'))
        
        self.stdout.write(self.style.SUCCESS(
            f'Retried {retried_count} analyses, {success_count} succeeded'
        ))

    def process_analysis_with_retry(self, analysis, max_retries=3):
        """Process analysis with database lock retry logic"""
        retry_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                with transaction.atomic():
                    # Refresh analysis from database
                    analysis.refresh_from_db()
                    
                    # Check if study has images
                    if analysis.study.get_image_count() == 0:
                        logger.warning(f"Study {analysis.study.accession_number} has no images")
                        analysis.status = 'failed'
                        analysis.error_message = 'No images available for analysis'
                        analysis.completed_at = timezone.now()
                        analysis.save()
                        return False
                    
                    # Process the analysis
                    success = ai_processor.process_analysis(analysis)
                    return success
                    
            except Exception as e:
                if "database is locked" in str(e).lower() and attempt < max_retries - 1:
                    self.stdout.write(f'Database locked, retrying in {retry_delay}s (attempt {attempt + 1}/{max_retries})')
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    # Final attempt failed or non-lock error
                    try:
                        with transaction.atomic():
                            analysis.status = 'failed'
                            analysis.error_message = str(e)
                            analysis.completed_at = timezone.now()
                            analysis.save()
                    except Exception:
                        pass  # Ignore save errors at this point
                    return False
        
        return False