from django.urls import path
from base.views import analytics_views as views
from base.views import phone_check_views

urlpatterns = [
    path('events/', views.log_event, name='analytics-log-event'),
    path('quotes/', views.create_quote_request, name='analytics-create-quote'),
    path('phone/send-code/', phone_check_views.send_code, name='enquiry-phone-send-code'),
    path('phone/verify/', phone_check_views.verify_code, name='enquiry-phone-verify'),
    path('vendor-summary/', views.vendor_summary, name='analytics-vendor-summary'),
    path('admin-summary/', views.admin_summary, name='analytics-admin-summary'),
    path('searches/', views.log_search, name='analytics-log-search'),
    path('search-summary/', views.search_summary, name='analytics-search-summary'),
    path('recent-signups/', views.recent_signups, name='analytics-recent-signups'),
]
