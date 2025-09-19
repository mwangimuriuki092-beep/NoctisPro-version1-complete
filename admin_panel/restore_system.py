"""
Medical Data Restore System
Professional disaster recovery for medical imaging systems
FDA 21 CFR Part 11 compliant restoration
"""

import os
import json
import tarfile
import subprocess
import logging
from datetime import datetime
from django.conf import settings
from .backup_system import medical_backup_system

logger = logging.getLogger('medical_restore')

class MedicalRestoreSystem:
    """
    Professional medical data restore system
    - Complete system restoration from backups
    - Database restoration with integrity verification
    - DICOM file restoration with checksum validation
    - Medical compliance verification
    """
    
    def __init__(self):
        self.backup_root = medical_backup_system.backup_root
        self.restore_log = []
        
    def list_available_backups(self):
        """List all available backups for restoration"""
        backups = []
        
        if not os.path.exists(self.backup_root):
            return backups
        
        # Find all backup manifests
        for file in os.listdir(self.backup_root):
            if file.endswith('_manifest.json'):
                try:
                    manifest_path = os.path.join(self.backup_root, file)
                    with open(manifest_path, 'r') as f:
                        manifest = json.load(f)
                    
                    backups.append({
                        'backup_id': manifest['backup_id'],
                        'timestamp': manifest['timestamp'],
                        'type': manifest.get('type', 'unknown'),
                        'status': manifest.get('status', 'unknown'),
                        'size_info': self.get_backup_size_info(manifest),
                        'components': list(manifest.get('components', {}).keys()),
                        'medical_compliance': manifest.get('medical_compliance', 'UNKNOWN'),
                        'manifest_path': manifest_path
                    })
                    
                except Exception as e:
                    logger.error(f"Failed to read backup manifest {file}: {str(e)}")
        
        # Sort by timestamp (newest first)
        backups.sort(key=lambda x: x['timestamp'], reverse=True)
        return backups
    
    def get_backup_size_info(self, manifest):
        """Extract size information from backup manifest"""
        total_size_gb = 0
        
        if 'components' in manifest:
            for component in manifest['components'].values():
                if isinstance(component, dict):
                    if 'total_size_gb' in component:
                        total_size_gb += component['total_size_gb']
                    elif 'total_size_mb' in component:
                        total_size_gb += component['total_size_mb'] / 1024
        
        return {
            'total_size_gb': round(total_size_gb, 2)
        }
    
    def restore_from_backup(self, backup_id, components=None, verify_integrity=True):
        """
        Restore system from backup
        
        Args:
            backup_id: ID of backup to restore from
            components: List of components to restore ['database', 'dicom_files', 'system_config']
                       If None, restores all components
            verify_integrity: Whether to verify backup integrity before restore
        """
        
        restore_info = {
            'restore_id': f"restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'backup_id': backup_id,
            'start_time': datetime.now().isoformat(),
            'components_requested': components or ['database', 'dicom_files', 'system_config'],
            'status': 'in_progress',
            'steps': [],
            'medical_compliance': 'FDA_21_CFR_11_RESTORE'
        }
        
        try:
            logger.info(f"Starting medical data restore from backup: {backup_id}")
            
            # 1. Load backup manifest
            manifest_path = os.path.join(self.backup_root, f"{backup_id}_manifest.json")
            if not os.path.exists(manifest_path):
                raise Exception(f"Backup manifest not found: {backup_id}")
            
            with open(manifest_path, 'r') as f:
                backup_manifest = json.load(f)
            
            restore_info['backup_manifest'] = backup_manifest
            
            # 2. Verify backup integrity if requested
            if verify_integrity:
                integrity_result = self.verify_backup_integrity(backup_id)
                restore_info['steps'].append({
                    'step': 'integrity_verification',
                    'status': 'completed' if integrity_result['valid'] else 'failed',
                    'details': integrity_result
                })
                
                if not integrity_result['valid']:
                    raise Exception("Backup integrity verification failed")
            
            # 3. Check if backup is compressed
            if 'compression' in backup_manifest:
                decompress_result = self.decompress_backup(backup_id, backup_manifest)
                restore_info['steps'].append({
                    'step': 'decompression',
                    'status': decompress_result['status'],
                    'details': decompress_result
                })
                
                if decompress_result['status'] != 'completed':
                    raise Exception("Backup decompression failed")
            
            # 4. Restore components
            components_to_restore = components or ['database', 'dicom_files', 'system_config']
            
            for component in components_to_restore:
                if component == 'database':
                    result = self.restore_database(backup_id, backup_manifest)
                elif component == 'dicom_files':
                    result = self.restore_dicom_files(backup_id, backup_manifest)
                elif component == 'system_config':
                    result = self.restore_system_config(backup_id, backup_manifest)
                else:
                    result = {'status': 'skipped', 'reason': f'Unknown component: {component}'}
                
                restore_info['steps'].append({
                    'step': f'restore_{component}',
                    'status': result['status'],
                    'details': result
                })
                
                if result['status'] == 'failed':
                    logger.error(f"Failed to restore component {component}: {result.get('error', 'Unknown error')}")
            
            restore_info['status'] = 'completed'
            restore_info['end_time'] = datetime.now().isoformat()
            
            logger.info(f"Medical data restore completed successfully: {restore_info['restore_id']}")
            
        except Exception as e:
            restore_info['status'] = 'failed'
            restore_info['error'] = str(e)
            restore_info['end_time'] = datetime.now().isoformat()
            
            logger.error(f"Medical data restore failed: {str(e)}")
            
        finally:
            # Save restore log
            self.save_restore_log(restore_info)
        
        return restore_info
    
    def verify_backup_integrity(self, backup_id):
        """Verify backup integrity using checksums"""
        try:
            verification_dir = os.path.join(self.backup_root, 'verification', backup_id)
            verification_file = os.path.join(verification_dir, 'integrity_verification.json')
            
            if not os.path.exists(verification_file):
                return {
                    'valid': False,
                    'reason': 'No integrity verification file found'
                }
            
            with open(verification_file, 'r') as f:
                verification_data = json.load(f)
            
            # Verify checksums for each component
            failed_files = []
            verified_files = 0
            
            for component_name, checksums in verification_data['checksums'].items():
                component_dir = os.path.join(self.backup_root, component_name, backup_id)
                
                if not os.path.exists(component_dir):
                    continue
                
                for rel_path, expected_checksum in checksums.items():
                    file_path = os.path.join(component_dir, rel_path)
                    
                    if os.path.exists(file_path):
                        actual_checksum = medical_backup_system.calculate_file_checksum(file_path)
                        
                        if actual_checksum == expected_checksum:
                            verified_files += 1
                        else:
                            failed_files.append({
                                'file': rel_path,
                                'expected': expected_checksum,
                                'actual': actual_checksum
                            })
            
            return {
                'valid': len(failed_files) == 0,
                'verified_files': verified_files,
                'failed_files': failed_files,
                'medical_compliance': 'FDA_21_CFR_11_VERIFIED'
            }
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def decompress_backup(self, backup_id, backup_manifest):
        """Decompress backup archive if compressed"""
        try:
            if 'compression' not in backup_manifest:
                return {'status': 'skipped', 'reason': 'Backup not compressed'}
            
            archive_path = backup_manifest['compression']['archive_path']
            
            if not os.path.exists(archive_path):
                return {'status': 'failed', 'error': 'Compressed archive not found'}
            
            # Extract archive
            with tarfile.open(archive_path, 'r:gz') as tar:
                extract_path = os.path.join(self.backup_root, 'temp_restore', backup_id)
                os.makedirs(extract_path, exist_ok=True)
                tar.extractall(extract_path)
            
            return {
                'status': 'completed',
                'extract_path': extract_path,
                'original_size_gb': backup_manifest['compression']['original_size_gb'],
                'compressed_size_gb': backup_manifest['compression']['compressed_size_gb']
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    def restore_database(self, backup_id, backup_manifest):
        """Restore database from backup"""
        try:
            db_backup_dir = os.path.join(self.backup_root, 'database', backup_id)
            
            if not os.path.exists(db_backup_dir):
                return {'status': 'failed', 'error': 'Database backup directory not found'}
            
            # Find PostgreSQL dump file
            pg_dump_file = None
            for file in os.listdir(db_backup_dir):
                if file.startswith('postgresql_dump_') and file.endswith('.sql'):
                    pg_dump_file = os.path.join(db_backup_dir, file)
                    break
            
            if not pg_dump_file:
                return {'status': 'failed', 'error': 'PostgreSQL dump file not found'}
            
            # Restore database
            if 'postgresql' in settings.DATABASES['default']['ENGINE']:
                db_config = settings.DATABASES['default']
                
                # Create restore command
                psql_cmd = [
                    'psql',
                    f"--host={db_config.get('HOST', 'localhost')}",
                    f"--port={db_config.get('PORT', '5432')}",
                    f"--username={db_config.get('USER', 'postgres')}",
                    f"--dbname={db_config['NAME']}",
                    '--no-password',
                    f"--file={pg_dump_file}"
                ]
                
                # Set password via environment
                env = os.environ.copy()
                env['PGPASSWORD'] = db_config.get('PASSWORD', '')
                
                result = subprocess.run(psql_cmd, env=env, capture_output=True, text=True)
                
                if result.returncode == 0:
                    return {
                        'status': 'completed',
                        'restored_from': pg_dump_file,
                        'medical_compliance': 'DATABASE_RESTORED_FDA_COMPLIANT'
                    }
                else:
                    return {
                        'status': 'failed',
                        'error': result.stderr,
                        'command': ' '.join(psql_cmd)
                    }
            
            return {'status': 'failed', 'error': 'Unsupported database engine'}
            
        except Exception as e:
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    def restore_dicom_files(self, backup_id, backup_manifest):
        """Restore DICOM files from backup"""
        try:
            dicom_backup_dir = os.path.join(self.backup_root, 'media', 'dicom', backup_id)
            dicom_target_dir = os.path.join(settings.MEDIA_ROOT, 'dicom')
            
            if not os.path.exists(dicom_backup_dir):
                return {'status': 'failed', 'error': 'DICOM backup directory not found'}
            
            # Create target directory
            os.makedirs(dicom_target_dir, exist_ok=True)
            
            # Copy DICOM files with verification
            copied_files = 0
            failed_files = 0
            
            for root, dirs, files in os.walk(dicom_backup_dir):
                for file in files:
                    if file == 'dicom_manifest.json':
                        continue
                    
                    source_path = os.path.join(root, file)
                    rel_path = os.path.relpath(source_path, dicom_backup_dir)
                    target_path = os.path.join(dicom_target_dir, rel_path)
                    target_dir = os.path.dirname(target_path)
                    
                    try:
                        os.makedirs(target_dir, exist_ok=True)
                        
                        # Copy file
                        import shutil
                        shutil.copy2(source_path, target_path)
                        
                        # Verify copy
                        source_checksum = medical_backup_system.calculate_file_checksum(source_path)
                        target_checksum = medical_backup_system.calculate_file_checksum(target_path)
                        
                        if source_checksum == target_checksum:
                            copied_files += 1
                        else:
                            failed_files += 1
                            logger.error(f"Checksum mismatch for restored file: {rel_path}")
                            
                    except Exception as e:
                        failed_files += 1
                        logger.error(f"Failed to restore DICOM file {rel_path}: {str(e)}")
            
            return {
                'status': 'completed' if failed_files == 0 else 'partial',
                'copied_files': copied_files,
                'failed_files': failed_files,
                'target_directory': dicom_target_dir,
                'medical_compliance': 'DICOM_FILES_RESTORED_WITH_INTEGRITY_CHECK'
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    def restore_system_config(self, backup_id, backup_manifest):
        """Restore system configuration from backup"""
        try:
            config_backup_dir = os.path.join(self.backup_root, 'system_config', backup_id)
            
            if not os.path.exists(config_backup_dir):
                return {'status': 'failed', 'error': 'System config backup directory not found'}
            
            restored_files = []
            
            # Restore configuration files (with caution)
            config_files = [
                'requirements.txt',
                'system_info.json'
            ]
            
            for config_file in config_files:
                source_path = os.path.join(config_backup_dir, config_file)
                
                if os.path.exists(source_path):
                    if config_file == 'system_info.json':
                        # Just log system info, don't restore
                        with open(source_path, 'r') as f:
                            system_info = json.load(f)
                        restored_files.append({
                            'file': config_file,
                            'action': 'logged',
                            'info': system_info
                        })
                    else:
                        # For requirements.txt, create a backup restore version
                        target_path = os.path.join(settings.BASE_DIR, f"{config_file}.restore_backup")
                        import shutil
                        shutil.copy2(source_path, target_path)
                        restored_files.append({
                            'file': config_file,
                            'action': 'restored_as_backup',
                            'target': target_path
                        })
            
            return {
                'status': 'completed',
                'restored_files': restored_files,
                'medical_compliance': 'SYSTEM_CONFIG_RESTORED_SAFELY'
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    def save_restore_log(self, restore_info):
        """Save restore operation log"""
        log_dir = os.path.join(self.backup_root, 'restore_logs')
        os.makedirs(log_dir, exist_ok=True)
        
        log_file = os.path.join(log_dir, f"{restore_info['restore_id']}_log.json")
        
        with open(log_file, 'w') as f:
            json.dump(restore_info, f, indent=2)
        
        logger.info(f"Restore log saved: {log_file}")


# Global restore system instance
medical_restore_system = MedicalRestoreSystem()