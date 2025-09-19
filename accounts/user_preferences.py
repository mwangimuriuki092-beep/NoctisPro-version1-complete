"""
User Preferences System
Safe enhancement - doesn't modify existing functionality
Stores user preferences in JSON field for flexibility
"""

import json
from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()

class UserPreferences(models.Model):
    """
    User preferences model - stores customizable settings
    Safe addition - doesn't affect existing user functionality
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    
    # DICOM Viewer Preferences
    dicom_viewer_preferences = models.JSONField(default=dict, blank=True)
    
    # Dashboard Preferences  
    dashboard_preferences = models.JSONField(default=dict, blank=True)
    
    # General UI Preferences
    ui_preferences = models.JSONField(default=dict, blank=True)
    
    # Notification Preferences
    notification_preferences = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Preferences"
        verbose_name_plural = "User Preferences"
    
    def __str__(self):
        return f"Preferences for {self.user.username}"
    
    def get_dicom_viewer_preferences(self):
        """Get DICOM viewer preferences with defaults"""
        defaults = {
            'default_tool': 'window',
            'default_window_preset': 'soft',
            'auto_fit': True,
            'show_annotations': True,
            'show_measurements': True,
            'show_crosshair': False,
            'invert_mouse_wheel': False,
            'keyboard_shortcuts_enabled': True,
            'show_patient_info': True,
            'show_study_info': True,
            'measurement_units': 'mm',
            'annotation_font_size': 12,
            'overlay_opacity': 0.8,
            'grid_lines': False,
            'ruler_color': '#00d4ff',
            'annotation_color': '#ffaa00'
        }
        
        prefs = self.dicom_viewer_preferences or {}
        return {**defaults, **prefs}
    
    def set_dicom_viewer_preferences(self, preferences):
        """Set DICOM viewer preferences"""
        current = self.get_dicom_viewer_preferences()
        current.update(preferences)
        self.dicom_viewer_preferences = current
        self.save()
    
    def get_dashboard_preferences(self):
        """Get dashboard preferences with defaults"""
        defaults = {
            'studies_per_page': 25,
            'default_sort': '-study_date',
            'show_thumbnails': True,
            'show_series_count': True,
            'show_image_count': True,
            'auto_refresh': True,
            'refresh_interval': 30,
            'compact_view': False,
            'show_facility_column': True,
            'show_modality_icons': True,
            'highlight_new_studies': True,
            'default_filters': {}
        }
        
        prefs = self.dashboard_preferences or {}
        return {**defaults, **prefs}
    
    def set_dashboard_preferences(self, preferences):
        """Set dashboard preferences"""
        current = self.get_dashboard_preferences()
        current.update(preferences)
        self.dashboard_preferences = current
        self.save()
    
    def get_ui_preferences(self):
        """Get UI preferences with defaults"""
        defaults = {
            'theme': 'dark',
            'font_size': 'medium',
            'sidebar_collapsed': False,
            'show_tooltips': True,
            'animation_speed': 'normal',
            'high_contrast': False,
            'reduce_motion': False,
            'language': 'en',
            'timezone': 'UTC',
            'date_format': 'YYYY-MM-DD',
            'time_format': '24h'
        }
        
        prefs = self.ui_preferences or {}
        return {**defaults, **prefs}
    
    def set_ui_preferences(self, preferences):
        """Set UI preferences"""
        current = self.get_ui_preferences()
        current.update(preferences)
        self.ui_preferences = current
        self.save()
    
    def get_notification_preferences(self):
        """Get notification preferences with defaults"""
        defaults = {
            'email_notifications': True,
            'browser_notifications': True,
            'new_study_notifications': True,
            'report_ready_notifications': True,
            'ai_analysis_notifications': True,
            'system_maintenance_notifications': True,
            'backup_status_notifications': False,  # Only for admins
            'sound_enabled': True,
            'notification_duration': 5000,
            'quiet_hours_enabled': False,
            'quiet_hours_start': '22:00',
            'quiet_hours_end': '08:00'
        }
        
        prefs = self.notification_preferences or {}
        return {**defaults, **prefs}
    
    def set_notification_preferences(self, preferences):
        """Set notification preferences"""
        current = self.get_notification_preferences()
        current.update(preferences)
        self.notification_preferences = current
        self.save()
    
    def get_all_preferences(self):
        """Get all preferences as a single dictionary"""
        return {
            'dicom_viewer': self.get_dicom_viewer_preferences(),
            'dashboard': self.get_dashboard_preferences(),
            'ui': self.get_ui_preferences(),
            'notifications': self.get_notification_preferences()
        }
    
    def reset_to_defaults(self, category=None):
        """Reset preferences to defaults"""
        if category == 'dicom_viewer':
            self.dicom_viewer_preferences = {}
        elif category == 'dashboard':
            self.dashboard_preferences = {}
        elif category == 'ui':
            self.ui_preferences = {}
        elif category == 'notifications':
            self.notification_preferences = {}
        else:
            # Reset all
            self.dicom_viewer_preferences = {}
            self.dashboard_preferences = {}
            self.ui_preferences = {}
            self.notification_preferences = {}
        
        self.save()

def get_user_preferences(user):
    """
    Get or create user preferences
    Safe function - doesn't affect existing functionality
    """
    try:
        preferences = UserPreferences.objects.get(user=user)
    except UserPreferences.DoesNotExist:
        preferences = UserPreferences.objects.create(user=user)
    
    return preferences

def update_user_preferences(user, category, preferences):
    """
    Update user preferences safely
    """
    user_prefs = get_user_preferences(user)
    
    if category == 'dicom_viewer':
        user_prefs.set_dicom_viewer_preferences(preferences)
    elif category == 'dashboard':
        user_prefs.set_dashboard_preferences(preferences)
    elif category == 'ui':
        user_prefs.set_ui_preferences(preferences)
    elif category == 'notifications':
        user_prefs.set_notification_preferences(preferences)
    
    return user_prefs