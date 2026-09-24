import json
import re
import xml.etree.ElementTree as ET
from datetime import time

from django.test import TestCase
from django.urls import resolve

from base.models import Product, BlogPost, Service
from base.views.sitemap_view import SITE

NS = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

# Public (non-login) routes from frontend/src/App.js. Keep in sync if routes change.
PUBLIC_ROUTE_PATTERNS = [
    r'/',
    r'/plan',
    r'/login',
    r'/register',
    r'/product/\d+',
    r'/available-today',
    r'/search/',
    r'/category/[A-Za-z_]+',
    r'/TermsAndCondition',
    r'/RefundAndCancellation',
    r'/ContactUs',
    r'/faq',
    r'/blog',
    r'/blog/[\w-]+',
]


class SitemapTests(TestCase):
    def setUp(self):
        self.approved = Product.objects.create(
            name='Approved Studio', category='Photographers', city='Chennai',
            personal_phone='9000000001', is_approved=True,
        )
        self.unapproved = Product.objects.create(
            name='Pending Studio', category='Photographers', city='Chennai',
            personal_phone='9000000002', is_approved=False,
        )
        self.post = BlogPost.objects.create(
            title='Chennai Wedding Guide', excerpt='x', content='x', published=True,
        )
        self.draft = BlogPost.objects.create(
            title='Draft Post', excerpt='x', content='x', published=False,
        )

    def get_locs(self):
        response = self.client.get('/sitemap.xml')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/xml')
        root = ET.fromstring(response.content)
        return root, [loc.text for loc in root.findall('sm:url/sm:loc', NS)]

    def test_sitemap_is_valid_xml(self):
        root, locs = self.get_locs()
        self.assertEqual(root.tag, '{%s}urlset' % NS['sm'])
        self.assertTrue(locs)
        self.assertEqual(len(locs), len(set(locs)), 'duplicate URLs in sitemap')

    def test_only_approved_vendors_listed(self):
        _, locs = self.get_locs()
        self.assertIn(f'{SITE}/product/{self.approved._id}', locs)
        self.assertNotIn(f'{SITE}/product/{self.unapproved._id}', locs)

    def test_vendor_lastmod_uses_created_at(self):
        root, _ = self.get_locs()
        for url in root.findall('sm:url', NS):
            if url.find('sm:loc', NS).text == f'{SITE}/product/{self.approved._id}':
                lastmod = url.find('sm:lastmod', NS).text
                self.assertEqual(lastmod, self.approved.createdAt.date().isoformat())
                return
        self.fail('approved vendor missing from sitemap')

    def test_only_published_blog_posts_listed(self):
        _, locs = self.get_locs()
        self.assertIn(f'{SITE}/blog/{self.post.slug}', locs)
        self.assertNotIn(f'{SITE}/blog/{self.draft.slug}', locs)

    def test_every_url_matches_a_public_react_route(self):
        _, locs = self.get_locs()
        for loc in locs:
            self.assertTrue(loc.startswith(SITE + '/'), loc)
            path = loc[len(SITE):]
            self.assertTrue(
                any(re.fullmatch(p, path) for p in PUBLIC_ROUTE_PATTERNS),
                f'{path} does not match a public React route',
            )


def json_ld_blocks(html):
    return [json.loads(m) for m in re.findall(
        r'<script type="application/ld\+json">(.*?)</script>', html, flags=re.S)]


def ld_items(html):
    items = []
    for block in json_ld_blocks(html):
        items.extend(block if isinstance(block, list) else [block])
    return items


class SeoPageTests(TestCase):
    """Server-rendered SEO for /product/<id> and /category/<category>.

    Uses the real React build at frontend/build/index.html, so these also
    confirm the tag replacements match the actual build output.
    """

    def setUp(self):
        self.vendor = Product.objects.create(
            name='Lotus Studio', category='Photographers', city='Chennai',
            area_name='Adyar', address='12 Main Rd, Adyar, Chennai 600020',
            description='Lotus Studio is a Photographer based in Adyar, Chennai.',
            business_phone='9876543210', personal_phone='9000000000',
            opening_time=time(10, 0), closing_time=time(19, 0),
            is_approved=True,
        )
        Service.objects.create(product=self.vendor, name='Candid Photography')
        self.hidden = Product.objects.create(
            name='Pending Studio', category='Photographers', city='Chennai',
            personal_phone='9000000001', is_approved=False,
        )

    def get_html(self, path, status=200):
        response = self.client.get(path)
        self.assertEqual(response.status_code, status)
        return response.content.decode()

    def assert_single_head_tags(self, html):
        self.assertEqual(len(re.findall(r'<title>', html)), 1)
        self.assertEqual(len(re.findall(r'<meta\s+name="description"', html)), 1)
        self.assertEqual(len(re.findall(r'<link\s+rel="canonical"', html)), 1)
        self.assertEqual(len(re.findall(r'<meta\s+property="og:url"', html)), 1)

    # ── Vendor pages ─────────────────────────────────────────

    def test_vendor_page_returns_200_with_react_app(self):
        html = self.get_html(f'/product/{self.vendor._id}')
        self.assertRegex(html, r'<script defer="defer" src="/static/js/main\.[0-9a-f]+\.js">')
        self.assertIn('<div id="root"><main class="seo-summary">', html)

    def test_vendor_title_and_description(self):
        html = self.get_html(f'/product/{self.vendor._id}')
        self.assertIn('<title>Lotus Studio | Photographers in Adyar, Chennai | WedMangal</title>', html)
        self.assertIn('<meta name="description" content="Lotus Studio is a Photographer based in Adyar, Chennai."/>', html)
        self.assertIn(f'<link rel="canonical" href="{SITE}/product/{self.vendor._id}"/>', html)
        self.assert_single_head_tags(html)

    def test_vendor_trailing_slash_uses_same_canonical(self):
        html = self.get_html(f'/product/{self.vendor._id}/')
        self.assertIn(f'<link rel="canonical" href="{SITE}/product/{self.vendor._id}"/>', html)

    def test_vendor_structured_data_uses_only_stored_fields(self):
        html = self.get_html(f'/product/{self.vendor._id}')
        business = next(i for i in ld_items(html) if i.get('@type') == 'LocalBusiness')
        self.assertEqual(business['name'], 'Lotus Studio')
        self.assertEqual(business['url'], f'{SITE}/product/{self.vendor._id}')
        self.assertEqual(business['telephone'], '+919876543210')
        self.assertEqual(business['address']['streetAddress'], '12 Main Rd, Adyar, Chennai 600020')
        self.assertEqual(business['address']['addressLocality'], 'Chennai')
        for invented in ('aggregateRating', 'review', 'openingHoursSpecification', 'priceRange', 'image'):
            self.assertNotIn(invented, business)

    def test_vendor_summary_contains_real_details(self):
        html = self.get_html(f'/product/{self.vendor._id}')
        self.assertIn('<h1>Lotus Studio</h1>', html)
        self.assertIn('Hours: 10:00 AM – 7:00 PM', html)
        self.assertIn('Services: Candid Photography', html)
        self.assertIn('href="/category/Photographers"', html)
        self.assertNotIn('9000000000', html)  # personal phone is never rendered

    def test_vendor_price_only_when_stored(self):
        self.vendor.min_price, self.vendor.max_price = 25000, 60000
        self.vendor.save()
        html = self.get_html(f'/product/{self.vendor._id}')
        business = next(i for i in ld_items(html) if i.get('@type') == 'LocalBusiness')
        self.assertEqual(business['priceRange'], '₹25,000 – ₹60,000')

    def test_vendor_text_is_escaped(self):
        self.vendor.name = 'Evil </script><script>alert(1)</script>'
        self.vendor.save()
        html = self.get_html(f'/product/{self.vendor._id}')
        self.assertNotIn('<script>alert(1)</script>', html)
        self.assertTrue(json_ld_blocks(html))  # JSON-LD still parses

    def test_unknown_vendor_returns_404(self):
        self.get_html('/product/999999', status=404)

    def test_unapproved_vendor_returns_404(self):
        self.get_html(f'/product/{self.hidden._id}', status=404)

    def test_other_product_routes_still_use_react_fallback(self):
        self.assertNotEqual(resolve(f'/product/{self.vendor._id}/edit').url_name, 'seo-product')
        self.assertNotEqual(resolve('/product/service/5').url_name, 'seo-product')
        self.assertEqual(resolve('/api/products/all').url_name, 'products')

    # ── Category pages ───────────────────────────────────────

    def test_category_page_has_category_seo(self):
        html = self.get_html('/category/Photographers')
        self.assertIn('<title>Wedding Photographers in Chennai | WedMangal</title>', html)
        self.assertIn('<meta name="description" content="Browse 1 wedding photographers in Chennai. See services', html)
        self.assertIn(f'<link rel="canonical" href="{SITE}/category/Photographers"/>', html)
        self.assert_single_head_tags(html)

    def test_category_page_links_only_approved_vendors(self):
        html = self.get_html('/category/Photographers')
        self.assertIn(f'<a href="/product/{self.vendor._id}">Lotus Studio</a>', html)
        self.assertNotIn(f'/product/{self.hidden._id}"', html)
        item_list = next(i for i in ld_items(html) if i.get('@type') == 'CollectionPage')['mainEntity']
        self.assertEqual(item_list['numberOfItems'], 1)

    def test_category_case_insensitive_with_canonical(self):
        html = self.get_html('/category/photographers')
        self.assertIn(f'<link rel="canonical" href="{SITE}/category/Photographers"/>', html)

    def test_empty_category_is_noindex(self):
        html = self.get_html('/category/Pandit')
        self.assertIn('<meta name="robots" content="noindex, follow"/>', html)

    def test_unknown_category_returns_404(self):
        self.get_html('/category/Not_A_Category', status=404)
