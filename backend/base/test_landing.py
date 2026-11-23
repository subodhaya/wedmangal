import json
import re
import tempfile
from pathlib import Path

from django.test import TestCase, override_settings

from base import landing
from base.models import BlogPost, Product

INDEX = '<html><head><title>WedMangal — Book Wedding Vendors</title></head><body><div id="root"></div></body></html>'


def vendor(name, category='Halls', city='Chennai', area='Velachery', approved=True, **extra):
    return Product.objects.create(name=name, category=category, city=city, area_name=area, is_approved=approved,
                                  **extra)


def json_ld(response):
    found = []
    for text in re.findall(r'<script type="application/ld\+json">(.*?)</script>', response.content.decode(), re.S):
        data = json.loads(text)
        found += data if isinstance(data, list) else [data]
    return found


class LandingPageTests(TestCase):

    def setUp(self):
        for i in range(3):
            vendor(f'Velachery Hall {i}', description='Rated 4.6★ on Google (120 reviews)')
        vendor('Adambakkam Hall', area='Adambakkam')                  # a Velachery neighbour
        vendor('Hidden Hall', approved=False)
        vendor('Lone Photographer', category='Photographers')
        for i in range(3):
            vendor(f'Koramangala Studio {i}', category='Photographers', city='Bangalore', area='Koramangala')

    def test_area_page_lists_vendors_there_and_nearby(self):
        response = self.client.get('/chennai/wedding-halls/velachery')
        self.assertEqual(response.status_code, 200)
        html = response.content.decode()
        self.assertIn('<title>Wedding Halls in Velachery, Chennai | Get Free Quotes | WedMangal</title>', html)
        self.assertIn('<link rel="canonical" href="https://www.wedmangal.com/chennai/wedding-halls/velachery">', html)
        self.assertIn('Velachery Hall 0', html)
        self.assertIn('4.6★ Google (120 reviews)', html)
        self.assertIn('Wedding Halls near Velachery', html)
        self.assertIn('Adambakkam Hall', html)
        self.assertNotIn('Hidden Hall', html)
        lists = [d for d in json_ld(response) if d['@type'] == 'CollectionPage']
        self.assertEqual(lists[0]['mainEntity']['numberOfItems'], 3)

    def test_thin_or_unknown_pages_are_real_404s(self):
        for url in ('/chennai/wedding-photographers/velachery',     # only one photographer there
                    '/chennai/wedding-halls/nowhere', '/chennai/not-a-category',
                    '/hyderabad/wedding-halls'):                       # nothing listed
            self.assertEqual(self.client.get(url).status_code, 404, url)

    def test_chennai_category_redirects_to_existing_category_page(self):
        response = self.client.get('/chennai/wedding-halls')
        self.assertEqual((response.status_code, response['Location']), (301, '/category/Halls'))

    def test_other_city_category_page(self):
        response = self.client.get('/bangalore/wedding-photographers')
        self.assertContains(response, '<h1>Wedding Photographers in Bangalore</h1>', html=True)
        self.assertContains(response, 'href="/bangalore/wedding-photographers/koramangala"')

    def test_city_hub_links_categories_and_area_pages(self):
        response = self.client.get('/chennai')
        self.assertContains(response, 'href="/category/Halls"')
        self.assertContains(response, 'href="/chennai/wedding-halls/velachery"')
        self.assertNotContains(response, '/chennai/wedding-photographers/velachery')

    def test_sitemap_has_only_pages_that_exist(self):
        for url in landing.all_pages():
            self.assertEqual(self.client.get(url).status_code, 200, url)
        self.assertIn('/chennai/wedding-halls/velachery', landing.all_pages())
        sitemap = self.client.get('/sitemap.xml').content.decode()
        self.assertIn('https://www.wedmangal.com/chennai/wedding-halls/velachery</loc>', sitemap)
        self.assertIn('https://www.wedmangal.com/list-your-business</loc>', sitemap)
        self.assertNotIn('/owner-register</loc>', sitemap)

    def test_vendor_landing_page_has_faq_and_sign_up_links(self):
        response = self.client.get('/list-your-business')
        self.assertContains(response, 'List Your Wedding Business on WedMangal — Free')
        self.assertContains(response, 'href="/owner-register"')
        self.assertContains(response, 'https://wa.me/917200152906?')
        faq = [d for d in json_ld(response) if d['@type'] == 'FAQPage'][0]
        self.assertTrue(faq['mainEntity'][0]['name'].startswith('Is it free'))


class ReactPageContentTests(TestCase):
    """Home, blog and sign-up stay React pages but carry their content in the first HTML."""

    def setUp(self):
        folder = tempfile.mkdtemp()
        Path(folder, 'index.html').write_text(INDEX, encoding='utf-8')
        self.settings_override = override_settings(REACT_INDEX_HTML=str(Path(folder, 'index.html')))
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.post = BlogPost.objects.create(title='Tamil Wedding Budget Guide', excerpt='How much a wedding costs.',
                                            content='<h2>Hall</h2><p>Halls cost…</p>', published=True)
        BlogPost.objects.create(title='Secret Draft', excerpt='x', content='x', published=False)

    def test_home_keeps_its_title_and_links_every_section(self):
        html = self.client.get('/').content.decode()
        self.assertIn('<title>WedMangal — Book Wedding Vendors</title>', html)
        for link in ('/category/Halls', '/chennai', '/bangalore', f'/blog/{self.post.slug}', '/list-your-business'):
            self.assertIn(f'href="{link}"', html)
        self.assertNotIn('Secret Draft', html)

    def test_blog_post_has_its_own_title_text_and_article_data(self):
        response = self.client.get(f'/blog/{self.post.slug}')
        html = response.content.decode()
        self.assertIn('<title>Tamil Wedding Budget Guide | WedMangal</title>', html)
        self.assertIn('<p>Halls cost…</p>', html)
        self.assertEqual([d for d in json_ld(response) if d['@type'] == 'Article'][0]['headline'],
                         'Tamil Wedding Budget Guide')

    def test_draft_and_unknown_posts_are_404(self):
        draft = BlogPost.objects.get(title='Secret Draft')
        self.assertEqual(self.client.get(f'/blog/{draft.slug}').status_code, 404)
        self.assertEqual(self.client.get('/blog/no-such-post').status_code, 404)

    def test_blog_list(self):
        html = self.client.get('/blog').content.decode()
        self.assertIn('Wedding Planning Guides', html)
        self.assertIn(f'href="/blog/{self.post.slug}"', html)

    def test_owner_register_is_noindex_and_points_to_landing_page(self):
        html = self.client.get('/owner-register').content.decode()
        self.assertIn('noindex, follow', html)
        self.assertIn('href="/list-your-business"', html)
