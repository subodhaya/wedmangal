# middleware.py
from django.http import HttpResponseForbidden
from django.utils.deprecation import MiddlewareMixin

class RoleBasedAccessMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if request.user.is_authenticated:
            request.user.is_product_manager = False
            if request.user.groups.filter(name='ProductManager').exists():
                request.user.is_product_manager = True


class RoleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.user.is_authenticated:
            return HttpResponseForbidden("You must be logged in to access this page.")
        return self.get_response(request)
