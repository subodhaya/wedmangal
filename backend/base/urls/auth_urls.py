from django.urls import path
from base.views.auth_views import GoogleLogin
from dj_rest_auth.views import LoginView

urlpatterns = [
    
    path('login/', LoginView.as_view(), name='rest_login'),
    path('google-login/', GoogleLogin.as_view(), name='google-login'),
]
