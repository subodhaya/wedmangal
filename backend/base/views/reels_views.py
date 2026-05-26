from django.core.paginator import Paginator
from rest_framework.decorators import api_view
from rest_framework.response import Response

from base.models import Product


@api_view(['GET'])
def get_reels(request):
    category = request.GET.get('category')
    page_num  = int(request.GET.get('page', 1))

    qs = Product.objects.filter(
        video_url__isnull=False,
        is_approved=True,
    ).exclude(video_url='').order_by('-video_uploaded_at')

    if category:
        qs = qs.filter(category__iexact=category)

    paginator = Paginator(qs, 10)
    page      = paginator.get_page(page_num)

    data = [
        {
            'product_id':   p._id,
            'vendor_name':  p.name,
            'category':     p.category,
            'city':         p.city,
            'video_url':    p.video_url,
            'thumb_url':    p.video_thumb,
            'duration':     p.video_duration,
        }
        for p in page
    ]

    return Response({
        'results':   data,
        'page':      page_num,
        'pages':     paginator.num_pages,
        'count':     paginator.count,
    })
