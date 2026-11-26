"""POST /api/users/delete-account/ (base/account_deletion.py)."""
import tempfile
from datetime import timedelta

from allauth.account.models import EmailAddress
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from base.models import (Budget, Order, OrderItem, Product, ProductVideo, QuoteRequest, Review, SearchQuery, Service,
                         ServiceImage, ServiceOwnerClaim, ShippingAddress, VendorEvent, Wishlist)

URL = '/api/users/delete-account/'


class AccountDeletionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('asha@example.com', 'asha@example.com', 'pw12345', first_name='Asha')
        self.user.profile.phone = '9876543210'
        self.user.profile.wedding_date = '2027-01-01'
        self.user.profile.save()
        self.vendor_user = User.objects.create_user('v@example.com', 'v@example.com', 'pw')
        self.vendor_user.profile.role = 'service-owner'
        self.vendor_user.profile.save()
        self.product = Product.objects.create(user=self.vendor_user, name='Hall', category='Halls', is_approved=True,
                                              personal_phone='9000000001', business_phone='9000000002',
                                              address='1 Street', description='Mine')
        self.service = Service.objects.create(product=self.product, name='Main hall', price=10)

    def as_user(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')

    def delete(self, user, **body):
        self.as_user(user)
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(URL, body or {'confirm': 'DELETE'}, format='json')

    def book(self, days):
        order = Order.objects.create(user=self.user, totalPrice=10)
        ShippingAddress.objects.create(order=order, address='5 Home St', city='Chennai')
        OrderItem.objects.create(order=order, user=self.user, service=self.service, product=self.product,
                                 start_date=timezone.localdate() + timedelta(days=days))
        return order

    def test_needs_login_and_confirmation(self):
        self.assertEqual(self.client.post(URL, {'confirm': 'DELETE'}, format='json').status_code, 401)
        self.assertEqual(self.delete(self.user, confirm='yes').status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_staff_admin_and_import_accounts_are_refused(self):
        staff = User.objects.create_user('s', 's@example.com', 'x', is_staff=True)
        admin = User.objects.create_user('a', 'a@example.com', 'x')
        admin.profile.role = 'admin'
        admin.profile.save()
        imported = User.objects.create_user('i', 'x@bookyourcelebrations.com', 'x')
        for user in (staff, admin, imported):
            self.assertEqual(self.delete(user).status_code, 403)
            user.refresh_from_db()
            self.assertTrue(user.is_active)

    def test_erases_the_person_and_keeps_anonymous_bookings(self):
        past, upcoming = self.book(-10), self.book(10)
        Wishlist.objects.create(user=self.user, product=self.product)
        Budget.objects.create(user=self.user)
        EmailAddress.objects.create(user=self.user, email=self.user.email)
        quote = QuoteRequest.objects.create(vendor=self.product, user=self.user, name='Asha', phone='9876543210',
                                            message='call me', session_id='s1')
        review = Review.objects.create(service=self.service, user=self.user, name='Asha', rating=5, comment='Nice')
        VendorEvent.objects.create(event_type='search', user=self.user, session_id='s1')
        SearchQuery.objects.create(user=self.user, source='search', query='asha 9876543210', session_id='s1')

        self.assertEqual(self.delete(self.user).status_code, 200)

        user = User.objects.get(pk=self.user.pk)
        self.assertFalse(user.is_active)
        self.assertFalse(user.has_usable_password())
        self.assertEqual((user.email, user.first_name, user.last_login), ('', 'Deleted user', None))
        self.assertNotIn('asha', user.username)
        self.assertEqual((user.profile.phone, user.profile.wedding_date), (None, None))
        for model in (Wishlist, Budget, EmailAddress):
            self.assertFalse(model.objects.filter(user=user).exists())
        quote.refresh_from_db()
        self.assertEqual((quote.user, quote.name, quote.phone, quote.message, quote.session_id),
                         (None, 'Deleted user', '', '', ''))
        review.refresh_from_db()
        self.assertEqual((review.user, review.name, review.rating, review.comment), (None, 'Deleted user', 5, 'Nice'))
        self.assertFalse(VendorEvent.objects.exclude(session_id='').exists())
        self.assertEqual(SearchQuery.objects.get().query, '')
        past.refresh_from_db(), upcoming.refresh_from_db()
        self.assertFalse(past.isCancelled)
        self.assertTrue(upcoming.isCancelled)
        self.assertEqual(past.shippingaddress.address, '')
        self.assertEqual(OrderItem.objects.filter(user=user).count(), 2)

        # the vendor's pages still work
        self.as_user(self.vendor_user)
        unread = self.client.get('/api/orders/unread/')
        self.assertEqual(unread.status_code, 200)
        self.assertNotIn('Asha', unread.content.decode())
        detail = self.client.get(f'/api/orders/{past._id}/')
        self.assertEqual(detail.status_code, 200)
        self.assertNotIn('asha', detail.content.decode().lower())

    def test_old_tokens_stop_working_and_the_email_and_phone_are_free_again(self):
        refresh = str(RefreshToken.for_user(self.user))
        self.delete(self.user)
        self.assertEqual(self.client.get('/api/users/profile/').status_code, 401)
        self.client.credentials()
        renewed = self.client.post('/api/token/refresh/', {'refresh': refresh}, format='json')
        if renewed.status_code == 200:       # whatever it returns must not open the account
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {renewed.data["access"]}')
            self.assertEqual(self.client.get('/api/users/profile/').status_code, 401)
            self.client.credentials()
        again = self.client.post('/api/users/register/', {'name': 'Asha', 'email': 'asha@example.com',
                                                          'password': 'pw12345'}, format='json')
        self.assertEqual(again.status_code, 200)

    def test_vendors_own_listing_is_hidden_and_erased(self):
        with tempfile.TemporaryDirectory() as folder:
            storage = Product._meta.get_field('image').storage
            with self.settings(MEDIA_ROOT=folder):
                storage.__dict__.pop('base_location', None), storage.__dict__.pop('location', None)
                mine = storage.save('mine.jpg', ContentFile(b'x'))
                shared = storage.save('shared.jpg', ContentFile(b'x'))
                self.product.image = mine
                self.product.save()
                ServiceImage.objects.create(service=self.service, image=shared)
                Product.objects.create(name='Other', image=shared, personal_phone='9')
                ProductVideo.objects.create(product=self.product, video_url='/static/videos/none.mp4')
                self.assertEqual(self.delete(self.vendor_user).status_code, 200)
                self.assertFalse(storage.exists(mine))
                self.assertTrue(storage.exists(shared))     # another listing uses it
            storage.__dict__.pop('base_location', None), storage.__dict__.pop('location', None)
        product = Product.objects.get(pk=self.product.pk)
        self.assertFalse(product.is_approved)
        self.assertEqual((product.user, product.personal_phone, product.business_phone, product.address,
                          product.description), (None, '', None, None, None))
        self.assertEqual(product.name, f'Deleted listing {product._id}')
        self.assertFalse(product.videos.exists() or ServiceImage.objects.filter(service__product=product).exists())
        self.assertTrue(Service.objects.filter(pk=self.service.pk).exists())

    def test_claimed_listing_is_hidden_and_released_but_not_erased(self):
        ServiceOwnerClaim.objects.create(product=self.product, user=self.vendor_user, phone='9', status='approved')
        Product.objects.filter(pk=self.product.pk).update(is_claimed=True, claimed_by=self.vendor_user)
        self.delete(self.vendor_user)
        product = Product.objects.get(pk=self.product.pk)
        self.assertEqual((product.is_approved, product.is_claimed, product.user, product.claimed_by), (False, False, None, None))
        self.assertEqual((product.name, product.business_phone, product.personal_phone), ('Hall', '9000000002', ''))

    def test_claim_on_a_listing_owned_by_someone_else_leaves_it_online(self):
        Product.objects.filter(pk=self.product.pk).update(is_claimed=True, claimed_by=self.user)
        self.delete(self.user)
        product = Product.objects.get(pk=self.product.pk)
        self.assertEqual((product.is_approved, product.user, product.claimed_by, product.name),
                         (True, self.vendor_user, None, 'Hall'))
