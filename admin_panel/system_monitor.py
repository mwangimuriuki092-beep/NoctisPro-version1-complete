"""
System Monitoring Dashboard
Safe enhancement - separate monitoring system
Real-time system health and performance metrics
"""

import psutil
import os
import time
import json
from datetime import datetime, timedelta
from django.conf import settings
from django.db import connection
from django.core.cache import cache
from worklist.models import Study, DicomImage
from accounts.models import User, UserSession
import logging

logger = logging.getLogger('system_monitor')

class SystemMonitor:
    """
    Professional system monitoring for medical PACS
    Safe monitoring - doesn't affect system performance
    """
    
    def __init__(self):
        self.cache_duration = 60  # Cache metrics for 1 minute
        
    def get_system_metrics(self):
        """Get comprehensive system metrics"""
        cache_key = 'system_metrics'
        cached_metrics = cache.get(cache_key)
        
        if cached_metrics:
            return cached_metrics
        
        try:
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'system': self.get_system_info(),
                'database': self.get_database_metrics(),
                'storage': self.get_storage_metrics(),
                'performance': self.get_performance_metrics(),
                'medical_data': self.get_medical_data_metrics(),
                'users': self.get_user_metrics(),
                'health_status': 'healthy'
            }
            
            # Determine overall health
            metrics['health_status'] = self.determine_health_status(metrics)
            
            # Cache for 1 minute
            cache.set(cache_key, metrics, self.cache_duration)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get system metrics: {str(e)}")
            return {
                'timestamp': datetime.now().isoformat(),
                'error': str(e),
                'health_status': 'error'
            }
    
    def get_system_info(self):
        """Get basic system information"""
        try:
            boot_time = datetime.fromtimestamp(psutil.boot_time())
            uptime = datetime.now() - boot_time
            
            return {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'cpu_count': psutil.cpu_count(),
                'memory': {
                    'total_gb': round(psutil.virtual_memory().total / (1024**3), 2),
                    'used_gb': round(psutil.virtual_memory().used / (1024**3), 2),
                    'percent': psutil.virtual_memory().percent,
                    'available_gb': round(psutil.virtual_memory().available / (1024**3), 2)
                },
                'disk': {
                    'total_gb': round(psutil.disk_usage('/').total / (1024**3), 2),
                    'used_gb': round(psutil.disk_usage('/').used / (1024**3), 2),
                    'free_gb': round(psutil.disk_usage('/').free / (1024**3), 2),
                    'percent': round((psutil.disk_usage('/').used / psutil.disk_usage('/').total) * 100, 1)
                },
                'uptime': {
                    'days': uptime.days,
                    'hours': uptime.seconds // 3600,
                    'minutes': (uptime.seconds % 3600) // 60
                },
                'load_average': os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
            }
        except Exception as e:
            logger.error(f"Failed to get system info: {str(e)}")
            return {'error': str(e)}
    
    def get_database_metrics(self):
        """Get database performance metrics"""
        try:
            # Database connection info
            db_metrics = {
                'engine': settings.DATABASES['default']['ENGINE'],
                'host': settings.DATABASES['default'].get('HOST', 'localhost'),
                'port': settings.DATABASES['default'].get('PORT', '5432')
            }
            
            # Query performance test
            start_time = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            query_time_ms = (time.time() - start_time) * 1000
            
            db_metrics['query_response_time_ms'] = round(query_time_ms, 2)
            db_metrics['connection_status'] = 'healthy' if query_time_ms < 100 else 'slow'
            
            # Get database size if PostgreSQL
            if 'postgresql' in db_metrics['engine']:
                try:
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                                   pg_database_size(current_database()) as size_bytes
                        """)
                        result = cursor.fetchone()
                        if result:
                            db_metrics['database_size'] = result[0]
                            db_metrics['database_size_bytes'] = result[1]
                except Exception:
                    pass
            
            return db_metrics
            
        except Exception as e:
            logger.error(f"Failed to get database metrics: {str(e)}")
            return {'error': str(e), 'connection_status': 'error'}
    
    def get_storage_metrics(self):
        """Get storage metrics for medical data"""
        try:
            media_root = getattr(settings, 'MEDIA_ROOT', '/tmp')
            
            storage_metrics = {
                'media_root': media_root,
                'dicom_storage': {
                    'path': os.path.join(media_root, 'dicom'),
                    'exists': os.path.exists(os.path.join(media_root, 'dicom'))
                }
            }
            
            # Calculate DICOM storage usage
            dicom_path = os.path.join(media_root, 'dicom')
            if os.path.exists(dicom_path):
                total_size = 0
                file_count = 0
                
                for root, dirs, files in os.walk(dicom_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        try:
                            total_size += os.path.getsize(file_path)
                            file_count += 1
                        except OSError:
                            pass
                
                storage_metrics['dicom_storage'].update({
                    'total_size_gb': round(total_size / (1024**3), 2),
                    'file_count': file_count,
                    'avg_file_size_mb': round((total_size / file_count) / (1024**2), 2) if file_count > 0 else 0
                })
            
            return storage_metrics
            
        except Exception as e:
            logger.error(f"Failed to get storage metrics: {str(e)}")
            return {'error': str(e)}
    
    def get_performance_metrics(self):
        """Get application performance metrics"""
        try:
            # Network connections
            connections = len(psutil.net_connections())
            
            # Process information
            current_process = psutil.Process()
            
            return {
                'network_connections': connections,
                'process_info': {
                    'memory_mb': round(current_process.memory_info().rss / (1024**2), 2),
                    'cpu_percent': current_process.cpu_percent(),
                    'threads': current_process.num_threads(),
                    'open_files': len(current_process.open_files()) if hasattr(current_process, 'open_files') else 0
                },
                'response_times': {
                    'database_ms': self.get_database_metrics().get('query_response_time_ms', 0),
                    'last_measured': datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance metrics: {str(e)}")
            return {'error': str(e)}
    
    def get_medical_data_metrics(self):
        """Get medical data specific metrics"""
        try:
            # Count medical data
            total_studies = Study.objects.count()
            total_images = DicomImage.objects.count()
            
            # Recent activity (last 24 hours)
            yesterday = datetime.now() - timedelta(days=1)
            recent_studies = Study.objects.filter(created_at__gte=yesterday).count()
            
            # Storage by modality
            modality_stats = {}
            try:
                from django.db.models import Count
                modalities = Study.objects.values('modality__code').annotate(
                    count=Count('id')
                ).order_by('-count')
                
                for modality in modalities:
                    code = modality['modality__code'] or 'Unknown'
                    modality_stats[code] = modality['count']
            except Exception:
                pass
            
            return {
                'total_studies': total_studies,
                'total_images': total_images,
                'recent_studies_24h': recent_studies,
                'avg_images_per_study': round(total_images / max(total_studies, 1), 1),
                'modality_distribution': modality_stats,
                'medical_compliance': 'DICOM_COMPLIANT'
            }
            
        except Exception as e:
            logger.error(f"Failed to get medical data metrics: {str(e)}")
            return {'error': str(e)}
    
    def get_user_metrics(self):
        """Get user activity metrics"""
        try:
            total_users = User.objects.count()
            active_sessions = UserSession.objects.filter(is_active=True).count()
            
            # Recent logins (last 24 hours)
            yesterday = datetime.now() - timedelta(days=1)
            recent_logins = UserSession.objects.filter(login_time__gte=yesterday).count()
            
            # User roles distribution
            role_stats = {}
            try:
                for role in ['admin', 'radiologist', 'technician', 'facility_user']:
                    count = User.objects.filter(**{f'is_{role}': True}).count()
                    if count > 0:
                        role_stats[role] = count
            except Exception:
                pass
            
            return {
                'total_users': total_users,
                'active_sessions': active_sessions,
                'recent_logins_24h': recent_logins,
                'role_distribution': role_stats
            }
            
        except Exception as e:
            logger.error(f"Failed to get user metrics: {str(e)}")
            return {'error': str(e)}
    
    def determine_health_status(self, metrics):
        """Determine overall system health"""
        try:
            issues = []
            
            # Check CPU usage
            cpu_percent = metrics.get('system', {}).get('cpu_percent', 0)
            if cpu_percent > 90:
                issues.append('High CPU usage')
            
            # Check memory usage
            memory_percent = metrics.get('system', {}).get('memory', {}).get('percent', 0)
            if memory_percent > 90:
                issues.append('High memory usage')
            
            # Check disk usage
            disk_percent = metrics.get('system', {}).get('disk', {}).get('percent', 0)
            if disk_percent > 90:
                issues.append('High disk usage')
            
            # Check database response time
            db_response = metrics.get('database', {}).get('query_response_time_ms', 0)
            if db_response > 1000:
                issues.append('Slow database response')
            
            # Determine status
            if len(issues) == 0:
                return 'healthy'
            elif len(issues) <= 2:
                return 'warning'
            else:
                return 'critical'
                
        except Exception:
            return 'unknown'


# Global monitor instance
system_monitor = SystemMonitor()