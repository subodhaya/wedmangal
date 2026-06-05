from django.urls import path
from base.views.blog_views import get_blog_posts, get_blog_post, create_blog_post

urlpatterns = [
    path('', get_blog_posts, name='blog-list'),
    path('create/', create_blog_post, name='blog-create'),
    path('<slug:slug>/', get_blog_post, name='blog-detail'),
]
