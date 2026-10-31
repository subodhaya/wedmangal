from django.urls import path
from base.views.removal_views import request_status, submit_copyright, submit_request

urlpatterns = [
    path('', submit_request, name='removal-request-submit'),
    path('copyright/', submit_copyright, name='removal-request-copyright'),
    path('status/', request_status, name='removal-request-status'),
]
