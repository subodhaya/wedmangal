# decorators.py
from django.http import HttpResponseForbidden
from functools import wraps
from functools import wraps
from django.http import HttpResponseForbidden

def admin_only(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if request.user.is_authenticated and request.user.is_staff:
            return view_func(request, *args, **kwargs)
        else:
            return HttpResponseForbidden()
    return _wrapped_view

def product_manager_only(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if request.user.is_authenticated and hasattr(request.user, 'is_product_manager') and request.user.is_product_manager:
            return view_func(request, *args, **kwargs)
        else:
            return HttpResponseForbidden()
    return _wrapped_view


def role_required(*roles):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return HttpResponseForbidden("You must be logged in to access this page.")
            user_profile = getattr(request.user, 'profile', None)
            if user_profile and user_profile.role in roles:
                return view_func(request, *args, **kwargs)
            return HttpResponseForbidden("You do not have permission to access this page.")
        return _wrapped_view
    return decorator
