from datetime import timedelta
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from base import analytics
from base.models import Product, QuoteRequest, VendorEvent

E = VendorEvent.EventType
MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'
DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'
SESSION = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'


class AnalyticsTestCase(TestCase):
    def setUp(self):
        cache.clear()  # throttle counters live in the cache
        self.client = APIClient(HTTP_USER_AGENT=MOBILE_UA)
        self.owner = User.objects.create_user(username='owner', password='x')
        self.rival = User.objects.create_user(username='rival', password='x')
        self.customer = User.objects.create_user(username='customer', password='x')
        self.staff = User.objects.create_user(username='staff', password='x', is_staff=True)
        self.vendor = Product.objects.create(user=self.owner, name='Lotus Hall', category='Halls',
                                             city='Chennai', personal_phone='9000000001', is_approved=True)
        self.rival_vendor = Product.objects.create(user=self.rival, name='Rival Hall', category='Halls',
                                                   city='Chennai', personal_phone='9000000002', is_approved=True)
        self.pending = Product.objects.create(name='Pending Hall', category='Halls', city='Chennai',
                                              personal_phone='9000000003', is_approved=False)

    def track(self, event_type, vendor=None, session_id=SESSION, **extra):
        payload = {'event_type': event_type, 'session_id': session_id, **extra}
        if vendor is not None:
            payload['vendor_id'] = vendor._id
        return self.client.post('/api/analytics/events/', payload, format='json')

    def quote(self, **overrides):
        payload = {'vendor_id': self.vendor._id, 'session_id': SESSION, 'name': 'Priya',
                   'phone': '+91 98765 43210', 'consent': True, **overrides}
        return self.client.post('/api/analytics/quotes/', payload, format='json')


class EventTrackingTests(AnalyticsTestCase):

    def test_anonymous_vendor_page_view_is_recorded(self):
        response = self.track(E.VENDOR_PAGE_VIEW, self.vendor, source='vendor_page',
                              path='/product/1?utm_source=x', referrer='https://www.google.com/search?q=priya+9876543210')
        self.assertEqual(response.status_code, 201)
        event = VendorEvent.objects.get()
        self.assertEqual((event.event_type, event.vendor, event.user, event.session_id),
                         (E.VENDOR_PAGE_VIEW, self.vendor, None, SESSION))
        self.assertEqual(event.device_type, 'mobile')
        self.assertEqual(event.path, '/product/1')                       # query string dropped
        self.assertEqual(event.referrer, 'https://www.google.com/search')  # query string dropped

    def test_authenticated_view_is_linked_to_user(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.track(E.VENDOR_PAGE_VIEW, self.vendor, session_id='').status_code, 201)
        self.assertEqual(VendorEvent.objects.get().user, self.customer)

    def test_repeat_page_views_are_not_double_counted(self):
        self.assertEqual(self.track(E.VENDOR_PAGE_VIEW, self.vendor).status_code, 201)
        second = self.track(E.VENDOR_PAGE_VIEW, self.vendor)
        self.assertEqual(second.status_code, 200)
        self.assertFalse(second.json()['recorded'])
        self.track(E.VENDOR_PAGE_VIEW, self.vendor, session_id='ffffffff-0000-4000-8000-000000000000')
        self.assertEqual(VendorEvent.objects.filter(event_type=E.VENDOR_PAGE_VIEW).count(), 2)

    def test_page_view_counts_again_after_dedupe_window(self):
        self.track(E.VENDOR_PAGE_VIEW, self.vendor)
        VendorEvent.objects.update(created_at=timezone.now() - timedelta(minutes=31))
        self.assertEqual(self.track(E.VENDOR_PAGE_VIEW, self.vendor).status_code, 201)

    def test_phone_whatsapp_and_quote_started_are_recorded(self):
        for event_type in (E.PHONE_CLICK, E.WHATSAPP_CLICK, E.GET_QUOTE_STARTED):
            self.assertEqual(self.track(event_type, self.vendor).status_code, 201, event_type)
        self.assertEqual(sorted(VendorEvent.objects.values_list('event_type', flat=True)),
                         sorted([E.PHONE_CLICK, E.WHATSAPP_CLICK, E.GET_QUOTE_STARTED]))

    def test_external_contact_metadata_is_whitelisted(self):
        self.track(E.EXTERNAL_CONTACT_CLICK, self.vendor,
                   metadata={'channel': 'instagram', 'host': 'instagram.com', 'phone': '9876543210', 'email': 'a@b.c'})
        self.assertEqual(VendorEvent.objects.get().metadata, {'channel': 'instagram', 'host': 'instagram.com'})

    def test_search_needs_no_vendor(self):
        self.assertEqual(self.track(E.SEARCH, metadata={'query': 'Halls', 'city': 'Chennai'}).status_code, 201)
        self.assertIsNone(VendorEvent.objects.get().vendor)

    def test_bots_are_ignored(self):
        self.client = APIClient(HTTP_USER_AGENT='Mozilla/5.0 (compatible; Googlebot/2.1)')
        self.assertEqual(self.track(E.VENDOR_PAGE_VIEW, self.vendor).status_code, 204)
        self.assertFalse(VendorEvent.objects.exists())

    def test_anonymous_event_requires_valid_session(self):
        for bad in ('', 'short', 'has spaces in it!!', 'x' * 65):
            self.assertEqual(self.track(E.VENDOR_PAGE_VIEW, self.vendor, session_id=bad).status_code, 400, bad)
        self.assertFalse(VendorEvent.objects.exists())

    def test_invalid_event_type_rejected(self):
        self.assertEqual(self.track('made_up', self.vendor).status_code, 400)

    def test_client_cannot_report_quote_submitted(self):
        self.assertEqual(self.track(E.GET_QUOTE_SUBMITTED, self.vendor).status_code, 400)
        self.assertFalse(VendorEvent.objects.exists())

    def test_unknown_or_unapproved_vendor_rejected(self):
        self.assertEqual(self.track(E.PHONE_CLICK, self.pending).status_code, 404)
        self.assertEqual(self.client.post('/api/analytics/events/', {
            'event_type': E.PHONE_CLICK, 'session_id': SESSION, 'vendor_id': 999999}, format='json').status_code, 404)
        self.assertEqual(self.client.post('/api/analytics/events/', {
            'event_type': E.PHONE_CLICK, 'session_id': SESSION, 'vendor_id': 'abc'}, format='json').status_code, 404)
        self.assertFalse(VendorEvent.objects.exists())

    def test_no_ip_address_is_stored(self):
        field_names = {f.name for f in VendorEvent._meta.get_fields()}
        self.assertFalse({'ip', 'ip_address', 'user_agent'} & field_names)


class QuoteRequestTests(AnalyticsTestCase):

    def test_valid_quote_is_saved_as_new_lead(self):
        response = self.quote(event_date=(timezone.now() + timedelta(days=60)).date().isoformat(),
                              message='Reception for 300 guests')
        self.assertEqual(response.status_code, 201, response.content)
        lead = QuoteRequest.objects.get()
        self.assertEqual((lead.vendor, lead.name, lead.phone, lead.status, lead.source, lead.consent),
                         (self.vendor, 'Priya', '9876543210', QuoteRequest.Status.NEW, 'wedmangal', True))
        self.assertIsNone(lead.user)

    def test_quote_submitted_event_is_recorded_by_server(self):
        self.quote()
        self.quote()  # every real submission counts — no dedupe
        self.assertEqual(VendorEvent.objects.filter(event_type=E.GET_QUOTE_SUBMITTED, vendor=self.vendor).count(), 2)

    def test_authenticated_quote_is_linked_to_user(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.quote(session_id='').status_code, 201)
        self.assertEqual(QuoteRequest.objects.get().user, self.customer)

    def test_phone_is_required(self):
        for missing in ({'phone': ''}, {'phone': '   '}, {'phone': None}):
            response = self.quote(**missing)
            self.assertEqual(response.status_code, 400, missing)
            self.assertEqual(response.json()['errors']['phone'], 'Phone number is required.')
        payload = {'vendor_id': self.vendor._id, 'name': 'Priya', 'consent': True}
        self.assertEqual(self.client.post('/api/analytics/quotes/', payload, format='json').status_code, 400)
        self.assertFalse(QuoteRequest.objects.exists())
        self.assertFalse(VendorEvent.objects.exists())

    def test_invalid_phone_numbers_rejected(self):
        for bad in ('12345', '5876543210', '98765 4321', '987654321012', 'abcdefghij', '+1 415 555 0100'):
            response = self.quote(phone=bad)
            self.assertEqual(response.status_code, 400, bad)
            self.assertIn('valid 10-digit', response.json()['errors']['phone'])
        self.assertFalse(QuoteRequest.objects.exists())

    def test_accepted_phone_formats_are_normalised(self):
        for raw in ('9876543210', '+919876543210', '09876543210', '98765-43210'):
            self.assertEqual(self.quote(phone=raw).status_code, 201, raw)
        self.assertEqual(set(QuoteRequest.objects.values_list('phone', flat=True)), {'9876543210'})

    def test_name_and_consent_are_required(self):
        self.assertIn('name', self.quote(name='  ').json()['errors'])
        self.assertIn('consent', self.quote(consent=False).json()['errors'])
        self.assertFalse(QuoteRequest.objects.exists())

    def test_past_event_date_rejected(self):
        response = self.quote(event_date='2020-01-01')
        self.assertEqual(response.status_code, 400)
        self.assertIn('event_date', response.json()['errors'])

    def test_quote_for_unapproved_vendor_rejected(self):
        self.assertEqual(self.quote(vendor_id=self.pending._id).status_code, 404)

    def test_analytics_failure_does_not_lose_the_enquiry(self):
        with mock.patch.object(analytics, 'record_event', side_effect=RuntimeError('db down')):
            response = self.quote()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(QuoteRequest.objects.count(), 1)


class VendorSummaryTests(AnalyticsTestCase):

    def setUp(self):
        super().setUp()
        now = timezone.now()
        for event_type, count in ((E.VENDOR_PAGE_VIEW, 5), (E.WHATSAPP_CLICK, 3), (E.PHONE_CLICK, 2),
                                  (E.GET_QUOTE_STARTED, 2)):
            for _ in range(count):
                VendorEvent.objects.create(event_type=event_type, vendor=self.vendor, session_id=SESSION)
        QuoteRequest.objects.create(vendor=self.vendor, name='A', phone='9876543210', consent=True)
        # Rival activity must never appear in Lotus Hall's numbers
        for _ in range(7):
            VendorEvent.objects.create(event_type=E.VENDOR_PAGE_VIEW, vendor=self.rival_vendor, session_id=SESSION)
        QuoteRequest.objects.create(vendor=self.rival_vendor, name='B', phone='9876543211', consent=True)
        # An old view: 20 days ago (inside 30d, outside 7d)
        old = VendorEvent.objects.create(event_type=E.VENDOR_PAGE_VIEW, vendor=self.vendor, session_id=SESSION)
        VendorEvent.objects.filter(pk=old.pk).update(created_at=now - timedelta(days=20))

    def summary(self, user, **params):
        if user:
            self.client.force_authenticate(user)
        return self.client.get('/api/analytics/vendor-summary/', params)

    def test_owner_sees_own_counts_for_7_days(self):
        response = self.summary(self.owner, range='7d')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['vendor']['id'], self.vendor._id)
        self.assertEqual(data['range'], '7d')
        self.assertEqual({k: data['metrics'][k] for k in
                          ('listing_views', 'whatsapp_clicks', 'phone_clicks', 'quote_starts', 'quote_submissions')},
                         {'listing_views': 5, 'whatsapp_clicks': 3, 'phone_clicks': 2,
                          'quote_starts': 2, 'quote_submissions': 1})

    def test_date_ranges(self):
        self.assertEqual(self.summary(self.owner, range='7d').json()['metrics']['listing_views'], 5)
        self.assertEqual(self.summary(self.owner, range='30d').json()['metrics']['listing_views'], 6)
        self.assertEqual(self.summary(self.owner, range='90d').json()['metrics']['listing_views'], 6)

    def test_this_month_starts_at_midnight_india_time(self):
        _, month_start, _ = analytics.date_range('month')
        self.assertEqual(month_start.astimezone(analytics.IST).strftime('%d %H:%M'), '01 00:00')
        prev = VendorEvent.objects.create(event_type=E.WHATSAPP_CLICK, vendor=self.vendor, session_id=SESSION)
        VendorEvent.objects.filter(pk=prev.pk).update(created_at=month_start - timedelta(minutes=1))
        self.assertEqual(self.summary(self.owner, range='month').json()['metrics']['whatsapp_clicks'], 3)
        self.assertEqual(self.summary(self.owner, range='90d').json()['metrics']['whatsapp_clicks'], 4)

    def test_default_range_is_this_month(self):
        self.assertEqual(self.summary(self.owner).json()['range'], 'month')
        self.assertEqual(self.summary(self.owner, range='bogus').json()['range'], 'month')

    def test_vendor_cannot_see_another_vendors_analytics(self):
        response = self.summary(self.rival, vendor_id=self.vendor._id)
        self.assertEqual(response.status_code, 403)
        self.assertNotIn('metrics', response.json())

    def test_vendor_without_param_only_gets_own_listing(self):
        data = self.summary(self.rival).json()
        self.assertEqual(data['vendor']['id'], self.rival_vendor._id)
        self.assertEqual(data['metrics']['listing_views'], 7)

    def test_customer_without_listing_gets_404(self):
        self.assertEqual(self.summary(self.customer).status_code, 404)

    def test_login_required(self):
        self.assertEqual(self.summary(None).status_code, 401)

    def test_admin_can_view_any_vendor(self):
        role_admin = User.objects.create_user(username='roleadmin', password='x')
        role_admin.profile.role = 'admin'
        role_admin.profile.save()
        for admin in (self.staff, role_admin):
            response = self.summary(admin, vendor_id=self.vendor._id, range='7d')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['metrics']['listing_views'], 5)

    def test_admin_summary_totals_and_access(self):
        self.assertEqual(self.client.get('/api/analytics/admin-summary/').status_code, 401)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get('/api/analytics/admin-summary/').status_code, 403)
        self.client.force_authenticate(self.staff)
        totals = self.client.get('/api/analytics/admin-summary/', {'range': '7d'}).json()['metrics']
        self.assertEqual((totals['listing_views'], totals['whatsapp_clicks'], totals['quote_submissions']), (12, 3, 2))
