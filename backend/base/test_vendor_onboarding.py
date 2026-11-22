from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from base.models import Product, Profile
from base.vendor_onboarding import OnboardingError, create_vendor

DETAILS = {'name': 'Rayar Caterers', 'category': 'Caterers', 'city': 'chennai', 'area': 'keelkattalai',
           'business_phone': '+91 98410 11940', 'owner_phone': '', 'owner_email': '', 'owner_name': 'Vijendiran',
           'approve': True}


def phone_account(phone, **extra):
    user = User.objects.create(username=phone, **extra)
    Profile.objects.filter(user=user).update(phone=phone)
    return user


class CreateVendorTests(TestCase):

    def setUp(self):
        self.admin = User.objects.create_superuser('boss', 'boss@example.com', 'pw')

    def test_new_vendor_gets_phone_account_without_password_or_invented_email(self):
        product, owner, how = create_vendor(dict(DETAILS), self.admin)
        self.assertEqual(how, 'new')
        self.assertEqual((owner.username, owner.email, owner.has_usable_password()), ('9841011940', '', False))
        self.assertEqual((owner.profile.phone, owner.profile.role), ('9841011940', 'service-owner'))
        self.assertEqual((product.user, product.claimed_by, product.is_claimed, product.is_approved),
                         (owner, owner, True, True))
        self.assertEqual((product.city, product.area_name, product.business_phone, product.personal_phone),
                         ('Chennai', 'Keelkattalai', '9841011940', '9841011940'))
        self.assertEqual(product.data_sources['_created']['by'], 'boss')

    def test_vendor_who_already_logged_in_by_phone_gets_listing_on_that_account(self):
        theirs = phone_account('9841011940', email='rvijendiran@gmail.com')
        product, owner, how = create_vendor(dict(DETAILS), self.admin)
        self.assertEqual((owner, how), (theirs, 'phone'))
        self.assertEqual(User.objects.count(), 2)          # admin + theirs: no second account
        self.assertEqual(Profile.objects.get(user=theirs).role, 'service-owner')

    def test_found_by_email_gets_the_phone_attached(self):
        theirs = User.objects.create_user('someone', 'Owner@Example.com', 'pw')
        _, owner, how = create_vendor({**DETAILS, 'owner_email': 'owner@example.com'}, self.admin)
        self.assertEqual((owner, how), (theirs, 'email'))
        self.assertEqual(Profile.objects.get(user=theirs).phone, '9841011940')

    def test_phone_and_email_on_different_accounts_is_refused(self):
        phone_account('9841011940')
        User.objects.create_user('other', 'owner@example.com', 'pw')
        with self.assertRaisesMessage(OnboardingError, 'belongs to account'):
            create_vendor({**DETAILS, 'owner_email': 'owner@example.com'}, self.admin)
        self.assertFalse(Product.objects.exists())

    def test_account_that_already_runs_a_listing_is_refused(self):
        owner = phone_account('9841011940')
        Product.objects.create(user=owner, name='Old Business', business_phone='9000000001')
        with self.assertRaisesMessage(OnboardingError, 'already runs listing'):
            create_vendor({**DETAILS, 'business_phone': '9000000002', 'owner_phone': '9841011940'}, self.admin)

    def test_switched_off_account_is_refused(self):
        phone_account('9841011940', is_active=False)
        with self.assertRaisesMessage(OnboardingError, 'switched off'):
            create_vendor(dict(DETAILS), self.admin)

    def test_duplicate_listing_needs_create_anyway(self):
        Product.objects.create(name='Someone Else', business_phone='919841011940')
        with self.assertRaisesMessage(OnboardingError, 'Possible duplicate'):
            create_vendor(dict(DETAILS), self.admin)
        Product.objects.create(name='Rayar Caterers', business_phone='9000000009')
        with self.assertRaisesMessage(OnboardingError, 'Possible duplicate'):     # same name, other phones
            create_vendor({**DETAILS, 'name': 'rayar caterers', 'business_phone': '9000000003',
                           'owner_phone': '9000000004'}, self.admin)
        product, _, _ = create_vendor({**DETAILS, 'name': 'Rayar Catering Two'}, self.admin, allow_duplicate=True)
        self.assertEqual(product.business_phone, '9841011940')

    def test_bad_phone_and_unknown_city_are_refused(self):
        with self.assertRaisesMessage(OnboardingError, 'Business phone'):
            create_vendor({**DETAILS, 'business_phone': '12345'}, self.admin)
        with self.assertRaisesMessage(OnboardingError, 'not one we list'):
            create_vendor({**DETAILS, 'city': 'Mumbai'}, self.admin)
        self.assertFalse(User.objects.exclude(pk=self.admin.pk).exists())

    def test_known_area_gets_its_exact_spelling(self):
        product, _, _ = create_vendor({**DETAILS, 'area': 't. nagar'}, self.admin)
        self.assertEqual(product.area_name, 'T Nagar')

    def test_throwaway_phone_only_account_is_reused_not_duplicated(self):
        throwaway = phone_account('9841011940')            # they once logged in with the phone, nothing else
        _, owner, how = create_vendor(dict(DETAILS), self.admin)
        self.assertEqual((owner, how), (throwaway, 'phone'))


class AddVendorPageTests(TestCase):

    def setUp(self):
        self.admin = User.objects.create_superuser('boss', 'boss@example.com', 'pw')
        self.client.force_login(self.admin)
        self.url = reverse('admin:base_product_add_vendor')

    def test_products_list_links_to_the_page(self):
        self.assertContains(self.client.get(reverse('admin:base_product_changelist')), self.url)

    def test_add_vendor_and_get_whatsapp_reply(self):
        response = self.client.post(self.url, {**DETAILS, 'city': 'Chennai', 'approve': 'on'})
        self.assertEqual(response.status_code, 200)
        product = Product.objects.get(name='Rayar Caterers')
        self.assertContains(response, f'Added: Rayar Caterers (#{product._id})')
        self.assertContains(response, 'log in at https://www.wedmangal.com/login with your phone number 9841011940')

    def test_error_is_shown_and_nothing_saved(self):
        phone_account('9841011940')
        User.objects.create_user('other', 'owner@example.com', 'pw')
        response = self.client.post(self.url, {**DETAILS, 'city': 'Chennai', 'owner_email': 'owner@example.com'})
        self.assertContains(response, 'belongs to account')
        self.assertFalse(Product.objects.exists())

    def test_staff_without_add_permission_cannot_use_it(self):
        clerk = User.objects.create_user('clerk', 'c@example.com', 'pw', is_staff=True)
        self.client.force_login(clerk)
        self.assertEqual(self.client.get(self.url).status_code, 404)
