"""
NoctisPro PACS - Core Views
Error handlers and utility views
"""

from django.shortcuts import render
from django.http import JsonResponse
from django.views.generic import View
from django.views.static import serve as static_serve
from django.conf import settings
import mimetypes
import os


# =============================================================================
# ERROR HANDLERS
# =============================================================================

def bad_request(request, exception=None):
    """Handle 400 Bad Request errors"""
    context = {
        'error_code': 400,
        'error_title': 'Bad Request',
        'error_message': 'The request could not be understood by the server.',
    }
    return render(request, 'errors/error.html', context, status=400)


def permission_denied(request, exception=None):
    """Handle 403 Permission Denied errors"""
    context = {
        'error_code': 403,
        'error_title': 'Permission Denied',
        'error_message': 'You do not have permission to access this resource.',
    }
    return render(request, 'errors/error.html', context, status=403)


def page_not_found(request, exception=None):
    """Handle 404 Page Not Found errors"""
    context = {
        'error_code': 404,
        'error_title': 'Page Not Found',
        'error_message': 'The requested page could not be found.',
    }
    return render(request, 'errors/error.html', context, status=404)


def server_error(request):
    """Handle 500 Server Error"""
    context = {
        'error_code': 500,
        'error_title': 'Server Error',
        'error_message': 'An internal server error occurred. Please try again later.',
    }
    return render(request, 'errors/error.html', context, status=500)


def rate_limited(request, exception=None):
    """Handle rate limit errors"""
    context = {
        'error_code': 429,
        'error_title': 'Too Many Requests',
        'error_message': 'You have exceeded the rate limit. Please try again later.',
    }
    return render(request, 'errors/error.html', context, status=429)


# =============================================================================
# STATIC FILE SERVING WITH PROPER MIME TYPES
# =============================================================================

class StaticFileView(View):
    """Serve static files with proper MIME types"""
    
    def get(self, request, path):
        """Serve static file with correct MIME type"""
        # Get the file's MIME type
        content_type, encoding = mimetypes.guess_type(path)
        
        # Set proper MIME type for common files
        if path.endswith('.js'):
            content_type = 'application/javascript'
        elif path.endswith('.css'):
            content_type = 'text/css'
        elif path.endswith('.json'):
            content_type = 'application/json'
        elif path.endswith('.svg'):
            content_type = 'image/svg+xml'
        
        # Serve the file
        response = static_serve(
            request,
            path,
            document_root=settings.STATIC_ROOT
        )
        
        # Set the content type if determined
        if content_type:
            response['Content-Type'] = content_type
        
        return response


# =============================================================================
# HEALTH CHECK VIEWS
# =============================================================================

class HealthCheckView(View):
    """Comprehensive health check endpoint"""
    
    def get(self, request):
        """Return system health status"""
        from django.db import connection
        from django.core.cache import cache
        import sys
        
        health_data = {
            'status': 'healthy',
            'service': 'NoctisPro PACS',
            'version': '1.0.0',
            'python_version': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            'checks': {}
        }
        
        # Database check
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            health_data['checks']['database'] = 'ok'
        except Exception as e:
            health_data['checks']['database'] = f'error: {str(e)}'
            health_data['status'] = 'unhealthy'
        
        # Cache check
        try:
            cache.set('health_check', 'ok', 10)
            if cache.get('health_check') == 'ok':
                health_data['checks']['cache'] = 'ok'
            else:
                health_data['checks']['cache'] = 'error'
                health_data['status'] = 'degraded'
        except Exception as e:
            health_data['checks']['cache'] = f'error: {str(e)}'
            health_data['status'] = 'degraded'
        
        # Media directory check
        try:
            if os.path.exists(settings.MEDIA_ROOT):
                health_data['checks']['media_storage'] = 'ok'
            else:
                health_data['checks']['media_storage'] = 'missing'
                health_data['status'] = 'degraded'
        except Exception as e:
            health_data['checks']['media_storage'] = f'error: {str(e)}'
            health_data['status'] = 'degraded'
        
        status_code = 200 if health_data['status'] == 'healthy' else 503
        return JsonResponse(health_data, status=status_code)


class ReadyCheckView(View):
    """Kubernetes-style readiness check"""
    
    def get(self, request):
        """Check if application is ready to serve requests"""
        from django.db import connection
        
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


class LiveCheckView(View):
    """Kubernetes-style liveness check"""
    
    def get(self, request):
        """Check if application is alive"""
        return JsonResponse({'status': 'alive'}, status=200)


# =============================================================================
# UTILITY VIEWS
# =============================================================================

class MaintenanceModeView(View):
    """Display maintenance mode page"""
    
    def get(self, request):
        """Show maintenance page"""
        return render(request, 'maintenance.html', status=503)
