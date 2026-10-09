"""Collect vendors from Google Places (API "New") into a JSON file + downloaded photos. Writes NO database rows.

    python manage.py collect_google --area Tambaram --category Halls --out ../pilot/google/tambaram-halls.json

Per area × category: run the category's text searches ("marriage hall Tambaram Chennai", …) until `--per` (10)
businesses pass, else record "target not reached" and move on. A business passes only if it is operational,
has a real phone, at least one photo, an address that names the area, category evidence (its name or its
Google type), and is not already a WedMangal listing. One photo is downloaded per business, with its author
attribution kept. Nothing is invented. Key: GOOGLE_PLACES_API_KEY in backend/.env (never logged).
"""
import json
import os
import pathlib
import re
import time

import requests
from django.core.management.base import BaseCommand, CommandError

from base import prospects
from base.models import Product

SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
FIELDS = ','.join(f'places.{f}' for f in (
    'id', 'displayName', 'formattedAddress', 'nationalPhoneNumber', 'internationalPhoneNumber', 'photos',
    'businessStatus', 'types', 'primaryType', 'googleMapsUri', 'websiteUri', 'rating', 'userRatingCount'))

QUERIES = {
    'Halls': ['marriage hall in {area} Chennai', 'kalyana mandapam in {area} Chennai', 'banquet hall in {area} Chennai'],
    'Photographers': ['wedding photographer in {area} Chennai', 'candid wedding photography {area} Chennai'],
    'Caterers': ['wedding caterers in {area} Chennai', 'catering service in {area} Chennai'],
    'Decorators': ['wedding decorators in {area} Chennai', 'stage decoration in {area} Chennai'],
    'Makeup_Artist': ['bridal makeup artist in {area} Chennai', 'bridal makeup studio {area} Chennai'],
    'Mehandi_Artist': ['bridal mehndi artist in {area} Chennai', 'mehendi artist {area} Chennai'],
    'DJ_Artist': ['wedding DJ in {area} Chennai', 'DJ services {area} Chennai'],
}
# Google business types that are themselves category evidence.
GOOGLE_TYPES = {
    'Halls': {'wedding_venue', 'banquet_hall', 'event_venue', 'convention_center'},
    'Photographers': {'photographer'},
    'Caterers': {'catering_service', 'caterer'},
    'Decorators': set(),
    'Makeup_Artist': {'makeup_artist'},
    'Mehandi_Artist': set(),
    'DJ_Artist': {'dj'},
}
DELAY = 0.5


class Command(BaseCommand):
    help = 'Collect vendors with phone, photo and address from Google Places into JSON. Writes no database rows.'

    def add_arguments(self, parser):
        parser.add_argument('--area', action='append', required=True)
        parser.add_argument('--category', action='append', required=True, choices=sorted(QUERIES))
        parser.add_argument('--per', type=int, default=10)
        parser.add_argument('--out', required=True)
        parser.add_argument('--photos', default='../pilot/google/photos')

    def handle(self, *args, **o):
        self.key = os.environ.get('GOOGLE_PLACES_API_KEY', '').strip()
        if not self.key:
            raise CommandError('GOOGLE_PLACES_API_KEY is not set in backend/.env')
        areas = []
        for a in o['area']:
            match = prospects.AREAS.get(prospects.si._key(a))
            if not match:
                raise CommandError(f'"{a}" is not one of the supported areas')
            areas.append(match)
        self.photo_dir = pathlib.Path(o['photos'])
        self.photo_dir.mkdir(parents=True, exist_ok=True)
        self.calls = {'search': 0, 'photo': 0}
        existing = prospects.ProductIndex()
        taken_phones = set(existing.by_phone)
        out_path = pathlib.Path(o['out'])
        out_path.parent.mkdir(parents=True, exist_ok=True)
        records, summary = [], []
        seen_ids = set()
        for category in o['category']:
            for area in areas:
                got, rejected = [], {}
                for q in QUERIES[category]:
                    if len(got) >= o['per']:
                        break
                    for place in self.search(q.format(area=area)):
                        if len(got) >= o['per']:
                            break
                        if place.get('id') in seen_ids:
                            continue
                        rec, why = self.evaluate(place, category, area, existing, taken_phones)
                        if rec is None:
                            rejected[why] = rejected.get(why, 0) + 1
                            continue
                        if not self.download_photo(rec):
                            rejected['photo download failed'] = rejected.get('photo download failed', 0) + 1
                            continue
                        seen_ids.add(place['id'])
                        taken_phones.add(rec['phone'])
                        got.append(rec)
                records += got
                status = 'ok' if len(got) >= o['per'] else 'target not reached'
                summary.append({'area': area, 'category': category, 'found': len(got), 'status': status,
                                'rejected': rejected})
                self.stdout.write(f'{category} / {area}: {len(got)} ({status}) rejected={rejected}')
                out_path.write_text(json.dumps(records, indent=1, ensure_ascii=False))
        out_path.with_suffix('.summary.json').write_text(json.dumps(
            {'calls': self.calls, 'combos': summary}, indent=1, ensure_ascii=False))
        self.stdout.write(f'{len(records)} records → {out_path}; API calls {self.calls}')

    def search(self, text):
        time.sleep(DELAY)
        self.calls['search'] += 1
        r = requests.post(SEARCH_URL, timeout=30, json={'textQuery': text, 'regionCode': 'IN', 'languageCode': 'en'},
                          headers={'X-Goog-Api-Key': self.key, 'X-Goog-FieldMask': FIELDS})
        if r.status_code != 200:
            raise CommandError(f'Places search failed ({r.status_code}): {r.text[:300]}')
        return r.json().get('places', [])

    def evaluate(self, place, category, area, existing, taken_phones):
        name = (place.get('displayName') or {}).get('text', '').strip()
        if place.get('businessStatus') not in (None, 'OPERATIONAL'):
            return None, 'not operational'
        phone = prospects.normalize_phone(place.get('nationalPhoneNumber') or place.get('internationalPhoneNumber'))
        if not phone:
            return None, 'no phone'
        if not place.get('photos'):
            return None, 'no photo'
        address = place.get('formattedAddress', '')
        biz_area, status, _ = prospects.check_area(address, area)
        if status != 'located_in' or biz_area != area:
            return None, 'address not in area'
        types = set(place.get('types') or [])
        name_ok = bool(re.search(prospects.CATEGORY_WORDS[category], name, re.I))
        type_ok = bool(types & GOOGLE_TYPES[category])
        if not (name_ok or type_ok):
            return None, 'category not evident'
        bad = prospects.NOT_CATEGORY.get(category)
        if bad and re.search(bad, name, re.I) and not type_ok:
            return None, 'looks like another kind of business'
        if phone in taken_phones:
            return None, 'already listed (phone)'
        for pr in existing.by_name.get(prospects.compact_name(name), []):
            return None, f'already listed (name, #{pr._id})'
        photo = place['photos'][0]
        return {
            'name': name, 'category': category, 'area': area, 'address': address, 'phone': phone,
            'website': place.get('websiteUri', ''), 'place_id': place['id'], 'maps_url': place.get('googleMapsUri', ''),
            'rating': place.get('rating'), 'review_count': place.get('userRatingCount'), 'types': sorted(types),
            'category_evidence': 'name' if name_ok else f'google type {sorted(types & GOOGLE_TYPES[category])}',
            'photo_name': photo.get('name'), 'photo_attribution': [
                {'name': a.get('displayName'), 'uri': a.get('uri')} for a in photo.get('authorAttributions') or []],
        }, None

    def download_photo(self, rec):
        time.sleep(DELAY)
        self.calls['photo'] += 1
        r = requests.get(f"https://places.googleapis.com/v1/{rec['photo_name']}/media",
                         params={'maxWidthPx': 1000, 'key': self.key}, timeout=30)
        if r.status_code != 200 or not r.headers.get('content-type', '').startswith('image/'):
            return False
        ext = '.png' if 'png' in r.headers['content-type'] else '.jpg'
        path = self.photo_dir / (re.sub(r'[^A-Za-z0-9_-]', '_', rec['place_id']) + ext)
        path.write_bytes(r.content)
        rec['photo_file'] = path.name
        return True
