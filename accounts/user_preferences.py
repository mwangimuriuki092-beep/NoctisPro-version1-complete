"""
User Preferences System
Safe enhancement - doesn't modify existing functionality
Helper functions for managing user preferences
"""

import json
from django.contrib.auth import get_user_model

User = get_user_model()

def get_user_preferences(user):
    """
    Get or create user preferences
    Safe function - doesn't affect existing functionality
    """
    from .models import UserPreferences
    
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
    
    # Update preferences based on category
    if category == 'dicom_viewer':
        current = user_prefs.dicom_viewer_preferences or {}
        current.update(preferences)
        user_prefs.dicom_viewer_preferences = current
    elif category == 'dashboard':
        current = user_prefs.dashboard_preferences or {}
        current.update(preferences)
        user_prefs.dashboard_preferences = current
    elif category == 'ui':
        current = user_prefs.ui_preferences or {}
        current.update(preferences)
        user_prefs.ui_preferences = current
    elif category == 'notifications':
        current = user_prefs.notification_preferences or {}
        current.update(preferences)
        user_prefs.notification_preferences = current
    
    user_prefs.save()
    return user_prefs

def get_preference_defaults():
    """Get default preferences for all categories"""
    return {
        'dicom_viewer': {
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
        },
        'dashboard': {
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
        },
        'ui': {
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
        },
        'notifications': {
            'email_notifications': True,
            'browser_notifications': True,
            'new_study_notifications': True,
            'report_ready_notifications': True,
            'ai_analysis_notifications': True,
            'system_maintenance_notifications': True,
            'backup_status_notifications': False,
            'sound_enabled': True,
            'notification_duration': 5000,
            'quiet_hours_enabled': False,
            'quiet_hours_start': '22:00',
            'quiet_hours_end': '08:00'
        }
    }