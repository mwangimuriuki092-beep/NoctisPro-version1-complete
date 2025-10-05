"""
NoctisPro PACS - Main URL Configuration
Comprehensive URL routing with proper namespacing
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from django.http import HttpResponse, JsonResponse
from django.views.generic import RedirectView, TemplateView
import base64


# =============================================================================
# HELPER VIEWS
# =============================================================================

def home_redirect(request):
    """Redirect home page based on authentication"""
    if request.user.is_authenticated:
        return redirect('worklist:dashboard')
    return redirect('accounts:login')


def favicon_view(request):
    """Serve minimal PNG favicon"""
    png_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8zwAAAgEBAHBhFJQAAAAASUVORK5CYII="
    png_bytes = base64.b64decode(png_b64)
    response = HttpResponse(png_bytes, content_type='image/png')
    response['Cache-Control'] = 'public, max-age=86400'
    return response


def robots_txt(request):
    """Robots.txt for search engine control"""
    content = """User-agent: *
Disallow: /admin/
Disallow: /api/
Disallow: /media/
Disallow: /static/
"""
    return HttpResponse(content, content_type='text/plain')


def health_check(request):
    """Simple health check endpoint"""
    return JsonResponse({
        'status': 'healthy',
        'service': 'NoctisPro PACS',
        'version': '1.0.0'
    })


# =============================================================================
# URL PATTERNS
# =============================================================================

urlpatterns = [
    # =========================================================================
    # CORE ROUTES
    # =========================================================================
    path('', home_redirect, name='home'),
    path('favicon.ico', favicon_view, name='favicon'),
    path('robots.txt', robots_txt, name='robots'),
    path('health/', health_check, name='health_check'),
    
    # =========================================================================
    # DJANGO ADMIN
    # =========================================================================
    path('django-admin/', admin.site.urls, name='django_admin'),
    
    # =========================================================================
    # AUTHENTICATION & ACCOUNTS
    # =========================================================================
    path('', include('accounts.urls', namespace='accounts')),
    
    # =========================================================================
    # WORKLIST (PATIENT & STUDY MANAGEMENT)
    # =========================================================================
    path('worklist/', include('worklist.urls', namespace='worklist')),
    
    # =========================================================================
    # DICOM VIEWER
    # =========================================================================
    path('dicom-viewer/', include('dicom_viewer.urls', namespace='dicom_viewer')),
    
    # Legacy viewer redirect for backwards compatibility
    path('viewer/', RedirectView.as_view(
        pattern_name='dicom_viewer:index',
        permanent=False
    )),
    path('viewer/<int:study_id>/', RedirectView.as_view(
        pattern_name='dicom_viewer:viewer',
        permanent=False
    )),
    
    # =========================================================================
    # REPORTS
    # =========================================================================
    path('reports/', include('reports.urls', namespace='reports')),
    
    # =========================================================================
    # AI ANALYSIS
    # =========================================================================
    path('ai/', include('ai_analysis.urls', namespace='ai_analysis')),
    
    # =========================================================================
    # NOTIFICATIONS
    # =========================================================================
    path('notifications/', include('notifications.urls', namespace='notifications')),
    
    # =========================================================================
    # CHAT
    # =========================================================================
    path('chat/', include('chat.urls', namespace='chat')),
    
    # =========================================================================
    # ADMIN PANEL
    # =========================================================================
    path('admin-panel/', include('admin_panel.urls', namespace='admin_panel')),
    
    # Alternative admin route
    path('admin/', RedirectView.as_view(
        pattern_name='admin_panel:dashboard',
        permanent=False
    )),
]

# =============================================================================
# MEDIA FILES SERVING
# =============================================================================

if settings.DEBUG or settings.SERVE_MEDIA_FILES:
    # Serve media files
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
    # Serve static files in development
    if settings.DEBUG:
        urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# =============================================================================
# API DOCUMENTATION (Optional)
# =============================================================================

if settings.DEBUG:
    urlpatterns += [
        path('api/docs/', TemplateView.as_view(
            template_name='api_docs.html'
        ), name='api_docs'),
    ]

# =============================================================================
# ERROR HANDLERS
# =============================================================================

handler400 = 'noctis_pro.views.bad_request'
handler403 = 'noctis_pro.views.permission_denied'
handler404 = 'noctis_pro.views.page_not_found'
handler500 = 'noctis_pro.views.server_error'

# =============================================================================
# DEVELOPMENT TOOLS
# =============================================================================

if settings.DEBUG:
    # Add debug toolbar if installed
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass

# =============================================================================
# URL CONFIGURATION SUMMARY
# =============================================================================

print("=" * 80)
print("🔗 NoctisPro PACS - URL Configuration Loaded")
print("=" * 80)
print(f"📍 Total URL patterns: {len(urlpatterns)}")
print(f"🔧 Debug mode: {settings.DEBUG}")
print(f"📁 Media serving: {settings.SERVE_MEDIA_FILES or settings.DEBUG}")
print("=" * 80)
print("Available namespaces:")
print("  • accounts       - Authentication & user management")
print("  • worklist       - Patient & study management")
print("  • dicom_viewer   - Medical image viewing")
print("  • reports        - Report management")
print("  • ai_analysis    - AI-powered analysis")
print("  • notifications  - Notification system")
print("  • chat           - Communication system")
print("  • admin_panel    - System administration")
print("=" * 80)
