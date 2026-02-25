from rest_framework import permissions
from .models import Admin



class isAdminRole(permissions.BasePermission):
    """
    Check if user has an Admin profile with 'admin' role_type.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        try:
            # Superusers always have admin access
            if getattr(request.user, 'is_superuser', False):
                return True
            
            admin_profile = Admin.objects.get(email=request.user.email)
            return admin_profile.role_type == 'admin'
        except Admin.DoesNotExist:
            return False

class isAdminFullAccess(permissions.BasePermission):
    """
    Check if user is an Admin AND has 'Full' access_level.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        try:
            # Superusers always have full admin access
            if getattr(request.user, 'is_superuser', False):
                return True
            
            admin_profile = Admin.objects.get(email=request.user.email)
            return admin_profile.role_type == 'admin' and admin_profile.access_level == 'Full'
        except Admin.DoesNotExist:
            return False

class isDoctorRole(permissions.BasePermission):
    """
    Check if user has an Admin profile with 'doctor' role_type.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        try:
            admin_profile = Admin.objects.get(email=request.user.email)
            return admin_profile.role_type == 'doctor'
        except Admin.DoesNotExist:
            return False

class isNurseRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        try:
            admin_profile = Admin.objects.get(email=request.user.email)
            return admin_profile.role_type == 'nurse'
        except Admin.DoesNotExist:
            return False
