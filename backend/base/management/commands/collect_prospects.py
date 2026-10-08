"""Collect vendor-prospect research records from Sulekha into a JSON file. Writes NO database rows.

    python manage.py collect_prospects --category Halls --area Tambaram --out pilot/prospects/tambaram-halls.json

Respectful by design:
  * checks robots.txt for our user agent before every fetch and skips anything disallowed;
  * one request every few seconds, identified as WedMangal research; pages cached on disk so re-runs re-fetch nothing;
  * never follows "?" URLs (Sulekha disallows them), never logs in, never solves a CAPTCHA;
  * stores only public business details shown on the business's own listing page.
Nothing is invented: a field the page does not show is left out (phone, rating, attributes…).
Category and area are judged later by base.prospects at import time — this command only records evidence.
"""
import hashlib
import json
import pathlib
import re
import time
import urllib.robotparser
from datetime import datetime, timezone

import requests
from django.core.management.base import BaseCommand, CommandError

from base import prospects

USER_AGENT = 'Mozilla/5.0 (compatible; WedMangal-research/1.0; +https://www.wedmangal.com/contact)'
SITE = 'https://www.sulekha.com'
DELAY = 3.0

# Sulekha listing pages per WedMangal category (existing taxonomy keys).
PAGES = {
    'Halls': ['marriage-halls', 'banquet-halls', 'community-halls'],
    'Photographers': ['wedding-photographers', 'candid-wedding-photographers'],
    'Caterers': ['wedding-catering-services', 'catering-services', 'veg-catering-services'],
    'Decorators': ['mandap-decorators', 'stage-decorators', 'event-decorators'],
    'Makeup_Artist': ['bridal-makeup-artists'],
    'Mehandi_Artist': ['bridal-mehndi-design-services', 'mehndi-design-services'],
    'DJ_Artist': ['djs'],
}
TEMPLATE_DESCRIPTION = re.compile(r'^.{0,120} in (Chennai|[A-Z][\w .]+, Chennai)\.?$')


def area_slug(area):
    return re.sub(r'[^a-z0-9]+', '-', area.lower()).strip('-')


class Fetcher:
    def __init__(self, cache_dir, out):
        self.cache = pathlib.Path(cache_dir)
        self.cache.mkdir(parents=True, exist_ok=True)
        self.robots = urllib.robotparser.RobotFileParser(f'{SITE}/robots.txt')
        self.robots.read()
        self.session = requests.Session()
        self.session.headers['User-Agent'] = USER_AGENT
        self.last = 0.0
        self.out = out

    def get(self, url):
        """→ (status, html, fetched_at). Cached; robots-checked; '?' URLs refused."""
        if '?' in url or not self.robots.can_fetch(USER_AGENT, url):
            return 'disallowed', '', None
        path = self.cache / (hashlib.sha1(url.encode()).hexdigest() + '.json')
        if path.exists():
            data = json.loads(path.read_text())
            return data['status'], data['html'], data['fetched_at']
        wait = DELAY - (time.monotonic() - self.last)
        if wait > 0:
            time.sleep(wait)
        self.last = time.monotonic()
        try:
            r = self.session.get(url, timeout=30, allow_redirects=True)
            status, html = r.status_code, (r.text if r.status_code == 200 else '')
        except requests.RequestException as exc:
            status, html = f'error: {type(exc).__name__}', ''
        fetched_at = datetime.now(timezone.utc).isoformat(timespec='seconds')
        if status == 200 or isinstance(status, int):
            path.write_text(json.dumps({'url': url, 'status': status, 'html': html, 'fetched_at': fetched_at}))
        return status, html, fetched_at


def json_ld(html):
    nodes = []
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html or '', re.S):
        try:
            data = json.loads(block)
        except ValueError:
            continue
        for node in (data.get('@graph') or [data]) if isinstance(data, dict) else data:
            if isinstance(node, dict):
                nodes.append(node)
    return nodes


def listing_items(html):
    for node in json_ld(html):
        if node.get('@type') == 'ItemList':
            return node.get('name', ''), [e.get('item', {}) for e in node.get('itemListElement', [])]
    return '', []


def business_node(html):
    return next((n for n in json_ld(html) if n.get('@type') == 'LocalBusiness' and n.get('address', {}).get('streetAddress')), None)


class Command(BaseCommand):
    help = 'Collect prospect research records from allowed Sulekha pages into JSON. Writes no database rows.'

    def add_arguments(self, parser):
        parser.add_argument('--category', action='append', required=True, choices=sorted(PAGES))
        parser.add_argument('--area', action='append', required=True)
        parser.add_argument('--out', required=True)
        parser.add_argument('--cache', default='../pilot/cache/sulekha')
        parser.add_argument('--limit', type=int, default=0, help='max businesses per category×area (0 = all)')

    def handle(self, *args, **o):
        areas = []
        for a in o['area']:
            match = prospects.AREAS.get(prospects.si._key(a))
            if not match:
                raise CommandError(f'"{a}" is not one of the supported areas')
            areas.append(match)
        fetch = Fetcher(o['cache'], self.stdout)
        by_url = {}
        log = []
        for category in o['category']:
            for area in areas:
                taken = 0
                for slug in PAGES[category]:
                    list_url = f'{SITE}/{slug}/{area_slug(area)}-chennai'
                    status, html, fetched = fetch.get(list_url)
                    title, items = listing_items(html) if status == 200 else ('', [])
                    log.append({'url': list_url, 'status': status, 'items': len(items)})
                    self.stdout.write(f'{category} / {area} / {slug}: {status}, {len(items)} listed')
                    for item in items:
                        if o['limit'] and taken >= o['limit']:
                            break
                        url, name = item.get('url', ''), (item.get('name') or '').strip()
                        if not url.startswith(SITE + '/') or not name:
                            continue
                        rec = by_url.get(url)
                        if rec is None:
                            d_status, d_html, d_fetched = fetch.get(url)
                            node = business_node(d_html) if d_status == 200 else None
                            rec = self.record(name, url, list_url, fetched, d_status, d_fetched, node, category, area)
                            by_url[url] = rec
                            taken += 1
                        self.add_category(rec, category, title, list_url, item)
        records = list(by_url.values())
        out = pathlib.Path(o['out'])
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(records, indent=1, ensure_ascii=False))
        (out.with_suffix('.fetchlog.json')).write_text(json.dumps(log, indent=1))
        self.stdout.write(f'{len(records)} records → {out}')

    @staticmethod
    def record(name, url, list_url, list_fetched, d_status, d_fetched, node, category, area):
        sources = [{'url': list_url, 'name': 'Sulekha (area listing)', 'status': 200, 'fetched_at': list_fetched},
                   {'url': url, 'name': 'Sulekha (business listing)', 'status': d_status, 'fetched_at': d_fetched}]
        rec = {'business_name': name, 'categories': [], 'category_evidence': [], 'city': 'Chennai',
               'source_name': 'Sulekha', 'source_url': list_url, 'source_listing_url': url, 'sources': sources,
               'data_source': 'directory', 'research_category': category, 'research_area': area}
        if node:
            addr = node.get('address', {})
            rec['address'] = (addr.get('streetAddress') or '').strip()
            if re.fullmatch(r'\d{6}', str(addr.get('postalCode') or '')):
                rec['pincode'] = str(addr['postalCode'])
            if node.get('telephone'):
                rec['phone'] = str(node['telephone'])                # validated (and fakes discarded) at import
            rating = node.get('aggregateRating') or {}
            if rating.get('ratingValue') and rating.get('reviewCount'):
                rec['rating'] = float(rating['ratingValue'])
                rec['review_count'] = int(rating['reviewCount'])
                rec['rating_source'] = f'Sulekha ({url})'
        return rec

    @staticmethod
    def add_category(rec, category, title, list_url, item):
        if category not in rec['categories']:
            rec['categories'].append(category)
        evidence = [{'category': category, 'kind': 'directory_label', 'quote': title, 'source_url': list_url}]
        text = (item.get('description') or '').strip()
        business_text = '' if TEMPLATE_DESCRIPTION.match(text) else text    # "X in Chennai" is Sulekha's template
        for e in prospects.category_signals(category, rec['business_name'], business_text):
            e['source_url'] = rec['source_listing_url'] if e['kind'] == 'name' else list_url
            evidence.append(e)
        known = {(e['category'], e['kind'], e['quote']) for e in rec['category_evidence']}
        rec['category_evidence'] += [e for e in evidence if (e['category'], e['kind'], e['quote']) not in known]
