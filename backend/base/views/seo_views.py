"""
Server-rendered SEO for public React pages.

Returns the React build's index.html with page-specific <title>, meta
description, canonical, Open Graph tags and JSON-LD, plus a short HTML
summary inside #root. React's createRoot() replaces #root when it mounts,
so the visible UI is unchanged.

Only data stored on the vendor record is used — no ratings, opening days,
prices or addresses are inferred.
"""
import json
import re
from collections import Counter
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse
from django.utils.html import escape

from base.models import Product

SITE = 'https://www.wedmangal.com'

# Mirrors CATEGORY_LABELS in frontend/src/screens/CategoryScreen.js
CATEGORY_LABELS = {
    'Makeup_Artist':    'Makeup Artists',
    'Photographers':    'Photographers',
    'Caterers':         'Caterers',
    'Planners':         'Event Planners',
    'Halls':            'Halls',
    'Decorators':       'Decorators',
    'Mehandi_Artist':   'Mehandi Artists',
    'Invitation':       'Invitation',
    'Jewellery':        'Jewellery',
    'DJ_Artist':        'DJ Artists',
    'Entertainment':    'Music & Entertainment',
    'Travel_Transport': 'Travel & Transport',
    'Pandit':           'Pandit',
}


# ── index.html handling ──────────────────────────────────────────────────────

def _index_path():
    # The real React build (repo-root frontend/build), not the stale copy under
    # backend/frontend/build that the TEMPLATES fallback resolves to.
    default = Path(settings.BASE_DIR).parent / 'frontend' / 'build' / 'index.html'
    return Path(getattr(settings, 'REACT_INDEX_HTML', default))


def _load_index():
    return _index_path().read_text(encoding='utf-8')


def _replace_or_insert(html, pattern, tag):
    """Replace the first tag matching pattern, or insert tag before </head>."""
    new_html, n = re.subn(pattern, lambda m: tag, html, count=1, flags=re.S | re.I)
    return new_html if n else html.replace('</head>', tag + '</head>', 1)


def _meta_name(name):
    return r'<meta\s+name="%s"[^>]*>' % re.escape(name)


def _meta_property(prop):
    return r'<meta\s+property="%s"[^>]*>' % re.escape(prop)


def _json_ld(data):
    # Escape characters that could close the <script> element early.
    text = json.dumps(data, ensure_ascii=False)
    text = text.replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    return f'<script type="application/ld+json">{text}</script>'


def _render(title, description, canonical, body_html, json_ld=None, image=None, noindex=False):
    html = _load_index()
    t, d, c = escape(title), escape(description), escape(canonical)

    html = _replace_or_insert(html, r'<title>.*?</title>', f'<title>{t}</title>')
    html = _replace_or_insert(html, _meta_name('description'), f'<meta name="description" content="{d}"/>')
    html = _replace_or_insert(html, r'<link\s+rel="canonical"[^>]*>', f'<link rel="canonical" href="{c}"/>')
    html = _replace_or_insert(html, _meta_property('og:title'), f'<meta property="og:title" content="{t}"/>')
    html = _replace_or_insert(html, _meta_property('og:description'), f'<meta property="og:description" content="{d}"/>')
    html = _replace_or_insert(html, _meta_property('og:url'), f'<meta property="og:url" content="{c}"/>')
    html = _replace_or_insert(html, _meta_name('twitter:title'), f'<meta name="twitter:title" content="{t}"/>')
    html = _replace_or_insert(html, _meta_name('twitter:description'), f'<meta name="twitter:description" content="{d}"/>')
    if image:
        i = escape(image)
        html = _replace_or_insert(html, _meta_property('og:image'), f'<meta property="og:image" content="{i}"/>')
        html = _replace_or_insert(html, _meta_name('twitter:image'), f'<meta name="twitter:image" content="{i}"/>')
    if noindex:
        html = _replace_or_insert(html, _meta_name('robots'), '<meta name="robots" content="noindex, follow"/>')
    if json_ld:
        html = html.replace('</head>', _json_ld(json_ld) + '</head>', 1)

    html = html.replace('<div id="root"></div>', f'<div id="root">{body_html}</div>', 1)
    return HttpResponse(html)


def _not_found():
    # Keep serving the React app (it shows its own not-found / preview UI),
    # but with a real 404 status so search engines don't index it.
    return HttpResponse(_load_index(), status=404)


# ── Formatting helpers ───────────────────────────────────────────────────────

def _truncate(text, limit=155):
    text = ' '.join((text or '').split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(' ', 1)[0].rstrip(',.;:-') + '…'


def _category_key(value):
    value = (value or '').strip().lower()
    for key in CATEGORY_LABELS:
        if key.lower() == value:
            return key
    return None


def _tel(phone):
    digits = re.sub(r'\D', '', phone or '')
    if len(digits) == 10:
        return '+91' + digits
    if len(digits) == 12 and digits.startswith('91'):
        return '+' + digits
    return digits


def _money(value):
    return f'₹{value:,.0f}'


def _time(value):
    return value.strftime('%I:%M %p').lstrip('0')


def _image_url(product):
    name = product.image.name if product.image else ''
    if not name or 'placeholder' in name:
        return None
    return SITE + product.image.url


def _breadcrumbs(*items):
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': i, 'name': name, 'item': url}
            for i, (name, url) in enumerate(items, start=1)
        ],
    }


# ── Views ────────────────────────────────────────────────────────────────────

def product_page(request, pk):
    product = Product.objects.filter(_id=pk, is_approved=True).first()
    if product is None:
        return _not_found()

    name = (product.name or '').strip() or 'Wedding vendor'
    key = _category_key(product.category)
    category_text = (product.category or '').replace('_', ' ').strip()
    city = (product.city or '').strip().title()
    area = (product.area_name or '').strip()
    place = ', '.join(p for p in (area, city) if p)
    kind = ' in '.join(p for p in (category_text, place) if p)

    url = f'{SITE}/product/{product._id}'
    title = f'{name} | {kind} | WedMangal' if kind else f'{name} | WedMangal'
    description = _truncate(product.description) or _truncate(
        f'{name}{" — " + kind if kind else ""}. See services and contact details on WedMangal.')
    image = _image_url(product)
    tel = _tel(product.business_phone)
    services = [s.name.strip() for s in product.services.all() if (s.name or '').strip()]

    price = None
    if product.min_price:
        price = _money(product.min_price)
        if product.max_price and product.max_price > product.min_price:
            price += ' – ' + _money(product.max_price)

    # Server-rendered summary (replaced by React on mount)
    facts = []
    if product.address:
        facts.append(f'<li>Address: {escape(product.address.strip())}</li>')
    if tel:
        facts.append(f'<li>Phone: <a href="tel:{escape(tel)}">{escape(product.business_phone.strip())}</a></li>')
    if product.opening_time and product.closing_time:
        facts.append(f'<li>Hours: {_time(product.opening_time)} – {_time(product.closing_time)}</li>')
    if price:
        facts.append(f'<li>Price range: {price}</li>')
    if services:
        facts.append(f'<li>Services: {escape(", ".join(services))}</li>')
    if product.website_url:
        facts.append(f'<li>Website: <a href="{escape(product.website_url)}" rel="noopener">{escape(product.website_url)}</a></li>')
    if product.instagram_url:
        facts.append(f'<li>Instagram: <a href="{escape(product.instagram_url)}" rel="noopener">{escape(product.instagram_url)}</a></li>')

    body = ['<main class="seo-summary">']
    if key:
        body.append(f'<nav><a href="/">WedMangal</a> › <a href="/category/{key}">{escape(CATEGORY_LABELS[key])}</a></nav>')
    body.append(f'<h1>{escape(name)}</h1>')
    if kind:
        body.append(f'<p>{escape(kind)}</p>')
    if product.description:
        body.append(f'<p>{escape(product.description.strip())}</p>')
    if facts:
        body.append('<ul>' + ''.join(facts) + '</ul>')
    if key:
        body.append(f'<p><a href="/category/{key}">More {escape(CATEGORY_LABELS[key].lower())} in Chennai</a></p>')
    body.append('</main>')

    # Structured data — only fields present on the record
    business = {'@context': 'https://schema.org', '@type': 'LocalBusiness', 'name': name, 'url': url}
    if product.description:
        business['description'] = ' '.join(product.description.split())
    if image:
        business['image'] = image
    if tel:
        business['telephone'] = tel
    address = {'@type': 'PostalAddress', 'addressCountry': 'IN'}
    if product.address:
        address['streetAddress'] = product.address.strip()
    elif area:
        address['streetAddress'] = area
    if city:
        address['addressLocality'] = city
    if city.lower() == 'chennai':
        address['addressRegion'] = 'Tamil Nadu'
    business['address'] = address
    if price:
        business['priceRange'] = price
    same_as = [u for u in (product.website_url, product.instagram_url) if u]
    if same_as:
        business['sameAs'] = same_as

    json_ld = [business]
    if key:
        json_ld.append(_breadcrumbs(
            ('Home', f'{SITE}/'),
            (CATEGORY_LABELS[key], f'{SITE}/category/{key}'),
            (name, url),
        ))

    return _render(title, description, url, ''.join(body), json_ld=json_ld, image=image)


def category_page(request, category):
    key = _category_key(category)
    if key is None:
        return _not_found()

    label = CATEGORY_LABELS[key]
    vendors = list(
        Product.objects.filter(is_approved=True, category__iexact=key, city__iexact='chennai')
        .order_by('-createdAt')
        .values('_id', 'name', 'area_name')
    )
    count = len(vendors)

    # Area names are stored with inconsistent casing — group case-insensitively
    # and display a capitalised variant when one exists.
    area_counts, area_display = Counter(), {}
    for v in vendors:
        area = (v['area_name'] or '').strip()
        if area:
            area_counts[area.lower()] += 1
            if area.lower() not in area_display or area_display[area.lower()].islower():
                area_display[area.lower()] = area
    # Only areas with 2+ listings — a list of one-vendor areas says nothing.
    top_areas = [(area_display[a], n) for a, n in area_counts.most_common(5) if n >= 2]

    url = f'{SITE}/category/{key}'
    title = f'Wedding {label} in Chennai | WedMangal'
    if count:
        area_names = [a for a, _ in top_areas[:3]]
        areas_text = f', including {", ".join(area_names[:-1])} and {area_names[-1]}' if len(area_names) > 1 else (
            f', including {area_names[0]}' if area_names else '')
        description = _truncate(
            f'Browse {count} wedding {label.lower()} in Chennai{areas_text}. '
            f'See services and contact details for each vendor on WedMangal.', 160)
    else:
        description = f'Wedding {label.lower()} in Chennai on WedMangal.'

    body = ['<main class="seo-summary">',
            '<nav><a href="/">WedMangal</a></nav>',
            f'<h1>Wedding {escape(label)} in Chennai</h1>']
    if count:
        body.append(f'<p>{count} {escape(label.lower())} in Chennai are listed on WedMangal.</p>')
        if top_areas:
            areas = ', '.join(f'{escape(a)} ({n})' for a, n in top_areas)
            body.append(f'<p>Areas with the most listings: {areas}</p>')
        body.append('<ul>' + ''.join(
            f'<li><a href="/product/{v["_id"]}">{escape((v["name"] or "").strip() or "Vendor")}</a>'
            + (f' – {escape(v["area_name"].strip())}' if (v['area_name'] or '').strip() else '')
            + '</li>'
            for v in vendors
        ) + '</ul>')
    else:
        body.append(f'<p>No {escape(label.lower())} are listed yet.</p>')
    body.append('</main>')

    json_ld = [
        _breadcrumbs(('Home', f'{SITE}/'), (label, url)),
        {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            'name': f'Wedding {label} in Chennai',
            'url': url,
            'mainEntity': {
                '@type': 'ItemList',
                'numberOfItems': count,
                'itemListElement': [
                    {'@type': 'ListItem', 'position': i, 'url': f'{SITE}/product/{v["_id"]}',
                     'name': (v['name'] or '').strip()}
                    for i, v in enumerate(vendors, start=1)
                ],
            },
        },
    ]

    return _render(title, description, url, ''.join(body), json_ld=json_ld, noindex=(count == 0))
