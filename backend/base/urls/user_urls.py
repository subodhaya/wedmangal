from django.urls import path
from base.views import user_views as views

urlpatterns = [
    path('login/',                      views.MyTokenObtainPairView.as_view(),  name='token_obtain_pair'),
    path('routes/',                     views.getRoutes,                        name='routes'),
    path('register/',                   views.registerUser,                     name='register'),
    path('owner-register/',             views.registerOwner,                    name='registerowner'),
    path('profile/',                    views.getUserProfile,                   name='users-profile'),
    path('profile/update/',             views.updateUserProfile,                name='user-profile-update'),
    path('wedding-date/',               views.wedding_date,                     name='save-wedding-date'),
    path('wedding-date/<str:user_id>/', views.wedding_date,                     name='get-wedding-date'),

    # ── Service Owner Claim OTP ──────────────────────────────────────────────
    path('claim/send-otp/',             views.claim_send_otp,                   name='claim-send-otp'),
    path('claim/verify-otp/',           views.claim_verify_otp,                 name='claim-verify-otp'),
    path('my-claims/',                  views.my_claimed_listings,              name='my-claimed-listings'),

    # ── Admin ────────────────────────────────────────────────────────────────
    path('',                            views.getUsers,                         name='users'),
    path('<str:pk>/',                   views.getUserById,                      name='user'),
    path('update/<str:pk>/',            views.updateUser,                       name='user-update'),
    path('delete/<str:pk>/',            views.deleteUser,                       name='user-delete'),
]