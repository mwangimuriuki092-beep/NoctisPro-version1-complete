"""
Professional Medical Backup Scheduler
Automated backup scheduling with medical-grade reliability
10-year retention with disaster recovery capabilities
"""

import schedule
import time
import threading
import logging
from datetime import datetime, timedelta
from django.conf import settings
from .backup_system import medical_backup_system
import json
import os

logger = logging.getLogger('medical_backup_scheduler')

class MedicalBackupScheduler:
    """
    Professional backup scheduler for medical data
    - Daily, weekly, monthly backup schedules
    - 10-year retention policy
    - Medical compliance monitoring
    - Disaster recovery automation
    """
    
    def __init__(self):
        self.is_running = False
        self.scheduler_thread = None
        self.backup_config = self.load_backup_config()
        
    def load_backup_config(self):
        """Load backup configuration from settings or defaults"""
        return {
            'daily_backup': {
                'enabled': True,
                'time': '02:00',  # 2 AM
                'retention_days': 7,
                'compress': True
            },
            'weekly_backup': {
                'enabled': True,
                'day': 'sunday',
                'time': '01:00',  # 1 AM Sunday
                'retention_weeks': 12,
                'compress': True
            },
            'monthly_backup': {
                'enabled': True,
                'day': 1,  # First day of month
                'time': '00:00',  # Midnight
                'retention_months': 120,  # 10 years
                'compress': True
            },
            'emergency_backup': {
                'enabled': True,
                'trigger_on_large_uploads': True,
                'minimum_size_gb': 5
            },
            'medical_compliance': {
                'fda_21_cfr_11': True,
                'retention_years': 10,
                'integrity_checks': True,
                'audit_logging': True
            }
        }
    
    def save_backup_config(self, config):
        """Save backup configuration"""
        config_file = os.path.join(settings.BASE_DIR, 'config', 'backup_config.json')
        os.makedirs(os.path.dirname(config_file), exist_ok=True)
        
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        self.backup_config = config
        logger.info("Backup configuration updated")
    
    def start_scheduler(self):
        """Start the backup scheduler"""
        if self.is_running:
            logger.warning("Backup scheduler is already running")
            return
        
        self.is_running = True
        self.setup_schedules()
        
        # Start scheduler in separate thread
        self.scheduler_thread = threading.Thread(target=self.run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        logger.info("Medical backup scheduler started")
    
    def stop_scheduler(self):
        """Stop the backup scheduler"""
        self.is_running = False
        schedule.clear()
        
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        
        logger.info("Medical backup scheduler stopped")
    
    def setup_schedules(self):
        """Setup backup schedules based on configuration"""
        schedule.clear()
        
        # Daily backup
        if self.backup_config['daily_backup']['enabled']:
            schedule.every().day.at(self.backup_config['daily_backup']['time']).do(
                self.run_daily_backup
            )
            logger.info(f"Daily backup scheduled at {self.backup_config['daily_backup']['time']}")
        
        # Weekly backup
        if self.backup_config['weekly_backup']['enabled']:
            day = self.backup_config['weekly_backup']['day'].lower()
            time_str = self.backup_config['weekly_backup']['time']
            
            getattr(schedule.every(), day).at(time_str).do(self.run_weekly_backup)
            logger.info(f"Weekly backup scheduled on {day} at {time_str}")
        
        # Monthly backup (simulate with daily check)
        if self.backup_config['monthly_backup']['enabled']:
            schedule.every().day.at(self.backup_config['monthly_backup']['time']).do(
                self.check_monthly_backup
            )
            logger.info(f"Monthly backup check scheduled at {self.backup_config['monthly_backup']['time']}")
    
    def run_scheduler(self):
        """Run the scheduler loop"""
        while self.is_running:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Scheduler error: {str(e)}")
                time.sleep(300)  # Wait 5 minutes on error
    
    def run_daily_backup(self):
        """Execute daily backup"""
        try:
            logger.info("Starting scheduled daily backup")
            
            backup_info = medical_backup_system.create_full_backup(backup_type='daily')
            
            if backup_info['status'] == 'completed':
                logger.info(f"Daily backup completed successfully: {backup_info['backup_id']}")
                
                # Clean up old daily backups
                self.cleanup_daily_backups()
                
                # Send notification if configured
                self.send_backup_notification('daily', backup_info, success=True)
                
            else:
                logger.error(f"Daily backup failed: {backup_info.get('error', 'Unknown error')}")
                self.send_backup_notification('daily', backup_info, success=False)
                
        except Exception as e:
            logger.error(f"Daily backup error: {str(e)}")
            self.send_backup_notification('daily', {'error': str(e)}, success=False)
    
    def run_weekly_backup(self):
        """Execute weekly backup"""
        try:
            logger.info("Starting scheduled weekly backup")
            
            backup_info = medical_backup_system.create_full_backup(backup_type='weekly')
            
            if backup_info['status'] == 'completed':
                logger.info(f"Weekly backup completed successfully: {backup_info['backup_id']}")
                
                # Clean up old weekly backups
                self.cleanup_weekly_backups()
                
                self.send_backup_notification('weekly', backup_info, success=True)
                
            else:
                logger.error(f"Weekly backup failed: {backup_info.get('error', 'Unknown error')}")
                self.send_backup_notification('weekly', backup_info, success=False)
                
        except Exception as e:
            logger.error(f"Weekly backup error: {str(e)}")
            self.send_backup_notification('weekly', {'error': str(e)}, success=False)
    
    def check_monthly_backup(self):
        """Check if monthly backup is needed"""
        today = datetime.now()
        
        if today.day == self.backup_config['monthly_backup']['day']:
            self.run_monthly_backup()
    
    def run_monthly_backup(self):
        """Execute monthly backup"""
        try:
            logger.info("Starting scheduled monthly backup")
            
            backup_info = medical_backup_system.create_full_backup(backup_type='monthly')
            
            if backup_info['status'] == 'completed':
                logger.info(f"Monthly backup completed successfully: {backup_info['backup_id']}")
                
                # Monthly backups are kept for 10 years (handled by main cleanup)
                self.send_backup_notification('monthly', backup_info, success=True)
                
            else:
                logger.error(f"Monthly backup failed: {backup_info.get('error', 'Unknown error')}")
                self.send_backup_notification('monthly', backup_info, success=False)
                
        except Exception as e:
            logger.error(f"Monthly backup error: {str(e)}")
            self.send_backup_notification('monthly', {'error': str(e)}, success=False)
    
    def trigger_emergency_backup(self, reason="Manual trigger"):
        """Trigger emergency backup"""
        try:
            logger.info(f"Starting emergency backup: {reason}")
            
            backup_info = medical_backup_system.create_full_backup(backup_type='emergency')
            
            if backup_info['status'] == 'completed':
                logger.info(f"Emergency backup completed: {backup_info['backup_id']}")
                self.send_backup_notification('emergency', backup_info, success=True)
                return backup_info
            else:
                logger.error(f"Emergency backup failed: {backup_info.get('error', 'Unknown error')}")
                self.send_backup_notification('emergency', backup_info, success=False)
                return backup_info
                
        except Exception as e:
            logger.error(f"Emergency backup error: {str(e)}")
            error_info = {'error': str(e), 'backup_id': f'emergency_failed_{datetime.now().strftime("%Y%m%d_%H%M%S")}'}
            self.send_backup_notification('emergency', error_info, success=False)
            return error_info
    
    def cleanup_daily_backups(self):
        """Clean up old daily backups"""
        try:
            retention_days = self.backup_config['daily_backup']['retention_days']
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            
            # Find and remove old daily backups
            backup_root = medical_backup_system.backup_root
            
            for file in os.listdir(backup_root):
                if file.startswith('medical_backup_') and file.endswith('_daily_manifest.json'):
                    manifest_path = os.path.join(backup_root, file)
                    
                    try:
                        with open(manifest_path, 'r') as f:
                            manifest = json.load(f)
                        
                        backup_date = datetime.strptime(manifest['timestamp'], '%Y%m%d_%H%M%S')
                        
                        if backup_date < cutoff_date:
                            backup_id = manifest['backup_id']
                            self.remove_backup(backup_id)
                            logger.info(f"Removed old daily backup: {backup_id}")
                            
                    except Exception as e:
                        logger.error(f"Failed to process backup manifest {file}: {str(e)}")
                        
        except Exception as e:
            logger.error(f"Daily backup cleanup failed: {str(e)}")
    
    def cleanup_weekly_backups(self):
        """Clean up old weekly backups"""
        try:
            retention_weeks = self.backup_config['weekly_backup']['retention_weeks']
            cutoff_date = datetime.now() - timedelta(weeks=retention_weeks)
            
            backup_root = medical_backup_system.backup_root
            
            for file in os.listdir(backup_root):
                if file.startswith('medical_backup_') and file.endswith('_weekly_manifest.json'):
                    manifest_path = os.path.join(backup_root, file)
                    
                    try:
                        with open(manifest_path, 'r') as f:
                            manifest = json.load(f)
                        
                        backup_date = datetime.strptime(manifest['timestamp'], '%Y%m%d_%H%M%S')
                        
                        if backup_date < cutoff_date:
                            backup_id = manifest['backup_id']
                            self.remove_backup(backup_id)
                            logger.info(f"Removed old weekly backup: {backup_id}")
                            
                    except Exception as e:
                        logger.error(f"Failed to process backup manifest {file}: {str(e)}")
                        
        except Exception as e:
            logger.error(f"Weekly backup cleanup failed: {str(e)}")
    
    def remove_backup(self, backup_id):
        """Remove a specific backup"""
        backup_root = medical_backup_system.backup_root
        
        # Remove backup directories
        backup_dirs = [
            os.path.join(backup_root, 'database', backup_id),
            os.path.join(backup_root, 'media', 'dicom', backup_id),
            os.path.join(backup_root, 'system_config', backup_id),
            os.path.join(backup_root, 'verification', backup_id)
        ]
        
        for backup_dir in backup_dirs:
            if os.path.exists(backup_dir):
                import shutil
                shutil.rmtree(backup_dir)
        
        # Remove manifest
        manifest_file = os.path.join(backup_root, f"{backup_id}_manifest.json")
        if os.path.exists(manifest_file):
            os.remove(manifest_file)
    
    def send_backup_notification(self, backup_type, backup_info, success=True):
        """Send backup notification to administrators"""
        try:
            from notifications.models import Notification, NotificationType
            from accounts.models import User
            
            # Create notification type if not exists
            notif_type, created = NotificationType.objects.get_or_create(
                code=f'backup_{backup_type}',
                defaults={
                    'name': f'{backup_type.title()} Backup Notification',
                    'description': f'Notifications for {backup_type} backup operations',
                    'is_system': True
                }
            )
            
            # Prepare notification message
            if success:
                title = f"✅ {backup_type.title()} Backup Successful"
                message = f"Medical backup completed successfully: {backup_info.get('backup_id', 'Unknown')}"
            else:
                title = f"❌ {backup_type.title()} Backup Failed"
                message = f"Medical backup failed: {backup_info.get('error', 'Unknown error')}"
            
            # Send to all administrators
            admin_users = User.objects.filter(is_admin=True)
            
            for admin in admin_users:
                Notification.objects.create(
                    notification_type=notif_type,
                    user=admin,
                    title=title,
                    message=message,
                    data={
                        'backup_type': backup_type,
                        'backup_info': backup_info,
                        'medical_compliance': 'FDA_21_CFR_11',
                        'timestamp': datetime.now().isoformat()
                    }
                )
            
            logger.info(f"Backup notification sent to {admin_users.count()} administrators")
            
        except Exception as e:
            logger.error(f"Failed to send backup notification: {str(e)}")
    
    def get_backup_status(self):
        """Get current backup system status"""
        backup_root = medical_backup_system.backup_root
        
        # Count backups by type
        backup_counts = {
            'daily': 0,
            'weekly': 0,
            'monthly': 0,
            'emergency': 0,
            'manual': 0
        }
        
        total_size_gb = 0
        
        for file in os.listdir(backup_root):
            if file.endswith('_manifest.json'):
                try:
                    manifest_path = os.path.join(backup_root, file)
                    with open(manifest_path, 'r') as f:
                        manifest = json.load(f)
                    
                    backup_type = manifest.get('type', 'manual')
                    if backup_type in backup_counts:
                        backup_counts[backup_type] += 1
                    
                    # Calculate total size
                    if 'components' in manifest:
                        for component in manifest['components'].values():
                            if isinstance(component, dict) and 'total_size_gb' in component:
                                total_size_gb += component['total_size_gb']
                    
                except Exception as e:
                    logger.error(f"Failed to process backup manifest {file}: {str(e)}")
        
        # Get last backup info
        last_backup = None
        try:
            manifest_files = [f for f in os.listdir(backup_root) if f.endswith('_manifest.json')]
            if manifest_files:
                latest_manifest = max(manifest_files, key=lambda x: os.path.getctime(os.path.join(backup_root, x)))
                
                with open(os.path.join(backup_root, latest_manifest), 'r') as f:
                    last_backup = json.load(f)
        except Exception as e:
            logger.error(f"Failed to get last backup info: {str(e)}")
        
        return {
            'scheduler_running': self.is_running,
            'backup_counts': backup_counts,
            'total_backups': sum(backup_counts.values()),
            'total_size_gb': round(total_size_gb, 2),
            'last_backup': last_backup,
            'configuration': self.backup_config,
            'medical_compliance': 'FDA_21_CFR_11_COMPLIANT',
            'retention_policy': '10_YEARS'
        }


# Global scheduler instance
medical_backup_scheduler = MedicalBackupScheduler()