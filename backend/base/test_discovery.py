from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from base import discovery
from base.models import DiscoveryLead, Product, SearchQuery, Service, VendorEvent

SESSION = 'd1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'


def hall(name, area='Tambaram', **attributes):
    p = Product.objects.create(name=name, category='Halls', city='Chennai', area_name=area,
                               address=f'1 Main Rd, {area}, Chennai', business_phone='9111111111',
                               personal_phone='9222222222', is_approved=True, attributes=attributes)
    Service.objects.create(product=p, name='Hall', rating=4.5, numReviews=10)
    return p


REQ = {
    'category': 'halls', 'location': {'area': 'Tambaram'}, 'guest_count': {'min': 500, 'max': 1000},
    'budget': {'min': 200000, 'max': 500000}, 'timeframe': '6_months',
    'must_have': ['parking', 'veg_food'], 'prefer': ['budget_friendly'], 'avoid': ['hotel'], 'dont_care': [],
}


class RequirementTests(TestCase):

    def test_clean_requirement_object(self):
        req = discovery.clean_requirements(REQ)
        self.assertEqual(req['category'], 'Halls')
        self.assertEqual(req['guest_count'], {'min': 500, 'max': 1000})
        self.assertEqual(req['budget'], {'min': 200000, 'max': 500000, 'per': 'event'})
        self.assertEqual((req['must_have'], req['avoid'], req['version']), (['parking', 'veg_food'], ['hotel'], 1))

    def test_not_sure_and_unanswered_stay_unknown(self):
        req = discovery.clean_requirements({'budget': {'unsure': True}, 'guest_count': None})
        self.assertEqual((req['budget'], req['guest_count'], req['location']), ({'unsure': True}, None, None))

    def test_invalid_requirements_rejected(self):
        for bad in ({'must_have': ['jacuzzi']}, {'guest_count': {'min': 900, 'max': 100}}, {'guest_count': {'min': 'x'}},
                    {'timeframe': 'tomorrow'}, {'must_have': 'parking'}, {'event_date': '1999-01-01'}, 'nope'):
            with self.assertRaises(discovery.RequirementError, msg=bad):
                discovery.clean_requirements(bad)

    def test_summary_reads_like_a_call_sheet(self):
        source = hall('Sri Mahal')
        lines = discovery.summary_lines(discovery.clean_requirements(REQ), source)
        self.assertEqual(lines[:4], [f'Source: Halls – Sri Mahal (#{source._id})', 'Looking for: Wedding Halls & Venues',
                                     'Location: Tambaram', 'Guests: 500–1,000'])
        self.assertIn('Budget: ₹2L–₹5L', lines)
        self.assertIn('Must have: Parking, Vegetarian food', lines)
        self.assertIn('Avoid: Hotel venue', lines)


class LeadApiTests(TestCase):

    def setUp(self):
        from django.core.cache import cache
        cache.clear()   # the lead rate limit counts across tests otherwise
        self.client = APIClient(HTTP_USER_AGENT=UA)
        self.source = hall('Sri Mahal')

    def submit(self, **extra):
        payload = {'session_id': SESSION, 'source_vendor_id': self.source._id, 'name': 'Ravi', 'phone': '98765 43210',
                   'event_date': (date.today() + timedelta(days=60)).isoformat(), 'message': 'Need a hall + catering',
                   'consent': True, 'requirements': REQ, **extra}
        return self.client.post('/api/discovery/leads/', payload, format='json')

    def test_lead_is_stored_with_source_and_requirements(self):
        response = self.submit()
        self.assertEqual(response.status_code, 201, response.content)
        lead = DiscoveryLead.objects.get()
        self.assertEqual((lead.name, lead.phone, lead.consent, lead.source_vendor, lead.category, lead.status),
                         ('Ravi', '9876543210', True, self.source, 'Halls', 'new'))
        self.assertEqual(lead.requirements['must_have'], ['parking', 'veg_food'])
        self.assertEqual(lead.requirements['event_date'], lead.event_date.isoformat())
        self.assertEqual(response.json(), {'id': lead.id})                      # nothing else echoed back
        event = VendorEvent.objects.get(event_type='discovery_contact_submitted')
        self.assertEqual((event.vendor, event.session_id), (self.source, SESSION))
        self.assertNotIn('9876543210', str(event.metadata))

    def test_consent_is_required_and_never_assumed(self):
        for consent in (False, None, 'true', 1, 'on'):
            response = self.submit(consent=consent)
            self.assertEqual(response.status_code, 400, consent)
            self.assertIn('consent', response.json()['errors'])
        response = self.client.post('/api/discovery/leads/', {'name': 'Ravi', 'phone': '9876543210'}, format='json')
        self.assertIn('consent', response.json()['errors'])
        self.assertEqual(DiscoveryLead.objects.count(), 0)

    def test_name_and_phone_validation(self):
        errors = self.submit(name='  ', phone='12345').json()['errors']
        self.assertEqual(set(errors), {'name', 'phone'})
        self.assertEqual(self.submit(phone='5876543210').status_code, 400)       # not a mobile

    def test_bad_requirements_and_dates_rejected(self):
        self.assertIn('requirements', self.submit(requirements={'must_have': ['jacuzzi']}).json()['errors'])
        self.assertIn('event_date', self.submit(event_date='2001-01-01').json()['errors'])

    def test_retry_is_the_same_lead(self):
        first, second = self.submit().json()['id'], self.submit().json()['id']
        self.assertEqual(first, second)
        self.assertEqual(DiscoveryLead.objects.count(), 1)

    def test_no_login_needed_and_no_account_created(self):
        users = User.objects.count()
        self.assertEqual(self.submit().status_code, 201)
        self.assertEqual(User.objects.count(), users)

    def test_unknown_source_vendor_is_ignored(self):
        self.assertEqual(self.submit(source_vendor_id=999999).status_code, 201)
        self.assertIsNone(DiscoveryLead.objects.get().source_vendor)

    def test_leads_are_never_public(self):
        self.submit()
        self.assertEqual(self.client.get('/api/discovery/leads/').status_code, 405)
        for path in ('/api/search/?q=hall', '/api/products/all', f'/api/products/{self.source._id}/'):
            self.assertNotIn('9876543210', self.client.get(path).content.decode(), path)


class DiscoverySearchTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.unknown = hall('Unknown Hall')                                      # told us nothing
        self.has_parking = hall('Parking Hall', parking=True, food_type='veg')
        self.no_parking = hall('No Parking Hall', parking=False)
        self.hotel = hall('Hotel Hall', hall_type='hotel', parking=True)
        self.elsewhere = hall('Adyar Hall', area='Adyar', parking=True)

    def search(self, **params):
        return self.client.get('/api/search/', {'category': 'Halls', 'area': 'Tambaram', 'from': 'discovery', **params}).json()

    def test_unknown_is_not_no(self):
        names = [r['name'] for r in self.search(must='parking,veg_food')['results']]
        self.assertIn('Unknown Hall', names)                                      # missing data never excludes
        self.assertNotIn('No Parking Hall', names)                                # a known "no" does
        self.assertEqual(names[0], 'Parking Hall')                                # confirmed matches first
        self.assertNotIn('Adyar Hall', names)                                     # area is a real filter

    def test_avoid_excludes_only_known_matches(self):
        names = [r['name'] for r in self.search(avoid='hotel')['results']]
        self.assertNotIn('Hotel Hall', names)
        self.assertIn('Unknown Hall', names)

    def test_requirements_echoed_and_unfiltered_criteria_explained(self):
        data = self.search(guests_min=500, guests_max=1000, budget_min=200000, budget_max=500000,
                           must='parking,rooms,jacuzzi', avoid='hotel')
        self.assertEqual(data['requirements'], {'guests_min': 500, 'guests_max': 1000, 'budget_min': 200000,
                                                'budget_max': 500000, 'must': ['parking', 'rooms'], 'avoid': ['hotel']})
        notes = ' '.join(data['notes'])
        for expected in ('500 guests', '₹2 lakh', 'parking', 'rooms', 'hotel venue'):
            self.assertIn(expected, notes)

    def test_plain_search_unchanged(self):
        names = [r['name'] for r in self.client.get('/api/search/', {'category': 'Halls', 'area': 'Tambaram'}).json()['results']]
        self.assertEqual(set(names), {'Unknown Hall', 'Parking Hall', 'No Parking Hall', 'Hotel Hall'})

    def test_discovery_search_is_logged_with_structured_intent(self):
        client = APIClient(HTTP_USER_AGENT=UA)
        response = client.post('/api/analytics/searches/', {
            'source': 'discovery', 'session_id': SESSION, 'query': '',
            'filters': {'category': 'Halls', 'area_name': 'Tambaram', 'hall_capacity': 500, 'max_price': 500000,
                        'hall_parking': True, 'food_type': 'veg'}, 'result_count': 3}, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        q = SearchQuery.objects.get()
        self.assertEqual((q.source, q.category, q.area, q.capacity, q.budget_max, q.parking_required, q.food_preference),
                         ('discovery', 'Halls', 'Tambaram', 500, 500000, True, 'veg'))


class DiscoveryEventTests(TestCase):

    def setUp(self):
        self.client = APIClient(HTTP_USER_AGENT=UA)
        self.source = hall('Sri Mahal')

    def event(self, event_type, **extra):
        return self.client.post('/api/analytics/events/', {'event_type': event_type, 'session_id': SESSION, **extra},
                                format='json')

    def test_discovery_events_recorded_with_optional_source_vendor(self):
        self.assertEqual(self.event('discovery_started', vendor_id=self.source._id, source='vendor_page',
                                    metadata={'category': 'Halls'}).status_code, 201)
        self.assertEqual(self.event('discovery_question_answered', metadata={'question': 'guests', 'answer': '500-1000',
                                                                            'phone': '9876543210'}).status_code, 201)
        started = VendorEvent.objects.get(event_type='discovery_started')
        self.assertEqual((started.vendor, started.metadata), (self.source, {'category': 'Halls'}))
        answered = VendorEvent.objects.get(event_type='discovery_question_answered')
        self.assertIsNone(answered.vendor)
        self.assertEqual(answered.metadata, {'question': 'guests', 'answer': '500-1000'})   # no phone kept

    def test_contact_submitted_cannot_be_faked_by_the_browser(self):
        self.assertEqual(self.event('discovery_contact_submitted').status_code, 400)


class SavedRequirementTests(TestCase):

    def setUp(self):
        self.client = APIClient(HTTP_USER_AGENT=UA)
        self.user = User.objects.create_user(username='9876543210')
        self.source = hall('Sri Mahal')

    def save(self, user=None, **extra):
        if user is not None:
            self.client.force_authenticate(user)
        return self.client.post('/api/discovery/saved/', {'requirements': REQ, 'source_vendor_id': self.source._id, **extra},
                                format='json')

    def test_saving_needs_an_account(self):
        self.assertEqual(self.save().status_code, 401)

    def test_save_and_list_without_creating_a_lead(self):
        response = self.save(self.user)
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(self.save(self.user).status_code, 200)                 # saving again after login: one copy
        from base.models import SavedRequirement
        saved = SavedRequirement.objects.get()
        self.assertEqual((saved.user, saved.category, saved.source_vendor), (self.user, 'Halls', self.source))
        listing = self.client.get('/api/discovery/saved/').json()
        self.assertEqual(len(listing), 1)
        self.assertIn('Location: Tambaram', listing[0]['summary'])
        self.assertEqual(DiscoveryLead.objects.count(), 0)                      # saving is not consent to be called

    def test_others_cannot_see_saved_requirements(self):
        self.save(self.user)
        other = User.objects.create_user(username='other')
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get('/api/discovery/saved/').json(), [])

    def test_invalid_requirement_rejected(self):
        self.assertEqual(self.save(self.user, requirements={'must_have': ['jacuzzi']}).status_code, 400)


class BudgetAndNewEventTests(TestCase):

    def setUp(self):
        self.client = APIClient(HTTP_USER_AGENT=UA)
        self.user = User.objects.create_user(username='u')

    def test_budget_saved_is_recorded_with_its_source(self):
        self.client.force_authenticate(self.user)
        for source in ('discovery', None):
            body = {'total_budget': 1500000, 'expenses': {'venue': 500000}, **({'source': source} if source else {})}
            self.assertIn(self.client.post(f'/api/orders/update-budget/{self.user.id}/', body, format='json').status_code, (200, 201))
        self.assertEqual(sorted(VendorEvent.objects.filter(event_type='budget_saved').values_list('source', flat=True)),
                         ['budget_planner', 'discovery'])

    def test_budget_saved_cannot_be_sent_by_the_browser(self):
        r = self.client.post('/api/analytics/events/', {'event_type': 'budget_saved', 'session_id': SESSION}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_budget_opened_and_save_started_events(self):
        source = hall('Sri Mahal')
        for t in ('discovery_budget_opened', 'discovery_save_started'):
            r = self.client.post('/api/analytics/events/', {'event_type': t, 'session_id': SESSION, 'vendor_id': source._id,
                                                            'metadata': {'category': 'Halls'}}, format='json')
            self.assertEqual(r.status_code, 201, t)
        self.assertEqual(VendorEvent.objects.filter(vendor=source, event_type__startswith='discovery_').count(), 2)
