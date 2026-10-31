import shutil
import tempfile
from unittest import mock

from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from base import removal_requests as rr
from base.models import (Product, ProductVideo, QuoteRequest, Service, ServiceImage, VendorRemovalRequest,
                         VendorRemovalRequestEvent)

RR = VendorRemovalRequest
UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'
PDF = b'%PDF-1.4\n%test evidence\n'
TMP = tempfile.mkdtemp(prefix='wm-private-')


@override_settings(REMOVAL_NOTIFICATIONS_SYNC=True, QUOTE_NOTIFICATIONS_SYNC=True, PRIVATE_MEDIA_ROOT=TMP,
                   EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
                   DEFAULT_FROM_EMAIL='WedMangal <noreply@wedmangal.com>', EMAIL_HOST_USER='team@wedmangal.com')
class RemovalRequestTests(TestCase):

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP, ignore_errors=True)

    def setUp(self):
        cache.clear()
        self.client = APIClient(HTTP_USER_AGENT=UA)
        self.vendor = Product.objects.create(name='Lotus Hall', category='Halls', city='Chennai', area_name='Anna Nagar',
                                             business_phone='9876543210', personal_phone='9000011111', is_approved=True)
        self.other = Product.objects.create(name='Rose Mahal', category='Halls', city='Chennai', area_name='Anna Nagar',
                                            business_phone='9123456780', personal_phone='9000022222', is_approved=True)
        self.staff = User.objects.create_superuser('boss', 'boss@example.com', 'x')

    def payload(self, **extra):
        return {'vendor_id': self.vendor._id, 'request_type': 'unlist', 'requester_name': 'Ravi Kumar',
                'requester_email': 'Ravi@Example.com', 'requester_phone': '+91 98765 43210',
                'requester_relationship': 'owner', 'reason': 'owner_opt_out', 'description': '',
                'consent': True, **extra}

    def submit(self, **extra):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post('/api/removal-requests/', self.payload(**extra), format='json')

    def copyright(self, **extra):
        data = {'vendor_id': self.vendor._id, 'requester_name': 'Anu Photography', 'requester_email': 'anu@example.com',
                'requester_phone': '9988776655', 'requester_relationship': 'content_owner',
                'disputed_content': 'The second hall photo is my work', 'description': 'Used without permission.',
                'consent': 'true', **extra}
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post('/api/removal-requests/copyright/', data, format='multipart')

    def decide(self, req, new_status, actor=None):
        with self.captureOnCommitCallbacks(execute=True):
            rr.change_status(req, new_status, actor or self.staff)
        req.refresh_from_db()

    # ── Submission ───────────────────────────────────────────

    def test_unlist_request_saved_without_account_and_listing_untouched(self):
        response = self.submit()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.data), {'reference', 'status'})
        req = RR.objects.get()
        self.assertRegex(req.reference, r'^RR-[A-Z2-9]{8}$')
        self.assertEqual(req.reference, response.data['reference'])
        self.assertEqual((req.requester_email, req.requester_phone, req.status), ('ravi@example.com', '9876543210', 'pending'))
        self.assertEqual(req.vendor_name, 'Lotus Hall')
        self.assertTrue(req.listing_url.endswith(f'/product/{self.vendor._id}'))
        self.vendor.refresh_from_db()
        self.assertTrue(self.vendor.is_approved)   # an unverified request never unpublishes
        self.assertEqual(list(req.events.values_list('action', flat=True)), ['submitted', 'email_sent', 'email_sent'])

    def test_acknowledgement_and_admin_alert_sent(self):
        self.submit()
        req = RR.objects.get()
        self.assertEqual(len(mail.outbox), 2)
        ack, alert = mail.outbox
        self.assertEqual(ack.to, ['ravi@example.com'])
        self.assertIn(req.reference, ack.subject)
        self.assertIn(req.reference, ack.body)
        self.assertEqual(alert.to, ['team@wedmangal.com'])
        self.assertNotIn('ravi@example.com', alert.body)          # contact details stay in the admin
        self.assertNotIn('9876543210', alert.body)

    @override_settings(REMOVAL_REQUEST_ADMIN_EMAILS='a@wedmangal.com, b@wedmangal.com')
    def test_admin_alert_goes_to_configured_addresses(self):
        self.submit()
        self.assertEqual(mail.outbox[1].to, ['a@wedmangal.com', 'b@wedmangal.com'])

    def test_email_failure_is_logged_and_does_not_fail_submission(self):
        with mock.patch('base.removal_requests.send_mail', side_effect=OSError('smtp down')):
            response = self.submit()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(RR.objects.get().events.filter(action='email_failed').count(), 2)

    def test_incorrect_information_needs_description(self):
        response = self.submit(request_type='incorrect_information', reason='', description='')
        self.assertEqual(response.status_code, 400)
        self.assertIn('description', response.data['errors'])
        response = self.submit(request_type='incorrect_information', reason='', description='Wrong phone number')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(RR.objects.get().reason, 'incorrect')

    def test_invalid_submissions_rejected(self):
        response = self.submit(requester_name='', requester_email='not-an-email', requester_phone='12345',
                               requester_relationship='boss', reason='because', consent=False)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data['errors']),
                         {'requester_name', 'requester_email', 'requester_phone', 'requester_relationship',
                          'reason', 'consent'})
        self.assertEqual(self.submit(vendor_id=999999).data['errors'], {'vendor_id': 'This listing could not be found.'})
        self.assertEqual(self.submit(request_type='copyright').status_code, 400)   # has its own endpoint
        self.assertEqual(self.submit(reason='other', description='').data['errors'].keys(), {'description'})
        self.assertEqual(self.submit(description='x' * 3001).status_code, 400)
        self.assertFalse(RR.objects.exists())
        self.assertEqual(mail.outbox, [])

    def test_international_phone_accepted_for_copyright_holders(self):
        self.assertEqual(rr.clean_contact_phone('+44 20 7946 0958'), '+442079460958')
        self.assertEqual(rr.clean_contact_phone('+91 12345'), '')
        self.assertEqual(rr.clean_contact_phone('020 7946 0958'), '')

    # ── Spam and duplicates ──────────────────────────────────

    def test_honeypot_drops_bot_submission(self):
        response = self.submit(website='http://spam.example')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(RR.objects.exists())

    def test_duplicate_open_request_not_saved_twice(self):
        self.submit()
        mail.outbox.clear()
        response = self.submit(requester_email='ravi@example.com')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['duplicate'])
        self.assertNotIn('reference', response.data)
        self.assertEqual(RR.objects.count(), 1)
        self.assertEqual(mail.outbox, [])
        # A different listing or request type is a new request
        self.assertEqual(self.submit(vendor_id=self.other._id).status_code, 201)
        self.assertEqual(self.submit(request_type='incorrect_information', description='Closed on Sundays').status_code, 201)

    def test_submissions_rate_limited_per_ip(self):
        codes = [self.submit(requester_email=f'p{i}@example.com').status_code for i in range(6)]
        self.assertEqual(codes, [201] * 5 + [429])

    def test_rate_limit_applies_to_logged_in_users_and_ignores_stale_tokens(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer expired.token.value')
        self.assertEqual(self.submit().status_code, 201)

    # ── Status check ─────────────────────────────────────────

    def test_status_check_needs_reference_and_matching_email(self):
        reference = self.submit().data['reference']
        ok = self.client.post('/api/removal-requests/status/', {'reference': reference.lower(), 'email': 'RAVI@example.com'},
                              format='json')
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.data['status'], 'pending')
        self.assertEqual(set(ok.data), {'reference', 'request_type', 'request_type_label', 'status', 'status_label',
                                        'vendor_name', 'submitted_at', 'updated_at'})
        for body in ({'reference': reference, 'email': 'someone@example.com'}, {'reference': 'RR-AAAAAAAA', 'email': 'ravi@example.com'},
                     {'reference': reference}):
            self.assertEqual(self.client.post('/api/removal-requests/status/', body, format='json').status_code, 404)

    # ── Unlisting decision ───────────────────────────────────

    def test_unlist_approval_requires_verified_ownership(self):
        self.submit()
        req = RR.objects.get()
        self.assertIn('Verify', rr.decision_problem(req, RR.Status.APPROVED))
        req.ownership_verified, req.verification_method = True, RR.Verification.LISTING_PHONE
        self.assertEqual(rr.decision_problem(req, RR.Status.APPROVED), '')
        self.assertIn('cannot', rr.decision_problem(req, RR.Status.COMPLETED))

    def _approved_unlisting(self):
        self.submit()
        req = RR.objects.get()
        req.ownership_verified, req.verification_method = True, RR.Verification.LISTING_PHONE
        req.save()
        mail.outbox.clear()
        self.decide(req, RR.Status.APPROVED)
        return req

    def test_approved_unlisting_hides_listing_but_keeps_record(self):
        req = self._approved_unlisting()
        self.vendor.refresh_from_db()
        self.assertFalse(self.vendor.is_approved)
        self.assertTrue(Product.objects.filter(pk=self.vendor.pk).exists())
        self.assertEqual((req.reviewed_by, req.status), (self.staff, 'approved'))
        self.assertTrue(req.events.filter(action='vendor_unlisted').exists())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('approved', mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].to, ['ravi@example.com'])

    def test_unlisted_vendor_gone_from_public_discovery(self):
        self._approved_unlisting()
        pk = self.vendor._id
        self.assertEqual(self.client.get(f'/api/products/{pk}/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/products/product/{pk}/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/products/products/{pk}/business-data/').status_code, 404)
        sitemap = self.client.get('/sitemap.xml').content.decode()
        self.assertNotIn(f'/product/{pk}<', sitemap)
        self.assertIn(f'/product/{self.other._id}<', sitemap)
        listing = self.client.get('/api/products/all', {'category': 'Halls'}).json()
        names = [p['name'] for p in (listing.get('products') if isinstance(listing, dict) else listing)]
        self.assertNotIn('Lotus Hall', names)
        self.assertIn('Rose Mahal', names)
        search = self.client.get('/api/products/search/', {'city': 'Chennai', 'vendor': 'Halls'}).json()
        self.assertEqual([p['name'] for p in search], ['Rose Mahal'])
        page = self.client.get(f'/product/{pk}')
        self.assertEqual(page.status_code, 301)   # old links go to similar vendors, not a dead end

    def test_staff_still_sees_unlisted_listing(self):
        self._approved_unlisting()
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get(f'/api/products/{self.vendor._id}/').status_code, 200)

    def test_react_admin_cannot_silently_relist(self):
        self._approved_unlisting()
        self.client.force_authenticate(self.staff)
        response = self.client.put(f'/api/products/{self.vendor._id}/approve/')
        self.assertEqual(response.status_code, 409)
        self.vendor.refresh_from_db()
        self.assertFalse(self.vendor.is_approved)

    def test_rejection_emails_requester_and_keeps_listing(self):
        self.submit()
        req = RR.objects.get()
        req.message_to_requester = 'Please call us from the listed number.'
        req.admin_notes = 'Caller sounded like a competitor'
        req.save()
        mail.outbox.clear()
        self.decide(req, RR.Status.REJECTED)
        self.vendor.refresh_from_db()
        self.assertTrue(self.vendor.is_approved)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('not approved', mail.outbox[0].subject)
        self.assertIn('Please call us from the listed number.', mail.outbox[0].body)
        self.assertNotIn('competitor', mail.outbox[0].body)   # admin notes are internal

    # ── Copyright ────────────────────────────────────────────

    def test_copyright_complaint_with_evidence_stored_privately(self):
        response = self.copyright(evidence_file=SimpleUploadedFile('licence.pdf', PDF, content_type='application/pdf'))
        self.assertEqual(response.status_code, 201)
        req = RR.objects.get()
        self.assertEqual((req.request_type, req.evidence_name), ('copyright', 'licence.pdf'))
        self.assertTrue(req.evidence_file.path.startswith(TMP))
        self.assertNotIn('licence', req.evidence_file.name)   # random name on disk

    def test_copyright_evidence_validated(self):
        fake = SimpleUploadedFile('photo.jpg', b'MZ\x90\x00 not a jpeg', content_type='image/jpeg')
        self.assertIn('evidence_file', self.copyright(evidence_file=fake).data['errors'])
        exe = SimpleUploadedFile('tool.exe', PDF)
        self.assertIn('evidence_file', self.copyright(evidence_file=exe).data['errors'])
        big = SimpleUploadedFile('big.pdf', PDF + b'0' * (5 * 1024 * 1024))
        self.assertIn('evidence_file', self.copyright(evidence_file=big).data['errors'])
        self.assertIn('disputed_content', self.copyright(disputed_content='').data['errors'])
        self.assertFalse(RR.objects.exists())

    def test_files_only_accepted_on_copyright_endpoint(self):
        upload = SimpleUploadedFile('licence.pdf', PDF)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post('/api/removal-requests/', {**self.payload(), 'evidence_file': upload},
                                        format='multipart')
        self.assertEqual(response.status_code, 400)

    def test_copyright_approval_removes_only_disputed_content(self):
        service = Service.objects.create(product=self.vendor, name='Hall')
        keep = ServiceImage.objects.create(service=service, image='service_images/keep.jpg')
        disputed = ServiceImage.objects.create(service=service, image='service_images/disputed.jpg')
        video = ProductVideo.objects.create(product=self.vendor, video_url='/videos/a.mp4')
        self.copyright()
        req = RR.objects.get()
        keys = [k for k, _ in rr.content_choices(self.vendor)]
        self.assertIn(f'service_image:{disputed._id}', keys)
        self.assertIn(f'video:{video._id}', keys)
        self.assertEqual(rr.decision_problem(req, RR.Status.APPROVED), '')   # no ownership gate for content
        self.decide(req, RR.Status.APPROVED)
        rr.remove_content(req, [f'service_image:{disputed._id}'], self.staff)
        self.vendor.refresh_from_db()
        self.assertTrue(self.vendor.is_approved)               # the listing stays
        self.assertTrue(ServiceImage.objects.filter(pk=keep.pk).exists())
        self.assertFalse(ServiceImage.objects.filter(pk=disputed.pk).exists())
        self.assertTrue(ProductVideo.objects.filter(pk=video.pk).exists())
        self.assertIn('disputed.jpg', req.events.get(action='content_removed').detail)

    def test_content_from_another_listing_cannot_be_removed(self):
        service = Service.objects.create(product=self.other, name='Other hall')
        image = ServiceImage.objects.create(service=service, image='service_images/other.jpg')
        self.copyright()
        req = RR.objects.get()
        self.assertEqual(rr.remove_content(req, [f'service_image:{image._id}'], self.staff), [])
        self.assertTrue(ServiceImage.objects.filter(pk=image.pk).exists())

    # ── Django admin ─────────────────────────────────────────

    def _admin_post(self, req, **fields):
        data = {'status': req.status, 'ownership_verified': '', 'verification_method': '', 'admin_notes': '',
                'message_to_requester': '', 'events-TOTAL_FORMS': req.events.count(),
                'events-INITIAL_FORMS': req.events.count(), 'events-MIN_NUM_FORMS': 0, 'events-MAX_NUM_FORMS': 1000}
        for i, event in enumerate(req.events.all()):
            data[f'events-{i}-id'] = event.pk
            data[f'events-{i}-request'] = req.pk
        data.update(fields)
        self.client.force_login(self.staff)
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(f'/admin/base/vendorremovalrequest/{req.pk}/change/', data)

    def test_admin_blocks_unverified_unlisting_then_approves(self):
        self.submit()
        req = RR.objects.get()
        response = self._admin_post(req, status='approved')
        self.assertEqual(response.status_code, 200)            # form re-shown with the error
        self.assertContains(response, 'Verify that the requester owns')
        self.vendor.refresh_from_db()
        self.assertTrue(self.vendor.is_approved)
        response = self._admin_post(req, status='approved', ownership_verified='on', verification_method='listing_phone',
                                    admin_notes='Called 9876543210, owner confirmed')
        self.assertEqual(response.status_code, 302)
        req.refresh_from_db()
        self.vendor.refresh_from_db()
        self.assertEqual(req.status, 'approved')
        self.assertFalse(self.vendor.is_approved)
        actions = list(req.events.values_list('action', flat=True))
        self.assertIn('ownership_verified_changed', actions)
        self.assertIn('vendor_unlisted', actions)

    def test_admin_removes_ticked_content_for_copyright(self):
        service = Service.objects.create(product=self.vendor, name='Hall')
        disputed = ServiceImage.objects.create(service=service, image='service_images/disputed.jpg')
        self.copyright()
        req = RR.objects.get()
        response = self._admin_post(req, status='pending', remove_content=[f'service_image:{disputed._id}'])
        self.assertContains(response, 'Approve the complaint before removing content')
        response = self._admin_post(req, status='approved', remove_content=[f'service_image:{disputed._id}'])
        self.assertEqual(response.status_code, 302)
        self.assertFalse(ServiceImage.objects.filter(pk=disputed.pk).exists())
        self.vendor.refresh_from_db()
        self.assertTrue(self.vendor.is_approved)

    def test_admin_evidence_download_staff_only(self):
        self.copyright(evidence_file=SimpleUploadedFile('licence.pdf', PDF))
        req = RR.objects.get()
        url = f'/admin/base/vendorremovalrequest/{req.pk}/evidence/'
        self.assertEqual(self.client.get(url).status_code, 302)   # to the admin login
        self.client.force_login(self.staff)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b''.join(response.streaming_content), PDF)
        self.assertIn('attachment', response['Content-Disposition'])

    def test_requests_cannot_be_deleted_in_admin(self):
        self.submit()
        req = RR.objects.get()
        self.client.force_login(self.staff)
        self.assertEqual(self.client.get(f'/admin/base/vendorremovalrequest/{req.pk}/delete/').status_code, 403)
        self.assertEqual(self.client.get('/admin/base/vendorremovalrequest/').status_code, 200)

    # ── Existing enquiry flow is unaffected ──────────────────

    def test_quote_enquiry_still_works_alongside_open_request(self):
        self.submit()
        with mock.patch('base.notifications.send_sms', return_value=('skipped', '')), \
                mock.patch('base.notifications.send_whatsapp', return_value=('', '', '')), \
                self.captureOnCommitCallbacks(execute=True):
            response = self.client.post('/api/analytics/quotes/', {
                'vendor_id': self.vendor._id, 'session_id': 'c1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
                'name': 'Priya', 'phone': '9988776655', 'message': '', 'consent': True}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(QuoteRequest.objects.filter(vendor=self.vendor).count(), 1)
        self.assertEqual(VendorRemovalRequestEvent.objects.filter(action='vendor_unlisted').count(), 0)
