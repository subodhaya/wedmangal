from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from base.models import BlogPost
from base.serializers import BlogPostSerializer, BlogPostListSerializer


@api_view(['POST'])
@permission_classes([IsAdminUser])
def create_blog_post(request):
    data = request.data
    post = BlogPost.objects.create(
        title=data.get('title', ''),
        slug=data.get('slug', ''),
        excerpt=data.get('excerpt', ''),
        content=data.get('content', ''),
        author=data.get('author', 'WedMangal Team'),
        category=data.get('category', 'wedding-tips'),
        tags=data.get('tags', ''),
        published=data.get('published', True),
    )
    return Response({'id': post.id, 'slug': post.slug, 'title': post.title}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_blog_posts(request):
    category = request.query_params.get('category', '')
    posts = BlogPost.objects.filter(published=True)
    if category:
        posts = posts.filter(category=category)
    serializer = BlogPostListSerializer(posts, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_blog_post(request, slug):
    try:
        post = BlogPost.objects.get(slug=slug, published=True)
    except BlogPost.DoesNotExist:
        return Response({'detail': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = BlogPostSerializer(post, context={'request': request})
    return Response(serializer.data)
