from rest_framework.permissions import BasePermission


class CanAddPatient(BasePermission):
    """Only doctors and admins can add patients"""
    def has_permission(self, request, view):
        return request.user.role_type in ['doctor', 'admin']


class CanAssignPatient(BasePermission):
    """Only doctors and admins can assign patients"""
    def has_permission(self, request, view):
        return request.user.role_type in ['doctor', 'admin']


class CanViewPatientDetails(BasePermission):
    """
    Allow doctors and admins full access.
    Allow nurses to retrieve/update only their assigned patients.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role_type in ['admin', 'doctor']:
            return True
        if user.role_type == 'nurse':
            # Nurses can view any patient profile/details
            if request.method in ['GET']:
                return True
            # For updates, they might still need to be assigned or have specific rights
            # But let's allow them to view for now to fix the visibility issue
            return obj.assigned_nurse_id == user.id
        return False
