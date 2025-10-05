"""
NoctisPro PACS - Worklist Permissions
Custom permission classes for patient and study access control
"""

from rest_framework import permissions


class CanViewPatient(permissions.BasePermission):
    """
    Check if user can view patient data
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin can view all
        if request.user.is_admin():
            return True
        
        # Users can only view patients from their facility's studies
        if hasattr(obj, 'study_set'):
            return obj.study_set.filter(facility=request.user.facility).exists()
        
        return False


class CanEditPatient(permissions.BasePermission):
    """
    Check if user can edit patient data
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_admin() or request.user.is_facility_manager())
        )
    
    def has_object_permission(self, request, view, obj):
        # Admin can edit all
        if request.user.is_admin():
            return True
        
        # Facility managers can edit patients from their facility
        if hasattr(obj, 'study_set'):
            return obj.study_set.filter(facility=request.user.facility).exists()
        
        return False


class CanViewStudy(permissions.BasePermission):
    """
    Check if user can view study
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin can view all
        if request.user.is_admin():
            return True
        
        # Users can view studies from their facility
        if hasattr(obj, 'facility'):
            return obj.facility == request.user.facility
        
        return False


class CanEditStudy(permissions.BasePermission):
    """
    Check if user can edit study
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_upload_studies()
        )
    
    def has_object_permission(self, request, view, obj):
        # Check if user can edit this specific study
        if hasattr(obj, 'can_be_edited_by'):
            return obj.can_be_edited_by(request.user)
        
        return False


class CanDeleteStudy(permissions.BasePermission):
    """
    Check if user can delete study
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_delete_studies()
        )
    
    def has_object_permission(self, request, view, obj):
        # Only admin or facility manager can delete
        if request.user.is_admin():
            return True
        
        if request.user.is_facility_manager():
            return obj.facility == request.user.facility
        
        return False


class CanUploadStudy(permissions.BasePermission):
    """
    Check if user can upload studies
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_upload_studies()
        )


class CanAssignRadiologist(permissions.BasePermission):
    """
    Check if user can assign radiologist to study
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_admin() or request.user.is_facility_manager())
        )
    
    def has_object_permission(self, request, view, obj):
        # Admin can assign all
        if request.user.is_admin():
            return True
        
        # Facility managers can assign within their facility
        if request.user.is_facility_manager():
            return obj.facility == request.user.facility
        
        return False


class CanViewSeries(permissions.BasePermission):
    """
    Check if user can view series
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Check study access
        if hasattr(obj, 'study'):
            if request.user.is_admin():
                return True
            return obj.study.facility == request.user.facility
        
        return False


class CanViewImage(permissions.BasePermission):
    """
    Check if user can view DICOM images
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Check study access via series
        if hasattr(obj, 'series') and hasattr(obj.series, 'study'):
            if request.user.is_admin():
                return True
            return obj.series.study.facility == request.user.facility
        
        return False


class CanAddAttachment(permissions.BasePermission):
    """
    Check if user can add attachments to study
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_upload_studies()
        )


class CanViewAttachment(permissions.BasePermission):
    """
    Check if user can view attachment
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Check study access
        if hasattr(obj, 'study'):
            if request.user.is_admin():
                return True
            
            # Check facility access
            if obj.study.facility != request.user.facility:
                return False
            
            # Check role-based access
            if not obj.is_public and obj.allowed_roles:
                return request.user.role in obj.allowed_roles
        
        return True


class CanDeleteAttachment(permissions.BasePermission):
    """
    Check if user can delete attachment
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Owner or admin can delete
        if request.user.is_admin():
            return True
        
        if hasattr(obj, 'uploaded_by') and obj.uploaded_by == request.user:
            return True
        
        # Facility manager can delete from their facility
        if request.user.is_facility_manager():
            if hasattr(obj, 'study'):
                return obj.study.facility == request.user.facility
        
        return False


class CanAddNote(permissions.BasePermission):
    """
    Check if user can add notes to study
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class CanViewNote(permissions.BasePermission):
    """
    Check if user can view note
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Check study access
        if hasattr(obj, 'study'):
            if request.user.is_admin():
                return True
            
            # Check facility access
            if obj.study.facility != request.user.facility:
                return False
            
            # Can't view private notes from other users
            if obj.is_private and obj.user != request.user:
                return False
        
        return True


class CanEditNote(permissions.BasePermission):
    """
    Check if user can edit note
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Only note owner or admin can edit
        if request.user.is_admin():
            return True
        
        return obj.user == request.user


class CanDeleteNote(permissions.BasePermission):
    """
    Check if user can delete note
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Only note owner or admin can delete
        if request.user.is_admin():
            return True
        
        return obj.user == request.user


class CanExportStudy(permissions.BasePermission):
    """
    Check if user can export study
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.can_export_data()
        )
    
    def has_object_permission(self, request, view, obj):
        # Check study access
        if hasattr(obj, 'facility'):
            if request.user.is_admin():
                return True
            return obj.facility == request.user.facility
        
        return False


class IsStudyOwnerOrAdmin(permissions.BasePermission):
    """
    Check if user is study uploader or admin
    """
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_admin():
            return True
        
        if hasattr(obj, 'uploaded_by'):
            return obj.uploaded_by == request.user
        
        return False


class IsFacilityMember(permissions.BasePermission):
    """
    Check if user belongs to the study's facility
    """
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_admin():
            return True
        
        if hasattr(obj, 'facility'):
            return obj.facility == request.user.facility
        
        if hasattr(obj, 'study') and hasattr(obj.study, 'facility'):
            return obj.study.facility == request.user.facility
        
        return False
