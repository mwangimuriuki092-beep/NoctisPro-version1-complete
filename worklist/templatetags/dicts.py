from django import template

register = template.Library()

@register.filter
def get_item(dictionary, key):
    """Get an item from a dictionary using a dynamic key."""
    if dictionary is None:
        return None
    return dictionary.get(key)

@register.filter
def dict_get(dictionary, key):
    """Alternative name for get_item filter."""
    return get_item(dictionary, key)

@register.simple_tag(takes_context=True)
def user_caps(context):
    """Get user capabilities for the current user."""
    user = context.get('user')
    if not user or not user.is_authenticated:
        return {
            'ai_visible': False,
            'manage_settings': False,
            'can_upload': False,
            'can_edit_reports': False,
            'can_manage_users': False,
        }
    
    # Basic capabilities based on user role
    caps = {
        'ai_visible': hasattr(user, 'is_admin') and user.is_admin() or hasattr(user, 'is_radiologist') and user.is_radiologist(),
        'manage_settings': hasattr(user, 'is_admin') and user.is_admin(),
        'can_upload': True,  # All authenticated users can upload
        'can_edit_reports': hasattr(user, 'can_edit_reports') and user.can_edit_reports(),
        'can_manage_users': hasattr(user, 'can_manage_users') and user.can_manage_users(),
    }
    
    return caps