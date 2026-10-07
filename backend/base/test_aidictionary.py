import json
import re

from django.test import TestCase

from base import aidictionary
from base.models import Product

URL = '/AIDictionary/lotus-banquet-hall-virugambakkam'
CANONICAL = f'https://www.wedmangal.com{URL}'


def ld_graph(html):
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    assert len(blocks) == 1, blocks
    return json.loads(blocks[0])['@graph']


class AIDictionaryPageTests(TestCase):

    def get(self, path=URL):
        response = self.client.get(path)
        return response, response.content.decode()

    def test_page_resolves_with_the_right_vendor(self):
        response, html = self.get()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(re.findall(r'<h1[ >]', html)), 1)
        self.assertIn('<h1>Lotus Banquet Hall</h1>', html)
        self.assertIn('Kaliamman Koil Road', html)
        self.assertIn('Virugambakkam', html)
        self.assertEqual(self.get(URL + '/')[0].status_code, 200)         # trailing slash tolerated

    def test_unknown_vendor_is_404(self):
        self.assertEqual(self.get('/AIDictionary/some-other-hall')[0].status_code, 404)
        self.assertEqual(self.get('/AIDictionary/Lotus-Banquet-Hall-Virugambakkam')[0].status_code, 404)

    def test_indexable_with_canonical_title_and_description(self):
        _, html = self.get()
        self.assertIn(f'<link rel="canonical" href="{CANONICAL}">', html)
        self.assertIn('<meta name="robots" content="index, follow">', html)
        self.assertNotIn('noindex', html)
        self.assertRegex(html, r'<title>Lotus Banquet Hall, Virugambakkam — business knowledge record')
        self.assertRegex(html, r'<meta name="description" content="Sourced factual record about Lotus Banquet Hall')

    def test_content_is_in_the_html_without_javascript(self):
        _, html = self.get()
        body = re.sub(r'<script.*?</script>', '', html, flags=re.S)
        for text in ('Business identity', 'Where sources disagree', 'Not known or not verified', 'Sources', '+91 98845 53290'):
            self.assertIn(text, body)
        self.assertNotIn('<div id="root">', html)                          # not a React shell

    def test_json_ld_is_valid_and_connects_page_and_business(self):
        _, html = self.get()
        graph = {node['@type'] if isinstance(node['@type'], str) else 'Business': node for node in ld_graph(html)}
        page, business, crumbs = graph['WebPage'], graph['Business'], graph['BreadcrumbList']
        self.assertEqual(page['url'], CANONICAL)
        self.assertEqual(page['about'], {'@id': f'{CANONICAL}#business'})
        self.assertEqual(business['@id'], f'{CANONICAL}#business')
        self.assertEqual(business['@type'], ['LocalBusiness', 'EventVenue'])
        self.assertEqual(business['address']['postalCode'], '600092')
        self.assertEqual(crumbs['itemListElement'][-1]['item'], CANONICAL)

    def test_no_fabricated_or_unverified_properties(self):
        _, html = self.get()
        text = json.dumps(ld_graph(html))
        for invented in ('aggregateRating', 'review', 'award', 'foundingDate', 'numberOfEmployees',
                         'maximumAttendeeCapacity', 'priceRange', 'founder', 'openingHours', 'areaServed'):
            self.assertNotIn(f'"{invented}"', text, invented)
        for promo in ('best', 'leading', 'No.1', 'trusted', 'premium', 'highly recommended'):
            self.assertNotRegex(html.lower(), rf'\b{re.escape(promo.lower())}\b', promo)

    def test_every_fact_names_a_source_and_discrepancies_are_shown(self):
        record = aidictionary.RECORD
        for fact in record['identity'] + record['services'] + record['details']:
            self.assertTrue(fact['sources'] and set(fact['sources']) <= set(aidictionary.SOURCES), fact)
            if fact['status'] == 'corroborated':                          # never just us + the business
                self.assertTrue(set(fact['sources']) - {'official', 'wedmangal'}, fact)
        _, html = self.get()
        self.assertIn('Up to 300 guests seated, 400 floating', html)
        self.assertIn('50 to 500 guests', html)
        self.assertIn('not an independent source', html)

    def test_sitemap_includes_only_the_experimental_record(self):
        xml = self.client.get('/sitemap.xml').content.decode()
        self.assertEqual(xml.count('/AIDictionary/'), 1)
        self.assertIn(f'<loc>{CANONICAL}</loc>', xml)

    def test_existing_vendor_page_still_works(self):
        Product.objects.create(_id=789, name='Lotus Banquet Hall, Virugambakkam', category='Halls', city='Chennai',
                               personal_phone='1', is_approved=True)
        self.assertEqual(self.client.get('/product/789').status_code, 200)
        self.assertEqual(self.client.get('/api/products/789/').status_code, 200)
