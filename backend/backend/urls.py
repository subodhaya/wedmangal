
"""backend URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.http import FileResponse, Http404
from dj_rest_auth.views import LoginView
from base.views.sitemap_view import sitemap_xml
import os

def serve_public_file(filename):
    def view(request):
        filepath = os.path.join(settings.BASE_DIR, 'frontend', 'build', filename)
        if os.path.exists(filepath):
            return FileResponse(open(filepath, 'rb'))
        raise Http404
    return view



   


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/products/', include('base.urls.product_urls')),
    path('api/users/', include('base.urls.user_urls')),
    path('api/orders/', include('base.urls.order_urls')),
    path('api/token/', include('base.urls.token_urls')),
    path('api/auth/', include('base.urls.auth_urls')),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('accounts/', include('allauth.urls')),
    path('api/auth/google/', include('allauth.socialaccount.urls')),
    path('robots.txt', serve_public_file('robots.txt')),
    path('llms.txt', serve_public_file('llms.txt')),
    path('sitemap.xml', sitemap_xml),
    path('api/blog/', include('base.urls.blog_urls')),
    path('api/reels/', include('base.urls.reels_urls')),
]

# Add static and media file serving
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Add a fallback for React's index.html
urlpatterns += [
    #re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
    re_path(r'^(?!admin|api|accounts|static|media).*$', TemplateView.as_view(template_name='index.html')),
]
