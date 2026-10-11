import json
import re

from django.test import TestCase

from base.models import Product


def listing(name, area='Tambaram', category='Halls', description='Rated 4.1★ on Google (1527 reviews).'):
    return Product.objects.create(name=name, category=category, city='Chennai', area_name=area,
                                  address=f'5 Gandhi Rd, East {area}, {area}, Tamil Nadu 600059',
                                  description=description, business_phone='9841045360',
                                  personal_phone='9841045360', is_approved=True)


class ImportedListingSeoTests(TestCase):
    """Listings with no words of their own (e.g. from Google) still get a useful, factual page."""

    def setUp(self):
        self.hall = listing('Sri Abiraami Mahal')
        self.other = listing('Kamakshi Kalyana Mahal')
        self.near = listing('Chromepet Mahal', area='Chromepet')

    def html(self):
        return self.client.get(f'/product/{self.hall._id}').content.decode()

    def test_title_and_description_use_search_terms_and_facts(self):
        html = self.html()
        self.assertIn('<title>Sri Abiraami Mahal | Wedding Hall in Tambaram, Chennai | WedMangal</title>', html)
        description = re.search(r'<meta name="description" content="([^"]*)"', html).group(1)
        self.assertIn('Wedding Hall in Tambaram, Chennai', description)
        self.assertIn('Rated 4.1★ on Google (1,527 reviews).', description)
        self.assertLessEqual(len(description), 160)

    def test_links_to_other_halls_in_and_near_the_area(self):
        html = self.html()
        self.assertIn('Other wedding halls in and near Tambaram', html)
        self.assertIn(f'href="/product/{self.other._id}"', html)
        self.assertIn(f'href="/product/{self.near._id}"', html)       # Chromepet neighbours Tambaram

    def test_structured_data_marks_halls_as_venues_with_postcode(self):
        blocks = [json.loads(b) for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', self.html(), re.S)]
        business = next(i for b in blocks for i in (b if isinstance(b, list) else [b])
                        if i.get('@type') == ['LocalBusiness', 'EventVenue'])
        self.assertEqual(business['address']['postalCode'], '600059')
        self.assertNotIn('aggregateRating', business)                 # Google's rating is not ours to mark up
