from django.urls import path
from base.views import product_views as views 
from base.views.product_views import ProductDetailView


urlpatterns = [
    path('', views.getRoutes, name="routes"),

    path('all', views.getProducts, name="products"),
    path('create/', views.createProduct, name="product-create"), 
    path('cart/', views.cart_sync, name='cart-sync'),
    path('wishlist/', views.wishlist_sync, name='wishlist_sync'),  
    path('services/<str:pk>/', views.getRelatedServices, name='getRelatedServices'),
    path('product/<str:pk>/', views.getProductRelated, name="product-detail"),

    path('add_service/', views.add_service, name='add_service'),
    path('delete_service/<int:service_id>/', views.delete_service, name='delete_service'),
    path('my-business/<int:user_id>/', views.my_business_view, name='my-business'),
   
    path('<int:service_id>/images/upload/', views.add_service_images, name='add-service-images'),
    

    #path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('products/<int:pk>/business-data/', ProductDetailView.as_view(), name='product-detail'),
    
    
    path('<int:pk>/remove-business-image/', views.remove_business_image, name='product-remove-business-image'),
    path('<int:pk>/remove-service-image/', views.remove_service_image, name='service-remove-image'),
    path('mine/', views.get_my_product, name='get-my-product'),
    path('register-product/', views.register_product, name="register-product"), 
    path('register-service/', views.register_service, name="register-service"),  
   
    path('upload/', views.uploadImage, name="image-upload"),
    path('search/', views.searchProducts, name='search-products'),
    path('<str:pk>/', views.getProduct, name="product"),
    path('bookings/<int:service_id>/dates', views.get_booked_dates, name='get-booked-dates'),
    
    path('<int:service_id>/reviews/', views.createServiceReview, name="create-review"),
    path('all/top/', views.getTopProducts, name='top-products'),
    path('update_product/<int:user_id>/', views.update_product, name='product-update'),
    path('update_service/<int:service_id>/', views.update_service, name='update_service'),
    
    path('delete/<str:pk>/', views.deleteProduct, name="product-delete"),

     path('<int:pk>/approve/', views.approveProduct, name='approve-product'),


      path('by-user/<str:user_id>/', views.get_product_by_user, name='get-product-by-user'),
    path('by-product/<str:product_id>/', views.get_services_by_product, name='get-services-by-product'),
    path('appointments/<str:product_id>/', views.get_appointments_by_product, name='get-appointments-by-product'),
    path('appointments/<str:pk>/update/', views.mark_order_as_done, name='mark-order-as-done'),
    
]
