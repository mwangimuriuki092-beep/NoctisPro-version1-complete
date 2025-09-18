from django.core.management.base import BaseCommand
from ai_analysis.tasks import process_pending_analyses, cleanup_old_analyses
from ai_analysis.models import AIAnalysis
import time


class Command(BaseCommand):
    help = 'Process pending AI analyses and generate reports'

    def add_arguments(self, parser):
        parser.add_argument(
            '--continuous',
            action='store_true',
            help='Run continuously, processing analyses as they arrive',
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=10,
            help='Interval in seconds between processing cycles (default: 10)',
        )

    def handle(self, *args, **options):
        continuous = options['continuous']
        interval = options['interval']
        
        if continuous:
            self.stdout.write('Starting continuous AI analysis processing...')
            self.stdout.write(f'Processing interval: {interval} seconds')
            self.stdout.write('Press Ctrl+C to stop')
            
            try:
                cycle = 0
                while True:
                    cycle += 1
                    
                    # Show pending count
                    pending_count = AIAnalysis.objects.filter(status='pending').count()
                    if pending_count > 0:
                        self.stdout.write(f'Cycle {cycle}: {pending_count} pending analyses')
                    
                    # Process pending analyses
                    processed, failed = process_pending_analyses()
                    
                    if processed > 0 or failed > 0:
                        self.stdout.write(
                            self.style.SUCCESS(f'Processed {processed}, Failed {failed}')
                        )
                    
                    # Cleanup old analyses every 100 cycles
                    if cycle % 100 == 0:
                        cleaned = cleanup_old_analyses()
                        if cleaned > 0:
                            self.stdout.write(f'Cleaned up {cleaned} old analyses')
                    
                    time.sleep(interval)
                    
            except KeyboardInterrupt:
                self.stdout.write('\nStopping AI analysis processing...')
        else:
            # Single run
            pending_count = AIAnalysis.objects.filter(status='pending').count()
            self.stdout.write(f'Processing {pending_count} pending AI analyses...')
            
            processed, failed = process_pending_analyses()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Batch complete: {processed} processed, {failed} failed'
                )
            )
            
            # Show summary
            total_analyses = AIAnalysis.objects.count()
            completed = AIAnalysis.objects.filter(status='completed').count()
            pending = AIAnalysis.objects.filter(status='pending').count()
            failed_total = AIAnalysis.objects.filter(status='failed').count()
            
            self.stdout.write('\nAI Analysis Summary:')
            self.stdout.write(f'  Total analyses: {total_analyses}')
            self.stdout.write(f'  Completed: {completed}')
            self.stdout.write(f'  Pending: {pending}')
            self.stdout.write(f'  Failed: {failed_total}')
            
            if pending > 0:
                self.stdout.write(f'\nRun with --continuous to process analyses automatically')