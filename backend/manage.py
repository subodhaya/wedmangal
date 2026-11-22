#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def _no_real_messages_in_tests():
    """Tests must never reach Fast2SMS (SMS / WhatsApp) with real keys from .env.

    deploy.sh copies the server .env into its test copy; a test that mocks only one sending step once sent
    real WhatsApp codes to its dummy number (2026-11-22). Every FAST2SMS_* name is set to '' before Django
    starts, so load_dotenv() (which never overrides) leaves them empty. Tests set fake values themselves.
    """
    if len(sys.argv) < 2 or sys.argv[1] != 'test':
        return
    names = {k for k in os.environ if k.startswith('FAST2SMS_')}
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.exists(env_file):
        with open(env_file, encoding='utf-8', errors='ignore') as f:
            for line in f:
                name = line.strip().removeprefix('export ').split('=', 1)[0].strip()
                if name.startswith('FAST2SMS_'):
                    names.add(name)
    for name in names:
        os.environ[name] = ''


def main():
    """Run administrative tasks."""
    _no_real_messages_in_tests()
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
