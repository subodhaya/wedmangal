from datetime import date, timedelta
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from base import notifications
from base.models import Product, QuoteRequest, VendorEvent

UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'
SESSION = 'w1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
WA_CONFIG = dict(FAST2SMS_WHATSAPP_PHONE_NUMBER_ID='576000000000001', FAST2SMS_WHATSAPP_MESSAGE_ID='8340',
                 FAST2SMS_WEBHOOK_SECRET='s' * 40, QUOTE_NOTIFICATIONS_SYNC=True,
                 EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
HALL_REQ = {'category': 'Halls', 'location': {'area': 'Tambaram'}, 'guest_count': {'min': 500, 'max': 1000},
            'budget': {'min': 200000, 'max': 500000}, 'must_have': ['parking', 'veg_food'], 'avoid': ['hotel']}


def reply(payload):
    r = mock.Mock(); r.json.return_value = payload; return r


WA_OK = reply({'status': True, 'message': 'Message sent successfully', 'request_id': 'wa-123'})
SMS_OK = reply({'return': True, 'request_id': 'sms-1', 'message': ['SMS sent successfully.']})


class Provider:
    """Stands in for Fast2SMS: records calls by API and answers per API."""
    def __init__(self, whatsapp=WA_OK, sms=SMS_OK):
        self.whatsapp, self.sms, self.calls = whatsapp, sms, []

    def __call__(self, url, **kwargs):
        api = 'whatsapp' if url == notifications.FAST2SMS_WHATSAPP_URL else 'sms'
        self.calls.append((api, kwargs))
        answer = getattr(self, api)
        if isinstance(answer, Exception):
            raise answer
        return answer

    def made(self, api):
        return [kw for a, kw in self.calls if a == api]


def vendor(name, category='Halls', phone='+91 98765 43210', **extra):
    return Product.objects.create(name=name, category=category, city='Chennai', area_name='Selaiyur',
                                  business_phone=phone, personal_phone='9000011111', is_approved=True, **extra)


@override_settings(**WA_CONFIG)
class WhatsAppTestCase(TestCase):

    def setUp(self):
        cache.clear()
        self.client = APIClient(HTTP_USER_AGENT=UA)
        self.hall = vendor('Lotus Hall')
        key = mock.patch('base.notifications._fast2sms_key', return_value='test-key')
        key.start(); self.addCleanup(key.stop)

    def submit(self, provider, target=None, **extra):
        payload = {'vendor_id': (target or self.hall)._id, 'session_id': SESSION, 'name': 'Ravi', 'phone': '98765 00012',
                   'event_date': (date.today() + timedelta(days=70)).isoformat(), 'message': 'Reception on the same day',
                   'consent': True, **extra}
        with mock.patch('base.notifications.requests.get', side_effect=provider):
            with self.captureOnCommitCallbacks(execute=True):
                return self.client.post('/api/analytics/quotes/', payload, format='json')


class MessageContentTests(WhatsAppTestCase):

    def quote(self, target=None, **extra):
        return QuoteRequest.objects.create(vendor=target or self.hall, name='Ravi', phone='9876500012', consent=True, **extra)

    def test_hall_enquiry_reads_like_a_real_customer(self):
        q = self.quote(event_date=date(2026, 12, 15), requirements=HALL_REQ, message='Need dining for 400')
        name, wants, summary, phone = notifications.whatsapp_variables(q)
        self.assertEqual((name, wants, phone), ('Ravi', 'a wedding hall in Tambaram', '9876500012'))
        self.assertEqual(summary, '📅 15 Dec 2026 · 👥 500–1,000 guests · 💰 ₹2L–₹5L · ✅ Parking, Vegetarian food · '
                                  '🚫 Not: Hotel venue · 💬 “Need dining for 400”')

    def test_category_wording_is_not_hard_coded(self):
        cases = [('Photographers', 'a wedding photographer'), ('Makeup_Artist', 'bridal makeup'),
                 ('Decorators', 'a wedding decorator'), ('Jewellery', 'wedding jewellery'), ('Unknown', 'a wedding vendor')]
        for category, phrase in cases:
            v = vendor(f'V {category}', category=category, phone='9123456780')
            self.assertEqual(notifications.whatsapp_variables(self.quote(v))[1], phrase, category)

    def test_caterer_mentions_guest_count(self):
        caterer = vendor('Annam', category='Caterers', phone='9123456780')
        q = self.quote(caterer, requirements={'guest_count': {'min': 500, 'max': 1000}, 'location': {'area': 'Tambaram'},
                                              'budget': {'min': 400, 'max': 700, 'per': 'plate'}})
        _, wants, summary, _ = notifications.whatsapp_variables(q)
        self.assertEqual(wants, 'a caterer for 500–1,000 guests in Tambaram')
        self.assertIn('💰 ₹400–₹700 per plate', summary)
        self.assertNotIn('guests', summary)                                  # not repeated

    def test_missing_information_is_never_invented(self):
        name, wants, summary, _ = notifications.whatsapp_variables(self.quote())
        self.assertEqual(wants, 'a wedding hall')                            # no location made up
        self.assertEqual(summary, 'No further details given — please ask the customer.')
        for fake in ('₹0', 'guests', '📅', 'Budget'):
            self.assertNotIn(fake, summary)
        unsure = notifications.whatsapp_variables(self.quote(requirements={'budget': {'unsure': True}}))[2]
        self.assertNotIn('💰', unsure)

    def test_variables_are_safe_for_the_template(self):
        q = self.quote(message='line one\nline two | three\t\tfour     five')
        for value in notifications.whatsapp_variables(q):
            self.assertNotRegex(value, r'[\n\t|]| {2,}')

    def test_phone_numbers_are_masked_in_errors(self):
        self.assertEqual(notifications.mask_phones('Invalid number 9876500012 / +919123456780'),
                         'Invalid number 98••••••12 / 91••••••80')


class SendingTests(WhatsAppTestCase):

    def test_whatsapp_to_the_vendor_with_the_approved_template_and_no_sms(self):
        provider = Provider()
        response = self.submit(provider, requirements=HALL_REQ)
        self.assertEqual(response.status_code, 201)
        quote = QuoteRequest.objects.get()
        [call] = provider.made('whatsapp')
        params = call['params']
        self.assertEqual(call['headers'], {'Authorization': 'test-key'})
        self.assertEqual((params['message_id'], params['phone_number_id'], params['numbers'], params['udf1']),
                         ('8340', '576000000000001', '9876543210', f'quote:{quote.id}'))
        self.assertTrue(params['variables_values'].startswith('Ravi|a wedding hall in Tambaram|'))
        self.assertTrue(params['variables_values'].endswith('|9876500012'))
        self.assertEqual(provider.made('sms'), [])                           # accepted → no SMS
        self.assertEqual((quote.whatsapp_status, quote.whatsapp_request_id, quote.sms_status), ('accepted', 'wa-123', 'skipped'))
        self.assertEqual(quote.requirements['must_have'], ['parking', 'veg_food'])

    def test_requirements_from_another_category_are_not_attached(self):
        self.submit(Provider(), requirements={**HALL_REQ, 'category': 'Photographers'})
        self.assertEqual(QuoteRequest.objects.get().requirements, {})

    def test_not_configured_uses_sms_only(self):
        provider = Provider()
        with override_settings(FAST2SMS_WHATSAPP_MESSAGE_ID=''):
            self.submit(provider)
        quote = QuoteRequest.objects.get()
        self.assertEqual((len(provider.made('whatsapp')), len(provider.made('sms'))), (0, 1))
        self.assertEqual((quote.whatsapp_status, quote.sms_status), ('skipped', 'sent'))

    def test_provider_problems_fall_back_to_sms_and_the_quote_still_succeeds(self):
        problems = {
            'timeout': TimeoutError('read timed out'),
            'api error': reply({'status': False, 'message': 'Internal error'}),
            'invalid number': reply({'status': False, 'message': 'Invalid number 9876543210'}),
            'template error': reply({'status': False, 'message': 'Template not approved'}),
            'not json': ValueError('Expecting value'),
        }
        for label, answer in problems.items():
            QuoteRequest.objects.all().delete(); cache.clear()
            provider = Provider(whatsapp=answer)
            self.assertEqual(self.submit(provider, message=label).status_code, 201, label)
            quote = QuoteRequest.objects.get()
            self.assertEqual((quote.whatsapp_status, quote.sms_status), ('failed', 'sent'), label)
            self.assertEqual(len(provider.made('sms')), 1, label)
            self.assertNotIn('9876543210', quote.notification_error, label)       # masked

    def test_both_channels_failing_still_keeps_the_enquiry(self):
        provider = Provider(whatsapp=ConnectionError('down'), sms=ConnectionError('down'))
        self.assertEqual(self.submit(provider).status_code, 201)
        quote = QuoteRequest.objects.get()
        self.assertEqual((quote.whatsapp_status, quote.sms_status), ('failed', 'failed'))

    def test_vendor_without_a_mobile_gets_nothing(self):
        landline = vendor('Old Hall', phone='914424413995')
        provider = Provider()
        self.submit(provider, target=landline)
        self.assertEqual(provider.calls, [])
        self.assertEqual(QuoteRequest.objects.get().sms_status, 'skipped')

    def test_one_enquiry_one_notification(self):
        provider = Provider()
        self.submit(provider); self.submit(provider)                       # retry / double tap
        self.assertEqual(QuoteRequest.objects.count(), 1)
        notifications.notify_vendor_of_quote(QuoteRequest.objects.get().id)  # e.g. a second worker
        self.assertEqual((len(provider.made('whatsapp')), len(provider.made('sms'))), (1, 0))

    def test_only_a_submitted_enquiry_notifies(self):
        provider = Provider()
        with mock.patch('base.notifications.requests.get', side_effect=provider):
            self.client.post('/api/analytics/events/', {'event_type': 'vendor_page_view', 'vendor_id': self.hall._id,
                                                        'session_id': SESSION}, format='json')
            self.client.get('/api/search/', {'category': 'Halls'})
            self.client.post('/api/discovery/leads/', {'session_id': SESSION, 'source_vendor_id': self.hall._id,
                                                       'name': 'Ravi', 'phone': '9876500012', 'consent': True,
                                                       'requirements': HALL_REQ}, format='json')
        self.assertEqual(provider.calls, [])                               # WedMangal handles help requests itself
        self.assertEqual(self.submit(provider, consent=False).status_code, 400)
        self.assertEqual(provider.calls, [])

    def test_customer_phone_stays_out_of_analytics(self):
        self.submit(Provider())
        for event in VendorEvent.objects.all():
            self.assertNotIn('9876500012', str(event.metadata) + event.path + event.referrer)


class WebhookTests(WhatsAppTestCase):

    def setUp(self):
        super().setUp()
        self.provider = Provider()
        self.submit(self.provider)
        self.quote = QuoteRequest.objects.get()

    def hook(self, status, token='s' * 40, provider=None, **extra):
        body = {'request_id': 'wa-123', 'udf1': f'quote:{self.quote.id}', 'status': status, **extra}
        with mock.patch('base.notifications.requests.get', side_effect=provider or self.provider):
            return self.client.post(f'/api/notifications/whatsapp/?token={token}', body, format='json')

    def test_secret_required(self):
        self.assertEqual(self.hook('delivered', token='wrong').status_code, 403)
        self.assertEqual(self.client.post('/api/notifications/whatsapp/', {}, format='json').status_code, 403)
        with override_settings(FAST2SMS_WEBHOOK_SECRET=''):
            self.assertEqual(self.hook('delivered').status_code, 403)       # never open by default

    def test_signing_header_is_accepted_too(self):
        r = self.client.post('/api/notifications/whatsapp/', {'udf1': f'quote:{self.quote.id}', 'status': 'delivered'},
                             format='json', HTTP_WEBHOOK_SECRET_KEY='s' * 40)
        self.assertEqual(r.status_code, 200)

    def test_delivery_progress_is_recorded_and_never_goes_backwards(self):
        self.assertEqual(self.hook('sent').json(), {'result': 'updated'})
        self.hook('delivered'); self.hook('read')
        self.assertEqual(self.hook('sent').json(), {'result': 'ignored'})     # late, out of order
        self.quote.refresh_from_db()
        self.assertEqual(self.quote.whatsapp_status, 'read')

    def test_failure_report_sends_one_sms_fallback(self):
        self.hook('failed', error='Recipient 9876543210 is not on WhatsApp')
        self.hook('failed')                                                    # Fast2SMS retry
        self.quote.refresh_from_db()
        self.assertEqual((self.quote.whatsapp_status, self.quote.sms_status), ('failed', 'sent'))
        self.assertEqual(len(self.provider.made('sms')), 1)
        self.assertIsNotNone(self.quote.sms_fallback_at)
        self.assertIn('whatsapp failed', self.quote.notification_error)
        self.assertNotIn('9876543210', self.quote.notification_error)

    def test_no_fallback_once_delivered(self):
        self.hook('delivered')
        self.hook('failed')
        self.quote.refresh_from_db()
        self.assertEqual((self.quote.whatsapp_status, len(self.provider.made('sms'))), ('delivered', 0))

    def test_unknown_message_and_unknown_status_are_ignored(self):
        r = self.client.post('/api/notifications/whatsapp/?token=' + 's' * 40,
                             {'request_id': 'nope', 'udf1': 'quote:999999', 'status': 'delivered'}, format='json')
        self.assertEqual(r.json(), {'result': 'unknown'})
        self.assertEqual(self.hook('received').json(), {'result': 'ignored'})
        self.assertEqual(self.hook('delivered', request_id='someone-else').json(), {'result': 'unknown'})
