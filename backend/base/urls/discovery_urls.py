from django.urls import path
from base.views.discovery_views import create_lead

urlpatterns = [
    path('leads/', create_lead, name='discovery-create-lead'),
]
