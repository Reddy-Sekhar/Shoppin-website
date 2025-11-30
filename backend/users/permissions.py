from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Allow access only to authenticated users with ADMIN role."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, 'role', '').upper() == 'ADMIN')

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
