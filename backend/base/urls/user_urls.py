from django.urls import path
from base.views import user_views as views

urlpatterns = [
    path('login/', views.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('wedding-date/', views.wedding_date, name='save-wedding-date'),  # POST to save the wedding date
    path('wedding-date/<str:user_id>/', views.wedding_date, name='get-wedding-date'),
    path('routes/', views.getRoutes, name="routes"),
    path('register/', views.registerUser, name='register'),
    path('owner-register/', views.registerOwner, name='registerowner'),
    path('profile/', views.getUserProfile, name="users-profile"),
    path('profile/update/', views.updateUserProfile, name="user-profile-update"),
    path('', views.getUsers, name="users"),
    path('<str:pk>/', views.getUserById, name='user'),
    path('update/<str:pk>/', views.updateUser, name='user-update'),
    path('delete/<str:pk>/', views.deleteUser, name='user-delete'),

  
    
]
