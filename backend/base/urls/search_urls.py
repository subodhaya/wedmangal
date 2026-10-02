from django.urls import path
from base.views.search_views import search_vendors

urlpatterns = [
    path('', search_vendors, name='search-vendors'),
]
