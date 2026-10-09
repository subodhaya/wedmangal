from django.test import TestCase
from rest_framework.test import APIClient

from base import areas, search_intent as si
from base.test_search import vendor


class NeighbourMapTests(TestCase):

    def test_every_supported_area_has_two_way_neighbours(self):
        self.assertEqual(set(areas.NEIGHBOURS), set(si.CHENNAI_AREAS))
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
