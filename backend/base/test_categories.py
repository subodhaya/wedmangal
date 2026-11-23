from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from base.models import Product


class NewCategoryTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user('vendor', 'v@example.com', 'pw')
        self.client.force_authenticate(self.owner)

    def register(self, **data):
        base = {'name': 'Sweet Cakes', 'city': 'Chennai', 'business_phone': '9444444444',
                'personal_phone': '9555555555'}
        return self.client.post('/api/products/register-product/', {**base, **data})

    def test_other_needs_their_own_words(self):
        response = self.register(category='Other')
        self.assertEqual(response.status_code, 400)
        self.assertIn('custom_category', response.data)
        self.assertFalse(Product.objects.exists())

    def test_other_with_their_words_is_saved(self):
        response = self.register(category='Other', custom_category='  Wedding   cakes ')
        self.assertLess(response.status_code, 300, response.data)
        self.assertEqual(Product.objects.get().custom_category, 'Wedding cakes')

    def test_return_gifts_and_switching_away_from_other_clears_the_words(self):
        product = Product.objects.create(user=self.owner, name='Gift Bags', category='Other',
                                         custom_category='Thamboolam bags', personal_phone='9555555555')
        response = self.client.post(f'/api/products/update_product/{self.owner.id}/', {'category': 'Return_Gifts'})
        self.assertEqual(response.status_code, 200, response.data)
        product.refresh_from_db()
        self.assertEqual((product.category, product.custom_category), ('Return_Gifts', None))

    def test_vendor_page_and_search_use_their_words(self):
        product = Product.objects.create(name='Sweet Cakes', category='Other', custom_category='Wedding cakes',
                                         city='Chennai', area_name='Adyar', is_approved=True,
                                         personal_phone='9555555555')
        html = self.client.get(f'/product/{product._id}').content.decode()
        self.assertIn('Sweet Cakes | Wedding cakes in Adyar, Chennai | WedMangal', html)
        found = self.client.get('/api/search/', {'q': 'cakes'}).json()
        card = next(r for r in found['results'] if r['_id'] == product._id)
        self.assertEqual(card['category_label'], 'Wedding cakes')

    def test_return_gifts_category_page_and_search_words(self):
        Product.objects.create(name='Gift Bags', category='Return_Gifts', city='Chennai', is_approved=True,
                               personal_phone='9555555555')
        self.assertContains(self.client.get('/category/Return_Gifts'), 'Wedding Return Gifts in Chennai')
        found = self.client.get('/api/search/', {'q': 'return gifts'}).json()
        self.assertEqual(found['applied']['category'], 'Return_Gifts')
