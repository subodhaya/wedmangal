"""Create live, ownerless WedMangal listings from a `collect_google` JSON file and its downloaded photos.

    python manage.py import_google_listings /root/google/r1.json --photos /root/google/photos [--dry-run]

Re-runnable: a business already listed (same Google place ID, phone or name) is skipped. Only collected
facts are stored (name, category, area, address, phone, website, photo, Google rating line); no services,
hours or reviews are invented. No User is created — the listing can be claimed through the normal flow.
Every field records its source in data_sources (private).
"""
import json
import pathlib

from django.core.files import File
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from base import prospects
from base.models import Product


class Command(BaseCommand):
    help = 'Create live ownerless listings from collect_google output. Skips businesses already listed.'

    def add_arguments(self, parser):
        parser.add_argument('path')
        parser.add_argument('--photos', required=True)
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **o):
        records = json.loads(pathlib.Path(o['path']).read_text())
        photos = pathlib.Path(o['photos'])
        existing = prospects.ProductIndex()
        place_ids = {ds.get('google', {}).get('place_id') for ds in Product.objects.values_list('data_sources', flat=True)
                     if isinstance(ds, dict)}
        names = {n.lower() for n in Product.objects.values_list('name', flat=True) if n}
        now = timezone.now().isoformat(timespec='seconds')
        created, skipped = [], {}

        def skip(why):
            skipped[why] = skipped.get(why, 0) + 1

        with transaction.atomic():
            for r in records:
                phone = prospects.normalize_phone(r.get('phone'))
                photo = photos / r.get('photo_file', '')
                if r['place_id'] in place_ids:
                    skip('already imported'); continue
                if not phone or phone in existing.by_phone:
                    skip('no phone or phone already listed'); continue
                if existing.by_name.get(prospects.compact_name(r['name'])):
                    skip('name already listed'); continue
                if not (r.get('photo_file') and photo.is_file()):
                    skip('photo file missing'); continue
                if not r.get('address'):
                    skip('no address'); continue
                name = r['name']
                if name.lower() in names:
                    name = f"{name} - {r['area']}"
                    if name.lower() in names:
                        skip('name clash'); continue
                src = {'source': 'google_places', 'place_id': r['place_id'], 'url': r.get('maps_url'), 'at': now}
                description = ''
                if r.get('rating') and r.get('review_count'):
                    # Same factual line the existing listings use; vendor_profile.google_rating() reads it.
                    description = f"Rated {r['rating']}★ on Google ({r['review_count']} reviews)."
                product = Product(
                    user=None, name=name, brand=name, category=r['category'], description=description,
                    city='Chennai', area_name=r['area'], address=r['address'], business_phone=phone,
                    personal_phone=phone, website_url=prospects.website_domain(r.get('website') or '') and r.get('website') or None,
                    is_approved=True,
                    data_sources={**{f: src for f in ('name', 'category', 'area_name', 'address', 'business_phone',
                                                      'image', 'description')},
                                  'google': {'place_id': r['place_id'], 'maps_url': r.get('maps_url'),
                                             'types': r.get('types'), 'category_evidence': r.get('category_evidence'),
                                             'photo_attribution': r.get('photo_attribution'), 'collected_at': now}})
                if not o['dry_run']:                 # a dry run must not leave files in media/
                    with photo.open('rb') as fh:
                        product.image.save(f"g_{photo.name}", File(fh), save=False)
                product.save()
                names.add(name.lower())
                place_ids.add(r['place_id'])
                existing.by_phone[phone] = product
                created.append(product._id)
            if o['dry_run']:
                transaction.set_rollback(True)
        self.stdout.write(('DRY RUN (rolled back): ' if o['dry_run'] else '') +
                          f'created={len(created)} skipped={skipped} ids={created[:5]}…')
