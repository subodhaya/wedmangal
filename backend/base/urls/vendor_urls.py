from django.urls import path
from base.views import claim_views as views

urlpatterns = [
    path('<int:pk>/claim/', views.claim_state, name='vendor-claim-state'),
    path('<int:pk>/claim/send-code/', views.claim_send_code, name='vendor-claim-send-code'),
    path('<int:pk>/claim/verify/', views.claim_verify, name='vendor-claim-verify'),
    path('<int:pk>/claim/request/', views.claim_request, name='vendor-claim-request'),
    path('<int:pk>/profile/', views.vendor_profile, name='vendor-profile'),
]
