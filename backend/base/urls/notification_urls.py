from django.urls import path
from base.views.notification_views import whatsapp_status

urlpatterns = [
    path('whatsapp/', whatsapp_status, name='fast2sms-whatsapp-status'),
]
