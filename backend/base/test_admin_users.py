from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient


class RecentSignupsTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        now = timezone.now()
        self.staff = User.objects.create_user(username='staff', password='x', is_staff=True)
        self.customer = User.objects.create_user(username='customer', password='x')
        self.role_admin = User.objects.create_user(username='roleadmin', password='x')
        self.role_admin.profile.role = 'admin'
        self.role_admin.profile.save()
        self.old = User.objects.create_user(username='olduser', password='x', email='old@example.com')
        User.objects.filter(pk=self.old.pk).update(date_joined=now - timedelta(days=60))
        self.newest = User.objects.create_user(username='newest', password='x', email='new@example.com',
                                               first_name='Priya', last_name='K')
        self.newest.profile.phone = '9876543210'
        self.newest.profile.save()
        User.objects.filter(pk=self.newest.pk).update(date_joined=now + timedelta(seconds=5))

    def get(self, user=None, **params):
        if user:
            self.client.force_authenticate(user)
        return self.client.get('/api/analytics/recent-signups/', params)

    def test_admin_only(self):
        self.assertEqual(self.get().status_code, 401)
        self.assertEqual(self.get(self.customer).status_code, 403)
        self.assertEqual(self.get(self.staff).status_code, 200)
        self.assertEqual(self.get(self.role_admin).status_code, 200)

    def test_newest_first_with_details(self):
        users = self.get(self.staff).json()['users']
        self.assertEqual(users[0]['username'], 'newest')
        self.assertEqual(users[-1]['username'], 'olduser')
        self.assertEqual((users[0]['name'], users[0]['email'], users[0]['role'], users[0]['phone_linked']),
                         ('Priya K', 'new@example.com', 'customer', True))
        joined = [u['date_joined'] for u in users]
        self.assertEqual(joined, sorted(joined, reverse=True))

    def test_counts(self):
        counts = self.get(self.staff).json()['counts']
        self.assertEqual(counts['total'], 5)
        self.assertEqual(counts['last_7_days'], 4)  # olduser joined 60 days ago

    def test_limit_is_bounded(self):
        self.assertEqual(len(self.get(self.staff, limit=2).json()['users']), 2)
        self.assertEqual(len(self.get(self.staff, limit=999).json()['users']), 5)
        self.assertEqual(len(self.get(self.staff, limit='abc').json()['users']), 5)

    def test_phone_numbers_are_never_returned(self):
        body = self.get(self.staff).content.decode()
        self.assertNotIn('9876543210', body)
        self.assertNotIn('"phone"', body)


class AdminUserListTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(username='staff', password='x', is_staff=True)
        self.first = User.objects.create_user(username='first', password='x')
        User.objects.filter(pk=self.first.pk).update(date_joined=timezone.now() - timedelta(days=30))
        self.latest = User.objects.create_user(username='latest', password='x')

    def test_user_list_is_newest_first_with_join_date(self):
        self.client.force_authenticate(self.staff)
        data = self.client.get('/api/users/').json()
        self.assertEqual(data[0]['username'], 'latest')
        self.assertEqual(data[-1]['username'], 'first')
        self.assertIn('date_joined', data[0])

    def test_user_list_still_admin_only(self):
        self.assertEqual(self.client.get('/api/users/').status_code, 401)
        self.client.force_authenticate(self.first)
        self.assertEqual(self.client.get('/api/users/').status_code, 403)
