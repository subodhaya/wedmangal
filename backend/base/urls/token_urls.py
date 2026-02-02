from django.urls import path
from base.views.token_views import refresh_token_view  # Import your view
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),  # Matches /api/token/refresh/
]
