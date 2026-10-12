from django.urls import path
from base.views.search_views import guess_city, search_vendors

urlpatterns = [
    path('', search_vendors, name='search-vendors'),
    path('city/', guess_city, name='guess-city'),
]
