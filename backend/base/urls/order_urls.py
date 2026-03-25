from django.urls import path
from base.views import order_views as views
from base.views.order_views import create_cashfree_payment, cashfree_webhook



urlpatterns = [

    
    path('',                views.getOrders,                 name='orders'),
    path('add/',            views.addOrderItems,             name='orders-add'),
    path('myorders/',       views.getMyOrders,               name='myorders'),
    path('unread/',         views.getUnreadOrders,           name='orders-unread'),
    path('mark-read/',      views.mark_notifications_as_read, name='orders-mark-read'),
    path('cashfree-webhook/', cashfree_webhook,              name='cashfree_webhook'),

    path('calendar/',                                   views.get_vendor_calendar,    name='vendor-calendar'),
    path('calendar/block/',                            views.add_unavailable_date,   name='calendar-block'),
    path('calendar/block/<int:pk>/',                     views.remove_unavailable_date, name='calendar-unblock'),

    path('appointments/<str:product_id>/',          views.get_service_appointments,  name='service-appointments'),
    path('get-budget/<str:pk>/',                    views.get_budget,                name='get_budget'),
    path('update-budget/<str:pk>/',                 views.update_budget,             name='update_budget'),

    
    path('<str:pk>/pay/',                           views.updateOrderToPaid,         name='pay'),
    path('<str:pk>/deliver/',                       views.updateOrderToDelivered,    name='order-delivered'),
    path('<int:pk>/create-cashfree-payment/',       create_cashfree_payment,         name='create_cashfree_payment'),

    
    path('<str:pk>/',                               views.getOrderById,              name='user-order'),

    
]