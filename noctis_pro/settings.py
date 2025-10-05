"""
NoctisPro PACS - Main Settings
Imports from base settings and security settings

This file imports all settings from settings_base.py and settings_security.py
Any project-specific overrides can be added here
"""

# Import all base settings
from .settings_base import *

# Import security settings
from .settings_security import *

# =============================================================================
# PROJECT-SPECIFIC OVERRIDES
# =============================================================================

# Add any project-specific setting overrides here if needed
# Example:
# if DEBUG:
#     # Development-specific overrides
#     pass

# =============================================================================
# CONFIGURATION COMPLETE
# =============================================================================
