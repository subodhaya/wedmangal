import json
from datetime import date, timedelta
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from base import analytics, search_intent as si
from base.models import Product, SearchQuery, VendorEvent

AREAS = {si._key(a): a for a in si.CHENNAI_AREAS}
UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'
SESSION = 'b1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'


def parse(query, **kw):
    return {k: v for k, v in si.parse_search_intent(query, AREAS, **kw).items() if v is not None}


class NaturalLanguageParsingTests(SimpleTestCase):

    def test_spec_example_full_intent(self):
        self.assertEqual(parse('hall near Tambaram 600 people 2 lakh vegetarian parking'), {
            'category': 'Halls', 'area': 'Tambaram', 'capacity': 600, 'budget_max': 200000,
            'food_preference': 'veg', 'parking_required': True})

    def test_spec_example_under_budget(self):
        self.assertEqual(parse('hall near Tambaram for 600 people under 2 lakh'),
                         {'category': 'Halls', 'area': 'Tambaram', 'capacity': 600, 'budget_max': 200000})

    def test_spec_example_city_food_parking(self):
        self.assertEqual(parse('vegetarian wedding hall in Chennai with parking for 500 guests'), {
            'category': 'Halls', 'city': 'Chennai', 'capacity': 500,
            'food_preference': 'veg', 'parking_required': True})

    def test_category_synonyms(self):
        cases = {'kalyana mandapam': 'Halls', 'banquet near porur': 'Halls', 'candid photography': 'Photographers',
                 'bridal makeup': 'Makeup_Artist', 'mehendi artist': 'Mehandi_Artist', 'catering service': 'Caterers',
                 'stage decoration': 'Decorators', 'wedding cards': 'Invitation', 'purohit': 'Pandit'}
        for query, key in cases.items():
            self.assertEqual(si.match_category(query), key, query)

    def test_empty_query(self):
        self.assertEqual(parse(''), {})
        self.assertEqual(parse('   '), {})


class BudgetParsingTests(SimpleTestCase):

    def test_indian_expressions(self):
        for text, expected in [('₹2 lakh', 200000), ('2 lakh', 200000), ('2 lakhs', 200000), ('200000', 200000),
                               ('2L', 200000), ('₹2L', 200000), ('2.5 lakh', 250000), ('5 lakh', 500000),
                               ('2 lac', 200000), ('50k', 50000), ('1 crore', 10000000), ('rs 75000', 75000),
                               ('₹1,50,000', 150000)]:
            self.assertEqual(si.parse_budget(text), (None, expected), text)

    def test_direction_words(self):
        self.assertEqual(si.parse_budget('under 3 lakh'), (None, 300000))
        self.assertEqual(si.parse_budget('budget of 3 lakh'), (None, 300000))
        self.assertEqual(si.parse_budget('above 3 lakhs'), (300000, None))
        self.assertEqual(si.parse_budget('starting from 1 lakh'), (100000, None))

    def test_ranges(self):
        self.assertEqual(si.parse_budget('1-2 lakh'), (100000, 200000))
        self.assertEqual(si.parse_budget('between 1 and 2 lakh'), (100000, 200000))
        self.assertEqual(si.parse_budget('rs 50000 to 80000'), (50000, 80000))

    def test_not_a_budget(self):
        for text in ('hall for 500 people', 'hall in 600089', 'call 9876543210', '2 lakh or 3 lakh',
                     'rs 500', '2 crore 1 lakh'):
            self.assertEqual(si.parse_budget(text), (None, None), text)


class CapacityParsingTests(SimpleTestCase):

    def test_capacity_expressions(self):
        for text, expected in [('500 people', 500), ('500 guests', 500), ('for 500', 500), ('600 pax', 600),
                               ('capacity 1000', 1000), ('seating capacity of 750', 750), ('300+ guests', 300)]:
            self.assertEqual(si.parse_capacity(text), expected, text)

    def test_not_a_capacity(self):
        for text in ('for 2 lakh', 'for 50k', 'hall 500', '500 or 800 people', 'for 5 people', 'for 2027'):
            self.assertIsNone(si.parse_capacity(text), text)


class FoodParkingAcTests(SimpleTestCase):

    def test_food_preference(self):
        self.assertEqual(si.parse_food('pure veg hall'), 'veg')
        self.assertEqual(si.parse_food('vegetarian food'), 'veg')
        self.assertEqual(si.parse_food('non veg caterers'), 'nonveg')
        self.assertEqual(si.parse_food('non-vegetarian'), 'nonveg')
        self.assertEqual(si.parse_food('veg and non-veg'), 'both')
        self.assertIsNone(si.parse_food('vegetable carving'))
        self.assertIsNone(si.parse_food('hall in adyar'))

    def test_parking(self):
        self.assertTrue(si.parse_parking('hall with car parking'))
        self.assertTrue(si.parse_parking('valet available'))
        self.assertFalse(si.parse_parking('no parking needed'))
        self.assertFalse(si.parse_parking('hall without parking'))
        self.assertFalse(si.parse_parking('parking not required'))
        self.assertIsNone(si.parse_parking('hall in adyar'))

    def test_ac(self):
        self.assertTrue(si.parse_ac('AC hall'))
        self.assertTrue(si.parse_ac('a/c mandapam'))
        self.assertTrue(si.parse_ac('air conditioned venue'))
        self.assertFalse(si.parse_ac('non ac hall'))
        self.assertIsNone(si.parse_ac('hall in adyar'))


class AreaHandlingTests(SimpleTestCase):

    def test_exact_area_match_is_case_and_punctuation_insensitive(self):
        self.assertEqual(si.match_area('hall in ADYAR', AREAS), 'Adyar')
        self.assertEqual(si.match_area('hall near t. nagar', AREAS), 'T Nagar')
        self.assertEqual(si.match_area('st thomas mount', AREAS), 'St. Thomas Mount')

    def test_longest_name_wins(self):
        self.assertEqual(si.match_area('hall in anna nagar west', AREAS), 'Anna Nagar West')

    def test_misspelt_area_is_not_guessed(self):
        self.assertIsNone(si.match_area('hall in thambaram', AREAS))
        self.assertIsNone(si.match_area('hall in anna ngr', AREAS))

    def test_two_areas_are_ambiguous(self):
        self.assertIsNone(si.match_area('hall in adyar or porur', AREAS))

    def test_city_is_not_an_area(self):
        self.assertIsNone(si.match_area('hall in chennai', AREAS))
        self.assertEqual(si.match_city('hall in chennai'), 'Chennai')


class AmbiguityAndPrivacyTests(SimpleTestCase):

    def test_two_categories_leave_category_empty(self):
        self.assertNotIn('category', parse('photographer and makeup artist in adyar'))

    def test_vague_query_has_no_invented_fields(self):
        self.assertEqual(parse('best wedding ideas'), {})
        self.assertEqual(parse('hall 500 2'), {'category': 'Halls'})

    def test_phone_and_email_are_redacted_and_never_parsed(self):
        self.assertEqual(si.redact('call 98765 43210 or me@example.com'), 'call [phone] or [email]')
        self.assertEqual(parse('hall +91 9876543210'), {'category': 'Halls'})

    def test_event_date_only_when_full_and_future(self):
        today = date(2026, 10, 1)
        self.assertEqual(parse('wedding on 12 feb 2027', today=today)['event_date'], date(2027, 2, 12))
        self.assertEqual(parse('hall 2027-03-05', today=today)['event_date'], date(2027, 3, 5))
        self.assertNotIn('event_date', parse('wedding on 12 feb', today=today))         # no year
        self.assertNotIn('event_date', parse('wedding on 12 feb 2020', today=today))    # past
        self.assertNotIn('event_date', parse('31/02/2027', today=today))                 # invalid


class FilterIntentTests(SimpleTestCase):

    def test_filter_based_intent(self):
        intent = si.intent_from_filters({'category': 'Halls', 'area_name': 'Tambaram', 'hall_capacity': '600',
                                         'max_price': '200000', 'food_type': 'veg', 'hall_parking': 'true'}, AREAS)
        self.assertEqual({k: v for k, v in intent.items() if v is not None}, {
            'category': 'Halls', 'area': 'Tambaram', 'capacity': 600, 'budget_max': 200000,
            'food_preference': 'veg', 'parking_required': True})

    def test_filter_values_are_validated_not_trusted(self):
        intent = si.intent_from_filters({'category': 'Hackers', 'area_name': 'Not A Real Place',
                                         'hall_capacity': '999999', 'food_type': 'pizza',
                                         'min_price': '500000', 'max_price': '100000'}, AREAS)
        self.assertFalse(si.has_intent(intent))

    def test_unknown_filter_keys_are_dropped(self):
        self.assertEqual(si.clean_filters({'budget_max': 1, 'vendor_owner': 5, 'city': 'Chennai'}), {'city': 'Chennai'})

    def test_explicit_filters_win_over_text(self):
        intent = si.combine_intent('veg hall in adyar', {'area_name': 'Porur', 'food_type': 'nonveg'}, AREAS)
        self.assertEqual((intent['area'], intent['food_preference'], intent['category']), ('Porur', 'nonveg', 'Halls'))


class SearchLoggingApiTests(TestCase):

    def setUp(self):
        cache.clear()
        self.client = APIClient(HTTP_USER_AGENT=UA)
        self.customer = User.objects.create_user(username='customer', password='x')

    def log(self, **payload):
        body = {'source': 'keyword', 'session_id': SESSION, **payload}
        return self.client.post('/api/analytics/searches/', body, format='json')

    def test_anonymous_natural_language_search_is_recorded(self):
        response = self.log(query='hall near Tambaram for 600 people under 2 lakh', result_count=4)
        self.assertEqual(response.status_code, 201, response.content)
        search = SearchQuery.objects.get()
        self.assertEqual((search.user, search.session_id, search.source, search.result_count),
                         (None, SESSION, 'keyword', 4))
        self.assertEqual((search.category, search.area, search.capacity, search.budget_max),
                         ('Halls', 'Tambaram', 600, 200000))
        self.assertEqual(search.normalized_query, 'hall near tambaram for 600 people under 2 lakh')

    def test_authenticated_search_is_linked_to_user(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.log(query='photographer in adyar', session_id='').status_code, 201)
        self.assertEqual(SearchQuery.objects.get().user, self.customer)

    def test_filter_based_search_is_recorded(self):
        response = self.log(source='category', filters={
            'category': 'Halls', 'area_name': 'Tambaram', 'hall_capacity': '600', 'max_price': '200000',
            'food_type': 'veg', 'hall_parking': 'true', 'sort': 'newest'})
        self.assertEqual(response.status_code, 201)
        search = SearchQuery.objects.get()
        self.assertEqual((search.category, search.area, search.capacity, search.budget_max,
                          search.food_preference, search.parking_required),
                         ('Halls', 'Tambaram', 600, 200000, 'veg', True))
        self.assertEqual(search.query, '')

    def test_client_supplied_structured_fields_are_ignored(self):
        self.log(query='hall', category='Pandit', area='Fake', budget_max=1, capacity=9)
        search = SearchQuery.objects.get()
        self.assertEqual((search.category, search.area, search.budget_max, search.capacity), ('Halls', None, None, None))

    def test_personal_details_are_redacted_before_storage(self):
        self.log(query='hall call me 9876543210 priya@example.com')
        search = SearchQuery.objects.get()
        self.assertEqual(search.query, 'hall call me [phone] [email]')
        self.assertNotIn('9876543210', search.normalized_query)
        self.assertNotIn('9876543210', json.dumps(list(VendorEvent.objects.values('metadata'))))

    def test_search_event_is_also_recorded_for_step7_analytics(self):
        self.log(query='hall in porur')
        event = VendorEvent.objects.get()
        self.assertEqual((event.event_type, event.vendor, event.source), (VendorEvent.EventType.SEARCH, None, 'keyword'))

    def test_repeat_search_within_a_minute_is_not_double_counted(self):
        self.assertEqual(self.log(query='hall in porur').status_code, 201)
        self.assertEqual(self.log(query='Hall in Porur ').status_code, 200)
        self.assertEqual(self.log(query='hall in adyar').status_code, 201)
        self.assertEqual(SearchQuery.objects.count(), 2)

    def test_validation(self):
        self.assertEqual(self.log(source='made_up', query='hall').status_code, 400)
        self.assertEqual(self.log(query='', filters={}).status_code, 400)            # nothing to record
        self.assertEqual(self.log(filters={'sort': 'newest'}).status_code, 400)      # sorting alone isn't a search
        self.assertEqual(self.log(query='hall', session_id='bad id').status_code, 400)
        self.assertFalse(SearchQuery.objects.exists())

    def test_bad_result_count_is_ignored(self):
        self.log(query='hall', result_count='lots')
        self.assertIsNone(SearchQuery.objects.get().result_count)

    def test_bots_are_ignored(self):
        self.client = APIClient(HTTP_USER_AGENT='Googlebot/2.1')
        self.assertEqual(self.log(query='hall').status_code, 204)
        self.assertFalse(SearchQuery.objects.exists())

    def test_area_list_includes_vendor_areas(self):
        Product.objects.create(name='Hall X', category='Halls', city='Chennai', area_name='Purasaiwalkam',
                               personal_phone='9000000001', is_approved=True)
        cache.clear()
        self.log(query='hall in purasaiwalkam')
        self.assertEqual(SearchQuery.objects.get().area, 'Purasaiwalkam')

    def test_analytics_failure_does_not_break_search_logging(self):
        with mock.patch.object(analytics, 'record_event', side_effect=RuntimeError('db down')):
            self.assertEqual(self.log(query='hall in porur').status_code, 201)
        self.assertEqual(SearchQuery.objects.count(), 1)


class SearchSummaryTests(TestCase):

    def setUp(self):
        cache.clear()
        self.client = APIClient(HTTP_USER_AGENT=UA)
        self.staff = User.objects.create_user(username='staff', password='x', is_staff=True)
        self.vendor_user = User.objects.create_user(username='vendor', password='x')

        def make(**fields):
            SearchQuery.objects.create(source='keyword', session_id=SESSION, **fields)

        for _ in range(3):
            make(query='hall in tambaram', category='Halls', area='Tambaram', capacity=600,
                 budget_max=200000, food_preference='veg', parking_required=True)
        make(query='hall in porur 9876', category='Halls', area='Porur', capacity=150, budget_min=600000)
        make(query='photographer', category='Photographers', budget_max=50000, parking_required=False)
        make(query='best ideas')
        old = SearchQuery.objects.create(source='keyword', session_id=SESSION, category='Halls', area='Adyar')
        SearchQuery.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=40))

    def summary(self, user=None, **params):
        if user:
            self.client.force_authenticate(user)
        return self.client.get('/api/analytics/search-summary/', params)

    def test_aggregates(self):
        data = self.summary(self.staff, range='30d').json()
        self.assertEqual((data['total_searches'], data['searches_with_intent']), (6, 5))
        self.assertEqual(data['top_areas'], [{'area': 'Tambaram', 'count': 3}, {'area': 'Porur', 'count': 1}])
        self.assertEqual([(c['category'], c['label'], c['count']) for c in data['top_categories']],
                         [('Halls', 'Halls', 4), ('Photographers', 'Photographers', 1)])
        self.assertEqual({r['label']: r['count'] for r in data['capacity_ranges']},
                         {'Under 100': 0, '100–299': 1, '300–499': 0, '500–999': 3, '1,000+': 0})
        self.assertEqual({r['label']: r['count'] for r in data['budget_ranges']},
                         {'Under ₹1 lakh': 1, '₹1–2 lakh': 3, '₹2–5 lakh': 0, '₹5 lakh+': 1})
        self.assertEqual(data['food_preferences'], [{'food_preference': 'veg', 'count': 3, 'label': 'Vegetarian'}])
        self.assertEqual(data['parking'], {'required': 3, 'not_required': 1})

    def test_range_excludes_older_searches(self):
        self.assertEqual(self.summary(self.staff, range='90d').json()['total_searches'], 7)

    def test_no_individual_searches_exposed(self):
        body = self.summary(self.staff, range='30d').content.decode()
        for private in ('hall in tambaram', '9876', 'best ideas', SESSION, 'user'):
            self.assertNotIn(private, body)

    def test_admin_only(self):
        self.assertEqual(self.summary().status_code, 401)
        self.assertEqual(self.summary(self.vendor_user).status_code, 403)
        role_admin = User.objects.create_user(username='roleadmin', password='x')
        role_admin.profile.role = 'admin'
        role_admin.profile.save()
        self.assertEqual(self.summary(role_admin).status_code, 200)
