import ast
import pathlib
import runpy

from django.conf import settings
from django.contrib.auth.models import User
from django.test import TestCase

from base import listing_checks as checks
from base.models import Product, Review, Service

BACKEND = pathlib.Path(settings.BASE_DIR)


class ListingCheckTests(TestCase):
    """The checks collect_google / import_google_listings rely on."""

    def test_area_must_be_an_address_component_not_a_road_or_near(self):
        cases = {
            'No 4, Velachery Main Road, Chennai - 600042': ('', 'unknown'),
            '5 Mudichur Road, near Tambaram, Chennai - 600048': ('', 'unknown'),
            '8 Gandhi Road, East Tambaram, Chennai - 600059': ('Tambaram', 'located_in'),
            '3 Camp Road, Selaiyur, Chennai - 600073': ('Selaiyur', 'located_in'),
        }
        for address, expected in cases.items():
            area, status, _ = checks.check_area(address)
            self.assertEqual((area, status), expected, address)

    def test_several_areas_need_the_researched_one(self):
        address = '12 Agaram Road, Selaiyur, Tambaram, Chennai - 600073'
        self.assertEqual(checks.check_area(address, 'Tambaram')[:2], ('Tambaram', 'located_in'))
        self.assertEqual(checks.check_area(address)[:2], ('', 'unknown'))

    def test_fake_and_bad_phones_are_dropped(self):
        for bad in ('9999999999', '0000000000', '1234567890', '12345', '9876543210', '+91 99999 99999'):
            self.assertEqual(checks.normalize_phone(bad), '', bad)
        self.assertEqual(checks.normalize_phone('+91 98410 11940'), '9841011940')
        self.assertEqual(checks.normalize_phone('044 2226 1234'), '04422261234')

    def test_directory_and_social_links_are_not_a_website(self):
        for url in ('https://www.sulekha.com/kamakshi', 'instagram.com/rayar', 'https://g.page/x'):
            self.assertEqual(checks.website_domain(url), '', url)
        self.assertEqual(checks.website_domain('https://www.rayarcaterers.in/menu'), 'rayarcaterers.in')

    def test_name_matching_ignores_spacing_and_company_words(self):
        self.assertEqual(checks.compact_name('Siva Sakthi Mahal Pvt Ltd'), checks.compact_name('SivaSakthi Mahal'))

    def test_existing_listing_index(self):
        Product.objects.create(name='Siva Sakthi Mahal', business_phone='+91 98400 55555', website_url='https://sivasakthi.in')
        index = checks.ProductIndex()
        self.assertIn('9840055555', index.by_phone)
        self.assertIn('sivasakthi.in', index.by_domain)
        self.assertIn(checks.compact_name('Sivasakthi Mahal'), index.by_name)

    def test_category_words(self):
        import re
        self.assertRegex('Kamakshi Kalyana Mahal', re.compile(checks.CATEGORY_WORDS['Halls'], re.I))
        self.assertRegex('Sri Colour Lab', re.compile(checks.NOT_CATEGORY['Photographers'], re.I))


class RetiredScraperTests(TestCase):

    def test_old_scrapers_cannot_run(self):
        scripts = sorted((BACKEND / 'retired_scrapers').glob('*.py'))
        self.assertEqual(len(scripts), 5)
        counts = (User.objects.count(), Product.objects.count(), Service.objects.count(), Review.objects.count())
        for script in scripts:
            first = ast.parse(script.read_text(encoding='utf-8')).body[0]
            self.assertIsInstance(first, ast.Raise, script.name)          # the guard is the very first statement
            with self.assertRaises(SystemExit, msg=script.name):
                runpy.run_path(str(script))
        self.assertEqual((User.objects.count(), Product.objects.count(), Service.objects.count(),
                          Review.objects.count()), counts)

    def test_no_scraper_left_in_the_active_tree_and_no_hardcoded_key(self):
        for name in ('vendor_scraper.py', 'google_scraper.py', 'import_places.py', 'inspect_site.py'):
            self.assertFalse((BACKEND / name).exists(), name)
        self.assertFalse((BACKEND / 'backend' / 'google_scraper.py').exists())
        for f in BACKEND.rglob('*.py'):
            if 'venv' in f.parts or 'node_modules' in f.parts:
                continue
            self.assertNotRegex(f.read_text(encoding='utf-8', errors='ignore'), r'AIza[0-9A-Za-z_\-]{30,}', str(f))
