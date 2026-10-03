from unittest import mock

from django.contrib import admin
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import RequestFactory, TestCase
from rest_framework.test import APIClient

from base import vendor_profile as vp
from base.models import Product, ServiceOwnerClaim, VendorEvent

UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'
SENT = ('sent', '')


def imported_vendor(name, category='Halls', phone='9876543210', **extra):
    placeholder = User.objects.create_user(username=f'imp-{name}', email=f'{name}@bookyourcelebrations.com')
    return Product.objects.create(**{'user': placeholder, 'name': name, 'category': category, 'city': 'Chennai',
                                     'business_phone': phone, 'personal_phone': '9000011111', 'is_approved': True,
                                     **extra})


class ClaimTestCase(TestCase):

    def setUp(self):
        cache.clear()
        self.client = APIClient(HTTP_USER_AGENT=UA)
        self.hall = imported_vendor('Lotus Hall')
        self.owner = User.objects.create_user(username='owner', email='owner@example.com', password='x')
        self.other = User.objects.create_user(username='other', email='other@example.com', password='x')
        sms = mock.patch('base.notifications.send_sms', return_value=SENT)
        self.sms = sms.start()
        self.addCleanup(sms.stop)

    def as_user(self, user):
        self.client.force_authenticate(user)
        return self.client

    def send_code(self, user, vendor=None):
        return self.as_user(user).post(f'/api/vendors/{(vendor or self.hall)._id}/claim/send-code/')

    def sent_code(self):
        return self.sms.call_args.args[1][:6]

    def claim(self, user, vendor=None):
        vendor = vendor or self.hall
        self.assertEqual(self.send_code(user, vendor).status_code, 200)
        return self.as_user(user).post(f'/api/vendors/{vendor._id}/claim/verify/', {'code': self.sent_code()})

    def events(self, event_type):
        return VendorEvent.objects.filter(event_type=event_type).count()


class ClaimFlowTests(ClaimTestCase):

    def test_code_goes_to_the_listed_phone_never_a_number_the_user_chooses(self):
        response = self.as_user(self.owner).post(f'/api/vendors/{self.hall._id}/claim/send-code/',
                                                 {'phone': '9111111111'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.sms.call_args.args[0], '9876543210')
        self.assertIn('Lotus Hall', self.sms.call_args.args[1])
        self.assertEqual(response.json()['listed_mobile'], '+91 98••••••10')
        self.assertEqual(self.events('claim_started'), 1)

    def test_unclaimed_vendor_can_be_claimed_with_the_code(self):
        response = self.claim(self.owner)
        self.assertEqual(response.status_code, 200, response.content)
        self.hall.refresh_from_db()
        self.assertTrue(self.hall.is_claimed)
        self.assertFalse(self.hall.is_verified)                # a claim is not verification
        self.assertEqual((self.hall.claimed_by, self.hall.user), (self.owner, self.owner))
        self.assertEqual(User.objects.get(pk=self.owner.pk).profile.role, 'service-owner')
        claim = ServiceOwnerClaim.objects.get()
        self.assertEqual((claim.status, claim.method, claim.phone), ('approved', 'listed_phone_otp', '9876543210'))
        self.assertEqual((self.events('claim_submitted'), self.events('claim_approved')), (1, 1))
        self.assertIn('token', response.json()['user'])

    def test_claim_lets_the_business_phone_log_in_to_the_owner_account(self):
        response = self.claim(self.owner)
        self.assertEqual(response.json()['login_phone'], '+91 98••••••10')
        self.assertEqual(User.objects.get(pk=self.owner.pk).profile.phone, '9876543210')

    def test_claim_keeps_an_existing_login_phone(self):
        from base.models import Profile
        Profile.objects.filter(user=self.owner).update(phone='9000000001')
        self.assertEqual(self.claim(self.owner).json()['login_phone'], '')
        self.assertEqual(User.objects.get(pk=self.owner.pk).profile.phone, '9000000001')

    def test_claim_does_not_take_the_phone_from_a_real_account(self):
        from base.models import Profile
        Profile.objects.filter(user=self.other).update(phone='9876543210')
        self.assertEqual(self.claim(self.owner).json()['login_phone'], '')
        self.assertEqual(User.objects.get(pk=self.other.pk).profile.phone, '9876543210')

    def test_wrong_code_is_rejected_and_attempts_are_limited(self):
        self.send_code(self.owner)
        wrong = '000000' if self.sent_code() != '000000' else '111111'
        url = f'/api/vendors/{self.hall._id}/claim/verify/'
        for _ in range(5):
            self.assertEqual(self.as_user(self.owner).post(url, {'code': wrong}).status_code, 400)
        self.assertEqual(self.as_user(self.owner).post(url, {'code': self.sent_code()}).status_code, 429)
        self.hall.refresh_from_db()
        self.assertFalse(self.hall.is_claimed)

    def test_code_is_bound_to_the_user_who_requested_it(self):
        self.send_code(self.owner)
        response = self.as_user(self.other).post(f'/api/vendors/{self.hall._id}/claim/verify/',
                                                 {'code': self.sent_code()})
        self.assertEqual(response.status_code, 400)
        self.hall.refresh_from_db()
        self.assertFalse(self.hall.is_claimed)

    def test_code_is_bound_to_the_listing(self):
        second = imported_vendor('Rose Mahal', phone='9123456780')
        self.send_code(self.owner)
        response = self.as_user(self.owner).post(f'/api/vendors/{second._id}/claim/verify/',
                                                 {'code': self.sent_code()})
        self.assertEqual(response.status_code, 400)
        second.refresh_from_db()
        self.assertFalse(second.is_claimed)

    def test_claimed_vendor_cannot_be_claimed_by_another_user(self):
        self.claim(self.owner)
        self.sms.reset_mock()
        response = self.send_code(self.other)
        self.assertEqual((response.status_code, response.json()['reason']), (409, 'already_claimed'))
        self.sms.assert_not_called()
        request = self.as_user(self.other).post(f'/api/vendors/{self.hall._id}/claim/request/',
                                                {'phone': '9111111111', 'message': 'I am the real owner'})
        self.assertEqual(request.status_code, 409)
        self.hall.refresh_from_db()
        self.assertEqual(self.hall.claimed_by, self.owner)

    def test_race_second_verifier_loses(self):
        self.send_code(self.owner)
        owner_code = self.sent_code()
        cache.delete(f'vclaim:resend:{self.hall._id}')
        self.send_code(self.other)
        other_code = self.sent_code()
        url = f'/api/vendors/{self.hall._id}/claim/verify/'
        self.assertEqual(self.as_user(self.owner).post(url, {'code': owner_code}).status_code, 200)
        self.assertEqual(self.as_user(self.other).post(url, {'code': other_code}).status_code, 409)
        self.assertEqual(ServiceOwnerClaim.objects.filter(status='approved').count(), 1)

    def test_login_required(self):
        self.client.force_authenticate(None)
        for path in ('send-code/', 'verify/', 'request/'):
            self.assertEqual(self.client.post(f'/api/vendors/{self.hall._id}/claim/{path}').status_code, 401)
        self.assertEqual(self.client.get(f'/api/vendors/{self.hall._id}/claim/').json()['logged_in'], False)

    def test_unapproved_listing_cannot_be_claimed(self):
        hidden = imported_vendor('Hidden Hall', phone='9123456780', is_approved=False)
        self.assertEqual(self.send_code(self.owner, hidden).status_code, 404)

    def test_resend_and_daily_limits_protect_the_vendors_phone(self):
        self.assertEqual(self.send_code(self.owner).status_code, 200)
        self.assertEqual(self.send_code(self.other).status_code, 429)          # within a minute
        for _ in range(2):
            cache.delete(f'vclaim:resend:{self.hall._id}')
            self.assertEqual(self.send_code(self.owner).status_code, 200)
        cache.delete(f'vclaim:resend:{self.hall._id}')
        self.assertEqual(self.send_code(self.owner).status_code, 429)          # 4th code today
        self.assertEqual(self.sms.call_count, 3)

    def test_sms_failure_does_not_leave_a_usable_code(self):
        self.sms.return_value = ('failed', 'sms: Insufficient balance')
        self.assertEqual(self.send_code(self.owner).status_code, 503)
        self.assertEqual(self.events('claim_started'), 0)
        self.sms.return_value = SENT
        self.assertEqual(self.send_code(self.owner).status_code, 200)        # can retry straight away

    def test_landline_listing_must_use_admin_review(self):
        landline = imported_vendor('Old Hall', phone='914424413995')
        response = self.send_code(self.owner, landline)
        self.assertEqual(response.json()['reason'], 'no_listed_mobile')
        self.sms.assert_not_called()

    def test_listing_owned_by_a_real_account_is_not_taken_over_by_sms(self):
        registrant = User.objects.create_user(username='reg', email='reg@gmail.com')
        own = Product.objects.create(user=registrant, name='Self Registered', category='Halls',
                                     business_phone='9123456780', personal_phone='1', is_approved=True)
        self.assertEqual(self.send_code(self.owner, own).json()['reason'], 'owned_by_account')
        self.sms.assert_not_called()
        # ... but its own account may claim it the normal way
        self.assertEqual(self.claim(registrant, own).status_code, 200)

    def test_one_listing_per_account(self):
        self.claim(self.owner)
        second = imported_vendor('Rose Mahal', phone='9123456780')
        self.assertEqual(self.send_code(self.owner, second).json()['reason'], 'has_other_listing')

    def test_ownership_cannot_be_set_through_other_apis(self):
        payload = {'is_claimed': True, 'claimed_by': self.other.id, 'user': self.other.id,
                   'is_verified': True, 'data_sources': {}, 'attributes': {'parking': True}}
        self.claim(self.owner)
        self.as_user(self.owner).patch(f'/api/vendors/{self.hall._id}/profile/', payload, format='json')
        self.as_user(self.owner).post(f'/api/products/update_product/{self.owner.id}/',
                                      {k: str(v) for k, v in payload.items()})
        self.hall.refresh_from_db()
        self.assertEqual((self.hall.claimed_by, self.hall.user, self.hall.is_verified),
                         (self.owner, self.owner, False))


class ClaimRequestTests(ClaimTestCase):

    def submit(self, user, **data):
        payload = {'phone': '9111111111', 'message': 'I own this hall since 2010'} | data
        return self.as_user(user).post(f'/api/vendors/{self.hall._id}/claim/request/', payload)

    def test_request_is_pending_and_does_not_grant_access(self):
        response = self.submit(self.owner)
        self.assertEqual(response.status_code, 201)
        claim = ServiceOwnerClaim.objects.get()
        self.assertEqual((claim.status, claim.method), ('pending', 'admin_review'))
        self.hall.refresh_from_db()
        self.assertFalse(self.hall.is_claimed)
        self.assertEqual(self.as_user(self.owner).get(f'/api/vendors/{self.hall._id}/profile/').status_code, 403)
        state = self.as_user(self.owner).get(f'/api/vendors/{self.hall._id}/claim/').json()
        self.assertEqual((state['claim_pending'], state['listing_status']), (True, 'unclaimed'))
        self.assertEqual(self.events('claim_submitted'), 1)

    def test_duplicate_request_prevented(self):
        self.submit(self.owner)
        self.assertEqual(self.submit(self.owner).status_code, 200)
        self.assertEqual(ServiceOwnerClaim.objects.count(), 1)
        self.assertEqual(self.events('claim_submitted'), 1)

    def test_request_needs_contact_and_explanation(self):
        self.assertEqual(self.submit(self.owner, phone='12').status_code, 400)
        self.assertEqual(self.submit(self.owner, message='hi').status_code, 400)

    def admin_action(self, action, queryset):
        model_admin = admin.site._registry[ServiceOwnerClaim]
        request = RequestFactory().post('/')
        request.user = User.objects.create_user(username=f'staff-{action}', is_staff=True, is_superuser=True)
        with mock.patch.object(model_admin, 'message_user'):
            getattr(model_admin, action)(request, queryset)
        return request.user

    def test_admin_approval(self):
        self.submit(self.owner)
        staff = self.admin_action('approve_claims', ServiceOwnerClaim.objects.all())
        claim = ServiceOwnerClaim.objects.get()
        self.assertEqual((claim.status, claim.reviewed_by), ('approved', staff))
        self.hall.refresh_from_db()
        self.assertEqual((self.hall.is_claimed, self.hall.claimed_by, self.hall.user, self.hall.is_verified),
                         (True, self.owner, self.owner, False))
        self.assertEqual(self.events('claim_approved'), 1)

    def test_admin_rejection(self):
        self.submit(self.owner)
        self.admin_action('reject_claims', ServiceOwnerClaim.objects.all())
        self.assertEqual(ServiceOwnerClaim.objects.get().status, 'rejected')
        self.hall.refresh_from_db()
        self.assertFalse(self.hall.is_claimed)

    def test_admin_cannot_approve_a_second_owner(self):
        self.submit(self.owner)
        self.submit(self.other)
        self.admin_action('approve_claims', ServiceOwnerClaim.objects.all())
        self.assertEqual(ServiceOwnerClaim.objects.filter(status='approved').count(), 1)
        self.assertEqual(ServiceOwnerClaim.objects.filter(status='pending').count(), 1)

    def test_verification_needs_a_claimed_listing(self):
        model_admin = admin.site._registry[Product]
        request = RequestFactory().post('/')
        with mock.patch.object(model_admin, 'message_user'):
            model_admin.mark_verified(request, Product.objects.all())
        self.hall.refresh_from_db()
        self.assertFalse(self.hall.is_verified)
        self.claim(self.owner)
        with mock.patch.object(model_admin, 'message_user'):
            model_admin.mark_verified(request, Product.objects.all())
        self.hall.refresh_from_db()
        self.assertTrue(self.hall.is_verified)
        self.assertEqual(self.client.get(f'/api/products/{self.hall._id}/').json()['listing_status'], 'verified')


class ProfileTests(ClaimTestCase):

    def setUp(self):
        super().setUp()
        self.claim(self.owner)
        self.hall.refresh_from_db()
        self.url = f'/api/vendors/{self.hall._id}/profile/'

    def patch(self, user, attributes):
        return self.as_user(user).patch(self.url, {'attributes': attributes}, format='json')

    def test_claimed_vendor_can_update_category_details(self):
        response = self.patch(self.owner, {'capacity': '600', 'parking': True, 'food_type': 'veg',
                                           'hall_type': 'kalyana_mandapam'})
        self.assertEqual(response.status_code, 200, response.content)
        self.hall.refresh_from_db()
        self.assertEqual(self.hall.attributes, {'capacity': 600, 'parking': True, 'food_type': 'veg',
                                                'hall_type': 'kalyana_mandapam'})
        self.assertEqual(self.hall.data_sources['attributes.capacity']['source'], 'vendor')
        self.assertEqual(response.json()['sources']['attributes.ac'], 'unknown')
        self.assertEqual(self.events('profile_updated'), 1)

    def test_unknown_is_not_stored_as_no(self):
        self.patch(self.owner, {'parking': True, 'ac': None, 'capacity': ''})
        self.hall.refresh_from_db()
        self.assertEqual(self.hall.attributes, {'parking': True})       # no ac=False, no capacity=0
        self.patch(self.owner, {'parking': None})                       # "not sure" removes the answer
        self.hall.refresh_from_db()
        self.assertNotIn('parking', self.hall.attributes)
        self.patch(self.owner, {'ac': False})                           # an explicit No is kept
        self.hall.refresh_from_db()
        self.assertIs(self.hall.attributes['ac'], False)

    def test_unsent_fields_are_left_alone(self):
        Product.objects.filter(pk=self.hall.pk).update(attributes={'capacity': 300, 'rooms': True})
        self.patch(self.owner, {'parking': True})
        self.hall.refresh_from_db()
        self.assertEqual(self.hall.attributes, {'capacity': 300, 'rooms': True, 'parking': True})

    def test_category_specific_fields(self):
        self.assertEqual(self.patch(self.owner, {'shoot_type': 'candid'}).status_code, 400)  # photographer field
        photographer = imported_vendor('Lens Studio', category='Photographers', phone='9123456780')
        photographer_owner = User.objects.create_user(username='p', email='p@example.com')
        self.claim(photographer_owner, photographer)
        url = f'/api/vendors/{photographer._id}/profile/'
        self.client.force_authenticate(photographer_owner)
        form = self.client.get(url).json()
        self.assertEqual([f['key'] for f in form['fields']], ['shoot_type', 'video_included', 'drone'])
        self.assertEqual(self.client.patch(url, {'attributes': {'capacity': 500}}, format='json').status_code, 400)

    def test_category_match_ignores_case(self):
        Product.objects.filter(pk=self.hall.pk).update(category='halls')
        self.assertEqual(self.patch(self.owner, {'parking': True}).status_code, 200)
        self.assertEqual(self.client.get(f'/api/products/{self.hall._id}/').json()['details'][0]['key'], 'parking')

    def test_invalid_values_rejected(self):
        for bad in ({'capacity': 0}, {'capacity': 'many'}, {'capacity': True}, {'parking': 'yes'},
                    {'food_type': 'vegan'}, {'is_claimed': True}):
            self.assertEqual(self.patch(self.owner, bad).status_code, 400, bad)
        self.hall.refresh_from_db()
        self.assertEqual(self.hall.attributes, {})

    def test_other_users_cannot_read_or_edit(self):
        for user in (self.other, None):
            self.client.force_authenticate(user)
            self.assertIn(self.client.get(self.url).status_code, (401, 403))
            self.assertIn(self.client.patch(self.url, {'attributes': {'parking': True}}, format='json').status_code,
                          (401, 403))
        self.hall.refresh_from_db()
        self.assertEqual(self.hall.attributes, {})

    def test_admin_edits_are_marked_as_admin(self):
        staff = User.objects.create_user(username='staff', is_staff=True)
        self.patch(staff, {'parking': True})
        self.hall.refresh_from_db()
        self.assertEqual(self.hall.data_sources['attributes.parking']['source'], 'admin')

    def test_completeness_checklist(self):
        data = self.as_user(self.owner).get(self.url).json()['completeness']
        before = data['percent']
        self.assertIn('details', [item['key'] for item in data['checklist']])
        self.patch(self.owner, {f['key']: v for f, v in zip(vp.fields_for('Halls'),
                                [600, 'banquet_hall', True, True, 'both', False, True, False])})
        after = self.as_user(self.owner).get(self.url).json()['completeness']
        self.assertGreater(after['percent'], before)
        self.assertTrue(next(i for i in after['checklist'] if i['key'] == 'details')['done'])

    def test_manage_page_edits_record_vendor_as_source(self):
        response = self.as_user(self.owner).post(f'/api/products/update_product/{self.owner.id}/', {
            'description': 'A family-run kalyana mandapam in Tambaram with a 600-seat hall and dining.',
            'business_phone': '9876543210'})
        self.assertEqual(response.status_code, 200, response.content)
        self.hall.refresh_from_db()
        self.assertEqual(self.hall.data_sources['description']['source'], 'vendor')
        self.assertNotIn('business_phone', self.hall.data_sources)      # unchanged → still imported
        self.assertEqual(self.events('profile_updated'), 1)

    def test_structured_details_work_with_existing_category_filters(self):
        self.patch(self.owner, {'capacity': 600, 'parking': True, 'food_type': 'veg'})
        imported_vendor('Small Hall', phone='9123456780')   # nothing known about it
        names = lambda **p: [v['name'] for v in self.client.get('/api/products/all', p).json()['products']]
        self.assertEqual(names(category='Halls', hall_capacity=500), ['Lotus Hall'])
        self.assertEqual(names(category='Halls', food_type='veg'), ['Lotus Hall'])


class PublicProfileTests(ClaimTestCase):

    def get(self, vendor=None):
        return self.client.get(f'/api/products/{(vendor or self.hall)._id}/').json()

    def test_status_is_represented_correctly(self):
        self.assertEqual(self.get()['listing_status'], 'unclaimed')
        self.claim(self.owner)
        self.client.force_authenticate(None)
        self.assertEqual(self.get()['listing_status'], 'claimed')

    def test_owner_and_claim_internals_are_not_exposed(self):
        self.claim(self.owner)
        Product.objects.filter(pk=self.hall.pk).update(attributes={'parking': True})
        self.client.force_authenticate(None)
        paths = [f'/api/products/{self.hall._id}/', '/api/products/all', f'/api/products/product/{self.hall._id}/',
                 f'/api/vendors/{self.hall._id}/claim/', '/api/search/?q=lotus']
        for path in paths:
            body = self.client.get(path).content.decode()
            for private in ('personal_phone', '9000011111', 'claimed_by_id', 'data_sources', 'owner@example.com',
                            'listed_phone_otp'):
                self.assertNotIn(private, body, f'{private} in {path}')

    def test_only_known_details_are_shown(self):
        Product.objects.filter(pk=self.hall.pk).update(attributes={'parking': False, 'capacity': 600})
        details = {d['key']: d['display'] for d in self.get()['details']}
        self.assertEqual(details, {'capacity': '600 guests', 'parking': 'No'})   # nothing invented for ac etc.

    def test_claim_state_for_a_visitor(self):
        self.client.force_authenticate(self.other)
        state = self.client.get(f'/api/vendors/{self.hall._id}/claim/').json()
        self.assertEqual((state['blocked'], state['sms_blocked'], state['listed_mobile']),
                         (None, None, '+91 98••••••10'))


class ExistingEditEndpointsAuthorizationTests(TestCase):
    """Writes on another vendor's listing are refused at the API, not just hidden in the UI."""

    def setUp(self):
        from base.models import Service
        self.client = APIClient()
        self.victim_owner = User.objects.create_user(username='victim', email='v@example.com')
        self.victim = Product.objects.create(user=self.victim_owner, name='Victim Hall', personal_phone='1',
                                             is_approved=True, image='hall.jpg')
        self.service = Service.objects.create(product=self.victim, name='Package', price=1000)
        self.attacker = User.objects.create_user(username='attacker', email='a@example.com')
        Product.objects.create(user=self.attacker, name='Attacker Hall', personal_phone='1')
        self.client.force_authenticate(self.attacker)

    def test_cannot_touch_another_vendors_listing(self):
        attempts = [
            ('put', f'/api/products/update_service/{self.service._id}/', {'name': 'Hacked', 'price': 1}),
            ('put', f'/api/products/{self.victim._id}/remove-business-image/', {}),
            ('put', f'/api/products/{self.service._id}/remove-service-image/', {'image': {'_id': 1}}),
            ('post', f'/api/products/{self.service._id}/images/upload/', {}),
            ('post', '/api/products/register-service/', {'_id': str(self.victim._id), 'name': 'Spam'}),
            ('post', f'/api/products/update_product/{self.victim_owner.id}/', {'name': 'Hacked'}),
        ]
        for method, url, data in attempts:
            response = getattr(self.client, method)(url, data, format='json')
            self.assertEqual(response.status_code, 403, f'{method} {url}: {response.status_code}')
        self.victim.refresh_from_db()
        self.service.refresh_from_db()
        self.assertEqual((self.victim.name, str(self.victim.image), self.service.name),
                         ('Victim Hall', 'hall.jpg', 'Package'))
        self.assertEqual(self.victim.services.count(), 1)

    def test_old_unverified_claim_endpoints_are_gone(self):
        for path in ('/api/users/claim/send-otp/', '/api/users/claim/verify-otp/'):
            self.assertIn(self.client.post(path, {'phone': '9111111111', 'product_id': self.victim._id}).status_code,
                          (404, 405))
