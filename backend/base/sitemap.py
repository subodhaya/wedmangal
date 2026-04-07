from django.contrib.sitemaps import Sitemap
from base.models import Product


class VendorSitemap(Sitemap):
    changefreq = 'weekly'
    priority = 0.8

    def items(self):
        return Product.objects.filter(is_approved=True)

    def location(self, obj):
        return f'/vendor/{obj._id}'

    def lastmod(self, obj):
        return obj.createdAt


class StaticSitemap(Sitemap):
    changefreq = 'monthly'
    priority = 0.5

    def items(self):
        return [
            'home', 'photographers', 'makeup',
            'catering', 'decoration', 'halls', 'dj'
        ]

    def location(self, item):
        return {
            'home': '/',
            'photographers': '/category/Photographers',
            'makeup': '/category/Makeup_Artist',
            'catering': '/category/Caterers',
            'decoration': '/category/Decorators',
            'halls': '/category/Halls',
            'dj': '/category/DJ_Artist',
        }[item]
