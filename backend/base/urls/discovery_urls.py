from django.urls import path
from base.views.discovery_views import create_lead, saved_requirements

urlpatterns = [
    path('leads/', create_lead, name='discovery-create-lead'),
    path('saved/', saved_requirements, name='discovery-saved-requirements'),
]
