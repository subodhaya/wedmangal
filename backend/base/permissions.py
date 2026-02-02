# permissions.py
from rest_framework.permissions import BasePermission
# backend/base/middleware/permissions.py

from django.shortcuts import redirect
from django.utils.deprecation import MiddlewareMixin

class AdminOnlyMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if request.user.is_authenticated and not request.user.is_superuser:
            if request.path.startswith('/admin/') and not request.user.is_staff:
                return redirect('/no-access/')


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.profile.role == 'admin'

class IsProductManager(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.profile.role == 'product-manager'

class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return request.user and request.user.profile.role in ['admin']
