import ast
import json
import pathlib
import runpy
import tempfile

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from base import prospects
from base.models import Product, Review, Service, VendorProspect

D = VendorProspect.Decision
BACKEND = pathlib.Path(settings.BASE_DIR)
SOURCE = 'https://www.sulekha.com/marriage-halls/tambaram-chennai'


def record(name='Kamakshi Kalyana Mahal', url='https://www.sulekha.com/kamakshi-kalyana-mahal-tambaram-chennai',
           address='Mudichoor Road, Near State Bank of India ATM, Tambaram, Chennai - 600045', category='Halls',
           evidence_kind='name', **extra):
    r = {
        'business_name': name, 'categories': [category],
        'category_evidence': [{'category': category, 'kind': evidence_kind, 'quote': name, 'source_url': url}],
        'address': address, 'city': 'Chennai', 'source_name': 'Sulekha', 'source_url': SOURCE,
        'source_listing_url': url, 'sources': [{'url': url, 'name': 'Sulekha', 'status': 200}],
        'data_source': 'directory', 'research_category': category, 'research_area': 'Tambaram',
    }
    r.update(extra)
    return r


def load(*records):
    return prospects.import_records(list(records))


class ProspectImportTests(TestCase):

    def test_prospect_is_created_and_passes_the_gates(self):
        counts = load(record(phone='+91 98400 12345'))
        p = VendorProspect.objects.get()
        self.assertEqual(counts['created'], 1)
        self.assertEqual((p.business_area, p.area_status), ('Tambaram', 'located_in'))
        self.assertEqual(p.phone, '9840012345')
        self.assertEqual((p.decision, p.quality_passed), (D.NEW, True))
        self.assertIn('website', p.missing_fields)

    def test_reimport_is_idempotent(self):
        load(record())
        counts = load(record(), record())
        self.assertEqual(VendorProspect.objects.count(), 1)
        self.assertEqual((counts['created'], counts['updated']), (0, 2))

    def test_reimport_keeps_a_persons_decision(self):
        load(record())
        VendorProspect.objects.update(decision=D.REJECT, decision_by='person')
        load(record())
        self.assertEqual(VendorProspect.objects.get().decision, D.REJECT)

    def test_same_phone_from_another_source_is_merged_not_duplicated(self):
        load(record(phone='9840012345'))
        load(record(name='Kamakshi Kalyana Mahal', url='https://www.mandap.com/chennai/kamakshi-mahal',
                    phone='098400 12345'))
        p = VendorProspect.objects.get()
        self.assertEqual(len(p.sources), 2)

    def test_same_website_domain_is_the_same_business(self):
        load(record(website_url='https://www.kamakshimahal.in/'))
        load(record(name='Kamakshi Mahal', url='https://weddingz.in/chennai/kamakshi', website_url='http://kamakshimahal.in/contact'))
        self.assertEqual(VendorProspect.objects.count(), 1)
        self.assertEqual(VendorProspect.objects.get().website_domain, 'kamakshimahal.in')

    def test_same_place_id_is_the_same_business(self):
        load(record(google_place_id='ChIJabc'))
        load(record(name='Kamakshi Hall', url='https://example.org/x', google_place_id='ChIJabc'))
        self.assertEqual(VendorProspect.objects.count(), 1)

    def test_same_name_different_address_is_a_possible_branch(self):
        load(record())
        load(record(url='https://www.sulekha.com/kamakshi-kalyana-mahal-selaiyur',
                    address='12 Camp Road, Selaiyur, Chennai - 600073', research_area='Selaiyur'))
        self.assertEqual(VendorProspect.objects.count(), 2)          # branches are never merged
        branch = VendorProspect.objects.get(business_area='Selaiyur')
        self.assertEqual(branch.decision, D.NEEDS_REVIEW)
        self.assertTrue(any('possible branch' in f for f in branch.quality_failures))

    def test_existing_product_match_is_recorded_and_product_untouched(self):
        pr = Product.objects.create(name='Kamakshi Kalyana Mahal', category='Halls', area_name='Tambaram',
                                    address='Tambaram, Chennai', personal_phone='9840012345', is_approved=True)
        before = Product.objects.filter(pk=pr.pk).values().get()
        load(record(phone='9840012345'))
        p = VendorProspect.objects.get()
        self.assertEqual((p.matches_product_id, p.decision), (pr.pk, D.DUPLICATE))
        self.assertEqual(Product.objects.filter(pk=pr.pk).values().get(), before)

    def test_unknown_attributes_stay_unknown(self):
        load(record(attributes={'ac': True, 'parking': None, 'rooms': 'unknown', 'veg_food': {'value': False}}))
        attrs = VendorProspect.objects.get().attributes
        self.assertEqual(attrs, {'ac': True})                      # nothing became False
        self.assertNotIn('parking', attrs)

    def test_category_gate(self):
        load(record(name='Some Business', category='Halls'),
             record(name='Bad Category Co', url='https://e.org/2', category='Florists'),
             record(name='Classic Colour Lab', url='https://e.org/3', category='Photographers'))
        no_hall_word = VendorProspect.objects.get(business_name='Some Business')
        self.assertEqual(no_hall_word.decision, D.REJECT)           # its name has no hall word → no evidence
        self.assertIn('no evidence for category Halls', no_hall_word.quality_failures)
        bad = VendorProspect.objects.get(business_name='Bad Category Co')
        self.assertEqual(bad.decision, D.REJECT)
        lab = VendorProspect.objects.get(business_name='Classic Colour Lab')
        self.assertFalse(lab.quality_passed)

    def test_hotels_and_restaurants_need_review_even_with_banquet_words(self):
        load(record(name='Kalyan Hometel', url='https://e.org/h', evidence_kind='business_text',
                    category_evidence=[{'category': 'Halls', 'kind': 'business_text',
                                        'quote': 'also renders conferencing and banqueting facilities'}]),
             record(name='Sri Bala Murugan Thirumana Maaligai', url='https://e.org/m'))
        self.assertEqual(VendorProspect.objects.get(business_name='Kalyan Hometel').decision, D.NEEDS_REVIEW)
        self.assertTrue(VendorProspect.objects.get(business_name__endswith='Maaligai').quality_passed)

    def test_directory_label_alone_is_not_enough(self):
        load(record(name='Sri Lakshmi', evidence_kind='directory_label'))
        p = VendorProspect.objects.get()
        self.assertEqual(p.decision, D.NEEDS_REVIEW)
        self.assertTrue(any('only a directory label' in f for f in p.quality_failures))

    def test_area_gate(self):
        cases = {
            'Tambaram main road': ('No 4, Velachery Main Road, Chennai - 600042', '', 'unknown'),
            'Near tambaram': ('5 Mudichur Road, near Tambaram, Chennai - 600048', '', 'unknown'),
            'East tambaram': ('8 Gandhi Road, East Tambaram, Chennai - 600059', 'Tambaram', 'located_in'),
            'In selaiyur': ('3 Camp Road, Selaiyur, Chennai - 600073', 'Selaiyur', 'located_in'),
        }
        for i, (name, (address, area, status)) in enumerate(cases.items()):
            load(record(name=f'{name} Mahal', url=f'https://e.org/a{i}', address=address))
            p = VendorProspect.objects.get(business_name=f'{name} Mahal')
            self.assertEqual((p.business_area, p.area_status), (area, status), name)
        self.assertFalse(VendorProspect.objects.get(business_name='Near tambaram Mahal').quality_passed)

    def test_serves_chennai_is_not_located_in_tambaram(self):
        load(record(name='Chennai Wedding Caterers', category='Caterers', address='', area_status='serves',
                    phone='9840055555', service_area='Chennai'))
        p = VendorProspect.objects.get()
        self.assertEqual((p.business_area, p.area_status, p.quality_passed), ('', 'serves', False))

    def test_fake_phone_is_rejected(self):
        counts = load(record(phone='9999999999', address='Tambaram, Chennai'))
        p = VendorProspect.objects.get()
        self.assertEqual((p.phone, counts['invalid_phone_discarded']), ('', 1))
        self.assertEqual(p.decision, D.REJECT)                        # no phone and no street address
        for bad in ('0000000000', '1234567890', '12345', '9876543210', '+91 99999 99999'):
            self.assertEqual(prospects.normalize_phone(bad), '', bad)
        self.assertEqual(prospects.normalize_phone('044 2226 1234'), '04422261234')

    def test_directory_link_is_not_a_website(self):
        load(record(website_url='https://www.sulekha.com/kamakshi'))
        self.assertEqual(VendorProspect.objects.get().website_url, '')

    def test_import_command_and_dry_run(self):
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as fh:
            json.dump([record()], fh)
        call_command('import_prospects', fh.name, '--dry-run', stdout=open('/dev/null', 'w'))
        self.assertEqual(VendorProspect.objects.count(), 0)
        call_command('import_prospects', fh.name, stdout=open('/dev/null', 'w'))
        call_command('import_prospects', fh.name, stdout=open('/dev/null', 'w'))
        self.assertEqual(VendorProspect.objects.count(), 1)

    def test_import_never_creates_users_products_services_or_reviews(self):
        counts = (User.objects.count(), Product.objects.count(), Service.objects.count(), Review.objects.count())
        load(record(phone='9840012345'), record(name='Lakshmi Caterers', url='https://e.org/c', category='Caterers'),
             record(name='Bad', url='https://e.org/d', phone='9999999999'))
        self.assertEqual((User.objects.count(), Product.objects.count(), Service.objects.count(),
                          Review.objects.count()), counts)


class ProspectIsolationTests(TestCase):
    """A VendorProspect must never become, or look like, a public vendor."""

    def setUp(self):
        cache.clear()
        load(record(name='Zzqx Prospect Mahal', phone='9840012345'))
        self.p = VendorProspect.objects.get()
        self.client = APIClient()

    def assertHidden(self, response):
        self.assertNotIn('Zzqx', response.content.decode(errors='ignore'))

    def test_not_in_public_search(self):
        for params in ({'q': 'Zzqx Prospect Mahal'}, {'category': 'Halls', 'area': 'Tambaram'}, {'category': 'Halls'}):
            data = self.client.get('/api/search/', params).json()
            self.assertEqual((data['count'], data['results']), (0, []), params)   # (the query itself is echoed)
        self.assertHidden(self.client.get('/api/products/all', {'keyword': 'Zzqx'}))

    def test_not_in_sitemap(self):
        self.assertHidden(self.client.get('/sitemap.xml'))

    def test_not_on_vendor_or_category_pages(self):
        self.assertHidden(self.client.get(f'/product/{self.p.pk}'))
        self.assertHidden(self.client.get('/category/Halls'))

    def test_not_through_get_product_api(self):
        response = self.client.get(f'/api/products/{self.p.pk}/')
        self.assertEqual(response.status_code, 404)
        self.assertHidden(response)

    def test_no_public_code_reads_vendor_prospects(self):
        allowed = {'models.py', 'prospects.py', 'admin.py', 'test_prospects.py', 'import_prospects.py',
                   'collect_prospects.py'}
        offenders = [str(f.relative_to(BACKEND)) for f in (BACKEND / 'base').rglob('*.py')
                     if 'migrations' not in f.parts and f.name not in allowed
                     and 'VendorProspect' in f.read_text(encoding='utf-8', errors='ignore')]
        self.assertEqual(offenders, [])


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
