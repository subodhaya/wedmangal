from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from base.models import Order, Product, Profile, Wishlist

OWNER_EMAIL = 'Owner@Example.com'
PHONE = '9876543210'


def google_token(email, verified=True):
    return mock.patch('base.views.auth_views.id_token.verify_oauth2_token',
                      return_value={'email': email, 'email_verified': verified, 'name': 'Priya K'})


class IdentityTestCase(TestCase):

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        sms = mock.patch('base.views.user_views._send_otp_fast2sms', return_value=(True, None))  # never a real SMS
        sms.start()
        self.addCleanup(sms.stop)
        # Owner registered by e-mail long ago, with a username that is not the e-mail
        self.owner = User.objects.create_user(username='subodhaya', email=OWNER_EMAIL, password='secret-pw')
        self.listing = Product.objects.create(user=self.owner, name='Lotus Hall', category='Halls',
                                              personal_phone='1', is_approved=True, is_claimed=True,
                                              claimed_by=self.owner)
        Profile.objects.filter(user=self.owner).update(role='service-owner')

    def phone_login(self, phone=PHONE):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/api/users/login/send-otp/', {'phone': phone}).status_code, 200)
        code = cache.get(f'login_otp:{phone}')
        return self.client.post('/api/users/login/verify-otp/', {'phone': phone, 'otp': code})

    def link_phone(self, user, phone=PHONE):
        self.client.force_authenticate(user)
        cache.delete(f'link_otp_rate:{phone}')
        sent = self.client.post('/api/users/profile/phone/send-otp/', {'phone': phone})
        if sent.status_code != 200:
            return sent
        return self.client.post('/api/users/profile/phone/verify-otp/',
                                {'phone': phone, 'otp': cache.get(f'link_otp:{phone}')})

    def can_manage(self, token):
        self.client.force_authenticate(None)
        return self.client.get(f'/api/vendors/{self.listing._id}/profile/',
                               HTTP_AUTHORIZATION=f'Bearer {token}').status_code


class PasswordLoginTests(IdentityTestCase):

    def login(self, identifier, password='secret-pw'):
        return self.client.post('/api/users/login/', {'username': identifier, 'password': password})

    def test_email_works_even_when_username_differs(self):
        for identifier in ('owner@example.com', 'OWNER@EXAMPLE.COM', 'subodhaya'):
            response = self.login(identifier)
            self.assertEqual(response.status_code, 200, identifier)
            self.assertEqual(response.json()['id'], self.owner.id)

    def test_wrong_password_still_fails(self):
        self.assertEqual(self.login('owner@example.com', 'nope').status_code, 401)

    def test_shared_email_logs_into_the_account_whose_password_matches(self):
        other = User.objects.create_user(username='dup', email=OWNER_EMAIL, password='other-pw')
        self.assertEqual(self.login(OWNER_EMAIL, 'other-pw').json()['id'], other.id)
        self.assertEqual(self.login(OWNER_EMAIL, 'secret-pw').json()['id'], self.owner.id)


class GoogleLoginTests(IdentityTestCase):

    def google(self, email, verified=True):
        with google_token(email, verified):
            return self.client.post('/api/auth/google-login/', {'token': 'x'})

    def test_google_opens_the_existing_account_with_that_email(self):
        response = self.google('owner@example.com')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual((data['id'], data['role']), (self.owner.id, 'service-owner'))
        self.assertIn('phone', data)                       # same shape as the other logins
        self.assertEqual(self.can_manage(data['token']), 200)

    def test_unverified_google_email_is_refused(self):
        self.assertEqual(self.google('owner@example.com', verified=False).status_code, 401)

    def test_new_google_user_gets_a_customer_account_without_a_password(self):
        data = self.google('new@gmail.com').json()
        user = User.objects.get(id=data['id'])
        self.assertEqual((user.email, user.profile.role, user.has_usable_password()), ('new@gmail.com', 'customer', False))
        self.assertEqual(self.can_manage(data['token']), 403)

    def test_shared_email_prefers_the_account_that_runs_a_business(self):
        User.objects.create_user(username='newer', email=OWNER_EMAIL, password='x')
        self.assertEqual(self.google(OWNER_EMAIL).json()['id'], self.owner.id)


class PhoneLinkTests(IdentityTestCase):

    def test_phone_login_reaches_the_owner_after_linking_the_phone(self):
        # The bug: an earlier phone login had created a separate empty account for this phone
        stray = self.phone_login().json()
        self.assertNotEqual(stray['id'], self.owner.id)
        self.assertEqual(self.can_manage(stray['token']), 403)
        Wishlist.objects.create(user_id=stray['id'], product=self.listing)

        response = self.link_phone(self.owner)            # owner, logged in by e-mail, adds the phone
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['phone'], PHONE)
        stray_user = User.objects.get(id=stray['id'])
        self.assertFalse(stray_user.is_active)
        self.assertIsNone(stray_user.profile.phone)
        self.assertEqual(Wishlist.objects.get().user, self.owner)   # saved items came along

        data = self.phone_login().json()
        self.assertEqual((data['id'], data['role']), (self.owner.id, 'service-owner'))
        self.assertEqual(self.can_manage(data['token']), 200)

    def test_phone_of_a_real_account_cannot_be_taken(self):
        real = User.objects.create_user(username='real', email='real@example.com', password='x')
        Profile.objects.filter(user=real).update(phone=PHONE)
        self.assertEqual(self.link_phone(self.owner).status_code, 400)
        self.assertEqual(Profile.objects.get(user=real).phone, PHONE)

    def test_phone_account_with_orders_is_not_merged(self):
        stray = self.phone_login().json()
        Order.objects.create(user_id=stray['id'])
        self.assertEqual(self.link_phone(self.owner).status_code, 400)
        self.assertEqual(self.phone_login().json()['id'], stray['id'])

    def test_same_phone_never_grants_a_listing_without_proof(self):
        # Knowing the owner's phone number is not enough: logging in needs the code
        self.client.force_authenticate(None)
        self.client.post('/api/users/login/send-otp/', {'phone': PHONE})
        response = self.client.post('/api/users/login/verify-otp/', {'phone': PHONE, 'otp': '000000'})
        self.assertEqual(response.status_code, 400)


class AccountHygieneTests(IdentityTestCase):

    def test_cannot_register_an_email_that_already_has_an_account(self):
        for path in ('/api/users/register/', '/api/users/owner-register/'):
            response = self.client.post(path, {'name': 'X', 'email': 'OWNER@example.com', 'password': 'pw-123456'})
            self.assertEqual(response.status_code, 400, path)
        self.assertEqual(User.objects.filter(email__iexact=OWNER_EMAIL).count(), 1)

    def test_cannot_take_another_accounts_email_in_profile(self):
        other = User.objects.create_user(username='o', email='o@example.com', password='x')
        self.client.force_authenticate(other)
        response = self.client.put('/api/users/profile/update/', {'name': 'O', 'email': 'owner@example.com'})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.get(pk=other.pk).email, 'o@example.com')
