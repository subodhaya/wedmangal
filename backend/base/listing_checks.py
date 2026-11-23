"""Checks for vendor data imported from outside (Google Places: collect_google / import_google_listings).

Kept from the retired prospects pipeline (VendorProspect table removed 2026-11-23): category words,
the "is the business really IN this area" address check, phone/website cleaning and the existing-listing index.
Nothing here writes to the database.
"""
import re
from urllib.parse import urlparse

from base import areas as city_areas
from base import search_intent as si
from base.models import Product

AREAS = {si._key(a): a for a in city_areas.NEIGHBOURS}     # supported areas in every city
LOCATED_IN, UNKNOWN = 'located_in', 'unknown'

# ── Category evidence ────────────────────────────────────────────────────────
# Strong = the business's own name or own words say it. A directory filing a business under a
# category is NOT enough on its own (e.g. colour labs listed as "wedding photographers").
CATEGORY_WORDS = {
    'Halls': (r'kalyana\s*mahal|kalyana\s*mandapam|thirumana\s*(mandapam|mahal|arangam|nilayam)|marriage\s*hall|'
              r'wedding\s*hall|wedding\s*venue|banquet|convention\s*(centre|center|hall)|mandapam|mandapa|mahal|'
              r'\bhall\b|community\s*hall|mini\s*hall|party\s*hall|arangam|maaligai|mantapa|mantap'),
    'Photographers': r'photograph|wedding\s*(films?|stories|gallery)|candid|cinematograph|\bclicks?\b',
    'Caterers': r'cater(er|ers|ing)|\bsamayal\b',
    'Decorators': r'decorat|\bdecor\b|flower\s*works|\bstage\s*designers?',
    'Makeup_Artist': r'make\s*-?\s*up|makeover|\bmua\b|bridal\s*(studio|beauty|salon|lounge)',
    'Mehandi_Artist': r'meh(e|a)?n?dh?i|henna',
    'DJ_Artist': r'\bdj\b|\bdjs\b|disc\s*jockey',
}
# Names that say the business is something else, whatever a directory filed it under.
NOT_CATEGORY = {
    'Photographers': (r'colou?r|photo\s*express|xerox|printing|\blab\b|frames?\b|digital\s*print|\bshop\b|stores?\b|'
                      r'album|manufactur|\bfilms?\s+manufactur'),
    'Halls': (r'\bhotels?\b|hometel|\binn\b|\bresorts?\b|\bresidency\b|\blodge\b|\bsuites\b|apartments|'
              r'restaurant|biri?yani|briyani|theatre|entertainments?|\bschool\b|\bchurch\b|\btemple\b'),  # review
    'Makeup_Artist': r'\bacademy\b|\binstitute\b|\btraining\b',
    'Caterers': r'institute|college|academy|technology|training|hotel\s*management|equipments?|industrial|matrimony',
}


# ── Area ─────────────────────────────────────────────────────────────────────
_DIRECTIONS = r'(east|west|north|south|new|old|sanatorium|h\s*o|s\s*o|b\s*o)'
_ROAD_WORDS = re.compile(r'\b(road|rd|salai|street|st|main|high\s*road|bypass|lane|avenue|cross)\b', re.I)
_NEAR_WORDS = re.compile(r'\b(near|opp|opposite|behind|off|next\s*to|beside|via|towards|to)\b', re.I)


def _components(address):
    parts = re.split(r'[,\n]| - |–', address or '')
    out = []
    for part in parts:
        p = re.sub(r'\b\d{6}\b', ' ', part)                       # PIN code
        p = re.sub(r'\b(chennai|tamil\s*nadu|india|bengaluru|bangalore|karnataka|hyderabad|telangana)\b', ' ', p, flags=re.I)
        p = re.sub(r'[^\w\s]', ' ', p)
        p = re.sub(r'\s+', ' ', p).strip()
        if p:
            out.append(p)
    return out


def _area_of_component(component):
    """A supported area this address component *is* (not merely mentions), else None."""
    if _ROAD_WORDS.search(component) or _NEAR_WORDS.search(component):
        return None                                 # "Velachery Main Road", "near Tambaram" ≠ located there
    key = si._key(component)
    if key in AREAS:
        return AREAS[key]
    stripped = re.sub(rf'^{_DIRECTIONS}\s+|\s+{_DIRECTIONS}$', '', component, flags=re.I).strip()
    stripped = re.sub(rf'^{city_areas._DESIGNATOR}\s+|\s+{city_areas._DESIGNATOR}$', '', stripped, flags=re.I).strip()
    key = si._key(stripped)
    return AREAS.get(key) if key and key in AREAS else None


def check_area(address, research_area=''):
    """→ (business_area, area_status, evidence). Only an address component that IS the area counts."""
    found = []
    for component in _components(address):
        area = _area_of_component(component)
        if area and area not in found:
            found.append(area)
    if len(found) == 1:
        return found[0], LOCATED_IN, [{'quote': address}]
    if len(found) > 1:
        if research_area in found:                  # e.g. "Selaiyur, Tambaram" found under Tambaram
            return research_area, LOCATED_IN, [{'quote': address, 'note': f'also names {", ".join(a for a in found if a != research_area)}'}]
        return '', UNKNOWN, [{'quote': address, 'note': f'names several areas: {", ".join(found)}'}]
    return '', UNKNOWN, ([{'quote': address}] if address else [])


# ── Contact ──────────────────────────────────────────────────────────────────
_PLACEHOLDER_PHONES = {'9999999999', '0000000000', '1234567890', '9876543210', '9876543211', '1111111111'}


def normalize_phone(raw):
    """10-digit Indian mobile or 044 landline → digits; anything else (incl. placeholders) → ''."""
    digits = re.sub(r'\D', '', str(raw or ''))
    if digits.startswith('91') and len(digits) == 12:
        digits = digits[2:]
    if digits.startswith('0') and len(digits) == 11 and digits[1] in '6789':
        digits = digits[1:]
    if len(digits) == 10 and digits[0] in '6789':
        mobile = digits
    elif len(digits) == 11 and digits.startswith('044'):
        mobile = digits
    elif len(digits) == 10 and digits.startswith('44'):
        mobile = '0' + digits
    else:
        return ''
    core = mobile[-10:]
    if core in _PLACEHOLDER_PHONES or len(set(core)) <= 2:
        return ''
    return mobile


# Not a business's own website — directories, social networks, maps, link shorteners.
NOT_OWN_SITE = ('sulekha.com', 'justdial.com', 'facebook.com', 'instagram.com', 'google.com', 'goo.gl', 'g.page',
                'wedmegood.com', 'mandap.com', 'weddingz.in', 'venuelook.com', 'bookeventz.com', 'weddingwire.in',
                'weddingbazaar.com', 'venuebookingz.com', 'youtube.com', 'linktr.ee', 'wa.me', 'whatsapp.com',
                'indiamart.com', 'wedmangal.com', 'shaadisaga.com', 'urbanclap.com', 'urbancompany.com', 'x.com',
                'twitter.com', 'linkedin.com', 'pinterest.com')


def website_domain(url):
    try:
        host = urlparse(url if '://' in (url or '') else f'https://{url}').hostname or ''
    except ValueError:
        return ''
    host = host.lower().removeprefix('www.')
    if not host or '.' not in host or any(host == d or host.endswith('.' + d) for d in NOT_OWN_SITE):
        return ''
    return host


def normalize_name(name):
    n = (name or '').lower().replace('&', ' and ')
    n = re.sub(r'\b(pvt|private|ltd|limited|llp|the)\b', ' ', n)
    n = re.sub(r'[^a-z0-9]+', ' ', n)
    return re.sub(r'\s+', ' ', n).strip()


def compact_name(name):
    """Name key that ignores spacing: "Siva Sakthi" and "Sivasakthi" are the same name."""
    return normalize_name(name).replace(' ', '')


def _same_address(a, b):
    ka, kb = si._key(a), si._key(b)
    return bool(ka) and (ka == kb or (len(min(ka, kb, key=len)) > 15 and (ka in kb or kb in ka)))


class ProductIndex:
    """Existing listings, read once per import. Read-only: Products are never changed."""

    def __init__(self):
        self.by_phone, self.by_domain, self.by_name = {}, {}, {}
        for pr in Product.objects.only('_id', 'name', 'business_phone', 'personal_phone', 'website_url',
                                       'address', 'area_name'):
            for raw in (pr.business_phone, pr.personal_phone):
                ph = normalize_phone(raw)
                if ph:
                    self.by_phone.setdefault(ph, pr)
            dom = website_domain(pr.website_url or '')
            if dom:
                self.by_domain.setdefault(dom, pr)
            self.by_name.setdefault(compact_name(pr.name), []).append(pr)
