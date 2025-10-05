"""
NoctisPro PACS - Accounts Permissions
Custom permission classes for role-based access control
"""

from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class IsAuthenticated(permissions.BasePermission):
    """
    Only allow authenticated users
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class IsAdmin(permissions.BasePermission):
    """
    Only allow administrators
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_admin()
        )


class IsRadiologist(permissions.BasePermission):
    """
    Only allow radiologists
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_radiologist() or request.user.is_admin())
        )


class IsFacilityManager(permissions.BasePermission):
    """
    Only allow facility managers and admins
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_facility_manager() or request.user.is_admin())
        )


class CanManageUsers(permissions.BasePermission):
    """
    Only allow users who can manage other users
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_manage_users()
        )


class IsSameUserOrAdmin(permissions.BasePermission):
    """
    Allow users to access their own data or admins to access any data
    """
    
    def has_object_permission(self, request, view, obj):
        # Admin can access all
        if request.user.is_admin():
            return True
        
        # User can access their own data
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # If obj is a User instance
        if isinstance(obj, User):
            return obj == request.user
        
        return False


class IsSameFacilityOrAdmin(permissions.BasePermission):
    """
    Allow users to access data from their facility or admins to access all
    """
    
    def has_object_permission(self, request, view, obj):
        # Admin can access all
        if request.user.is_admin():
            return True
        
        # User can access data from their facility
        if hasattr(obj, 'facility'):
            return obj.facility == request.user.facility
        
        # If obj is a Facility instance
        if hasattr(obj, 'users'):
            return obj == request.user.facility
        
        return False


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Allow owners to edit, others to read only
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        if isinstance(obj, User):
            return obj == request.user
        
        return False


class CanAccessFacilityData(permissions.BasePermission):
    """
    Check if user can access data for a specific facility
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Admins can access all facilities
        if request.user.is_admin():
            return True
        
        # Check if user has a facility
        if not request.user.facility:
            return False
        
        # Get facility from URL or request
        facility_id = view.kwargs.get('facility_id')
        if facility_id:
            return str(request.user.facility.id) == str(facility_id)
        
        return True


class ReadOnlyPermission(permissions.BasePermission):
    """
    Read-only access for all users
    """
    
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS


class IsVerifiedUser(permissions.BasePermission):
    """
    Only allow verified users
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_verified
        )


class CanEditReports(permissions.BasePermission):
    """
    Check if user can edit reports
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_edit_reports()
        )


class CanApproveReports(permissions.BasePermission):
    """
    Check if user can approve reports
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_approve_reports()
        )


class CanUploadStudies(permissions.BasePermission):
    """
    Check if user can upload studies
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_upload_studies()
        )


class CanDeleteStudies(permissions.BasePermission):
    """
    Check if user can delete studies
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_delete_studies()
        )


class CanExportData(permissions.BasePermission):
    """
    Check if user can export data
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_export_data()
        )


class IsActiveUser(permissions.BasePermission):
    """
    Only allow active users
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_active and
            not request.user.is_locked()
        )


class DjangoModelPermissions(permissions.DjangoModelPermissions):
    """
    Extended Django model permissions
    """
    
    perms_map = {
        'GET': ['%(app_label)s.view_%(model_name)s'],
        'OPTIONS': [],
        'HEAD': [],
        'POST': ['%(app_label)s.add_%(model_name)s'],
        'PUT': ['%(app_label)s.change_%(model_name)s'],
        'PATCH': ['%(app_label)s.change_%(model_name)s'],
        'DELETE': ['%(app_label)s.delete_%(model_name)s'],
    }


class HasAPIAccess(permissions.BasePermission):
    """
    Check if user has API access enabled
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_active and
            not request.user.is_locked()
        )


# Composite permission classes
class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Admin can edit, others can read
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_admin()


class IsRadiologistOrAdmin(permissions.BasePermission):
    """
    Only radiologists and admins
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_radiologist() or request.user.is_admin())
        )


class IsFacilityManagerOrAdmin(permissions.BasePermission):
    """
    Only facility managers and admins
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_facility_manager() or request.user.is_admin())
        )
