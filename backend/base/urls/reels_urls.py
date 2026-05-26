from django.urls import path
from base.views import reels_views as views

urlpatterns = [
    path('', views.get_reels, name='reels'),
]
