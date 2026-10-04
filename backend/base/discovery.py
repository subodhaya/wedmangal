"""Discovery journey: a visitor's structured wedding requirement.

Requirement object (stored on DiscoveryLead.requirements, built by the frontend from the
quick questions; validated here — never trusted as sent):

    {
      "version": 1,
      "category": "Halls",                       # a CATEGORY_LABELS key, or null
      "location": {"area": "Tambaram"} | {"anywhere": true} | {"other": "Kelambakkam"} | null,
      "guest_count": {"min": 500, "max": 1000} | null,      # null = not answered
      "budget": {"min": 200000, "max": 500000, "per": "event"|"plate"} | {"unsure": true} | null,
      "timeframe": "3_months" | "6_months" | "12_months" | "undecided" | null,
      "event_date": "2026-12-12" | null,
      "must_have": ["parking", "veg_food"],
      "prefer":    ["budget_friendly"],
      "avoid":     ["hotel"],
      "dont_care": []
    }

Matching rule (Unknown is not No): a requirement can only *exclude* a vendor when the
vendor's own stored details contradict it (e.g. parking recorded as "No"). Vendors whose
details are unknown always stay in the results.
"""
import re
from datetime import date, timedelta

from django.db.models import Case, IntegerField, Q, Value, When

from base.analytics import normalize_indian_mobile
from base.views.seo_views import CATEGORY_LABELS

MAX_GUESTS = 20000
MAX_BUDGET = 100_000_000
TIMEFRAMES = {'3_months': 'Within 3 months', '6_months': 'In 3–6 months',
              '12_months': 'In 6–12 months', 'undecided': 'Date not decided'}

# Requirement keys → how they relate to Product.attributes (vendor_profile.CATEGORY_FIELDS).
#   match:   Q for a vendor whose stored details satisfy it (ranked first)
#   reject:  Q for a vendor whose stored details contradict it (excluded) — only for clear yes/no facts
REQUIREMENT_KEYS = {
    'parking':          {'label': 'Parking', 'match': Q(attributes__parking=True), 'reject': Q(attributes__parking=False)},
    'ac':               {'label': 'Air conditioning', 'match': Q(attributes__ac=True), 'reject': Q(attributes__ac=False)},
    'veg_food':         {'label': 'Vegetarian food', 'match': Q(attributes__food_type__in=['veg', 'both']),
                         'reject': Q(attributes__food_type='nonveg')},
    'nonveg_food':      {'label': 'Non-veg food', 'match': Q(attributes__food_type__in=['nonveg', 'both']),
                         'reject': Q(attributes__food_type='veg')},
    'rooms':            {'label': 'Rooms for guests', 'match': Q(attributes__rooms=True), 'reject': Q(attributes__rooms=False)},
    'in_house_catering': {'label': 'In-house catering', 'match': Q(attributes__in_house_catering=True),
                          'reject': Q(attributes__in_house_catering=False)},
    'candid':           {'label': 'Candid photography', 'match': Q(attributes__shoot_type='candid')},
    'videography':      {'label': 'Videography', 'match': Q(attributes__video_included=True),
                         'reject': Q(attributes__video_included=False)},
    'drone':            {'label': 'Drone shoot', 'match': Q(attributes__drone=True), 'reject': Q(attributes__drone=False)},
    'pre_wedding':      {'label': 'Pre-wedding shoot', 'match': Q(attributes__shoot_type='pre-wedding')},
    'bridal':           {'label': 'Bridal', 'match': Q(attributes__type='bridal')},
    'trial':            {'label': 'Trial session', 'match': Q(attributes__trial_available=True),
                         'reject': Q(attributes__trial_available=False)},
    'home_visit':       {'label': 'Comes to the venue/home', 'match': Q(attributes__home_visit=True),
                         'reject': Q(attributes__home_visit=False)},
    'stage_decoration': {'label': 'Stage decoration', 'match': Q(attributes__stage_decoration=True),
                         'reject': Q(attributes__stage_decoration=False)},
    'flower_decoration': {'label': 'Flower decoration', 'match': Q(attributes__flower_decoration=True),
                          'reject': Q(attributes__flower_decoration=False)},
    'sound_lights':     {'label': 'Sound & lights included', 'match': Q(attributes__equipment_included=True),
                         'reject': Q(attributes__equipment_included=False)},
    'outdoor':          {'label': 'Outdoor event', 'match': Q(attributes__venue_type='outdoor')},
    'budget_friendly':  {'label': 'Budget-friendly'},                       # no price data yet: stored only
    # avoid-only venue types: a known match is excluded
    'hotel':            {'label': 'Hotel venue', 'match': Q(attributes__hall_type='hotel')},
    'resort':           {'label': 'Resort', 'match': Q(attributes__hall_type='resort')},
    'open_lawn':        {'label': 'Open lawn', 'match': Q(attributes__hall_type='open_lawn')},
}
LIST_FIELDS = ('must_have', 'prefer', 'avoid', 'dont_care')


class RequirementError(ValueError):
    pass


def _bucket(value, upper, label):
    """{"min": int, "max": int|None} → validated dict, or None."""
    if value in (None, '', {}):
        return None
    if not isinstance(value, dict):
        raise RequirementError(f'{label}: invalid value.')
    out = {}
    for key in ('min', 'max'):
        raw = value.get(key)
        if raw in (None, ''):
            out[key] = None
            continue
        if isinstance(raw, bool):
            raise RequirementError(f'{label}: invalid value.')
        try:
            number = int(raw)
        except (TypeError, ValueError):
            raise RequirementError(f'{label}: invalid value.')
        if not 0 <= number <= upper:
            raise RequirementError(f'{label}: out of range.')
        out[key] = number
    if out['min'] is None and out['max'] is None:
        return None
    if out['min'] is not None and out['max'] is not None and out['min'] > out['max']:
        raise RequirementError(f'{label}: minimum is above maximum.')
    return out


def clean_requirements(data):
    """Validate a requirement object from the browser. Raises RequirementError."""
    if not isinstance(data, dict):
        raise RequirementError('Requirements must be an object.')
    category = str(data.get('category') or '').strip()
    category = next((k for k in CATEGORY_LABELS if k.lower() == category.lower()), None) if category else None

    location = data.get('location') or None
    if location is not None:
        if not isinstance(location, dict):
            raise RequirementError('Location: invalid value.')
        if location.get('anywhere') is True:
            location = {'anywhere': True}
        elif isinstance(location.get('area'), str) and location['area'].strip():
            location = {'area': location['area'].strip()[:100]}
        elif isinstance(location.get('other'), str) and location['other'].strip():
            location = {'other': location['other'].strip()[:100]}
        else:
            location = None

    budget = data.get('budget') or None
    if isinstance(budget, dict) and budget.get('unsure') is True:
        budget = {'unsure': True}
    else:
        per = budget.get('per') if isinstance(budget, dict) else None
        budget = _bucket(budget, MAX_BUDGET, 'Budget')
        if budget is not None:
            budget['per'] = 'plate' if per == 'plate' else 'event'

    timeframe = data.get('timeframe') or None
    if timeframe is not None and timeframe not in TIMEFRAMES:
        raise RequirementError('Timeframe: invalid value.')

    lists = {}
    for field in LIST_FIELDS:
        values = data.get(field) or []
        if not isinstance(values, list) or any(not isinstance(v, str) for v in values):
            raise RequirementError(f'{field}: must be a list of keys.')
        unknown = sorted(set(values) - set(REQUIREMENT_KEYS))
        if unknown:
            raise RequirementError(f'{field}: unknown option(s) {", ".join(unknown)}.')
        lists[field] = list(dict.fromkeys(values))[:12]

    return {
        'version': 1, 'category': category, 'location': location,
        'guest_count': _bucket(data.get('guest_count'), MAX_GUESTS, 'Guest count'),
        'budget': budget, 'timeframe': timeframe,
        'event_date': clean_event_date(data.get('event_date')),
        **lists,
    }


def clean_event_date(value):
    if value in (None, ''):
        return None
    try:
        day = date.fromisoformat(str(value)[:10])
    except ValueError:
        raise RequirementError('Wedding date: use YYYY-MM-DD.')
    if not date.today() - timedelta(days=1) <= day <= date.today() + timedelta(days=3 * 365):
        raise RequirementError('Wedding date: choose a date in the next three years.')
    return day.isoformat()


# ── Search ──────────────────────────────────────────────────────────────────

def parse_key_list(value):
    keys = [k.strip() for k in str(value or '').split(',') if k.strip()]
    return [k for k in dict.fromkeys(keys) if k in REQUIREMENT_KEYS][:12]


def apply_to_queryset(qs, must=(), avoid=()):
    """Exclude only vendors whose *known* details contradict the requirement; rank known matches first.

    Exclusions go through a subquery on purpose: `.exclude(attributes__parking=False)` would also drop
    vendors with no parking information, because SQL compares a missing JSON key as NULL.
    """
    from base.models import Product
    for key in must:
        rule = REQUIREMENT_KEYS[key]
        if 'reject' in rule:
            qs = qs.exclude(pk__in=Product.objects.filter(rule['reject']).values('pk'))
    for key in avoid:
        rule = REQUIREMENT_KEYS[key]
        if 'match' in rule:
            qs = qs.exclude(pk__in=Product.objects.filter(rule['match']).values('pk'))
    scored = [REQUIREMENT_KEYS[k]['match'] for k in must if 'match' in REQUIREMENT_KEYS[k]]
    score = sum((Case(When(q, then=Value(1)), default=Value(0), output_field=IntegerField()) for q in scored), Value(0))
    return qs.annotate(requirement_rank=score)


def search_filters(guests_min=None, guests_max=None, budget_min=None, budget_max=None, must=()):
    """The same requirement expressed as the existing search-intent filter keys."""
    filters = {}
    if guests_min or guests_max:
        filters['hall_capacity'] = guests_min or guests_max
    if budget_min:
        filters['min_price'] = budget_min
    if budget_max:
        filters['max_price'] = budget_max
    if 'parking' in must:
        filters['hall_parking'] = True
    if 'ac' in must:
        filters['hall_ac'] = True
    if 'veg_food' in must:
        filters['food_type'] = 'veg'
    elif 'nonveg_food' in must:
        filters['food_type'] = 'nonveg'
    return filters


def _rupees(n):
    return f'₹{n / 100000:g}L' if n >= 100000 else f'₹{n:,}'


def _range(bucket, unit=''):
    lo, hi = bucket.get('min'), bucket.get('max')
    fmt = _rupees if unit == '₹' else (lambda n: f'{n:,}')
    if lo is not None and hi is not None:
        return f'{fmt(lo)}–{fmt(hi)}'
    return f'under {fmt(hi)}' if hi is not None else f'{fmt(lo)}+'


def summary_lines(req, source_vendor=None):
    """Plain lines a person can read before calling the customer."""
    req = req or {}
    lines = []
    if source_vendor is not None:
        lines.append(f'Source: {(source_vendor.category or "").replace("_", " ")} – {source_vendor.name} (#{source_vendor._id})')
    if req.get('category'):
        from base.views.search_views import CATEGORY_NAMES
        lines.append(f'Looking for: {CATEGORY_NAMES.get(req["category"], req["category"].replace("_", " "))}')
    loc = req.get('location') or {}
    if loc:
        lines.append('Location: ' + ('Anywhere in Chennai' if loc.get('anywhere') else loc.get('area') or f'{loc.get("other")} (typed)'))
    if req.get('guest_count'):
        lines.append(f'Guests: {_range(req["guest_count"])}')
    budget = req.get('budget') or {}
    if budget.get('unsure'):
        lines.append('Budget: not sure')
    elif budget:
        lines.append(f'Budget: {_range(budget, "₹")}{" per plate" if budget.get("per") == "plate" else ""}')
    if req.get('timeframe'):
        lines.append(f'When: {TIMEFRAMES[req["timeframe"]]}')
    if req.get('event_date'):
        lines.append(f'Wedding date: {req["event_date"]}')
    for field, label in (('must_have', 'Must have'), ('prefer', 'Prefer'), ('avoid', 'Avoid'), ('dont_care', "Don't care")):
        if req.get(field):
            lines.append(f'{label}: ' + ', '.join(REQUIREMENT_KEYS[k]['label'] for k in req[field] if k in REQUIREMENT_KEYS))
    return lines


def clean_name(value):
    name = re.sub(r'\s+', ' ', str(value or '')).strip()
    return name if 1 <= len(name) <= 100 else ''


def clean_phone(value):
    return normalize_indian_mobile(str(value or ''))
