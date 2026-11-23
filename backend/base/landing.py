"""Search landing pages: what couples type into Google, mapped to real listings.

    /chennai                              wedding vendors in a city (hub: every category, busiest areas)
    /bangalore/wedding-photographers      a category in a city (Chennai's is /category/<X>, which already exists)
    /chennai/wedding-halls/velachery      a category in an area — only where enough vendors are really there

A page exists only when it has real listings behind it (MIN_AREA_VENDORS), so Google never sees thin or
empty pages; the sitemap and the internal links use the same rule.
"""
from collections import Counter, defaultdict

from django.utils.text import slugify

from base import areas
from base.models import Product

MIN_AREA_VENDORS = 3

# URL slug → (Product.category, what people search for)
CATEGORIES = {
    'wedding-halls':               ('Halls', 'Wedding Halls'),
    'wedding-photographers':       ('Photographers', 'Wedding Photographers'),
    'bridal-makeup-artists':       ('Makeup_Artist', 'Bridal Makeup Artists'),
    'wedding-caterers':            ('Caterers', 'Wedding Caterers'),
    'wedding-decorators':          ('Decorators', 'Wedding Decorators'),
    'mehendi-artists':             ('Mehandi_Artist', 'Mehendi Artists'),
    'wedding-djs':                 ('DJ_Artist', 'Wedding DJs'),
    'wedding-planners':            ('Planners', 'Wedding Planners'),
    'bridal-jewellery':            ('Jewellery', 'Bridal Jewellery'),
    'wedding-invitations':         ('Invitation', 'Wedding Invitations'),
    'wedding-music-entertainment': ('Entertainment', 'Wedding Music & Entertainment'),
    'wedding-cars-travel':         ('Travel_Transport', 'Wedding Cars & Travel'),
    'wedding-pandits':             ('Pandit', 'Wedding Pandits'),
}
SLUG_OF = {key: slug for slug, (key, _) in CATEGORIES.items()}
CITY_SLUGS = {slugify(c): c for c in areas.CITIES}           # chennai, bangalore, hyderabad


def city_slug(city):
    return slugify(city)


def area_slug(area):
    return slugify(area)


def area_from_slug(city, slug):
    return next((a for a in areas.CITY_AREAS.get(city, []) if slugify(a) == slug), None)


def category_url(city, key):
    if city == 'Chennai':
        return f'/category/{key}'           # the existing Chennai category page
    return f'/{city_slug(city)}/{SLUG_OF[key]}'


def area_url(city, key, area):
    return f'/{city_slug(city)}/{SLUG_OF[key]}/{area_slug(area)}'


def city_vendors(city):
    return Product.objects.filter(areas.city_q(city), is_approved=True)


def _category_key(value):
    value = (value or '').strip().lower()
    return next((key for key in SLUG_OF if key.lower() == value), None)


def city_summary(city):
    """{category key: count} and {category key: Counter(area → count)} for the approved vendors of a city.
    Areas are the vendor's stored area, normalised to the supported spelling; unknown areas are skipped."""
    per_category, per_area = Counter(), defaultdict(Counter)
    for category, area in city_vendors(city).values_list('category', 'area_name'):
        key = _category_key(category)
        if not key:
            continue
        per_category[key] += 1
        name = areas.canonical(area or '')
        if name and areas.AREA_CITY.get(name) == city:
            per_area[key][name] += 1
    return per_category, per_area


def area_pages(city, summary=None):
    """[(key, area, count)] for every category × area page that has enough vendors, busiest first."""
    _, per_area = summary or city_summary(city)
    pages = [(key, area, n) for key, counter in per_area.items() for area, n in counter.items()
             if n >= MIN_AREA_VENDORS]
    return sorted(pages, key=lambda p: (-p[2], p[0], p[1]))


def all_pages():
    """Every landing page URL (for the sitemap)."""
    urls = []
    for city in areas.CITIES:
        summary = city_summary(city)
        if not summary[0]:
            continue
        urls.append(f'/{city_slug(city)}')
        if city != 'Chennai':
            urls += [category_url(city, key) for key in summary[0]]
        urls += [area_url(city, key, area) for key, area, _ in area_pages(city, summary)]
    return urls
