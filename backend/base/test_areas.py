from django.test import TestCase
from rest_framework.test import APIClient

from base import areas, search_intent as si
from base.test_search import vendor


class NeighbourMapTests(TestCase):

    def test_every_supported_area_has_two_way_neighbours(self):
        self.assertEqual(set(areas.CITY_AREAS['Chennai']), set(si.CHENNAI_AREAS))
        self.assertEqual(set(areas.NEIGHBOURS), {a for names in areas.CITY_AREAS.values() for a in names})
        for area, nbs in areas.NEIGHBOURS.items():
            self.assertTrue(nbs, area)
            for other in nbs:
                self.assertIn(area, areas.NEIGHBOURS[other], f'{area} → {other} is one-way')


class AreaSearchTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.home = vendor('Velachery Hall', 'Halls', 'Velachery', 'No 1, Velachery, Chennai 600042')
        self.road = vendor('Road Hall', 'Halls', 'Selaiyur', 'No 4, Velachery Tambaram Main Road, Selaiyur, Chennai')
        self.near = vendor('Madipakkam Hall', 'Halls', 'Madipakkam', 'No 9, Madipakkam, Chennai 600091')
        self.far = vendor('Ambattur Hall', 'Halls', 'Ambattur', 'Ambattur, Chennai 600053')

    def search(self, **params):
        return self.client.get('/api/search/', {'category': 'Halls', 'area': 'Velachery', **params}).json()

    def test_in_area_first_then_labelled_neighbours(self):
        data = self.search()
        self.assertEqual([(r['name'], r['nearby']) for r in data['results']],
                         [('Velachery Hall', False), ('Madipakkam Hall', True)])
        self.assertEqual((data['area_results']['in_area'], data['area_results']['nearby']), (1, 1))
        self.assertIn('Madipakkam', data['area_results']['nearby_areas'])

    def test_road_named_after_the_area_does_not_count(self):
        names = [r['name'] for r in self.search()['results']]
        self.assertNotIn('Road Hall', names)            # "Velachery … Main Road" is in Selaiyur
        self.assertNotIn('Ambattur Hall', names)

    def test_only_area_keeps_the_strict_locality(self):
        data = self.search(only_area='1')
        self.assertEqual([r['name'] for r in data['results']], ['Velachery Hall'])

    def test_home_and_category_lists_use_the_same_matcher(self):
        names = [p['name'] for p in self.client.get('/api/products/all', {'area_name': 'Velachery'}).json()['products']]
        self.assertEqual(names, ['Velachery Hall', 'Madipakkam Hall'])


class CityTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.chennai = vendor('Chennai Hall', 'Halls', 'Velachery', 'No 1, Velachery, Chennai 600042')
        self.blr = vendor('Koramangala Hall', 'Halls', 'Koramangala', '4th Block, Koramangala, Bengaluru 560034')
        self.blr.city = 'Bangalore'
        self.blr.save()
        self.hsr = vendor('HSR Hall', 'Halls', 'HSR Layout', 'Sector 2, HSR Layout, Bengaluru 560102')
        self.hsr.city = 'Bangalore'
        self.hsr.save()

    def names(self, **params):
        return [r['name'] for r in self.client.get('/api/search/', params).json()['results']]

    def test_chennai_is_the_default_and_other_cities_stay_out(self):
        self.assertEqual(self.names(category='Halls'), ['Chennai Hall'])
        self.assertEqual(sorted(self.names(category='Halls', city='Bangalore')), ['HSR Hall', 'Koramangala Hall'])
        self.assertEqual(sorted(self.names(q='wedding hall in bengaluru')), ['HSR Hall', 'Koramangala Hall'])

    def test_an_area_brings_its_city_and_its_nearby_areas(self):
        data = self.client.get('/api/search/', {'category': 'Halls', 'area': 'Koramangala'}).json()
        self.assertEqual(data['applied']['city'], 'Bangalore')
        self.assertEqual([(r['name'], r['nearby']) for r in data['results']],
                         [('Koramangala Hall', False), ('HSR Hall', True)])

    def test_listing_api_follows_the_city(self):
        get = lambda **p: [x['name'] for x in self.client.get('/api/products/all', p).json()['products']]
        self.assertEqual(get(category='Halls'), ['Chennai Hall'])
        self.assertEqual(sorted(get(category='Halls', city='Bangalore')), ['HSR Hall', 'Koramangala Hall'])
        self.assertIn('Koramangala Hall', get(keyword='Koramangala'))      # name lookups search every city
