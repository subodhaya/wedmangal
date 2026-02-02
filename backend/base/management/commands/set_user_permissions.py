# backend/base/management/commands/set_user_permissions.py

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Set permissions for users'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str)
        parser.add_argument('role', type=str)

    def handle(self, *args, **options):
        username = options['username']
        role = options['role']
        try:
            user = User.objects.get(username=username)
            if role == 'admin':
                user.is_staff = True
                user.is_superuser = True
            elif role == 'staff':
                user.is_staff = True
                user.is_superuser = False
            else:
                user.is_staff = False
                user.is_superuser = False
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Successfully updated {username} to {role} role.'))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User with username {username} does not exist.'))
