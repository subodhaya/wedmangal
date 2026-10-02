from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from base.models import Product, Service


def vendor(name, category, area='', address='', rating=None, reviews=5, approved=True, price=None, **extra):
    desc = extra.pop('description', '')
    if rating is not None and not desc:
        desc = f'{name} is a {category} based in {area}, Chennai. Rated {rating}★ on Google (123 reviews).'
    p = Product.objects.create(name=name, category=category, city='Chennai', area_name=area, address=address,
                               description=desc, business_phone='9111111111', personal_phone='9222222222',
                               is_approved=approved, **extra)
    if rating is not None:
        Service.objects.create(product=p, name='Package', rating=rating, numReviews=reviews, price=price)
    return p


class SearchApiTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.lotus = vendor('Lotus Studio', 'Photographers', 'Anna Nagar', 'Anna Nagar, Chennai', rating=4.8)
        self.pixel = vendor('Pixel Weddings', 'Photographers', 'Adyar', 'Adyar, Chennai', rating=4.2)
        self.unrated = vendor('New Lens', 'Photographers', 'Porur', 'Porur, Chennai')
        self.tambaram_hall = vendor('Sri Mahal', 'Halls', 'Tambaram', 'Tambaram, Chennai', rating=4.6)
        self.address_only = vendor('Royal Mandapam', 'Halls', 'Selaiyur', '12 Main Rd, East Tambaram, Chennai',
                                   rating=4.9)
        self.tnagar = vendor('Kalyan Hall', 'Halls', 'Mambalam', '5 Usman Rd, T. Nagar, Chennai', rating=4.0)
        self.pending = vendor('Hidden Studio', 'Photographers', 'Adyar', rating=5.0, approved=False)

    def search(self, **params):
        response = self.client.get('/api/search/', params)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def names(self, data):
        return [r['name'] for r in data['results']]

    # ── Keyword & category ───────────────────────────────────

    def test_keyword_search_by_vendor_name(self):
        data = self.search(q='lotus')
        self.assertEqual(self.names(data), ['Lotus Studio'])
        self.assertEqual(data['applied']['category'], None)

    def test_category_from_query_text(self):
        data = self.search(q='wedding photographer')
        self.assertEqual(data['applied']['category'], 'Photographers')
        self.assertEqual(set(self.names(data)), {'Lotus Studio', 'Pixel Weddings', 'New Lens'})
        self.assertEqual(data['interpreted']['category_label'], 'Photographers')

    def test_category_param(self):
        data = self.search(category='Halls')
        self.assertEqual(set(self.names(data)), {'Sri Mahal', 'Royal Mandapam', 'Kalyan Hall'})

    def test_explicit_category_overrides_query(self):
        self.assertEqual(self.search(q='photographer', category='Halls')['applied']['category'], 'Halls')

    def test_unapproved_vendors_never_appear(self):
        self.assertNotIn('Hidden Studio', self.names(self.search(category='Photographers')))
        self.assertNotIn('Hidden Studio', self.names(self.search(q='hidden')))

    # ── Location ─────────────────────────────────────────────

    def test_area_filter_uses_area_and_google_address(self):
        data = self.search(q='marriage hall near Tambaram')
        self.assertEqual(data['applied']['area'], 'Tambaram')
        # exact area first, then a vendor whose address is in (East) Tambaram, despite its higher rating
        self.assertEqual(self.names(data), ['Sri Mahal', 'Royal Mandapam'])

    def test_area_with_dots_in_address(self):
        self.assertEqual(self.names(self.search(category='Halls', area='T Nagar')), ['Kalyan Hall'])

    def test_unknown_area_is_reported_not_guessed(self):
        data = self.search(category='Halls', area='Thambaram')
        self.assertIsNone(data['applied']['area'])
        self.assertEqual(data['count'], 3)
        self.assertTrue(any('couldn’t match' in n for n in data['notes']))

    # ── Budget, capacity, rating ─────────────────────────────

    def test_budget_is_understood_but_not_used_to_hide_vendors(self):
        data = self.search(q='photographer in Chennai under 50000')
        self.assertEqual((data['interpreted']['budget_max'], data['interpreted']['city']), (50000, 'Chennai'))
        self.assertEqual(data['count'], 3)
        self.assertTrue(any('under ₹50,000' in n and 'aren’t filtered by price' in n for n in data['notes']))

    def test_capacity_is_understood_and_reported(self):
        data = self.search(q='hall near Tambaram for 600 people around 2 lakh')
        self.assertEqual((data['interpreted']['capacity'], data['interpreted']['budget_max']), (600, 200000))
        notes = ' '.join(data['notes'])
        self.assertIn('600 guests', notes)
        self.assertIn('₹2 lakh', notes)

    def test_rating_filter_uses_google_rating(self):
        self.assertEqual(self.names(self.search(category='Photographers', min_rating='4.5')), ['Lotus Studio'])
        self.assertEqual(len(self.names(self.search(category='Photographers', min_rating='4.0'))), 2)  # unrated excluded

    def test_unrated_services_do_not_count_as_ratings(self):
        Service.objects.create(product=self.unrated, name='Default', rating=1.0, numReviews=0)
        card = next(r for r in self.search(category='Photographers')['results'] if r['name'] == 'New Lens')
        self.assertIsNone(card['rating'])

    def test_combined_filters(self):
        data = self.search(q='hall', area='Tambaram', min_rating='4.5')
        self.assertEqual(self.names(data), ['Sri Mahal', 'Royal Mandapam'])

    # ── Empty results & suggestions ──────────────────────────

    def test_empty_results_offer_honest_suggestions(self):
        data = self.search(category='Photographers', area='Tambaram')
        self.assertEqual(data['count'], 0)
        self.assertIn({'label': 'Show all Photographers in Chennai', 'remove': 'area', 'count': 3}, data['suggestions'])
        self.assertIn({'label': 'Show other vendors in Tambaram', 'remove': 'category', 'count': 2},
                      data['suggestions'])

    def test_no_suggestions_when_nothing_to_relax(self):
        data = self.search(q='zzzz')
        self.assertEqual((data['count'], data['suggestions']), (0, []))

    # ── Sorting & paging ─────────────────────────────────────

    def test_sort_by_rating(self):
        self.assertEqual(self.names(self.search(category='Photographers', sort='rating')),
                         ['Lotus Studio', 'Pixel Weddings', 'New Lens'])  # unrated last

    def test_sort_newest(self):
        Product.objects.filter(pk=self.pixel.pk).update(createdAt=timezone.now() + timedelta(hours=1))
        self.assertEqual(self.names(self.search(category='Photographers', sort='newest'))[0], 'Pixel Weddings')

    def test_relevance_puts_name_matches_first(self):
        self.assertEqual(self.names(self.search(q='pixel photographer'))[0], 'Pixel Weddings')

    def test_pagination(self):
        for i in range(14):
            vendor(f'Extra Studio {i}', 'Photographers', 'Adyar', rating=4.0)
        page1, page2 = self.search(category='Photographers'), self.search(category='Photographers', page=2)
        self.assertEqual((page1['count'], page1['pages'], len(page1['results']), len(page2['results'])), (17, 2, 12, 5))

    def test_bad_parameters_fall_back_safely(self):
        data = self.search(sort='drop table', min_rating='3.7', page='abc', category='Nope')
        self.assertEqual((data['applied']['sort'], data['applied']['min_rating'], data['page']), ('relevance', None, 1))
        self.assertIsNone(data['applied']['category'])

    # ── Result cards & privacy ───────────────────────────────

    def test_cards_never_expose_personal_phone(self):
        body = self.client.get('/api/search/', {'category': 'Photographers'}).content.decode()
        self.assertNotIn('personal_phone', body)
        self.assertNotIn('9222222222', body)
        self.assertIn('9111111111', body)  # public business contact

    def test_card_shows_google_rating_and_real_prices_only(self):
        card = next(r for r in self.search(q='lotus')['results'])
        self.assertEqual((card['rating'], card['google_reviews'], card['price_from']), (4.8, 123, None))
        priced = vendor('Priced Studio', 'Photographers', 'Adyar', rating=4.1, price=40000)
        card = next(r for r in self.search(q='priced')['results'] if r['_id'] == priced._id)
        self.assertEqual(card['price_from'], 40000.0)

    def test_phone_numbers_in_query_are_redacted(self):
        self.assertEqual(self.search(q='photographer 9876543210')['query'], 'photographer [phone]')
