"""
NoctisPro PACS - Base Settings
Django settings for noctis_pro project - Optimized and Secure
"""

import os
import secrets
from pathlib import Path
from django.core.management.utils import get_random_secret_key

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent

# =============================================================================
# SECURITY SETTINGS
# =============================================================================

# Secret key with secure generation
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY or SECRET_KEY == 'your-secret-key-here-replace-this-with-random-50-chars':
    SECRET_KEY = get_random_secret_key()
    print("⚠️  WARNING: Using auto-generated SECRET_KEY. Set SECRET_KEY in environment!")

# Debug mode (NEVER True in production)
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# Deployment mode: internet, tailnet, local
DEPLOYMENT_MODE = os.environ.get('DEPLOYMENT_MODE', 'local')
INTERNET_ACCESS = DEPLOYMENT_MODE == 'internet' or os.environ.get('INTERNET_ACCESS', 'false').lower() == 'true'
USE_HTTPS = os.environ.get('USE_HTTPS', 'false').lower() == 'true'
IS_TAILNET = DEPLOYMENT_MODE == 'tailnet' or os.environ.get('USE_TAILNET', 'false').lower() == 'true'

# Domain configuration
DOMAIN_NAME = os.environ.get('DOMAIN_NAME', 'localhost')
TAILSCALE_HOSTNAME = os.environ.get('TAILNET_HOSTNAME', 'noctispro')

# =============================================================================
# ALLOWED HOSTS CONFIGURATION
# =============================================================================

ALLOWED_HOSTS = []

# Add environment-specified hosts
env_hosts = os.environ.get('ALLOWED_HOSTS', '').split(',')
ALLOWED_HOSTS.extend([h.strip() for h in env_hosts if h.strip()])

# Add standard local hosts
ALLOWED_HOSTS.extend(['localhost', '127.0.0.1', '0.0.0.0'])

# Add domain hosts
if DOMAIN_NAME and DOMAIN_NAME != 'localhost':
    ALLOWED_HOSTS.extend([
        DOMAIN_NAME,
        f'www.{DOMAIN_NAME}',
        f'*.{DOMAIN_NAME}',
    ])

# Add Tailscale hosts
if IS_TAILNET:
    ALLOWED_HOSTS.extend([
        TAILSCALE_HOSTNAME,
        f'{TAILSCALE_HOSTNAME}.ts.net',
        '*.ts.net',
        '100.*',
    ])

# Remove duplicates and empty strings
ALLOWED_HOSTS = list(filter(None, dict.fromkeys(ALLOWED_HOSTS)))

# =============================================================================
# APPLICATION DEFINITION
# =============================================================================

INSTALLED_APPS = [
    # Django channels (must be before django.contrib.staticfiles)
    'daphne',
    
    # Django core apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'corsheaders',
    'channels',
    'django_extensions',
    
    # NoctisPro apps (ordered by dependency)
    'accounts.apps.AccountsConfig',
    'worklist.apps.WorklistConfig',
    'dicom_viewer.apps.DicomViewerConfig',
    'reports.apps.ReportsConfig',
    'ai_analysis.apps.AiAnalysisConfig',
    'notifications.apps.NotificationsConfig',
    'chat.apps.ChatConfig',
    'admin_panel.apps.AdminPanelConfig',
]

# =============================================================================
# MIDDLEWARE CONFIGURATION
# =============================================================================

MIDDLEWARE = [
    # Security middleware (first)
    'django.middleware.security.SecurityMiddleware',
    
    # CORS middleware (before CommonMiddleware)
    'corsheaders.middleware.CorsMiddleware',
    
    # Session middleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    
    # Common middleware
    'django.middleware.common.CommonMiddleware',
    
    # CSRF middleware
    'django.middleware.csrf.CsrfViewMiddleware',
    
    # Authentication middleware
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    
    # Messages middleware
    'django.contrib.messages.middleware.MessageMiddleware',
    
    # Clickjacking protection
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'noctis_pro.urls'

# =============================================================================
# TEMPLATES CONFIGURATION
# =============================================================================

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.template.context_processors.media',
                'django.template.context_processors.static',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'noctis_pro.wsgi.application'
ASGI_APPLICATION = 'noctis_pro.asgi.application'

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

DATABASES = {
    'default': {
        'ENGINE': os.environ.get('DB_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': os.environ.get('DB_NAME', BASE_DIR / 'db.sqlite3'),
        'USER': os.environ.get('DB_USER', ''),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', ''),
        'PORT': os.environ.get('DB_PORT', ''),
        'CONN_MAX_AGE': int(os.environ.get('DB_CONN_MAX_AGE', '300')),
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {},
    }
}

# SQLite-specific optimizations
if DATABASES['default']['ENGINE'] == 'django.db.backends.sqlite3':
    DATABASES['default']['OPTIONS'] = {
        'timeout': 30,
        'check_same_thread': False,
        'init_command': '''
            PRAGMA journal_mode=WAL;
            PRAGMA synchronous=NORMAL;
            PRAGMA cache_size=-64000;
            PRAGMA temp_store=MEMORY;
            PRAGMA busy_timeout=30000;
            PRAGMA foreign_keys=ON;
        ''',
    }

# PostgreSQL-specific optimizations
elif DATABASES['default']['ENGINE'] == 'django.db.backends.postgresql':
    DATABASES['default']['OPTIONS'] = {
        'connect_timeout': 10,
        'options': '-c statement_timeout=30000',
    }

# =============================================================================
# PASSWORD VALIDATION
# =============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8}
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# =============================================================================
# INTERNATIONALIZATION
# =============================================================================

LANGUAGE_CODE = 'en-us'
TIME_ZONE = os.environ.get('TIME_ZONE', 'UTC')
USE_I18N = True
USE_TZ = True

# =============================================================================
# STATIC FILES CONFIGURATION
# =============================================================================

STATIC_URL = os.environ.get('STATIC_URL', '/static/')
STATIC_ROOT = Path(os.environ.get('STATIC_ROOT', BASE_DIR / 'staticfiles'))
STATICFILES_DIRS = [BASE_DIR / 'static']

# Ensure static directory exists
os.makedirs(BASE_DIR / 'static', exist_ok=True)

# MIME types configuration
import mimetypes
mimetypes.add_type('application/javascript', '.js', True)
mimetypes.add_type('text/css', '.css', True)
mimetypes.add_type('application/json', '.json', True)
mimetypes.add_type('image/svg+xml', '.svg', True)

# =============================================================================
# MEDIA FILES CONFIGURATION
# =============================================================================

MEDIA_URL = '/media/'
MEDIA_ROOT = Path(os.environ.get('MEDIA_ROOT', BASE_DIR / 'media'))
DICOM_ROOT = Path(os.environ.get('DICOM_ROOT', MEDIA_ROOT / 'dicom'))
SERVE_MEDIA_FILES = os.environ.get('SERVE_MEDIA_FILES', 'True').lower() == 'true'

# Create media directories
for directory in [MEDIA_ROOT, DICOM_ROOT]:
    os.makedirs(directory, exist_ok=True)

# =============================================================================
# AUTHENTICATION
# =============================================================================

AUTH_USER_MODEL = 'accounts.User'

LOGIN_URL = '/login/'
LOGIN_REDIRECT_URL = '/worklist/'
LOGOUT_REDIRECT_URL = '/login/'

# =============================================================================
# SESSION CONFIGURATION
# =============================================================================

SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_NAME = 'noctispro_sessionid'
SESSION_COOKIE_AGE = int(os.environ.get('SESSION_COOKIE_AGE', '3600'))  # 1 hour
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = False  # Will be set in security settings
SESSION_SERIALIZER = 'django.contrib.sessions.serializers.JSONSerializer'

# =============================================================================
# CSRF CONFIGURATION
# =============================================================================

CSRF_COOKIE_NAME = 'noctispro_csrftoken'
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = False  # Will be set in security settings
CSRF_USE_SESSIONS = False
CSRF_COOKIE_AGE = 31449600  # 1 year

# CSRF trusted origins
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost',
    'http://127.0.0.1',
]

# Add domain to CSRF trusted origins
if DOMAIN_NAME != 'localhost':
    CSRF_TRUSTED_ORIGINS.extend([
        f'https://{DOMAIN_NAME}',
        f'https://www.{DOMAIN_NAME}',
        f'http://{DOMAIN_NAME}',
        f'http://www.{DOMAIN_NAME}',
    ])

# Add Tailscale origins
if IS_TAILNET:
    CSRF_TRUSTED_ORIGINS.extend([
        f'http://{TAILSCALE_HOSTNAME}',
        f'http://{TAILSCALE_HOSTNAME}:8080',
        'http://*.ts.net',
        'https://*.ts.net',
    ])

# =============================================================================
# CORS CONFIGURATION
# =============================================================================

CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:8000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
]

# Add domain CORS origins
if DOMAIN_NAME != 'localhost':
    CORS_ALLOWED_ORIGINS.extend([
        f'https://{DOMAIN_NAME}',
        f'https://www.{DOMAIN_NAME}',
        f'http://{DOMAIN_NAME}',
        f'http://www.{DOMAIN_NAME}',
    ])

# Add Tailscale CORS origins
if IS_TAILNET:
    CORS_ALLOWED_ORIGINS.extend([
        f'http://{TAILSCALE_HOSTNAME}',
        f'http://{TAILSCALE_HOSTNAME}:8080',
    ])

CORS_ALLOWED_ORIGIN_REGEXES = []
if IS_TAILNET:
    CORS_ALLOWED_ORIGIN_REGEXES.extend([
        r'^http://.*\.ts\.net$',
        r'^https://.*\.ts\.net$',
    ])

# =============================================================================
# REST FRAMEWORK CONFIGURATION
# =============================================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
    },
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
    'DATETIME_FORMAT': '%Y-%m-%d %H:%M:%S',
    'DATE_FORMAT': '%Y-%m-%d',
}

# =============================================================================
# CHANNELS CONFIGURATION
# =============================================================================

if INTERNET_ACCESS or IS_TAILNET:
    # Use Redis for production/tailnet
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [(
                    os.environ.get('REDIS_HOST', 'redis'),
                    int(os.environ.get('REDIS_PORT', '6379'))
                )],
                'password': os.environ.get('REDIS_PASSWORD', ''),
                'capacity': 1500,
                'expiry': 10,
            },
        },
    }
else:
    # Use in-memory for development
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# =============================================================================
# CACHE CONFIGURATION
# =============================================================================

if not DEBUG and (INTERNET_ACCESS or IS_TAILNET):
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': f"redis://{os.environ.get('REDIS_HOST', 'redis')}:{os.environ.get('REDIS_PORT', '6379')}/{os.environ.get('REDIS_CACHE_DB', '1')}",
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'PASSWORD': os.environ.get('REDIS_PASSWORD', ''),
                'SOCKET_CONNECT_TIMEOUT': 5,
                'SOCKET_TIMEOUT': 5,
                'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 50,
                    'retry_on_timeout': True,
                }
            },
            'KEY_PREFIX': 'noctispro',
            'TIMEOUT': 300,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'noctispro-cache',
        }
    }

# =============================================================================
# FILE UPLOAD SETTINGS
# =============================================================================

FILE_UPLOAD_MAX_MEMORY_SIZE = int(os.environ.get('FILE_UPLOAD_MAX_SIZE', 5 * 1024 * 1024 * 1024))  # 5GB
DATA_UPLOAD_MAX_MEMORY_SIZE = FILE_UPLOAD_MAX_MEMORY_SIZE
DATA_UPLOAD_MAX_NUMBER_FIELDS = None
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
LOG_DIR = BASE_DIR / 'logs'
os.makedirs(LOG_DIR, exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {name} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{levelname}] {asctime} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': LOG_LEVEL,
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': LOG_LEVEL,
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'noctispro.log',
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'security': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'security.log',
            'maxBytes': 5 * 1024 * 1024,  # 5MB
            'backupCount': 3,
            'formatter': 'verbose',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'errors.log',
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'] if DEBUG else ['file', 'error_file'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'django.request': {
            'handlers': ['file', 'error_file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['security'],
            'level': 'WARNING',
            'propagate': False,
        },
        'noctis_pro': {
            'handlers': ['console', 'file'] if DEBUG else ['file'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': LOG_LEVEL,
    },
}

# =============================================================================
# DEFAULT SETTINGS
# =============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# =============================================================================
# DICOM VIEWER SETTINGS
# =============================================================================

DICOM_VIEWER_SETTINGS = {
    'MAX_UPLOAD_SIZE': FILE_UPLOAD_MAX_MEMORY_SIZE,
    'SUPPORTED_MODALITIES': ['CT', 'MR', 'CR', 'DX', 'US', 'XA', 'MG', 'PT', 'NM'],
    'CACHE_TIMEOUT': int(os.environ.get('THUMBNAIL_CACHE_TIMEOUT', '3600')),
    'ENABLE_3D_RECONSTRUCTION': os.environ.get('FEATURE_3D_RECONSTRUCTION', 'True').lower() == 'true',
    'ENABLE_MEASUREMENTS': True,
    'ENABLE_ANNOTATIONS': True,
    'ENABLE_AI_ANALYSIS': os.environ.get('FEATURE_AI_ANALYSIS', 'True').lower() == 'true',
    'ENABLE_QR_CODES': True,
    'ENABLE_LETTERHEADS': True,
    'THUMBNAIL_SIZE': (256, 256),
    'PREVIEW_SIZE': (512, 512),
}

# =============================================================================
# AI CONFIGURATION
# =============================================================================

AI_SETTINGS = {
    'MODELS_PATH': Path(os.environ.get('AI_MODELS_PATH', BASE_DIR / 'ai_models')),
    'ENABLE_AUTO_ANALYSIS': os.environ.get('AI_ENABLE_AUTO_ANALYSIS', 'True').lower() == 'true',
    'ANALYSIS_WORKERS': int(os.environ.get('AI_ANALYSIS_WORKERS', '2')),
    'CONFIDENCE_THRESHOLD': float(os.environ.get('AI_CONFIDENCE_THRESHOLD', '0.7')),
    'BATCH_SIZE': 8,
    'MAX_QUEUE_SIZE': 100,
}

# Create AI models directory
os.makedirs(AI_SETTINGS['MODELS_PATH'], exist_ok=True)

# =============================================================================
# FEATURE FLAGS
# =============================================================================

FEATURES = {
    'AI_ANALYSIS': os.environ.get('FEATURE_AI_ANALYSIS', 'True').lower() == 'true',
    '3D_RECONSTRUCTION': os.environ.get('FEATURE_3D_RECONSTRUCTION', 'True').lower() == 'true',
    'CHAT': os.environ.get('FEATURE_CHAT', 'True').lower() == 'true',
    'NOTIFICATIONS': os.environ.get('FEATURE_NOTIFICATIONS', 'True').lower() == 'true',
    'INVOICING': os.environ.get('FEATURE_INVOICING', 'True').lower() == 'true',
    'AUDIT_LOG': os.environ.get('FEATURE_AUDIT_LOG', 'True').lower() == 'true',
}

# =============================================================================
# PRINT CONFIGURATION SUMMARY
# =============================================================================

print("=" * 80)
print("🚀 NoctisPro PACS Configuration Loaded")
print("=" * 80)
print(f"📍 Deployment Mode: {DEPLOYMENT_MODE.upper()}")
print(f"🐛 Debug Mode: {DEBUG}")
print(f"🌐 Internet Access: {INTERNET_ACCESS}")
print(f"🔒 HTTPS Enabled: {USE_HTTPS}")
print(f"🌍 Domain: {DOMAIN_NAME}")
print(f"🔗 Tailnet: {IS_TAILNET}")
if IS_TAILNET:
    print(f"   Hostname: {TAILSCALE_HOSTNAME}")
print(f"🗄️  Database: {DATABASES['default']['ENGINE'].split('.')[-1]}")
print(f"💾 Cache Backend: {CACHES['default']['BACKEND'].split('.')[-1]}")
print(f"📝 Logging Level: {LOG_LEVEL}")
print(f"🔐 Security Profile: {'Development' if DEBUG else 'Production'}")
print(f"🤖 AI Analysis: {'Enabled' if FEATURES['AI_ANALYSIS'] else 'Disabled'}")
print(f"💬 Chat: {'Enabled' if FEATURES['CHAT'] else 'Disabled'}")
print(f"🔔 Notifications: {'Enabled' if FEATURES['NOTIFICATIONS'] else 'Disabled'}")
print(f"📊 Allowed Hosts: {len(ALLOWED_HOSTS)} configured")
print("=" * 80)
