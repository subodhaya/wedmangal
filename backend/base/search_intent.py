"""Search intent: turn a customer's search into structured, aggregatable fields.

parse_search_intent("hall near Tambaram for 600 people under 2 lakh")
  -> {'category': 'Halls', 'area': 'Tambaram', 'capacity': 600, 'budget_max': 200000, ...}

Rule: when a field can't be determined confidently it is None. Nothing is
guessed — two different categories, two different areas, a misspelt area or
conflicting amounts all leave that field empty.
"""
import re
from collections import Counter
from datetime import date

from django.core.cache import cache

from base.views.seo_views import CATEGORY_LABELS

INTENT_FIELDS = ('category', 'area', 'city', 'capacity', 'budget_min', 'budget_max',
                 'food_preference', 'parking_required', 'ac_required', 'event_date')

# Mirrors CHENNAI_AREAS in frontend/src/components/AreaDropdown.js (there is no
# location model). Combined at runtime with vendors' stored area names.
CHENNAI_AREAS = [
    'Adambakkam', 'Adyar', 'Alandur', 'Alapakkam', 'Alwarpet', 'Alwarthirunagar',
    'Ambattur', 'Ambattur Estate', 'Aminjikarai', 'Anakaputhur', 'Anna Nagar',
    'Anna Nagar East', 'Anna Nagar West', 'Arcot Road', 'Arumbakkam', 'Ashok Nagar',
    'Athipet', 'Avadi', 'Ayanavaram', 'Ayapakkam', 'Basin Bridge', 'Besant Nagar',
    'Chengalpattu', 'Chetpet', 'Chitlapakkam', 'Chitlapakkam East', 'Choolai',
    'Choolaimedu', 'Chromepet', 'Egmore', 'Ekkattuthangal', 'Gerugambakkam',
    'Gopalapuram', 'Guindy', 'Gummidipoondi', 'Injambakkam', 'Irumbuliyur',
    'Iyyappanthangal', 'Jafferkhanpet', 'Kadapakkam', 'Kanathur', 'Kattankulathur',
    'Kattupakkam', 'Keelambakkam', 'Kilpauk', 'Kodambakkam', 'Kolathur', 'Korattur',
    'Korukkupet', 'Kotturpuram', 'Kovalam', 'Kovur', 'Koyambedu', 'Madhavaram',
    'Madipakkam', 'Maduravoyal', 'Maduvinkarai', 'Mambalam', 'Manali', 'Mandaveli',
    'Mangadu', 'Maraimalai Nagar', 'Medavakkam', 'Meenambakkam', 'Minjur', 'Mogappair',
    'Moovarasampet', 'Mudichur', 'Mugalivakkam', 'Mylapore', 'Nandambakkam',
    'Nanganallur', 'Neelankarai', 'Nemam', 'Nerkundram', 'Nolambur', 'Nungambakkam',
    'Oragadam', 'Padappai', 'Padi', 'Pallavaram', 'Pallikaranai', 'Pammal',
    'Pattabiram', 'Perambur', 'Perungalathur', 'Perungudi', 'Ponneri', 'Poonamallee',
    'Porur', 'Pozhichalur', 'Puliyanthope', 'Puzhuthivakkam', 'Ramapuram', 'Red Hills',
    'Royapettah', 'Royapuram', 'Saidapet', 'Saligramam', 'Selaiyur', 'Selaiyur East', 'Sembakkam',
    'Sholinganallur', 'Sithalapakkam', 'Sriperumbudur', 'St. Thomas Mount', 'T Nagar',
    'Tambaram', 'Thirumazhisai', 'Thirumullaivoyal', 'Thiruvanmiyur', 'Thiruverkadu',
    'Thiruvottiyur', 'Thoraipakkam', 'Tondiarpet', 'Triplicane', 'Urapakkam',
    'Vadapalani', 'Valasaravakkam', 'Vanagaram', 'Vandalur', 'Velachery', 'Vepery',
    'Vichoor', 'Virugambakkam', 'West Mambalam', 'Wimco Nagar',
]

CITIES = {'chennai': 'Chennai'}

# Phrases → CATEGORY_LABELS key. Matched on word boundaries; longer phrases first.
CATEGORY_SYNONYMS = {
    'Halls': ['kalyana mandapam', 'marriage hall', 'wedding hall', 'banquet hall', 'party hall',
              'reception hall', 'convention centre', 'convention center', 'mandapam', 'mahal',
              'banquet', 'venue', 'venues', 'halls', 'hall', 'auditorium'],
    'Photographers': ['candid photography', 'wedding photography', 'videography', 'videographer',
                      'photographers', 'photographer', 'photography', 'photoshoot', 'photo shoot'],
    'Makeup_Artist': ['bridal makeup', 'makeup artist', 'make up artist', 'makeup', 'make up', 'mua',
                      'beautician', 'bridal makeover'],
    'Caterers': ['catering', 'caterers', 'caterer'],
    'Decorators': ['stage decoration', 'flower decoration', 'decorations', 'decoration', 'decorators',
                   'decorator', 'decor'],
    'Mehandi_Artist': ['mehandi', 'mehendi', 'mehndi', 'henna'],
    'DJ_Artist': ['dj', 'disc jockey'],
    'Planners': ['wedding planner', 'event planner', 'event management', 'planners', 'planner'],
    'Invitation': ['wedding cards', 'wedding card', 'invitations', 'invitation', 'invites'],
    'Jewellery': ['jewellery', 'jewelry', 'jewellers', 'jeweller', 'jewels'],
    'Entertainment': ['nadaswaram', 'orchestra', 'entertainment', 'live band', 'music band'],
    'Travel_Transport': ['wedding car', 'car rental', 'transport', 'travels', 'travel', 'bus'],
    'Pandit': ['purohit', 'pandit', 'priest', 'vadhyar'],
}

PHONE_RE = re.compile(r'(?<!\d)(?:\+?91[\s-]?)?[6-9](?:[\s-]?\d){9}(?!\d)')
EMAIL_RE = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')

UNIT = r'(crores?|cr|lakhs?|lacs?|lac|l|k|thousand)'
NUM = r'(\d+(?:\.\d+)?)'
MAX_WORDS = r'(?:under|below|upto|up to|within|max|maximum|less than|not more than|budget(?: of| is)?)'
MIN_WORDS = r'(?:above|over|min|minimum|more than|at least|starting(?: from)?|from)'
PEOPLE = r'(?:people|persons?|guests?|pax|members|heads|ppl|seats?|seater|crowd)'

MONTHS = {m: i for i, m in enumerate(
    ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'], start=1)}

MIN_BUDGET, MAX_BUDGET = 1_000, 1_000_000_000  # ₹1,000 – ₹100 crore
MIN_CAPACITY, MAX_CAPACITY = 10, 20_000


# ── Text helpers ─────────────────────────────────────────────────────────────

def redact(text):
    """Remove phone numbers and email addresses before anything is stored."""
    text = EMAIL_RE.sub('[email]', text or '')
    return PHONE_RE.sub('[phone]', text)


def normalize(text):
    text = redact(text).lower()
    text = text.replace('₹', ' rs ').replace(',', '')
    return re.sub(r'\s+', ' ', text).strip()


def _key(text):
    return re.sub(r'[^a-z0-9]', '', (text or '').lower())


# ── Budget ───────────────────────────────────────────────────────────────────

def _amount(number, unit):
    value = float(number)
    unit = (unit or '').lower()
    if unit.startswith('cr'):
        value *= 10_000_000
    elif unit.startswith('la') or unit == 'l':
        value *= 100_000
    elif unit in ('k', 'thousand'):
        value *= 1_000
    value = int(round(value))
    return value if MIN_BUDGET <= value <= MAX_BUDGET else None


def parse_budget(text):
    """Return (budget_min, budget_max) in INR, each None if not stated or unclear."""
    text = normalize(text)

    # Ranges: "1-2 lakh", "1 to 2 lakh", "between 1 and 2 lakh", "rs 50000 - 80000"
    rng = re.search(rf'(?:rs\.?|inr)?\s*{NUM}\s*{UNIT}?\s*(?:-|to|and)\s*(?:rs\.?|inr)?\s*{NUM}\s*{UNIT}\b', text) \
        or re.search(rf'(?:rs\.?|inr)\s*{NUM}\s*(?:-|to|and)\s*(?:rs\.?|inr)?\s*{NUM}(?!\s*{PEOPLE})\b', text)
    if rng:
        groups = rng.groups()
        if len(groups) == 4:
            low_n, low_u, high_n, high_u = groups
            low, high = _amount(low_n, low_u or high_u), _amount(high_n, high_u)
        else:
            low, high = _amount(groups[0], None), _amount(groups[1], None)
        if low and high and low < high:
            return low, high
        # not a sensible range (e.g. "500 and 2 lakh") — fall through to single amounts

    amounts = []
    # Amounts with a unit ("2 lakh", "2.5l", "50k", "1 crore") or a currency mark ("rs 200000")
    for m in re.finditer(rf'(?:(rs\.?|inr)\s*)?{NUM}\s*{UNIT}\b', text):
        amounts.append((m.start(), _amount(m.group(2), m.group(3))))
    for m in re.finditer(rf'(?:rs\.?|inr)\s*{NUM}(?!\s*(?:{UNIT}\b|\.\d|{PEOPLE}))', text):
        amounts.append((m.start(), _amount(m.group(1), None)))
    # A bare large number ("200000") that isn't a capacity or a Chennai-style pincode
    for m in re.finditer(rf'(?<![\d.])(\d{{5,10}})(?![\d.])(?!\s*{PEOPLE})', text):
        if re.search(r'(?:rs\.?|inr)\s*$', text[:m.start()]) or re.fullmatch(r'6\d{5}', m.group(1)):
            continue
        amounts.append((m.start(), _amount(m.group(1), None)))

    values = {v for _, v in amounts if v}
    if len(values) != 1:
        return None, None  # none stated, or conflicting amounts
    value = values.pop()
    start = min(pos for pos, v in amounts if v == value)
    before = text[max(0, start - 25):start]
    if re.search(rf'{MIN_WORDS}\s*(?:rs\.?|inr)?\s*$', before):
        return value, None
    return None, value  # "under 2 lakh", "budget 2 lakh", or a plain "2 lakh"


# ── Capacity ─────────────────────────────────────────────────────────────────

def parse_capacity(text):
    text = normalize(text)
    # "500 or 800 people", "300-500 guests": the customer gave two numbers — unclear
    if re.search(rf'(?<![\d.])\d{{2,5}}\s*(?:or|to|-)\s*\d{{2,5}}\s*\+?\s*{PEOPLE}\b', text):
        return None
    found = set()
    for m in re.finditer(rf'(?<![\d.])(\d{{2,5}})\s*\+?\s*{PEOPLE}\b', text):
        found.add(int(m.group(1)))
    for m in re.finditer(rf'\b(capacity|seating(?: capacity)?|for|crowd of)\s*(?:of\s*)?(\d{{2,5}})(?![\d.])'
                         rf'(?!\s*(?:{UNIT}\b|rs|inr|%|am|pm))', text):
        number = int(m.group(2))
        if m.group(1) == 'for' and 2020 <= number <= 2099:
            continue  # "for 2027" is a year, not a guest count
        found.add(number)
    found = {n for n in found if MIN_CAPACITY <= n <= MAX_CAPACITY}
    return found.pop() if len(found) == 1 else None


# ── Food, parking, AC ────────────────────────────────────────────────────────

NONVEG_RE = re.compile(r'\bnon[\s-]?veg(?:etarian)?\b')
VEG_RE = re.compile(r'\b(?:pure\s+)?veg(?:etarian)?\b')


def parse_food(text):
    text = normalize(text)
    has_nonveg = bool(NONVEG_RE.search(text))
    has_veg = bool(VEG_RE.search(NONVEG_RE.sub(' ', text)))
    if has_nonveg and has_veg:
        return 'both'
    if has_nonveg:
        return 'nonveg'
    if has_veg:
        return 'veg'
    return None


def parse_parking(text):
    text = normalize(text)
    if re.search(r"\b(?:no|without|don'?t need|do not need|no need (?:of|for))\s+(?:car\s+)?parking\b", text) \
            or re.search(r'\bparking\s+(?:not\s+(?:needed|required)|optional)\b', text):
        return False
    if re.search(r'\b(?:car\s+)?parking\b|\bvalet\b', text):
        return True
    return None


def parse_ac(text):
    text = normalize(text)
    if re.search(r'\bnon[\s-]?a[./]?c\b', text):
        return False
    if re.search(r'\ba[./]?c\b|\bair[\s-]?condition(?:ed|ing)?\b', text):
        return True
    return None


# ── Category & area ──────────────────────────────────────────────────────────

def match_category(text):
    text = normalize(text)
    matched = set()
    for key, phrases in CATEGORY_SYNONYMS.items():
        for phrase in phrases:
            if re.search(rf'\b{re.escape(phrase)}\b', text):
                matched.add(key)
                break
    return matched.pop() if len(matched) == 1 else None


def known_areas():
    """{normalised key: display name} from the area list plus vendors' stored areas."""
    areas = cache.get('search_intent_known_areas')
    if areas is None:
        from base.models import Product
        names = Counter(n.strip() for n in Product.objects.filter(is_approved=True)
                        .values_list('area_name', flat=True) if n and n.strip())
        areas = {}
        for name in CHENNAI_AREAS:
            areas[_key(name)] = name
        for name, _ in names.most_common():
            k = _key(name)
            if k and k not in areas and not name.islower():
                areas[k] = name
        for name in names:  # lowercase-only spellings, if nothing better exists
            areas.setdefault(_key(name), name.title())
        areas = {k: v for k, v in areas.items() if len(k) >= 3 and k not in CITIES}
        cache.set('search_intent_known_areas', areas, 600)
    return areas


def match_area(text, areas=None):
    """Exact (case/punctuation-insensitive) match against known areas. Ambiguous → None."""
    areas = known_areas() if areas is None else areas
    words = re.findall(r'[a-z0-9.]+', normalize(text))
    found, used = [], set()
    for size in (4, 3, 2, 1):  # prefer the longest name ("Anna Nagar West" over "Anna Nagar")
        for i in range(len(words) - size + 1):
            span = set(range(i, i + size))
            if span & used:
                continue
            name = areas.get(_key(''.join(words[i:i + size])))
            if name:
                found.append(name)
                used |= span
    distinct = set(found)
    return distinct.pop() if len(distinct) == 1 else None


def match_city(text):
    words = set(re.findall(r'[a-z]+', normalize(text)))
    cities = {CITIES[w] for w in words if w in CITIES}
    return cities.pop() if len(cities) == 1 else None


# ── Event date ───────────────────────────────────────────────────────────────

def parse_event_date(text, today=None):
    """Only a full, future date counts ("12 Feb 2027", "2027-02-12", "12/02/2027")."""
    text = normalize(text)
    today = today or date.today()
    candidates = []
    for y, m, d in re.findall(r'\b(20\d\d)-(\d{1,2})-(\d{1,2})\b', text):
        candidates.append((int(y), int(m), int(d)))
    for d, m, y in re.findall(r'\b(\d{1,2})[/.](\d{1,2})[/.](20\d\d)\b', text):
        candidates.append((int(y), int(m), int(d)))
    month = r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'
    for d, mon, y in re.findall(rf'\b(\d{{1,2}})(?:st|nd|rd|th)?\s+{month}\s+(20\d\d)\b', text):
        candidates.append((int(y), MONTHS[mon], int(d)))
    for mon, d, y in re.findall(rf'\b{month}\s+(\d{{1,2}})(?:st|nd|rd|th)?,?\s+(20\d\d)\b', text):
        candidates.append((int(y), MONTHS[mon], int(d)))
    dates = set()
    for y, m, d in candidates:
        try:
            parsed = date(y, m, d)
        except ValueError:
            continue
        if parsed >= today:
            dates.add(parsed)
    return dates.pop() if len(dates) == 1 else None


# ── Public API ───────────────────────────────────────────────────────────────

def empty_intent():
    return dict.fromkeys(INTENT_FIELDS)


def parse_search_intent(query, areas=None, today=None):
    """Extract structured intent from free text. Unclear fields are None."""
    intent = empty_intent()
    if not query or not query.strip():
        return intent
    budget_min, budget_max = parse_budget(query)
    intent.update(
        category=match_category(query),
        area=match_area(query, areas),
        city=match_city(query),
        capacity=parse_capacity(query),
        budget_min=budget_min,
        budget_max=budget_max,
        food_preference=parse_food(query),
        parking_required=parse_parking(query),
        ac_required=parse_ac(query),
        event_date=parse_event_date(query, today),
    )
    return intent


FILTER_KEYS = {'category', 'city', 'area_name', 'min_price', 'max_price', 'food_type',
               'hall_capacity', 'hall_parking', 'hall_ac', 'min_rating', 'sort'}


def clean_filters(filters):
    """Keep only known filter keys with short scalar values."""
    if not isinstance(filters, dict):
        return {}
    cleaned = {}
    for key in FILTER_KEYS & set(filters):
        value = filters[key]
        if isinstance(value, bool):
            cleaned[key] = value
        elif isinstance(value, (int, float)) and not isinstance(value, bool):
            cleaned[key] = value
        elif isinstance(value, str) and value.strip():
            cleaned[key] = redact(value.strip())[:100]
    return cleaned


def _int_in(value, low, high):
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        return None
    return number if low <= number <= high else None


def _truthy(value):
    return value is True or (isinstance(value, str) and value.lower() == 'true')


def intent_from_filters(filters, areas=None):
    """Structured intent from UI filters, validated (never trusted as-is)."""
    filters = clean_filters(filters)
    intent = empty_intent()
    category = str(filters.get('category', '')).strip().lower()
    intent['category'] = next((k for k in CATEGORY_LABELS if k.lower() == category), None)
    if filters.get('area_name'):
        intent['area'] = match_area(filters['area_name'], areas)
    if filters.get('city'):
        intent['city'] = CITIES.get(_key(filters['city']))
    intent['capacity'] = _int_in(filters.get('hall_capacity'), MIN_CAPACITY, MAX_CAPACITY)
    budget_min = _int_in(filters.get('min_price'), 1, MAX_BUDGET)
    budget_max = _int_in(filters.get('max_price'), 1, MAX_BUDGET)
    if budget_min and budget_max and budget_min > budget_max:
        budget_min = budget_max = None
    intent['budget_min'], intent['budget_max'] = budget_min, budget_max
    if filters.get('food_type') in ('veg', 'nonveg', 'both'):
        intent['food_preference'] = filters['food_type']
    if _truthy(filters.get('hall_parking')):
        intent['parking_required'] = True
    if _truthy(filters.get('hall_ac')):
        intent['ac_required'] = True
    return intent


def combine_intent(query, filters, areas=None):
    """Filters the customer chose explicitly win over values parsed from text."""
    parsed = parse_search_intent(query, areas)
    chosen = intent_from_filters(filters, areas)
    return {field: chosen[field] if chosen[field] is not None else parsed[field] for field in INTENT_FIELDS}


def has_intent(intent):
    return any(value is not None for value in intent.values())
