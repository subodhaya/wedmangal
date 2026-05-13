from django.contrib.sitemaps import Sitemap
from base.models import Product


class VendorSitemap(Sitemap):
    changefreq = 'weekly'
    priority = 0.8

    def items(self):
        return Product.objects.filter(is_approved=True)

    def location(self, obj):
        return f'/product/{obj._id}'

    def lastmod(self, obj):
        return obj.createdAt


class StaticSitemap(Sitemap):
    changefreq = 'monthly'
    priority = 0.6

    def items(self):
        return [
            'home', 'photographers', 'makeup', 'mehandi', 'dj',
            'catering', 'decoration', 'halls', 'planners',
            'jewellery', 'invitation', 'pandit', 'travel', 'music',
            'plan', 'available-today',
        ]

    def location(self, item):
        return {
            'home':           '/',
            'photographers':  '/category/Photographers',
            'makeup':         '/category/Makeup_Artist',
            'mehandi':        '/category/Mehandi_Artist',
            'dj':             '/category/DJ_Artist',
            'catering':       '/category/Caterers',
            'decoration':     '/category/Decorators',
            'halls':          '/category/Halls',
            'planners':       '/category/Planners',
            'jewellery':      '/category/Jewellery',
            'invitation':     '/category/Invitation',
            'pandit':         '/category/Pandit',
            'travel':         '/category/Travel_Transport',
            'music':          '/category/Entertainment',
            'plan':           '/plan',
            'available-today': '/available-today',
        }[item]
