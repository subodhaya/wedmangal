"""Vendor prospects: quality gates, deduplication and import (docs/prospects.md).

A prospect is a business found during research. It is NOT a WedMangal vendor. This module writes only
VendorProspect rows: it never creates or changes a User, Product, Service or Review, and nothing public
reads VendorProspect.

Rules carried over from the rest of the codebase:
  * Unknown ≠ No — an attribute nobody stated stays absent from `attributes`.
  * Nothing is invented: no fallback phone, no default hours, no template description.
"""
import re
from urllib.parse import urlparse

from django.db import transaction
from django.utils import timezone

from base import search_intent as si
from base.models import Product, VendorProspect
from base.views.seo_views import CATEGORY_LABELS

Decision = VendorProspect.Decision
AreaStatus = VendorProspect.AreaStatus

CATEGORIES = tuple(CATEGORY_LABELS)                       # the existing taxonomy, unchanged
AREAS = {si._key(a): a for a in si.CHENNAI_AREAS}          # the 127 supported areas

# ── Category evidence ────────────────────────────────────────────────────────
# Strong = the business's own name or own words say it. A directory filing a business under a
# category is NOT enough on its own (e.g. colour labs listed as "wedding photographers").
CATEGORY_WORDS = {
    'Halls': (r'kalyana\s*mahal|kalyana\s*mandapam|thirumana\s*(mandapam|mahal|arangam|nilayam)|marriage\s*hall|'
              r'wedding\s*hall|wedding\s*venue|banquet|convention\s*(centre|center|hall)|mandapam|mandapa|mahal|'
              r'\bhall\b|community\s*hall|mini\s*hall|party\s*hall|arangam|maaligai'),
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
EVIDENCE_KINDS = {'name', 'business_text', 'official_site', 'directory_label'}
# Proof that a business IS in a category: its name or its official site. Listing text is kept as evidence for
# the reviewer but is not enough on its own — restaurants mention a "party hall", event companies mention
# "decoration", studios mention "wedding photography" (seen in the 2026-10-09 data).
STRONG_KINDS = {'name', 'official_site'}
STRONG_KINDS_FOR = {}
# A name made only of these words doesn't identify a business ("Party hall", "Mini Hall AC").
GENERIC_NAME_WORDS = {'party', 'hall', 'halls', 'mini', 'ac', 'a', 'c', 'marriage', 'mahal', 'function', 'banquet',
                      'banquets', 'community', 'wedding', 'kalyana', 'mandapam', 'thirumana', 'the', 'and', 'photo',
                      'photography', 'studio', 'catering', 'caterers', 'decorators', 'events', 'makeup', 'artist',
                      'bridal', 'mehndi', 'mehendi', 'dj', 'services', 'service', 'professional', 'chennai', 'air', 'condition',
                      'conditioned', 'contractors', 'contractor'}


def category_signals(category, name, business_text=''):
    """Evidence entries the business's own name / own words give for `category` (used by the collector)."""
    found = []
    pattern = CATEGORY_WORDS.get(category)
    if not pattern:
        return found
    m = re.search(pattern, name or '', re.I)
    if m:
        found.append({'category': category, 'kind': 'name', 'quote': name})
    if business_text:
        m = re.search(pattern, business_text, re.I)
        if m:
            start = max(0, m.start() - 60)
            found.append({'category': category, 'kind': 'business_text', 'quote': business_text[start:m.end() + 60].strip()})
    return found


def check_categories(name, categories, evidence):
    """→ (valid categories, failures, review_reasons). Evidence must be real and must be about this business."""
    failures, review = [], []
    valid = []
    for raw in categories or []:
        key = next((k for k in CATEGORIES if k.lower() == str(raw).lower()), None)
        if key is None:
            failures.append(f'unknown category "{raw}"')
        elif key not in valid:
            valid.append(key)
    if not valid:
        failures.append('no valid category')
    for key in valid:
        mine = [e for e in evidence or [] if isinstance(e, dict) and e.get('category') == key
                and e.get('kind') in EVIDENCE_KINDS and (e.get('quote') or '').strip()]
        # No evidence is taken on trust: a "name" quote must be the business's name, and any quote from the
        # business itself must actually contain a word for this category.
        pattern = CATEGORY_WORDS.get(key)
        mine = [e for e in mine if e['kind'] != 'name' or e['quote'].strip().lower() == (name or '').strip().lower()]
        mine = [e for e in mine if e['kind'] == 'directory_label' or (pattern and re.search(pattern, e['quote'], re.I))]
        strong = [e for e in mine if e['kind'] in STRONG_KINDS_FOR.get(key, STRONG_KINDS)]
        if not mine:
            failures.append(f'no evidence for category {key}')
        elif not strong:
            if any(e['kind'] == 'business_text' for e in mine):
                review.append(f'{key}: only the listing text mentions it, not the name or official site')
            else:
                review.append(f'{key}: only a directory label, nothing from the business itself')
        not_pattern = NOT_CATEGORY.get(key)
        if not_pattern and re.search(not_pattern, name or '', re.I):
            review.append(f'{key}: name suggests a different kind of business ("{name}")')
    return valid, failures, review


# ── Area ─────────────────────────────────────────────────────────────────────
_DIRECTIONS = r'(east|west|north|south|new|old|sanatorium|h\s*o|s\s*o|b\s*o)'
_ROAD_WORDS = re.compile(r'\b(road|rd|salai|street|st|main|high\s*road|bypass|lane|avenue|cross)\b', re.I)
_NEAR_WORDS = re.compile(r'\b(near|opp|opposite|behind|off|next\s*to|beside|via|towards|to)\b', re.I)


def _components(address):
    parts = re.split(r'[,\n]| - |–', address or '')
    out = []
    for part in parts:
        p = re.sub(r'\b\d{6}\b', ' ', part)                       # PIN code
        p = re.sub(r'\bchennai\b|\btamil\s*nadu\b|\bindia\b', ' ', p, flags=re.I)
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
        return found[0], AreaStatus.LOCATED_IN, [{'quote': address}]
    if len(found) > 1:
        if research_area in found:                  # e.g. "Selaiyur, Tambaram" found under Tambaram
            return research_area, AreaStatus.LOCATED_IN, [{'quote': address, 'note': f'also names {", ".join(a for a in found if a != research_area)}'}]
        return '', AreaStatus.UNKNOWN, [{'quote': address, 'note': f'names several areas: {", ".join(found)}'}]
    return '', AreaStatus.UNKNOWN, ([{'quote': address}] if address else [])


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


def meaningful_address(address):
    """A street-level address: something beyond area + city, and a PIN code."""
    if not re.search(r'\b6\d{5}\b', address or ''):
        return False
    comps = [c for c in _components(address) if not _area_of_component(c)]
    return any(len(c) >= 6 for c in comps)


# ── Score (ranking only — never overrides a failed gate) ─────────────────────
def score(p):
    s = 0
    s += 2 if p.website_domain else 0
    s += 1 if p.phone else 0
    s += 1 if meaningful_address(p.address) else 0
    s += 1 if (p.rating is not None and (p.review_count or 0) >= 5) else 0
    s += 1 if (p.description or p.services) else 0
    s += min(3, len([k for k, v in (p.attributes or {}).items() if isinstance(v, bool)]))
    s += 1 if len({urlparse(x.get('url', '')).hostname for x in p.sources or [] if x.get('status') == 200}) >= 2 else 0
    return min(s, 10)


def missing(p):
    checks = [('phone', p.phone), ('website', p.website_domain), ('street address', meaningful_address(p.address)),
              ('rating', p.rating is not None), ('description or services', p.description or p.services),
              ('category attributes', p.attributes), ('capacity', p.capacity), ('pricing', p.pricing)]
    return [label for label, value in checks if not value]


# ── Duplicates ───────────────────────────────────────────────────────────────
def find_duplicate(p):
    """Another prospect that is the same business → (prospect, reason) or (None, review_reason|None)."""
    others = VendorProspect.objects.exclude(pk=p.pk) if p.pk else VendorProspect.objects.all()
    for field, label in (('google_place_id', 'Google place ID'), ('phone', 'phone'), ('website_domain', 'website')):
        value = getattr(p, field)
        if value:
            hit = others.filter(**{field: value}).order_by('pk').first()
            if hit:
                return hit, f'same {label} as prospect #{hit.pk}'
    key = compact_name(p.business_name)
    same_name = [o for o in others.filter(normalized_name__startswith=p.normalized_name[:1]).order_by('pk')
                 if compact_name(o.business_name) == key]
    for hit in same_name:
        if _same_address(hit.address, p.address):
            return hit, f'same name and address as prospect #{hit.pk}'
    if same_name:
        return None, f'possible branch: same name as prospect #{same_name[0].pk}, different address'
    return None, None


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

    def match(self, p):
        """→ (product, strong: bool, reason)."""
        if p.phone and p.phone in self.by_phone:
            pr = self.by_phone[p.phone]
            return pr, True, f'same phone as existing listing #{pr._id}'
        if p.website_domain and p.website_domain in self.by_domain:
            pr = self.by_domain[p.website_domain]
            return pr, True, f'same website as existing listing #{pr._id}'
        for pr in self.by_name.get(compact_name(p.business_name), []):
            same_area = p.business_area and p.business_area.lower() in ((pr.address or '') + ' ' + (pr.area_name or '')).lower()
            if same_area or _same_address(pr.address, p.address):
                return pr, True, f'same name in the same area as existing listing #{pr._id}'
            return pr, False, f'possible existing listing #{pr._id} (same name, area not confirmed)'
        return None, False, None


# ── Evaluate + import ────────────────────────────────────────────────────────
AUTO_DECISIONS = {Decision.NEW, Decision.NEEDS_REVIEW, Decision.DUPLICATE, Decision.REJECT}


def evaluate(p, products):
    """Apply the hard gates to an unsaved/saved prospect in place. Never touches anything but `p`."""
    failures, review = [], []
    if not (p.business_name or '').strip():
        failures.append('no business name')
    elif set(normalize_name(p.business_name).split()) <= GENERIC_NAME_WORDS:
        review.append(f'name "{p.business_name}" is generic — not enough to identify the business')
    p.categories, cat_fail, cat_review = check_categories(p.business_name, p.categories, p.category_evidence)
    failures += cat_fail
    review += cat_review

    if p.area_status != AreaStatus.LOCATED_IN or not p.business_area:
        review.append(f'not shown to be located in {p.research_area or "a supported area"} '
                      f'({p.get_area_status_display().lower()})')

    if not any(isinstance(s, dict) and s.get('status') == 200 and s.get('url') for s in p.sources or []):
        failures.append('no source page that was actually fetched')
    if not (p.phone or meaningful_address(p.address)):
        failures.append('no real phone and no street address')

    duplicate, dup_reason = find_duplicate(p)
    product, strong, product_reason = products.match(p)
    p.duplicate_of = duplicate
    p.matches_product = product

    if failures:
        decision = Decision.REJECT
    elif duplicate or (product and strong):
        decision = Decision.DUPLICATE
        review.append(dup_reason or product_reason)
    elif review or dup_reason or product:
        decision = Decision.NEEDS_REVIEW
        review += [r for r in (dup_reason, product_reason) if r]
    else:
        decision = Decision.NEW
    p.quality_passed = decision == Decision.NEW
    p.quality_failures = failures + review
    p.missing_fields = missing(p)
    p.quality_score = score(p)
    if p.decision_by != 'person':                    # a person's decision is never overwritten
        p.decision = decision
    return p


FIELDS = ('business_name', 'categories', 'category_evidence', 'service_area', 'city', 'address', 'pincode',
          'website_url', 'source_name', 'source_url', 'source_listing_url', 'sources', 'data_source',
          'google_place_id', 'research_category', 'research_area', 'rating', 'review_count', 'rating_source',
          'description', 'services', 'attributes', 'capacity', 'pricing', 'notes')


def _identity(record, phone, domain):
    """→ (existing prospect, how). 'same_listing' = this exact source page (update it);
    'same_business' = same place ID / website / phone / name+address from another source (merge into it)."""
    qs = VendorProspect.objects
    url = record.get('source_listing_url')
    if url:
        hit = qs.filter(source_listing_url=url).order_by('pk').first()
        if hit:
            return hit, 'same_listing'
    for field, value in (('google_place_id', record.get('google_place_id')),
                         ('website_domain', domain), ('phone', phone)):
        if value:
            hit = qs.filter(**{field: value}).order_by('pk').first()
            if hit:
                return hit, 'same_business'
    name = normalize_name(record.get('business_name'))
    for hit in qs.filter(normalized_name=name).order_by('pk'):
        if _same_address(hit.address, record.get('address')):
            return hit, 'same_business'
    return None, None


def clean_attributes(raw):
    """Keep only explicit True/False values. Unknown stays absent — never stored as False."""
    out = {}
    for key, value in (raw or {}).items() if isinstance(raw, dict) else []:
        if isinstance(value, dict) and isinstance(value.get('value'), bool) and value.get('source_url'):
            out[key] = value['value']                # evidence travels in notes/sources, value here
        elif isinstance(value, bool):
            out[key] = value
    return out


def _merge(p, record):
    """Same business seen on another source: add the source, fill only empty fields, never overwrite."""
    urls = {s.get('url') for s in p.sources or []}
    p.sources = (p.sources or []) + [s for s in record.get('sources') or [] if s.get('url') not in urls]
    for c in record.get('categories') or []:
        if c not in p.categories:
            p.categories = p.categories + [c]
    known = {(e.get('category'), e.get('kind'), e.get('quote')) for e in p.category_evidence or []}
    p.category_evidence = (p.category_evidence or []) + [
        e for e in record.get('category_evidence') or [] if (e.get('category'), e.get('kind'), e.get('quote')) not in known]
    for field in ('address', 'pincode', 'website_url', 'google_place_id', 'description', 'services', 'capacity',
                  'pricing', 'rating', 'review_count', 'rating_source', 'service_area', 'city'):
        if not getattr(p, field) and record.get(field):
            setattr(p, field, record[field])
    attrs = dict(clean_attributes(record.get('attributes')))
    attrs.update(p.attributes or {})                  # existing sourced values win; nothing becomes False
    p.attributes = attrs


def summary(p):
    return {'id': p.pk, 'name': p.business_name, 'categories': p.categories, 'area': p.business_area,
            'area_status': p.area_status, 'address': p.address, 'phone': p.phone, 'website': p.website_domain,
            'decision': p.decision, 'quality_passed': p.quality_passed, 'score': p.quality_score,
            'failures': p.quality_failures, 'missing': p.missing_fields,
            'duplicate_of': p.duplicate_of_id, 'matches_product': p.matches_product_id,
            'source': p.source_listing_url}


def import_records(records, dry_run=False, report=None):
    """Create or update VendorProspect rows. Returns counts. Writes nothing but VendorProspect.
    `report`, if a list, receives one summary per record (also in a dry run)."""
    products = ProductIndex()
    counts = {'created': 0, 'updated': 0, 'merged': 0, 'invalid_phone_discarded': 0}
    seen = []
    with transaction.atomic():
        for record in records:
            raw_phone = record.get('phone') or ''
            phone = normalize_phone(raw_phone)
            if raw_phone and not phone:
                counts['invalid_phone_discarded'] += 1
            domain = website_domain(record.get('website_url') or '')
            p, how = _identity(record, phone, domain)
            if how == 'same_business':
                _merge(p, record)
                p.phone = p.phone or phone
                p.website_domain = p.website_domain or domain
                counts['merged'] += 1
            else:
                p = p or VendorProspect()
                counts['created' if p.pk is None else 'updated'] += 1
                previous_categories, previous_evidence = list(p.categories or []), list(p.category_evidence or [])
                for field in FIELDS:
                    if field in record and record[field] is not None:
                        setattr(p, field, record[field])
                # The same listing found under another category page adds to it; it never drops a category.
                p.categories = list(p.categories) + [c for c in previous_categories if c not in p.categories]
                p.category_evidence = list(p.category_evidence) + [e for e in previous_evidence
                                                                   if e not in p.category_evidence]
                p.phone = phone
                p.website_domain = domain
                p.attributes = clean_attributes(record.get('attributes'))
            if not p.website_domain:
                p.website_url = ''                   # a directory/social link is a source, not a website
            p.business_name = (p.business_name or '').strip()
            p.normalized_name = normalize_name(p.business_name)
            p.business_area, p.area_status, p.area_evidence = check_area(p.address, p.research_area)
            if record.get('area_status') == AreaStatus.SERVES and p.area_status != AreaStatus.LOCATED_IN:
                p.area_status = AreaStatus.SERVES
            p.scraped_at = p.scraped_at or timezone.now()
            if p.verification_status == VendorProspect.Verification.UNVERIFIED and p.sources:
                p.verification_status = VendorProspect.Verification.SOURCE_CHECKED
            if raw_phone and not phone and 'not a real number' not in p.notes:
                p.notes = (p.notes + '\n' if p.notes else '') + 'A phone value from the source was not a real number and was discarded.'
            p.save()                                 # saved first so duplicate checks can exclude itself
            evaluate(p, products)
            p.save()
            seen.append(p.pk)
            if report is not None:
                report.append(summary(p))
        if dry_run:
            transaction.set_rollback(True)
    counts['records'] = len(records)
    counts['prospects'] = len(set(seen))
    return counts
