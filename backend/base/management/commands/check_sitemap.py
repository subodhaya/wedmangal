"""
Fetches the live sitemap.xml and compares its URLs against what should be
there based on the DB — approved products, published blog posts, and
categories with at least one approved listing. Flags anything missing
from the sitemap (or present in the sitemap but not backed by a live
DB record) so stale/incomplete sitemaps are easy to spot.

Usage:
    python manage.py check_sitemap
    python manage.py check_sitemap --url https://www.wedmangal.com/sitemap.xml
"""
import re
import xml.etree.ElementTree as ET

import requests
from django.core.management.base import BaseCommand

from base.models import Product, BlogPost

DEFAULT_SITEMAP_URL = 'https://www.wedmangal.com/sitemap.xml'

PRODUCT_RE  = re.compile(r'/product/(\d+)/?$')
BLOG_RE     = re.compile(r'/blog/([^/]+)/?$')
CATEGORY_RE = re.compile(r'/category/([^/]+)/?$')


class Command(BaseCommand):
    help = 'Fetch the live sitemap.xml and compare its URL count against DB records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--url', default=DEFAULT_SITEMAP_URL,
            help=f'Sitemap URL to fetch (default: {DEFAULT_SITEMAP_URL})'
        )
        parser.add_argument(
            '--show-all', action='store_true',
            help='Print every missing/extra ID instead of truncating to 30'
        )

    def handle(self, *args, **options):
        url = options['url']
        limit = None if options['show_all'] else 30

        self.stdout.write(f'Fetching {url} ...')
        try:
            resp = requests.get(url, timeout=15, headers={'User-Agent': 'WedMangal-SitemapAudit/1.0'})
            resp.raise_for_status()
        except requests.RequestException as e:
            self.stderr.write(self.style.ERROR(f'Failed to fetch sitemap: {e}'))
            return

        locs = self._parse_locs(resp.content)
        if locs is None:
            self.stderr.write(self.style.ERROR('Could not parse response as sitemap XML.'))
            self.stdout.write('--- First 500 chars of response ---')
            self.stdout.write(resp.text[:500])
            return

        self.stdout.write(self.style.SUCCESS(f'Sitemap returned {len(locs)} total <loc> URLs\n'))

        product_ids_in_sitemap, blog_slugs_in_sitemap, category_slugs_in_sitemap, other_urls = \
            self._categorize(locs)

        db_product_ids = set(
            Product.objects.filter(is_approved=True).values_list('_id', flat=True)
        )
        db_blog_slugs = set(
            BlogPost.objects.filter(published=True).values_list('slug', flat=True)
        )
        db_categories = set(
            Product.objects.filter(is_approved=True)
            .exclude(category__isnull=True).exclude(category='')
            .values_list('category', flat=True).distinct()
        )

        self._report('Vendor / product pages', product_ids_in_sitemap, db_product_ids, limit)
        self._report('Blog posts', blog_slugs_in_sitemap, db_blog_slugs, limit)
        self._report('Categories', category_slugs_in_sitemap, db_categories, limit)

        self.stdout.write(self.style.MIGRATE_HEADING('\nOther / static URLs in sitemap'))
        if other_urls:
            for u in sorted(other_urls):
                self.stdout.write(f'  {u}')
        else:
            self.stdout.write('  (none)')

        total_expected = len(db_product_ids) + len(db_blog_slugs) + len(db_categories) + len(other_urls)
        self.stdout.write(self.style.MIGRATE_HEADING('\nSummary'))
        self.stdout.write(f'  Total URLs in live sitemap : {len(locs)}')
        self.stdout.write(f'  Total expected (approx)    : {total_expected}')
        if len(locs) < total_expected:
            self.stdout.write(self.style.ERROR(
                f'  ❌ Sitemap looks incomplete — roughly {total_expected - len(locs)} URLs short'
            ))
        elif len(locs) > total_expected:
            self.stdout.write(self.style.WARNING(
                f'  ⚠️  Sitemap has ~{len(locs) - total_expected} more URLs than expected '
                f'(could be extra static pages, or stale/unapproved entries)'
            ))
        else:
            self.stdout.write(self.style.SUCCESS('  ✅ Counts line up'))

    # ── Helpers ──────────────────────────────────────────────────

    def _parse_locs(self, content):
        try:
            root = ET.fromstring(content)
        except ET.ParseError:
            return None
        ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        locs = [el.text.strip() for el in root.findall('.//sm:loc', ns) if el.text]
        if not locs:
            # fallback in case the file omits the default namespace
            locs = [el.text.strip() for el in root.iter('loc') if el.text]
        return locs

    def _categorize(self, locs):
        product_ids, blog_slugs, category_slugs, other = set(), set(), set(), []
        for loc in locs:
            m = PRODUCT_RE.search(loc)
            if m:
                product_ids.add(int(m.group(1)))
                continue
            m = BLOG_RE.search(loc)
            if m:
                blog_slugs.add(m.group(1))
                continue
            m = CATEGORY_RE.search(loc)
            if m:
                category_slugs.add(m.group(1))
                continue
            other.append(loc)
        return product_ids, blog_slugs, category_slugs, other

    def _report(self, name, in_sitemap, in_db, limit):
        missing = in_db - in_sitemap
        extra = in_sitemap - in_db
        self.stdout.write(self.style.MIGRATE_HEADING(f'\n{name}'))
        self.stdout.write(f'  In sitemap: {len(in_sitemap)}   Expected from DB: {len(in_db)}')
        if missing:
            shown = sorted(missing)[:limit] if limit else sorted(missing)
            suffix = f' ... (+{len(missing) - limit} more)' if limit and len(missing) > limit else ''
            self.stdout.write(self.style.ERROR(f'  ❌ Missing from sitemap ({len(missing)}): {shown}{suffix}'))
        if extra:
            shown = sorted(extra)[:limit] if limit else sorted(extra)
            suffix = f' ... (+{len(extra) - limit} more)' if limit and len(extra) > limit else ''
            self.stdout.write(self.style.WARNING(f'  ⚠️  In sitemap but not approved/published in DB ({len(extra)}): {shown}{suffix}'))
        if not missing and not extra:
            self.stdout.write(self.style.SUCCESS('  ✅ Match'))
