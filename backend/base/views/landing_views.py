"""Server-rendered landing pages for Google searches (see base/landing.py for the URL scheme).

These are plain Django pages, not the React app: what Google reads is exactly what the visitor sees,
and they load fast. Every vendor link goes to the normal React vendor page.
"""
import json
from urllib.parse import urlencode

from django.http import Http404, HttpResponsePermanentRedirect
from django.shortcuts import render

from base import areas, landing
from base.models import Product
from base.views.seo_views import GOOGLE_RATING_RE, SITE, _breadcrumbs, _truncate

WHATSAPP_NUMBER = '917200152906'          # WedMangal's WhatsApp (Contact Us page)


def _ld(data):
    text = json.dumps(data, ensure_ascii=False)
    return text.replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')


def _city_or_404(slug):
    city = landing.CITY_SLUGS.get(slug)
    if not city:
        raise Http404
    return city


def _category_or_404(slug):
    if slug not in landing.CATEGORIES:
        raise Http404
    return landing.CATEGORIES[slug]


def _card(p):
    rating = GOOGLE_RATING_RE.search(p.description or '')
    image = p.image.name if p.image else ''
    return {
        'id': p._id, 'name': (p.name or '').strip() or 'Vendor',
        'area': areas.canonical(p.area_name or '') or (p.area_name or '').strip(),
        'rating': rating.group(1) if rating else None,
        'reviews': int(rating.group(2)) if rating else None,
        'image': p.image.url if image and 'placeholder' not in image else None,
        'price': p.min_price,
    }


def _item_list(name, url, cards):
    return {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': name, 'url': url,
            'mainEntity': {'@type': 'ItemList', 'numberOfItems': len(cards), 'itemListElement': [
                {'@type': 'ListItem', 'position': i, 'url': f'{SITE}/product/{c["id"]}', 'name': c['name']}
                for i, c in enumerate(cards, start=1)]}}


def _ranked(qs):
    """Claimed and photographed listings first, then newest."""
    return qs.order_by('-is_claimed', '-createdAt')


def _page(request, template, *, title, description, canonical, json_ld, **context):
    return render(request, template, {
        'title': title, 'description': _truncate(description, 160), 'canonical': SITE + canonical,
        'json_ld': [_ld(d) for d in json_ld], 'cities': [(c, landing.city_slug(c)) for c in areas.CITIES],
        **context})


def city_page(request, city_slug):
    city = _city_or_404(city_slug)
    per_category, per_area = landing.city_summary(city)
    if not per_category:
        raise Http404
    categories = [{'label': label, 'count': per_category[key], 'url': landing.category_url(city, key)}
                  for slug, (key, label) in landing.CATEGORIES.items() if per_category[key]]
    popular = [{'label': f'{landing.CATEGORIES[landing.SLUG_OF[key]][1]} in {area}', 'count': n,
                'url': landing.area_url(city, key, area)}
               for key, area, n in landing.area_pages(city, (per_category, per_area))]
    total = sum(per_category.values())
    url = f'/{city_slug}'
    title = f'Wedding Vendors in {city} — Halls, Photographers, Caterers & More | WedMangal'
    description = (f'Find {total} wedding vendors in {city}: '
                   + ', '.join(f'{c["count"]} {c["label"].lower()}' for c in categories[:4])
                   + '. See photos, Google ratings and phone numbers, and get free quotes.')
    return _page(request, 'seo/city.html', title=title, description=description, canonical=url,
                 json_ld=[_breadcrumbs(('Home', f'{SITE}/'), (f'Wedding vendors in {city}', SITE + url))],
                 city=city, total=total, categories=categories, popular=popular[:40])


def city_category_page(request, city_slug, category_slug):
    city = _city_or_404(city_slug)
    key, label = _category_or_404(category_slug)
    if city == 'Chennai':
        return HttpResponsePermanentRedirect(f'/category/{key}')
    vendors = [_card(p) for p in _ranked(landing.city_vendors(city).filter(category__iexact=key))]
    if not vendors:
        raise Http404
    summary = landing.city_summary(city)
    per_area = summary[1]
    area_links = [{'label': area, 'count': n, 'url': landing.area_url(city, key, area)}
                  for k, area, n in landing.area_pages(city, summary) if k == key]
    url = landing.category_url(city, key)
    title = f'{label} in {city} | Compare & Get Free Quotes | WedMangal'
    top = [a for a, _ in per_area[key].most_common(3)]
    description = (f'{len(vendors)} {label.lower()} in {city}'
                   + (f', including {", ".join(top)}' if top else '')
                   + '. See photos, Google ratings and phone numbers, and get free quotes on WedMangal.')
    return _page(request, 'seo/listing.html', title=title, description=description, canonical=url,
                 json_ld=[_breadcrumbs(('Home', f'{SITE}/'), (f'Wedding vendors in {city}', f'{SITE}/{city_slug}'),
                                       (label, SITE + url)),
                          _item_list(f'{label} in {city}', SITE + url, vendors)],
                 heading=f'{label} in {city}', city=city, city_slug=city_slug, label=label,
                 vendors=vendors, nearby=[], area_links=area_links, area=None,
                 search_url='/search/?' + urlencode({'category': key, 'city': city}))


def area_page(request, city_slug, category_slug, area_slug):
    city = _city_or_404(city_slug)
    key, label = _category_or_404(category_slug)
    area = landing.area_from_slug(city, area_slug)
    if not area:
        raise Http404
    in_city = landing.city_vendors(city).filter(category__iexact=key)
    here = [p for p in _ranked(in_city) if areas.canonical(p.area_name or '') == area]
    if len(here) < landing.MIN_AREA_VENDORS:
        raise Http404
    here_ids = {p._id for p in here}
    near = [p for p in _ranked(in_city.filter(areas.nearby_q(area))) if p._id not in here_ids][:12]
    vendors, nearby = [_card(p) for p in here], [_card(p) for p in near]
    other_areas = [{'label': a, 'count': n, 'url': landing.area_url(city, key, a)}
                   for k, a, n in landing.area_pages(city) if k == key and a != area]
    url = landing.area_url(city, key, area)
    title = f'{label} in {area}, {city} | Get Free Quotes | WedMangal'
    rated = [v for v in vendors if v['rating']]
    description = (f'{len(vendors)} {label.lower()} in {area}, {city}'
                   + (f' and {len(nearby)} more nearby' if nearby else '')
                   + (f', {len(rated)} with Google ratings' if rated else '')
                   + '. See photos and phone numbers, and get free quotes on WedMangal.')
    return _page(request, 'seo/listing.html', title=title, description=description, canonical=url,
                 json_ld=[_breadcrumbs(('Home', f'{SITE}/'), (f'Wedding vendors in {city}', f'{SITE}/{city_slug}'),
                                       (f'{label} in {city}', SITE + landing.category_url(city, key)),
                                       (f'{label} in {area}', SITE + url)),
                          _item_list(f'{label} in {area}, {city}', SITE + url, vendors)],
                 heading=f'{label} in {area}, {city}', city=city, city_slug=city_slug, label=label, area=area,
                 vendors=vendors, nearby=nearby, area_links=other_areas,
                 category_link=landing.category_url(city, key),
                 search_url='/search/?' + urlencode({'category': key, 'area': area, 'city': city}))


VENDOR_FAQ = [
    ('Is it free to list my wedding business on WedMangal?',
     'Yes. Creating your vendor account and listing your business is free.'),
    ('Which businesses can register?',
     'Wedding halls and venues, photographers, bridal makeup artists, caterers, decorators, mehendi artists, DJs, '
     'wedding planners, invitation printers, bridal jewellers, pandits, wedding cars and entertainers in '
     'Chennai, Bangalore and Hyderabad.'),
    ('How do couples contact me?',
     'Your page shows your phone number with Call and WhatsApp buttons. When a couple asks for a quote, '
     'the enquiry is sent to your phone.'),
    ('My business is already on WedMangal. How do I take it over?',
     'Open your listing and tap "Claim this listing". After we confirm it is yours, you can add photos, '
     'prices and services yourself.'),
    ('Can I register by WhatsApp instead?',
     'Yes. Send your business name, category, area and phone number to WedMangal on WhatsApp '
     'and we will set up your listing and send you the link.'),
    ('How do I log in later?',
     'Log in with your phone number — you get a one-time code on WhatsApp. No password to remember.'),
]


def list_business_page(request):
    counts = {}
    for city in areas.CITIES:
        counts[city] = landing.city_vendors(city).count()
    url = '/list-your-business'
    title = 'List Your Wedding Business Free — Register as a Wedding Vendor | WedMangal'
    description = ('Register your wedding hall, photography, makeup, catering or decoration business on WedMangal '
                   'for free. Get your own page on Google and enquiries from couples in Chennai, Bangalore and '
                   'Hyderabad.')
    faq = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in VENDOR_FAQ]}
    whatsapp = f'https://wa.me/{WHATSAPP_NUMBER}?' + urlencode(
        {'text': 'Hi WedMangal, I want to list my wedding business. Name: , Category: , Area: , Phone: '})
    return _page(request, 'seo/list_business.html', title=title, description=description, canonical=url,
                 json_ld=[_breadcrumbs(('Home', f'{SITE}/'), ('List your business', SITE + url)), faq],
                 faq=VENDOR_FAQ, total=sum(counts.values()), counts=counts, whatsapp=whatsapp,
                 categories=[label for _, label in landing.CATEGORIES.values()])
