"""AI Dictionary experiment: one evidence-backed knowledge record about one real business.

    /AIDictionary/<slug>   (see docs/aidictionary-experiment.md)

Deliberately a hand-checked fixture, not a CMS: the experiment is whether a factual,
sourced, machine-readable record changes how search/AI systems describe the business —
not whether we can generate many pages. Every fact names its source(s); facts the sources
disagree on are listed as discrepancies instead of being resolved; anything unverified
is left out. WedMangal lists this business and is therefore not an independent source.
"""
import json
from html import escape

SITE = 'https://www.wedmangal.com'
VERIFIED_ON = '2026-10-08'

# ── Sources (what each one is, and what kind of source it is) ───────────────────
SOURCES = {
    'official': {
        'label': 'Official website — lotusbanquethall.com',
        'url': 'https://www.lotusbanquethall.com/',
        'type': 'Official (published by the business)',
    },
    'wedmangal': {
        'label': 'WedMangal vendor listing #789',
        'url': f'{SITE}/product/789',
        'type': 'Listing on WedMangal (entered on WedMangal on 25 May 2026; not yet confirmed by the business through a claim)',
    },
    'weddingwire': {
        'label': 'WeddingWire India venue listing',
        'url': 'https://www.weddingwire.in/kalyana-mandapams/lotus-banquet-hall--e447130',
        'type': 'Third-party directory',
    },
}

# status: 'corroborated' = the business's own site AND an independent third party agree (WedMangal's
# listing never counts as independent); 'business' = stated by the business; 'listing' = WedMangal listing only
RECORD = {
    'slug': 'lotus-banquet-hall-virugambakkam',
    'vendor_id': 789,
    'name': 'Lotus Banquet Hall',
    'description': ('Lotus Banquet Hall is an air-conditioned banquet hall in Virugambakkam, Chennai, '
                    'used for weddings, receptions and other family and corporate events.'),
    'identity': [
        {'field': 'Name', 'value': 'Lotus Banquet Hall', 'sources': ['official', 'wedmangal', 'weddingwire'], 'status': 'corroborated'},
        {'field': 'Type of business', 'value': 'Banquet hall / event venue', 'sources': ['official', 'wedmangal', 'weddingwire'], 'status': 'corroborated'},
        {'field': 'Locality', 'value': 'Virugambakkam, Chennai, Tamil Nadu 600092, India', 'sources': ['official', 'wedmangal', 'weddingwire'], 'status': 'corroborated'},
        {'field': 'Street', 'value': 'Kaliamman Koil Road, Ganapathraj Nagar Main Road, near Elango Nagar bus stop', 'sources': ['official', 'wedmangal', 'weddingwire'], 'status': 'corroborated'},
        {'field': 'Address (as published by the business)', 'value': '1/25, Kaliamman Koil Road, Ganpathraj Nagar Main Rd, (Near By Elango Nagar Bus Stop) Virugambakkam, Chennai-600092, Tamil Nadu', 'sources': ['official'], 'status': 'business'},
        {'field': 'Website', 'value': 'https://www.lotusbanquethall.com/', 'sources': ['official', 'wedmangal'], 'status': 'business'},
        {'field': 'Phone', 'value': '+91 98845 53290', 'sources': ['official', 'wedmangal'], 'status': 'business'},
        {'field': 'Other phones (published by the business)', 'value': '+91 98840 10229, +91 99625 33226', 'sources': ['official'], 'status': 'business'},
        {'field': 'Email (published by the business)', 'value': 'events@lotusbanquethall.com, info@lotusbanquethall.com', 'sources': ['official'], 'status': 'business'},
        {'field': 'GSTIN (published by the business)', 'value': '33APOPS5189M2ZX', 'sources': ['official'], 'status': 'business'},
    ],
    'services': [
        {'value': 'Venue for weddings, receptions, engagements, birthdays, baby showers, upanayanam and corporate events', 'sources': ['official'], 'status': 'business'},
        {'value': 'Air-conditioned hall', 'sources': ['official', 'wedmangal', 'weddingwire'], 'status': 'corroborated'},
        {'value': 'Separate dining area', 'sources': ['official', 'wedmangal', 'weddingwire'], 'status': 'corroborated'},
        {'value': 'Two furnished air-conditioned guest rooms with a dressing area', 'sources': ['official'], 'status': 'business'},
        {'value': 'Parking for up to 25 cars', 'sources': ['official'], 'status': 'business'},
        {'value': 'Stage, sound system, projector and generator backup', 'sources': ['official'], 'status': 'business'},
        {'value': 'Vegetarian catering; outside food allowed (as stated by the business)', 'sources': ['official'], 'status': 'business'},
    ],
    'details': [
        {'field': 'Hall size', 'value': '5,000 sq ft', 'sources': ['official'], 'status': 'business'},
        {'field': 'Packages listed on WedMangal', 'value': 'Smaller setup up to 200 guests (dining 35 at a time), ₹35,000 + electricity at ₹24/unit; larger two-hall setup up to 500 guests (dining 75 at a time), ₹60,000 + electricity', 'sources': ['wedmangal'], 'status': 'listing'},
        {'field': 'Hours listed on WedMangal', 'value': '9:30 am – 8:30 pm', 'sources': ['wedmangal'], 'status': 'listing'},
    ],
    'discrepancies': [
        {'topic': 'Guest capacity', 'versions': [
            ('official', 'Up to 300 guests seated, 400 floating, in a 5,000 sq ft hall'),
            ('wedmangal', 'Up to 200 guests (one hall) or up to 500 guests (two-hall setup)'),
            ('weddingwire', '50 to 500 guests')]},
        {'topic': 'Catering', 'versions': [
            ('official', 'Pure vegetarian catering, outside food allowed'),
            ('weddingwire', 'In-house catering available; external caterers permitted')]},
        {'topic': 'Street number', 'versions': [
            ('official', '1/25, Kaliamman Koil Road'),
            ('wedmangal', '.1 Kaliamman Koil Road / 1, Ganapath Raj Nagar Main Rd'),
            ('weddingwire', '1, Kaliamman Koil Street')]},
    ],
    'unknown': [
        'Year established — a directory snippet says 2004, but no primary source confirms it.',
        'Owner or operating company — not published by the business.',
        'A possible alternate name, “SundarShree Mahal”, appears in a search-result title for lotusbanquethall.co.in; that domain did not resolve on 8 Oct 2026, so it is not treated as verified.',
        'Directory claims of a pool and 24 AC rooms conflict with the official site (two guest rooms) and are not included.',
        'Social media profiles — none found that could be confirmed as official.',
        'Areas served beyond the venue location — not stated by any source.',
    ],
}


def get_record(slug):
    return RECORD if slug == RECORD['slug'] else None


def page_url(record):
    return f'{SITE}/AIDictionary/{record["slug"]}'


def json_ld(record):
    """Only properties the sources actually support. Capacity, ratings, reviews, founding date and
    social profiles are deliberately absent (conflicting or unverified)."""
    url = page_url(record)
    business = {
        '@type': ['LocalBusiness', 'EventVenue'],
        '@id': f'{url}#business',
        'name': record['name'],
        'description': record['description'],
        'url': 'https://www.lotusbanquethall.com/',
        'telephone': '+91-98845-53290',
        'email': 'events@lotusbanquethall.com',
        'taxID': '33APOPS5189M2ZX',
        'address': {
            '@type': 'PostalAddress',
            'streetAddress': '1/25, Kaliamman Koil Road, Ganpathraj Nagar Main Road, Virugambakkam',
            'addressLocality': 'Chennai',
            'addressRegion': 'Tamil Nadu',
            'postalCode': '600092',
            'addressCountry': 'IN',
        },
        'amenityFeature': [{'@type': 'LocationFeatureSpecification', 'name': 'Air-conditioned hall', 'value': True}],
        'sameAs': [SOURCES['weddingwire']['url']],
    }
    page = {
        '@type': 'WebPage',
        '@id': f'{url}#webpage',
        'url': url,
        'name': f'{record["name"]} — business knowledge record',
        'description': f'Sourced factual record about {record["name"]}, Virugambakkam, Chennai.',
        'inLanguage': 'en-IN',
        'about': {'@id': f'{url}#business'},
        'lastReviewed': VERIFIED_ON,
        'isPartOf': {'@type': 'WebSite', '@id': f'{SITE}/#website', 'url': SITE, 'name': 'WedMangal'},
        'publisher': {'@type': 'Organization', 'name': 'WedMangal', 'url': SITE},
        'citation': [SOURCES[k]['url'] for k in ('official', 'weddingwire')],
        'breadcrumb': {'@id': f'{url}#breadcrumb'},
    }
    crumbs = {
        '@type': 'BreadcrumbList',
        '@id': f'{url}#breadcrumb',
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'WedMangal', 'item': SITE},
            {'@type': 'ListItem', 'position': 2, 'name': record['name'], 'item': url},
        ],
    }
    return {'@context': 'https://schema.org', '@graph': [page, business, crumbs]}


STATUS_LABEL = {
    'corroborated': 'Confirmed by more than one source',
    'business': 'Stated by the business',
    'listing': 'From the WedMangal listing only',
}


def _sources(keys):
    return ', '.join(f'<a href="{escape(SOURCES[k]["url"])}" rel="nofollow noopener">{escape(SOURCES[k]["label"])}</a>' for k in keys)


def _fact_rows(facts):
    rows = []
    for f in facts:
        label = f'<th scope="row">{escape(f["field"])}</th>' if 'field' in f else ''
        rows.append(f'<tr>{label}<td>{escape(f["value"])}</td>'
                    f'<td class="st st-{f["status"]}">{STATUS_LABEL[f["status"]]}</td><td>{_sources(f["sources"])}</td></tr>')
    return '\n'.join(rows)


def render(record):
    url = page_url(record)
    ld = json.dumps(json_ld(record), ensure_ascii=False).replace('<', '\\u003c')
    title = f'{record["name"]}, Virugambakkam — business knowledge record | WedMangal AI Dictionary'
    description = (f'Sourced factual record about {record["name"]}, a banquet hall in Virugambakkam, Chennai: '
                   f'identity, location, facilities, sources and known discrepancies. Last verified {VERIFIED_ON}.')
    discrepancies = '\n'.join(
        f'<li><strong>{escape(d["topic"])}</strong><ul>' +
        ''.join(f'<li>{escape(SOURCES[k]["label"])}: {escape(v)}</li>' for k, v in d['versions']) + '</ul></li>'
        for d in record['discrepancies'])
    sources = '\n'.join(
        f'<li><a href="{escape(s["url"])}" rel="nofollow noopener">{escape(s["label"])}</a> — {escape(s["type"])}</li>'
        for s in SOURCES.values())
    return f'''<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title>
<meta name="description" content="{escape(description)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:title" content="{escape(title)}">
<meta property="og:description" content="{escape(description)}">
<meta property="og:url" content="{url}">
<script type="application/ld+json">{ld}</script>
<style>
  :root {{ --ink: #2a0918; --muted: #6b5a62; --line: #ead6df; --plum: #5e143f; --bg: #fdf8f0; }}
  body {{ margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }}
  main {{ max-width: 920px; margin: 0 auto; padding: 24px 16px 48px; }}
  h1 {{ font-size: 1.9rem; margin: 4px 0 2px; }}
  h2 {{ font-size: 1.2rem; margin: 32px 0 10px; border-bottom: 1px solid var(--line); padding-bottom: 6px; }}
  .kind {{ color: var(--muted); margin: 0 0 16px; }}
  table {{ width: 100%; border-collapse: collapse; background: #fff; font-size: 0.95rem; }}
  th, td {{ text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid var(--line); overflow-wrap: anywhere; }}
  thead th {{ font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }}
  .st {{ font-size: 0.82rem; white-space: nowrap; }}
  .st-corroborated {{ color: #1a6e3a; }} .st-business {{ color: #7a5200; }} .st-listing {{ color: var(--muted); }}
  .note {{ background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; color: var(--muted); }}
  a {{ color: var(--plum); }}
  nav {{ font-size: 0.9rem; }}
  @media (max-width: 640px) {{ .st {{ white-space: normal; }} table, thead, tbody, tr, th, td {{ display: block; }}
    thead {{ display: none; }} tr {{ padding: 8px 0; border-bottom: 1px solid var(--line); }} th, td {{ border: 0; padding: 2px 10px; }} }}
</style>
</head>
<body>
<main>
<nav aria-label="Breadcrumb"><a href="{SITE}/">WedMangal</a> › AI Dictionary › {escape(record["name"])}</nav>
<article>
<h1>{escape(record["name"])}</h1>
<p class="kind">AI Dictionary · Business knowledge record · Last verified {VERIFIED_ON}</p>

<h2>About</h2>
<p>{escape(record["description"])}</p>

<h2>Business identity</h2>
<table><thead><tr><th>Field</th><th>Value</th><th>Status</th><th>Source</th></tr></thead><tbody>
{_fact_rows(record["identity"])}
</tbody></table>

<h2>Services and facilities</h2>
<table><thead><tr><th>Item</th><th>Status</th><th>Source</th></tr></thead><tbody>
{_fact_rows(record["services"])}
</tbody></table>

<h2>Other details</h2>
<table><thead><tr><th>Field</th><th>Value</th><th>Status</th><th>Source</th></tr></thead><tbody>
{_fact_rows(record["details"])}
</tbody></table>

<h2>Where sources disagree</h2>
<p>These are recorded as published; this record does not choose between them.</p>
<ul>
{discrepancies}
</ul>

<h2>Not known or not verified</h2>
<ul>
{"".join(f"<li>{escape(u)}</li>" for u in record["unknown"])}
</ul>

<h2>Sources</h2>
<ul>
{sources}
</ul>

<h2>About this record</h2>
<p class="note">Prepared by WedMangal, which also lists this business at <a href="{SITE}/product/{record["vendor_id"]}">wedmangal.com/product/{record["vendor_id"]}</a>.
WedMangal is therefore not an independent source. Facts marked “Stated by the business” come from the business’s own website and
were not independently confirmed. No ratings, reviews, awards or rankings are included. Last verified {VERIFIED_ON}.</p>
</article>
</main>
</body>
</html>'''
