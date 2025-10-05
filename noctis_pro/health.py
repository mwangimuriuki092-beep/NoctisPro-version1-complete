"""
NoctisPro PACS - Health Check Endpoints
System health and readiness checks
"""

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from django.core.cache import cache
from django.conf import settings
import os
import sys


@csrf_exempt
@require_http_methods(["GET", "HEAD"])
def health_check(request):
    """Comprehensive health check"""
    from django.utils import timezone
    
    health_data = {
        'status': 'healthy',
        'service': 'NoctisPro PACS',
        'version': '1.0.0',
        'timestamp': timezone.now().isoformat(),
        'environment': settings.DEPLOYMENT_MODE,
        'checks': {}
    }
    
    # Database check
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_data['checks']['database'] = {'status': 'ok'}
    except Exception as e:
        health_data['checks']['database'] = {'status': 'error', 'message': str(e)}
        health_data['status'] = 'unhealthy'
    
    # Cache check
    try:
        test_key = 'health_check_test'
        cache.set(test_key, 'ok', 10)
        if cache.get(test_key) == 'ok':
            health_data['checks']['cache'] = {'status': 'ok'}
        else:
            health_data['checks']['cache'] = {'status': 'error', 'message': 'Cache read/write failed'}
            health_data['status'] = 'degraded'
        cache.delete(test_key)
    except Exception as e:
        health_data['checks']['cache'] = {'status': 'error', 'message': str(e)}
        health_data['status'] = 'degraded'
    
    # Storage check
    try:
        media_exists = os.path.exists(settings.MEDIA_ROOT)
        dicom_exists = os.path.exists(settings.DICOM_ROOT)
        
        if media_exists and dicom_exists:
            health_data['checks']['storage'] = {'status': 'ok'}
        else:
            health_data['checks']['storage'] = {
                'status': 'warning',
                'message': 'Some storage directories missing'
            }
            health_data['status'] = 'degraded'
    except Exception as e:
        health_data['checks']['storage'] = {'status': 'error', 'message': str(e)}
        health_data['status'] = 'degraded'
    
    status_code = 200 if health_data['status'] == 'healthy' else 503
    return JsonResponse(health_data, status=status_code)


@csrf_exempt
@require_http_methods(["GET", "HEAD"])
def simple_health_check(request):
    """Simple health check for load balancers"""
    return JsonResponse({'status': 'ok'}, status=200)


@csrf_exempt
@require_http_methods(["GET", "HEAD"])
def ready_check(request):
    """Readiness check for Kubernetes"""
    try:
        # Check database connectivity
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({'status': 'ready'}, status=200)
    except Exception as e:
        return JsonResponse({
            'status': 'not_ready',
            'error': str(e)
        }, status=503)


@csrf_exempt
@require_http_methods(["GET", "HEAD"])
def live_check(request):
    """Liveness check for Kubernetes"""
    return JsonResponse({'status': 'alive'}, status=200)
