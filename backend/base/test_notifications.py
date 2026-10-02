from datetime import timedelta
from unittest import mock

from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from base import notifications
from base.models import Product, QuoteRequest, VendorEvent

UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'
SESSION = 'c1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
SMS_OK = {'return': True, 'request_id': 'abc', 'message': ['SMS sent successfully.']}


def fast2sms_reply(payload):
    response = mock.Mock()
    response.json.return_value = payload
    return response


@override_settings(QUOTE_NOTIFICATIONS_SYNC=True, EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
                   DEFAULT_FROM_EMAIL='WedMangal <noreply@wedmangal.com>')
class QuoteNotificationTests(TestCase):

    def setUp(self):
        cache.clear()
        self.client = APIClient(HTTP_USER_AGENT=UA)
        owner = User.objects.create_user(username='owner', password='x', email='owner@example.com')
        self.claimed = Product.objects.create(
            user=owner, name='Lotus Hall', category='Halls', city='Chennai', business_phone='+91 98765 43210',
            personal_phone='9000011111', is_approved=True, is_claimed=True, claimed_by=owner)
        placeholder = User.objects.create_user(username='hall42', password='x', email='hall42@bookyourcelebrations.com')
        self.unclaimed = Product.objects.create(
            user=placeholder, name='Rose Mahal', category='Halls', city='Chennai', business_phone='9123456780',
            personal_phone='9000022222', is_approved=True)
        self.landline = Product.objects.create(
            name='Old Hall', category='Halls', city='Chennai', business_phone='914424413995',
            personal_phone='9000033333', is_approved=True)
        patcher = mock.patch('base.notifications._fast2sms_key', return_value='test-key')
        patcher.start()
        self.addCleanup(patcher.stop)

    def submit(self, vendor, **extra):
        payload = {'vendor_id': vendor._id, 'session_id': SESSION, 'name': 'Priya', 'phone': '9988776655',
                   'event_date': (timezone.now() + timedelta(days=90)).date().isoformat(),
                   'message': 'Reception for 300 guests', 'consent': True, **extra}
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post('/api/analytics/quotes/', payload, format='json')

    # ── Successful quote ─────────────────────────────────────

    @mock.patch('base.notifications.requests.get', return_value=fast2sms_reply(SMS_OK))
    def test_quote_saved_event_recorded_and_vendor_notified(self, sms):
        response = self.submit(self.claimed)
        self.assertEqual(response.status_code, 201)
        quote = QuoteRequest.objects.get()
        self.assertTrue(VendorEvent.objects.filter(event_type='get_quote_submitted', vendor=self.claimed).exists())
        sms.assert_called_once()
        params = sms.call_args.kwargs['params']
        self.assertEqual((params['numbers'], params['route']), ('9876543210', 'q'))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['owner@example.com'])
        self.assertEqual((quote.sms_status, quote.email_status, quote.notification_error), ('sent', 'sent', ''))
        self.assertIsNotNone(quote.notified_at)

    @mock.patch('base.notifications.requests.get', return_value=fast2sms_reply(SMS_OK))
    def test_unclaimed_vendor_gets_sms_but_no_email_to_placeholder_account(self, sms):
        self.submit(self.unclaimed)
        quote = QuoteRequest.objects.get()
        self.assertEqual(sms.call_args.kwargs['params']['numbers'], '9123456780')
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual((quote.sms_status, quote.email_status), ('sent', 'skipped'))

    # ── Failures never break the quote ───────────────────────

    @mock.patch('base.notifications.requests.get', return_value=fast2sms_reply({'return': False, 'message': ['Insufficient balance']}))
    def test_sms_provider_rejection_keeps_quote(self, sms):
        with self.assertLogs('base.notifications', level='WARNING') as logs:
            response = self.submit(self.unclaimed)
        self.assertEqual(response.status_code, 201)
        quote = QuoteRequest.objects.get()
        self.assertEqual(quote.sms_status, 'failed')
        self.assertIn('Insufficient balance', quote.notification_error)
        self.assertIn('sms=failed', logs.output[0])

    @mock.patch('base.notifications.requests.get', side_effect=ConnectionError('fast2sms down'))
    def test_sms_network_error_keeps_quote(self, sms):
        response = self.submit(self.claimed)
        self.assertEqual(response.status_code, 201)
        quote = QuoteRequest.objects.get()
        self.assertEqual((quote.sms_status, quote.email_status), ('failed', 'sent'))  # email still went out
        self.assertIn('fast2sms down', quote.notification_error)

    @mock.patch('base.notifications.send_mail', side_effect=OSError('smtp unavailable'))
    @mock.patch('base.notifications.requests.get', return_value=fast2sms_reply(SMS_OK))
    def test_email_failure_keeps_quote(self, sms, send):
        response = self.submit(self.claimed)
        self.assertEqual(response.status_code, 201)
        quote = QuoteRequest.objects.get()
        self.assertEqual((quote.sms_status, quote.email_status), ('sent', 'failed'))
        self.assertIn('smtp unavailable', quote.notification_error)

    @mock.patch('base.notifications.sms_text', side_effect=RuntimeError('bug'))
    @mock.patch('base.notifications.requests.get')
    def test_unexpected_crash_never_reaches_the_customer(self, sms, text):
        with self.assertLogs('base.notifications', level='ERROR'):
            response = self.submit(self.claimed)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(QuoteRequest.objects.get().sms_status, 'failed')
        sms.assert_not_called()

    @mock.patch('base.notifications.schedule_vendor_notification', side_effect=RuntimeError('cannot schedule'))
    def test_scheduling_failure_keeps_quote(self, schedule):
        self.assertEqual(self.submit(self.claimed).status_code, 201)
        self.assertEqual(QuoteRequest.objects.count(), 1)

    @mock.patch('base.notifications.requests.get')
    def test_failed_quote_sends_nothing(self, sms):
        self.assertEqual(self.submit(self.claimed, phone='').status_code, 400)
        self.assertEqual(self.submit(self.claimed, consent=False).status_code, 400)
        sms.assert_not_called()
        self.assertEqual(len(mail.outbox), 0)

    # ── Missing contact details ──────────────────────────────

    @mock.patch('base.notifications.requests.get')
    def test_vendor_with_landline_only_is_skipped(self, sms):
        self.assertEqual(self.submit(self.landline).status_code, 201)
        quote = QuoteRequest.objects.get()
        sms.assert_not_called()
        self.assertEqual((quote.sms_status, quote.email_status), ('skipped', 'skipped'))
        self.assertIn('no mobile number', quote.notification_error)

    @mock.patch('base.notifications.requests.get', return_value=fast2sms_reply(SMS_OK))
    def test_claimed_vendor_without_email(self, sms):
        self.claimed.claimed_by.email = ''
        self.claimed.claimed_by.save()
        self.assertEqual(self.submit(self.claimed).status_code, 201)
        self.assertEqual(QuoteRequest.objects.get().email_status, 'skipped')

    @mock.patch('base.notifications.requests.get')
    def test_no_sms_key_configured(self, sms):
        with mock.patch('base.notifications._fast2sms_key', return_value=''):
            self.submit(self.unclaimed)
        sms.assert_not_called()
        self.assertEqual(QuoteRequest.objects.get().sms_status, 'skipped')

    # ── Duplicate protection ─────────────────────────────────

    @mock.patch('base.notifications.requests.get', return_value=fast2sms_reply(SMS_OK))
    def test_same_quote_is_never_notified_twice(self, sms):
        self.submit(self.claimed)
        quote = QuoteRequest.objects.get()
        self.assertEqual(notifications.notify_vendor_of_quote(quote.id), 'duplicate')
        self.assertEqual(notifications.notify_vendor_of_quote(quote.id), 'duplicate')
        self.assertEqual(sms.call_count, 1)
        self.assertEqual(len(mail.outbox), 1)

    @mock.patch('base.notifications.requests.get', return_value=fast2sms_reply(SMS_OK))
    def test_retried_submission_returns_same_quote_without_new_notification(self, sms):
        first = self.submit(self.claimed).json()['id']
        second = self.submit(self.claimed).json()['id']    # browser/API retry, identical payload
        self.assertEqual(first, second)
        self.assertEqual(QuoteRequest.objects.count(), 1)
        self.assertEqual(sms.call_count, 1)
        self.assertEqual(VendorEvent.objects.filter(event_type='get_quote_submitted').count(), 1)

    @mock.patch('base.notifications.requests.get', return_value=fast2sms_reply(SMS_OK))
    def test_a_genuinely_different_enquiry_is_a_new_lead(self, sms):
        self.submit(self.claimed)
        self.submit(self.claimed, message='Also need decoration')
        self.assertEqual((QuoteRequest.objects.count(), sms.call_count), (2, 2))

    # ── What the vendor receives ─────────────────────────────

    def test_sms_contains_only_the_agreed_details(self):
        quote = QuoteRequest.objects.create(vendor=self.claimed, name='Priya', phone='9988776655', consent=True,
                                            event_date=timezone.now().date() + timedelta(days=90),
                                            message='secret plans and my address')
        text = notifications.sms_text(quote)
        self.assertIn('Lotus Hall', text)
        self.assertIn('Priya', text)
        self.assertIn('9988776655', text)
        self.assertIn(f'{quote.event_date:%d %b %Y}', text)
        for private in ('secret plans', 'address', '9000011111', self.claimed.business_phone):
            self.assertNotIn(private, text)
        self.assertLessEqual(len(text), 160)

    def test_email_contains_enquiry_details_but_no_vendor_private_data(self):
        quote = QuoteRequest.objects.create(vendor=self.claimed, name='Priya', phone='9988776655', consent=True,
                                            message='Reception for 300 guests')
        subject, body = notifications.email_content(quote)
        self.assertIn('Priya', subject)
        for expected in ('Lotus Hall', 'Priya', '9988776655', 'Reception for 300 guests', 'not given'):
            self.assertIn(expected, body)
        self.assertNotIn('9000011111', body)  # vendor's personal phone

    def test_public_apis_still_hide_personal_phone(self):
        for path in ('/api/search/?q=hall', '/api/products/all', f'/api/products/{self.claimed._id}/'):
            body = self.client.get(path).content.decode()
            self.assertNotIn('personal_phone', body, path)
            self.assertNotIn('9000011111', body, path)


@override_settings(QUOTE_NOTIFICATIONS_SYNC=False)
class BackgroundDispatchTests(TestCase):

    def test_notification_runs_in_a_background_thread_after_commit(self):
        with mock.patch('base.notifications.threading.Thread') as thread:
            with self.captureOnCommitCallbacks(execute=False) as callbacks:
                notifications.schedule_vendor_notification(123)
            thread.assert_not_called()          # nothing happens before the commit
            for callback in callbacks:
                callback()
        thread.assert_called_once()
        self.assertEqual(thread.call_args.kwargs['args'], (123,))
        thread.return_value.start.assert_called_once()
