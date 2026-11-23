"""Admin "register a vendor for a client" (base/views/client_vendor_views.py)."""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from base.models import Product, Service

LOOKUP = '/api/products/admin/client-account/'
REGISTER = '/api/products/admin/register-for-client/'


class RegisterForClientTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='boss', password='x', is_staff=True)
        self.client.force_authenticate(self.admin)

    def phone_user(self, phone='9876543210'):
        """An account made by a past phone-OTP login (as login_verify_otp does)."""
        u = User.objects.create(username=phone)
        u.set_unusable_password()
        u.save()
        u.profile.phone = phone
        u.profile.role = 'customer'
        u.profile.save()
        return u

    def email_user(self, email='client@example.com'):
        u = User.objects.create_user(username=email, email=email, password='secret1', first_name='Asha')
        u.profile.role = 'customer'
        u.profile.save()
        return u

    def register(self, **client):
        data = {'name': 'Asha Bridal Studio', 'category': 'Makeup_Artist', 'city': 'Chennai',
                'business_phone': '9876543210',
                'services[0][name]': 'Bridal makeup', 'services[0][price]': '15000', **client}
        return self.client.post(REGISTER, data, format='multipart')

    # ── permissions ──────────────────────────────────────────

    def test_non_admin_is_refused(self):
        self.client.force_authenticate(self.email_user())
        self.assertEqual(self.client.get(LOOKUP, {'phone': '9876543210'}).status_code, 403)
        self.assertEqual(self.register(client_phone='9876543210').status_code, 403)
        self.assertFalse(Product.objects.exists())

    # ── existing accounts ────────────────────────────────────

    def test_business_goes_to_existing_phone_login_account(self):
        u = self.phone_user()
        look = self.client.get(LOOKUP, {'phone': '+91 98765 43210'}).json()
        self.assertTrue(look['found'])
        self.assertEqual(look['account']['id'], u.id)

        r = self.register(client_phone='98765 43210', client_name='Asha')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertFalse(r.json()['created_account'])
        self.assertEqual(r.json()['account']['business']['name'], 'Asha Bridal Studio')
        product = Product.objects.get(name='Asha Bridal Studio')
        self.assertEqual(product.user_id, u.id)
        self.assertFalse(product.is_approved)
        self.assertTrue(Service.objects.filter(product=product, name='Bridal makeup').exists())
        u.refresh_from_db()
        self.assertEqual(u.profile.role, 'service-owner')
        self.assertEqual(u.first_name, 'Asha')
        self.assertEqual(User.objects.count(), 2)          # no new account

    def test_business_goes_to_existing_email_account(self):
        u = self.email_user()
        r = self.register(client_email='CLIENT@example.com')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(Product.objects.get().user_id, u.id)
        u.refresh_from_db()
        self.assertTrue(u.check_password('secret1'))       # their password is untouched

    def test_phone_and_email_on_different_accounts_is_refused(self):
        self.phone_user()
        self.email_user()
        r = self.register(client_phone='9876543210', client_email='client@example.com')
        self.assertEqual(r.status_code, 409)
        self.assertIn('conflict', r.json())
        self.assertFalse(Product.objects.exists())

    def test_does_not_attach_new_email_to_existing_phone_account(self):
        u = self.phone_user()
        r = self.register(client_phone='9876543210', client_email='someone@example.com')
        self.assertEqual(r.status_code, 201, r.content)
        u.refresh_from_db()
        self.assertEqual(u.email, '')                       # joining needs proof

    def test_account_that_already_has_a_business_is_refused(self):
        u = self.phone_user()
        Product.objects.create(user=u, name='Old Studio')
        r = self.register(client_phone='9876543210')
        self.assertEqual(r.status_code, 400)
        self.assertIn('already has a business', r.json()['detail'])

    def test_admin_account_is_refused(self):
        self.admin.email = 'boss@example.com'
        self.admin.save()
        r = self.register(client_email='boss@example.com')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(Product.objects.exists())

    # ── new accounts ─────────────────────────────────────────

    def test_new_account_from_phone_logs_in_by_phone(self):
        r = self.register(client_phone='9123456780', client_name='Ravi')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()['created_account'])
        u = Product.objects.get().user
        self.assertEqual(u.profile.phone, '9123456780')
        self.assertEqual(u.profile.role, 'service-owner')
        self.assertFalse(u.has_usable_password())

    def test_new_account_with_email_and_temp_password(self):
        r = self.register(client_email='new@example.com', client_password='Wed@1234')
        self.assertEqual(r.status_code, 201, r.content)
        u = Product.objects.get().user
        self.assertEqual(u.email, 'new@example.com')
        self.assertTrue(u.check_password('Wed@1234'))

    def test_new_email_only_account_needs_a_password(self):
        r = self.register(client_email='new@example.com')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(email='new@example.com').exists())

    def test_failed_business_rolls_back_the_new_account(self):
        Product.objects.create(name='Asha Bridal Studio')   # name already taken
        r = self.register(client_phone='9123456780')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(username='9123456780').exists())

    def test_failed_business_keeps_existing_customer_role(self):
        u = self.phone_user()
        Product.objects.create(name='Asha Bridal Studio')
        self.assertEqual(self.register(client_phone='9876543210').status_code, 400)
        u.refresh_from_db()
        self.assertEqual(u.profile.role, 'customer')

    # ── services added afterwards ────────────────────────────

    def test_admin_can_add_service_to_client_business(self):
        self.register(client_phone='9123456780')
        product = Product.objects.get()
        r = self.client.post('/api/products/add_service/',
                             {'name': 'Party makeup', 'price': '3000', 'product_id': product._id},
                             format='multipart')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(Service.objects.filter(product=product, name='Party makeup').exists())

    def test_non_admin_product_id_is_ignored(self):
        owner = self.email_user('owner@example.com')
        own = Product.objects.create(user=owner, name='Own')
        other = Product.objects.create(name='Someone else')
        self.client.force_authenticate(owner)
        r = self.client.post('/api/products/add_service/',
                             {'name': 'X', 'price': '1', 'product_id': other._id}, format='multipart')
        self.assertEqual(r.status_code, 201)
        self.assertTrue(Service.objects.filter(product=own, name='X').exists())
        self.assertFalse(Service.objects.filter(product=other).exists())
