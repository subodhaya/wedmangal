"""Guess which of our cities a visitor is in, from their IP address — a hint only, never stored.

Uses the free DB-IP "IP to City Lite" database (CC BY 4.0; credit "IP Geolocation by DB-IP" is shown in
the city picker), read locally with `maxminddb` — the visitor's IP is never sent to anyone. The file lives
at $GEOIP_CITY_DB in backend/.env (default backend/geo/dbip-city-lite.mmdb). Missing file or package → no guess,
and the site simply asks the visitor.
"""
import ipaddress
import logging
import os
from functools import lru_cache
from pathlib import Path

from django.conf import settings

log = logging.getLogger(__name__)

# State (subdivision) → our city. Whole-state matching on purpose: a visitor elsewhere in Tamil Nadu is
# still most likely planning around Chennai.
STATE_CITY = {'tamil nadu': 'Chennai', 'puducherry': 'Chennai', 'karnataka': 'Bangalore',
              'telangana': 'Hyderabad'}
CITY_WORDS = {'chennai': 'Chennai', 'bengaluru': 'Bangalore', 'bangalore': 'Bangalore', 'hyderabad': 'Hyderabad',
              'secunderabad': 'Hyderabad'}


def db_path():
    configured = os.environ.get('GEOIP_CITY_DB') or getattr(settings, 'GEOIP_CITY_DB', None)
    return Path(configured or Path(settings.BASE_DIR) / 'geo' / 'dbip-city-lite.mmdb')


@lru_cache(maxsize=1)
def _reader():
    try:
        import maxminddb
        return maxminddb.open_database(str(db_path()))
    except Exception as exc:          # no package / no file → no guesses, never an error page
        log.info('IP city lookup unavailable: %s', exc)
        return None


def client_ip(request):
    """nginx sets X-Real-IP to the visitor's address."""
    for value in (request.META.get('HTTP_X_REAL_IP'), request.META.get('REMOTE_ADDR')):
        try:
            ip = ipaddress.ip_address((value or '').strip())
        except ValueError:
            continue
        if ip.is_global:
            return str(ip)
    return None


def city_for_ip(ip, reader=None):
    reader = reader or _reader()
    if not (ip and reader):
        return None
    try:
        record = reader.get(ip) or {}
    except ValueError:
        return None
    if (record.get('country') or {}).get('iso_code') != 'IN':
        return None
    city = ((record.get('city') or {}).get('names') or {}).get('en', '').lower()
    city = city.split('(')[0].strip()             # "Hyderabad (NBT Nagar)" → "hyderabad"
    if city in CITY_WORDS:
        return CITY_WORDS[city]
    for sub in record.get('subdivisions') or []:
        state = ((sub.get('names') or {}).get('en') or '').lower()
        if state in STATE_CITY:
            return STATE_CITY[state]
    return None
