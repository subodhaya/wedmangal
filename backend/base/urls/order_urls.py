from django.urls import path
from base.views import order_views as views
from base.views.order_views import create_cashfree_payment, cashfree_webhook



urlpatterns = [

    path('', views.getOrders, name='orders'),
    path('add/', views.addOrderItems, name='orders-add'),
    path('myorders/', views.getMyOrders, name='myorders'),

    path('appointments/<str:product_id>/', views.get_service_appointments),

    path('<str:pk>/deliver/', views.updateOrderToDelivered, name='order-delivered'),
    path('unread/', views.getUnreadOrders, name='orders-unread'),
    path('mark-read/', views.mark_notifications_as_read, name='orders-mark-read'),
    path('<str:pk>/', views.getOrderById, name='user-order'),
    path('<str:pk>/pay/', views.updateOrderToPaid, name='pay'),

    path("<int:pk>/create-cashfree-payment/", create_cashfree_payment, name="create_cashfree_payment"),
    path("cashfree-webhook/", cashfree_webhook, name="cashfree_webhook"),


    path('get-budget/<str:pk>/', views.get_budget, name='get_budget'),
    path('update-budget/<str:pk>/', views.update_budget, name='update_budget'),

]
