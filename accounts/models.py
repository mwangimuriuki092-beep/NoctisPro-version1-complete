"""
NoctisPro PACS - Accounts Models
Optimized user and facility management with role-based access control
"""

from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
import re
import secrets
import hashlib
from datetime import timedelta


class Facility(models.Model):
    """Healthcare facility model with enhanced metadata"""
    
    # Basic Information
    name = models.CharField(
        max_length=200,
        db_index=True,
        help_text="Facility name"
    )
    code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Unique facility code"
    )
    
    # Contact Information
    address = models.TextField(help_text="Physical address")
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default='USA')
    
    phone = models.CharField(
        max_length=20,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message="Phone number must be valid format"
        )]
    )
    email = models.EmailField(db_index=True)
    website = models.URLField(blank=True)
    
    # License and Regulatory
    license_number = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Medical facility license number"
    )
    accreditation_number = models.CharField(max_length=100, blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    
    # DICOM Configuration
    ae_title = models.CharField(
        max_length=16,
        blank=True,
        validators=[RegexValidator(
            regex=r'^[A-Z0-9_]{1,16}$',
            message="AE Title must be 1-16 uppercase alphanumeric characters"
        )],
        help_text="DICOM Application Entity Title"
    )
    dicom_port = models.IntegerField(default=11112, blank=True, null=True)
    
    # Branding
    logo = models.ImageField(upload_to='facilities/logos/', null=True, blank=True)
    letterhead = models.ImageField(upload_to='facilities/letterheads/', null=True, blank=True)
    
    # Settings
    timezone = models.CharField(max_length=50, default='UTC')
    default_modalities = models.JSONField(default=list, blank=True)
    settings = models.JSONField(default=dict, blank=True)
    
    # Status and Metadata
    is_active = models.BooleanField(default=True, db_index=True)
    is_verified = models.BooleanField(default=False)
    subscription_tier = models.CharField(
        max_length=20,
        choices=[
            ('basic', 'Basic'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise'),
        ],
        default='basic'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name_plural = "Facilities"
        ordering = ['name']
        indexes = [
            models.Index(fields=['name', 'is_active']),
            models.Index(fields=['code']),
            models.Index(fields=['license_number']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"
    
    def clean(self):
        """Validate model fields"""
        super().clean()
        if self.ae_title:
            self.ae_title = self.ae_title.upper()
            if not re.match(r'^[A-Z0-9_]{1,16}$', self.ae_title):
                raise ValidationError({'ae_title': 'Invalid AE Title format'})


class User(AbstractUser):
    """Enhanced user model with comprehensive role-based access control"""
    
    # Role Definitions
    ROLE_ADMIN = 'admin'
    ROLE_RADIOLOGIST = 'radiologist'
    ROLE_TECHNICIAN = 'technician'
    ROLE_REFERRING_PHYSICIAN = 'referring_physician'
    ROLE_FACILITY_MANAGER = 'facility_manager'
    ROLE_FACILITY_USER = 'facility_user'
    ROLE_VIEWER = 'viewer'
    
    USER_ROLES = [
        (ROLE_ADMIN, 'System Administrator'),
        (ROLE_RADIOLOGIST, 'Radiologist'),
        (ROLE_TECHNICIAN, 'Radiology Technician'),
        (ROLE_REFERRING_PHYSICIAN, 'Referring Physician'),
        (ROLE_FACILITY_MANAGER, 'Facility Manager'),
        (ROLE_FACILITY_USER, 'Facility User'),
        (ROLE_VIEWER, 'Viewer Only'),
    ]
    
    # Profile Information
    role = models.CharField(
        max_length=30,
        choices=USER_ROLES,
        default=ROLE_FACILITY_USER,
        db_index=True
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='users',
        db_index=True
    )
    
    # Contact Information
    phone = models.CharField(
        max_length=20,
        blank=True,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message="Phone number must be valid format"
        )]
    )
    mobile = models.CharField(max_length=20, blank=True)
    
    # Professional Information
    license_number = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        help_text="Medical license number"
    )
    specialization = models.CharField(max_length=100, blank=True)
    title = models.CharField(max_length=50, blank=True)
    department = models.CharField(max_length=100, blank=True)
    
    # Profile
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True)
    signature = models.ImageField(upload_to='signatures/', null=True, blank=True)
    
    # Status and Verification
    is_verified = models.BooleanField(default=False, db_index=True)
    verification_token = models.CharField(max_length=100, blank=True)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    
    # Security
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_location = models.CharField(max_length=200, blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    require_password_change = models.BooleanField(default=False)
    
    # Two-Factor Authentication
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=32, blank=True)
    
    # Preferences
    language = models.CharField(max_length=10, default='en')
    timezone = models.CharField(max_length=50, default='UTC')
    notifications_enabled = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    last_activity = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['username']
        indexes = [
            models.Index(fields=['role', 'facility']),
            models.Index(fields=['email']),
            models.Index(fields=['is_active', 'is_verified']),
            models.Index(fields=['last_activity']),
        ]
        permissions = [
            ('view_all_facilities', 'Can view all facilities'),
            ('manage_users', 'Can manage users'),
            ('view_analytics', 'Can view analytics'),
            ('manage_system', 'Can manage system settings'),
            ('approve_studies', 'Can approve studies'),
            ('delete_studies', 'Can delete studies'),
            ('export_data', 'Can export data'),
            ('access_audit_log', 'Can access audit log'),
        ]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
    
    def get_display_name(self):
        """Get user's display name"""
        return self.get_full_name() or self.username
    
    # Permission Methods
    def is_admin(self):
        """Check if user is an administrator"""
        return self.is_superuser or self.is_staff or self.role == self.ROLE_ADMIN
    
    def is_radiologist(self):
        """Check if user is a radiologist"""
        return self.role == self.ROLE_RADIOLOGIST
    
    def is_technician(self):
        """Check if user is a technician"""
        return self.role == self.ROLE_TECHNICIAN
    
    def is_referring_physician(self):
        """Check if user is a referring physician"""
        return self.role == self.ROLE_REFERRING_PHYSICIAN
    
    def is_facility_manager(self):
        """Check if user is a facility manager"""
        return self.role == self.ROLE_FACILITY_MANAGER
    
    def is_facility_user(self):
        """Check if user is a facility user"""
        return self.role == self.ROLE_FACILITY_USER
    
    def can_edit_reports(self):
        """Check if user can edit reports"""
        return self.role in [self.ROLE_ADMIN, self.ROLE_RADIOLOGIST]
    
    def can_approve_reports(self):
        """Check if user can approve reports"""
        return self.role in [self.ROLE_ADMIN, self.ROLE_RADIOLOGIST]
    
    def can_manage_users(self):
        """Check if user can manage users"""
        return self.is_superuser or self.is_staff or self.role in [
            self.ROLE_ADMIN, self.ROLE_FACILITY_MANAGER
        ]
    
    def can_upload_studies(self):
        """Check if user can upload studies"""
        return self.role in [
            self.ROLE_ADMIN,
            self.ROLE_RADIOLOGIST,
            self.ROLE_TECHNICIAN,
            self.ROLE_FACILITY_MANAGER,
            self.ROLE_FACILITY_USER,
        ]
    
    def can_view_facility_data(self, facility):
        """Check if user can view data from a specific facility"""
        if self.is_admin():
            return True
        return self.facility == facility
    
    def can_delete_studies(self):
        """Check if user can delete studies"""
        return self.is_admin() or self.has_perm('accounts.delete_studies')
    
    def can_export_data(self):
        """Check if user can export data"""
        return self.is_admin() or self.has_perm('accounts.export_data')
    
    # Security Methods
    def is_locked(self):
        """Check if account is locked"""
        if self.locked_until and timezone.now() < self.locked_until:
            return True
        return False
    
    def lock_account(self, duration_minutes=15):
        """Lock account for specified duration"""
        self.locked_until = timezone.now() + timezone.timedelta(minutes=duration_minutes)
        self.save(update_fields=['locked_until'])
    
    def unlock_account(self):
        """Unlock account"""
        self.locked_until = None
        self.failed_login_attempts = 0
        self.save(update_fields=['locked_until', 'failed_login_attempts'])
    
    def record_login_attempt(self, success, ip_address=None):
        """Record login attempt"""
        if success:
            self.failed_login_attempts = 0
            self.last_login_ip = ip_address
            self.last_activity = timezone.now()
            self.save(update_fields=['failed_login_attempts', 'last_login_ip', 'last_activity'])
        else:
            self.failed_login_attempts += 1
            if self.failed_login_attempts >= 5:
                self.lock_account()
            self.save(update_fields=['failed_login_attempts'])
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])


class UserSession(models.Model):
    """Track active user sessions for security"""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    session_key = models.CharField(max_length=40, unique=True, db_index=True)
    
    # Session Information
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    device_type = models.CharField(max_length=50, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=200, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Timestamps
    login_time = models.DateTimeField(auto_now_add=True, db_index=True)
    last_activity = models.DateTimeField(auto_now=True)
    logout_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-login_time']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_key']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.ip_address} - {self.login_time}"
    
    def terminate(self):
        """Terminate this session"""
        self.is_active = False
        self.logout_time = timezone.now()
        self.save(update_fields=['is_active', 'logout_time'])


class UserPreferences(models.Model):
    """User preferences and customization settings"""
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='preferences'
    )
    
    # DICOM Viewer Preferences
    dicom_viewer_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="DICOM viewer settings (window/level presets, layout, etc.)"
    )
    
    # Dashboard Preferences  
    dashboard_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="Dashboard layout and widget preferences"
    )
    
    # UI Preferences
    ui_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="UI theme, colors, font size, etc."
    )
    
    # Notification Preferences
    notification_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="Notification channels and frequency"
    )
    
    # Worklist Preferences
    worklist_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="Worklist filters, columns, sorting"
    )
    
    # Report Preferences
    report_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="Report templates, macros, shortcuts"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Preferences"
        verbose_name_plural = "User Preferences"
    
    def __str__(self):
        return f"Preferences for {self.user.username}"
    
    def get_preference(self, category, key, default=None):
        """Get a specific preference value"""
        preferences = getattr(self, f'{category}_preferences', {})
        return preferences.get(key, default)
    
    def set_preference(self, category, key, value):
        """Set a specific preference value"""
        attr_name = f'{category}_preferences'
        preferences = getattr(self, attr_name, {})
        preferences[key] = value
        setattr(self, attr_name, preferences)
        self.save(update_fields=[attr_name, 'updated_at'])


class UserActivity(models.Model):
    """Track user activity for analytics and security"""
    
    ACTIVITY_TYPES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('view_study', 'View Study'),
        ('upload_study', 'Upload Study'),
        ('edit_report', 'Edit Report'),
        ('approve_report', 'Approve Report'),
        ('download', 'Download'),
        ('export', 'Export Data'),
        ('settings_change', 'Settings Change'),
        ('user_management', 'User Management'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPES, db_index=True)
    description = models.TextField()
    
    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Related Objects
    object_type = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name_plural = "User Activities"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'activity_type', 'created_at']),
            models.Index(fields=['activity_type', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.get_activity_type_display()} - {self.created_at}"


class PasswordResetToken(models.Model):
    """Password reset tokens with expiration"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=100, unique=True, db_index=True)
    
    # Status
    is_used = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token', 'is_used']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"Reset token for {self.user.username}"
    
    def is_valid(self):
        """Check if token is still valid"""
        return not self.is_used and timezone.now() < self.expires_at
    
    def mark_used(self):
        """Mark token as used"""
        self.is_used = True
        self.used_at = timezone.now()
        self.save(update_fields=['is_used', 'used_at'])


class PasswordResetToken(models.Model):
    """Password reset token model"""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens'
    )
    token = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        db_table = 'accounts_password_reset_token'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"Password reset token for {self.user.email}"
    
    @classmethod
    def generate_token(cls, user, request=None):
        """Generate a new password reset token"""
        # Invalidate existing tokens
        cls.objects.filter(user=user, is_used=False).update(is_used=True, used_at=timezone.now())
        
        # Generate secure token
        token = secrets.token_urlsafe(64)
        
        # Create token record
        reset_token = cls.objects.create(
            user=user,
            token=token,
            expires_at=timezone.now() + timedelta(hours=24),
            ip_address=request.META.get('REMOTE_ADDR') if request else None,
            user_agent=request.META.get('HTTP_USER_AGENT', '') if request else ''
        )
        
        return reset_token
    
    def is_valid(self):
        """Check if token is still valid"""
        return not self.is_used and timezone.now() < self.expires_at
    
    def mark_used(self):
        """Mark token as used"""
        self.is_used = True
        self.used_at = timezone.now()
        self.save(update_fields=['is_used', 'used_at'])
    
    @classmethod
    def cleanup_expired(cls):
        """Clean up expired tokens"""
        expired_tokens = cls.objects.filter(expires_at__lt=timezone.now())
        count = expired_tokens.count()
        expired_tokens.delete()
        return count
