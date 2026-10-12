from unittest import mock

from django.test import SimpleTestCase, TestCase

from base import geo


class FakeReader:
    def __init__(self, records):
        self.records = records

    def get(self, ip):
        return self.records.get(ip)


READER = FakeReader({
    '1.1.1.1': {'country': {'iso_code': 'IN'}, 'city': {'names': {'en': 'Chennai'}}},
    '2.2.2.2': {'country': {'iso_code': 'IN'}, 'city': {'names': {'en': 'Hosur'}},
                'subdivisions': [{'names': {'en': 'Karnataka'}}]},
    '3.3.3.3': {'country': {'iso_code': 'IN'}, 'city': {'names': {'en': 'Mumbai'}},
                'subdivisions': [{'names': {'en': 'Maharashtra'}}]},
    '4.4.4.4': {'country': {'iso_code': 'US'}, 'city': {'names': {'en': 'Hyderabad'}}},
})


class CityGuessTests(SimpleTestCase):

    def test_city_from_ip_city_or_state_only_for_our_cities_in_india(self):
        self.assertEqual(geo.city_for_ip('1.1.1.1', READER), 'Chennai')
        self.assertEqual(geo.city_for_ip('2.2.2.2', READER), 'Bangalore')   # by state
        self.assertIsNone(geo.city_for_ip('3.3.3.3', READER))               # not a city we cover
        self.assertIsNone(geo.city_for_ip('4.4.4.4', READER))               # not India
        self.assertIsNone(geo.city_for_ip('9.9.9.9', READER))               # unknown IP
        self.assertIsNone(geo.city_for_ip(None, READER))

    def test_private_addresses_are_ignored(self):
        request = mock.Mock(META={'HTTP_X_REAL_IP': '10.0.0.5', 'REMOTE_ADDR': '127.0.0.1'})
        self.assertIsNone(geo.client_ip(request))


class CityGuessEndpointTests(TestCase):

    def test_endpoint_answers_without_the_database(self):
        with mock.patch.object(geo, '_reader', return_value=None):
            response = self.client.get('/api/search/city/', HTTP_X_REAL_IP='8.8.8.8')
        self.assertEqual(response.json()['city'], None)
        self.assertEqual(response['Cache-Control'], 'private, no-store')

    def test_endpoint_uses_the_visitor_ip(self):
        with mock.patch.object(geo, '_reader', return_value=FakeReader(
                {'8.8.8.8': {'country': {'iso_code': 'IN'}, 'subdivisions': [{'names': {'en': 'Telangana'}}]}})):
            self.assertEqual(self.client.get('/api/search/city/', HTTP_X_REAL_IP='8.8.8.8').json()['city'], 'Hyderabad')
