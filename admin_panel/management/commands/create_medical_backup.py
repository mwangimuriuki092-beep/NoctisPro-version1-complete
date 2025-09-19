"""
Django management command to create medical backup manually
Usage: python manage.py create_medical_backup [--type manual|emergency]
"""

from django.core.management.base import BaseCommand
from admin_panel.backup_system import medical_backup_system
import json

class Command(BaseCommand):
    help = 'Create a manual medical backup of all system data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            type=str,
            default='manual',
            choices=['manual', 'emergency', 'daily', 'weekly', 'monthly'],
            help='Type of backup to create (default: manual)',
        )

    def handle(self, *args, **options):
        backup_type = options['type']
        
        self.stdout.write(
            self.style.SUCCESS(f'🏥 Creating {backup_type} medical backup...')
        )
        
        try:
            # Create the backup
            backup_info = medical_backup_system.create_full_backup(backup_type=backup_type)
            
            if backup_info['status'] == 'completed':
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Medical backup completed successfully!')
                )
                
                # Display backup information
                self.stdout.write(f"\n📋 Backup Details:")
                self.stdout.write(f"  Backup ID: {backup_info['backup_id']}")
                self.stdout.write(f"  Type: {backup_info['type'].title()}")
                self.stdout.write(f"  Timestamp: {backup_info['timestamp']}")
                self.stdout.write(f"  Medical Compliance: {backup_info['medical_compliance']}")
                
                # Component details
                if 'components' in backup_info:
                    self.stdout.write(f"\n📊 Components Backed Up:")
                    
                    for component_name, component_info in backup_info['components'].items():
                        if isinstance(component_info, dict) and component_info.get('status') == 'completed':
                            self.stdout.write(f"  ✅ {component_name.replace('_', ' ').title()}")
                            
                            if 'total_size_mb' in component_info:
                                size_mb = component_info['total_size_mb']
                                if size_mb > 1024:
                                    self.stdout.write(f"     Size: {size_mb/1024:.2f} GB")
                                else:
                                    self.stdout.write(f"     Size: {size_mb:.1f} MB")
                            
                            if component_name == 'database' and 'files' in component_info:
                                files = component_info['files']
                                self.stdout.write(f"     Files: {len(files)} database files")
                            
                            if component_name == 'dicom_files':
                                if 'copied_files' in component_info:
                                    self.stdout.write(f"     DICOM Files: {component_info['copied_files']}")
                                if 'total_size_gb' in component_info:
                                    self.stdout.write(f"     DICOM Size: {component_info['total_size_gb']:.2f} GB")
                        else:
                            self.stdout.write(f"  ❌ {component_name.replace('_', ' ').title()}: {component_info.get('status', 'unknown')}")
                
                # Integrity verification
                if 'integrity_checks' in backup_info:
                    integrity = backup_info['integrity_checks']
                    if integrity.get('status') == 'completed':
                        self.stdout.write(f"\n🔒 Integrity Verification: ✅ Passed")
                        self.stdout.write(f"     Components Verified: {integrity.get('components_verified', 0)}")
                        self.stdout.write(f"     Medical Compliance: {integrity.get('medical_compliance', 'FDA_21_CFR_11')}")
                    else:
                        self.stdout.write(f"\n🔒 Integrity Verification: ❌ Failed")
                
                # Compression info
                if 'compression' in backup_info:
                    comp = backup_info['compression']
                    if comp.get('status') == 'completed':
                        self.stdout.write(f"\n📦 Compression:")
                        self.stdout.write(f"     Original Size: {comp['original_size_gb']:.2f} GB")
                        self.stdout.write(f"     Compressed Size: {comp['compressed_size_gb']:.2f} GB")
                        self.stdout.write(f"     Compression Ratio: {comp['compression_ratio_percent']:.1f}%")
                        self.stdout.write(f"     Archive: {comp['archive_path']}")
                
                # Retention information
                if 'retention_until' in backup_info:
                    self.stdout.write(f"\n📅 Retention Policy:")
                    self.stdout.write(f"     Retained Until: {backup_info['retention_until'][:10]} (10 years)")
                    self.stdout.write(f"     Medical Compliance: FDA 21 CFR Part 11")
                
            else:
                self.stdout.write(
                    self.style.ERROR(f'❌ Medical backup failed!')
                )
                
                if 'error' in backup_info:
                    self.stdout.write(f"Error: {backup_info['error']}")
                
                # Show component status
                if 'components' in backup_info:
                    self.stdout.write(f"\nComponent Status:")
                    for component_name, component_info in backup_info['components'].items():
                        status = component_info.get('status', 'unknown') if isinstance(component_info, dict) else 'unknown'
                        status_icon = '✅' if status == 'completed' else '❌' if status == 'failed' else '⏳'
                        self.stdout.write(f"  {status_icon} {component_name.replace('_', ' ').title()}: {status}")
                        
                        if isinstance(component_info, dict) and 'error' in component_info:
                            self.stdout.write(f"     Error: {component_info['error']}")
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Backup creation failed: {str(e)}')
            )
            raise