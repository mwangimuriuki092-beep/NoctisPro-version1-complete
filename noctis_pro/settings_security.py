"""
NoctisPro PACS - Security Settings
Production-grade security configuration
"""

import os
from .settings_base import DEBUG, INTERNET_ACCESS, USE_HTTPS, IS_TAILNET

# =============================================================================
# SECURITY HEADERS
# =============================================================================

# XSS Protection
SECURE_BROWSER_XSS_FILTER = True

# Content Type Sniffing Protection
SECURE_CONTENT_TYPE_NOSNIFF = True

# Referrer Policy
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# X-Frame-Options
X_FRAME_OPTIONS = 'SAMEORIGIN' if DEBUG else 'DENY'

# =============================================================================
# PRODUCTION SECURITY (INTERNET ACCESS WITH HTTPS)
# =============================================================================

if INTERNET_ACCESS and USE_HTTPS and not DEBUG:
    # Force HTTPS
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    
    # HSTS (HTTP Strict Transport Security)
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    
    # Secure Cookies
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Strict'
    CSRF_COOKIE_SAMESITE = 'Strict'
    
    # Content Security Policy
    CSP_DEFAULT_SRC = ("'self'",)
    CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "'unsafe-eval'")
    CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
    CSP_IMG_SRC = ("'self'", "data:", "https:")
    CSP_FONT_SRC = ("'self'", "data:")
    CSP_CONNECT_SRC = ("'self'",)
    CSP_FRAME_ANCESTORS = ("'none'",)
    CSP_BASE_URI = ("'self'",)
    CSP_FORM_ACTION = ("'self'",)
    
    print("🔐 Production Security Mode: HTTPS Internet Access")

# =============================================================================
# TAILNET SECURITY (PRIVATE NETWORK)
# =============================================================================

elif IS_TAILNET and not DEBUG:
    # Tailscale provides encrypted transport, adjust for HTTP over private network
    SECURE_SSL_REDIRECT = False
    SECURE_PROXY_SSL_HEADER = None
    
    # No HSTS for Tailnet
    SECURE_HSTS_SECONDS = 0
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False
    
    # Secure cookies over HTTP (Tailscale encrypts)
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_SAMESITE = 'Lax'
    
    print("🔐 Production Security Mode: Tailnet Private Network")

# =============================================================================
# LOCAL/DEVELOPMENT SECURITY
# =============================================================================

elif not DEBUG:
    # Local network production
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False').lower() == 'true'
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https') if SECURE_SSL_REDIRECT else None
    
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '0'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_SECONDS > 0
    SECURE_HSTS_PRELOAD = False
    
    SESSION_COOKIE_SECURE = SECURE_SSL_REDIRECT
    CSRF_COOKIE_SECURE = SECURE_SSL_REDIRECT
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_SAMESITE = 'Lax'
    
    print("🔐 Production Security Mode: Local Network")

else:
    # Development mode
    SECURE_SSL_REDIRECT = False
    SECURE_PROXY_SSL_HEADER = None
    SECURE_HSTS_SECONDS = 0
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_SAMESITE = 'Lax'
    
    print("⚠️  Development Security Mode: Relaxed Settings")

# =============================================================================
# AUTHENTICATION SETTINGS
# =============================================================================

# Password hashing
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

# Authentication backends
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

# Login attempt throttling
LOGIN_ATTEMPTS_LIMIT = 5
LOGIN_ATTEMPTS_TIMEOUT = 300  # 5 minutes

# =============================================================================
# SESSION SECURITY
# =============================================================================

# Session security enhancements
SESSION_COOKIE_NAME = 'noctispro_sessionid'
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# Session timeout settings
SESSION_COOKIE_AGE = int(os.environ.get('SESSION_COOKIE_AGE', '3600'))  # 1 hour default
SESSION_SAVE_EVERY_REQUEST = True  # Refresh session on each request
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# =============================================================================
# CSRF PROTECTION
# =============================================================================

CSRF_COOKIE_NAME = 'noctispro_csrftoken'
CSRF_USE_SESSIONS = False
CSRF_COOKIE_AGE = 31449600  # 1 year
CSRF_FAILURE_VIEW = 'django.views.csrf.csrf_failure'

# =============================================================================
# RATE LIMITING
# =============================================================================

# Rate limiting configuration (requires django-ratelimit or similar)
RATELIMIT_ENABLE = not DEBUG
RATELIMIT_VIEW = 'noctis_pro.views.rate_limited'

# API rate limits
API_RATE_LIMIT = '1000/hour' if not DEBUG else '10000/hour'
UPLOAD_RATE_LIMIT = '100/hour' if not DEBUG else '1000/hour'
LOGIN_RATE_LIMIT = '5/5m'  # 5 attempts per 5 minutes

# =============================================================================
# ALLOWED FILE UPLOADS
# =============================================================================

ALLOWED_UPLOAD_EXTENSIONS = [
    # DICOM files
    '.dcm', '.dicom', '.dic',
    # Medical images
    '.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff',
    # Documents
    '.pdf', '.doc', '.docx', '.txt',
    # Archives
    '.zip', '.tar', '.gz', '.bz2',
]

MAX_UPLOAD_SIZE = 5 * 1024 * 1024 * 1024  # 5GB

# Content types whitelist
ALLOWED_CONTENT_TYPES = [
    'application/dicom',
    'application/octet-stream',
    'image/jpeg',
    'image/png',
    'image/bmp',
    'image/tiff',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-tar',
    'application/gzip',
]

# =============================================================================
# IP FILTERING (Optional)
# =============================================================================

# Whitelist/Blacklist IPs (empty = allow all)
ALLOWED_IPS = os.environ.get('ALLOWED_IPS', '').split(',') if os.environ.get('ALLOWED_IPS') else []
BLOCKED_IPS = os.environ.get('BLOCKED_IPS', '').split(',') if os.environ.get('BLOCKED_IPS') else []

# =============================================================================
# AUDIT LOGGING
# =============================================================================

AUDIT_LOG_ENABLED = os.environ.get('FEATURE_AUDIT_LOG', 'True').lower() == 'true'
AUDIT_LOG_MODELS = [
    'accounts.User',
    'worklist.Study',
    'worklist.Patient',
    'reports.Report',
    'admin_panel.SystemConfiguration',
]

# Log sensitive actions
AUDIT_SENSITIVE_ACTIONS = [
    'login',
    'logout',
    'password_change',
    'user_create',
    'user_delete',
    'permission_change',
    'config_change',
    'data_export',
]

# =============================================================================
# DATA PROTECTION
# =============================================================================

# Anonymization settings
ENABLE_DATA_ANONYMIZATION = os.environ.get('ENABLE_DATA_ANONYMIZATION', 'False').lower() == 'true'
ANONYMIZE_PATIENT_DATA = False  # Keep false for medical records
ANONYMIZE_EXPORT = True  # Anonymize when exporting for research

# Encryption settings
ENABLE_FIELD_ENCRYPTION = os.environ.get('ENABLE_FIELD_ENCRYPTION', 'False').lower() == 'true'
ENCRYPTED_FIELDS = [
    'accounts.User.license_number',
    'worklist.Patient.medical_record_number',
]

# =============================================================================
# BACKUP & DISASTER RECOVERY
# =============================================================================

BACKUP_ENABLED = os.environ.get('BACKUP_ENABLED', 'True').lower() == 'true'
BACKUP_DIR = os.environ.get('BACKUP_DIR', '/var/backups/noctispro')
BACKUP_RETENTION_DAYS = int(os.environ.get('BACKUP_RETENTION_DAYS', '30'))
BACKUP_ENCRYPT = not DEBUG

# =============================================================================
# MONITORING & ALERTS
# =============================================================================

# Security monitoring
ENABLE_SECURITY_MONITORING = not DEBUG
ALERT_ON_MULTIPLE_LOGIN_FAILURES = True
ALERT_ON_SUSPICIOUS_ACTIVITY = True

# Admin notification emails
SECURITY_EMAIL_RECIPIENTS = os.environ.get('SECURITY_EMAIL_RECIPIENTS', '').split(',')
if os.environ.get('ADMIN_EMAIL'):
    SECURITY_EMAIL_RECIPIENTS.append(os.environ.get('ADMIN_EMAIL'))
SECURITY_EMAIL_RECIPIENTS = [email.strip() for email in SECURITY_EMAIL_RECIPIENTS if email.strip()]

print(f"🔒 Security Configuration Loaded")
print(f"   SSL Redirect: {SECURE_SSL_REDIRECT}")
print(f"   HSTS Enabled: {SECURE_HSTS_SECONDS > 0}")
print(f"   Secure Cookies: {SESSION_COOKIE_SECURE}")
print(f"   Audit Logging: {AUDIT_LOG_ENABLED}")
print(f"   Backup Enabled: {BACKUP_ENABLED}")
