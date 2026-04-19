# middleware.py
from django.http import HttpResponseForbidden
from django.utils.deprecation import MiddlewareMixin
import requests

RENDERTRON_URL = "http://localhost:3000/render/"  # your Rendertron instance

BOT_AGENTS = [
    'googlebot', 'bingbot', 'duckduckbot', 'slurp',
    'gptbot', 'claudebot', 'anthropic-ai', 'chatgpt-user',
    'facebookexternalhit', 'twitterbot', 'linkedinbot',
]

def prerender_middleware(get_response):
    def middleware(request):
        ua = request.META.get('HTTP_USER_AGENT', '').lower()
        is_bot = any(bot in ua for bot in BOT_AGENTS)

        if is_bot:
            url = request.build_absolute_uri()
            try:
                rendered = requests.get(RENDERTRON_URL + url, timeout=10)
                from django.http import HttpResponse
                return HttpResponse(rendered.content, content_type='text/html')
            except Exception:
                pass  # fallback to normal response

        return get_response(request)
    return middleware

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
