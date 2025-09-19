"""
Django management command to start the medical backup scheduler
Usage: python manage.py start_backup_scheduler
"""

from django.core.management.base import BaseCommand
from admin_panel.backup_scheduler import medical_backup_scheduler
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Start the medical backup scheduler for automated backups'

    def add_arguments(self, parser):
        parser.add_argument(
            '--daemon',
            action='store_true',
            help='Run as daemon (background process)',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🏥 Starting Medical Backup Scheduler...')
        )
        
        try:
            # Start the backup scheduler
            medical_backup_scheduler.start_scheduler()
            
            self.stdout.write(
                self.style.SUCCESS('✅ Medical backup scheduler started successfully')
            )
            
            # Display configuration
            config = medical_backup_scheduler.backup_config
            
            self.stdout.write('\n📋 Backup Configuration:')
            self.stdout.write(f"  Daily backups: {'✅ Enabled' if config['daily_backup']['enabled'] else '❌ Disabled'}")
            if config['daily_backup']['enabled']:
                self.stdout.write(f"    Time: {config['daily_backup']['time']}")
                self.stdout.write(f"    Retention: {config['daily_backup']['retention_days']} days")
            
            self.stdout.write(f"  Weekly backups: {'✅ Enabled' if config['weekly_backup']['enabled'] else '❌ Disabled'}")
            if config['weekly_backup']['enabled']:
                self.stdout.write(f"    Day: {config['weekly_backup']['day'].title()}")
                self.stdout.write(f"    Time: {config['weekly_backup']['time']}")
                self.stdout.write(f"    Retention: {config['weekly_backup']['retention_weeks']} weeks")
            
            self.stdout.write(f"  Monthly backups: {'✅ Enabled' if config['monthly_backup']['enabled'] else '❌ Disabled'}")
            if config['monthly_backup']['enabled']:
                self.stdout.write(f"    Day: {config['monthly_backup']['day']} of month")
                self.stdout.write(f"    Time: {config['monthly_backup']['time']}")
                self.stdout.write(f"    Retention: {config['monthly_backup']['retention_months']} months (10 years)")
            
            self.stdout.write(f"\n🛡️ Medical Compliance: FDA 21 CFR Part 11")
            self.stdout.write(f"📅 Data Retention: 10 years minimum")
            self.stdout.write(f"🔒 Integrity Checks: Enabled")
            
            if not options['daemon']:
                self.stdout.write('\n⚠️  Scheduler is running. Press Ctrl+C to stop.')
                try:
                    # Keep the command running
                    import time
                    while medical_backup_scheduler.is_running:
                        time.sleep(60)
                except KeyboardInterrupt:
                    self.stdout.write('\n⏹️  Stopping backup scheduler...')
                    medical_backup_scheduler.stop_scheduler()
                    self.stdout.write('✅ Backup scheduler stopped.')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Failed to start backup scheduler: {str(e)}')
            )
            raise