"""Customer search (Phase 2): GET /api/search/

Deterministic, no AI. The query is understood with the Step 8 parser
(base/search_intent.py), but only filters backed by reliable data are applied:

  applied:      category, area (vendor area or Google address), Google rating
  understood,   budget, capacity, food, parking, AC — vendors' price and
  not applied:  facility data is missing or scraper-generated, so these are
                reported back as notes instead of silently hiding vendors.

Relevance is transparent: vendor-name word matches, then exact area, then
area found in the address, then Google rating.
"""
import re

from django.core.paginator import Paginator
from django.db.models import Avg, Case, F, IntegerField, Max, Min, Q, Value, When
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from base import search_intent as si
from base.models import Product

PAGE_SIZE = 12
MAX_QUERY = 200

# Customer-facing names for the existing category keys (database values unchanged).
CUSTOMER_CATEGORIES = [
    ('Halls', 'Wedding Halls & Venues'),
    ('Photographers', 'Photographers'),
    ('Makeup_Artist', 'Bridal Makeup'),
    ('Decorators', 'Decorators'),
    ('Caterers', 'Caterers'),
    ('Planners', 'Wedding Planners'),
    ('Mehandi_Artist', 'Mehendi Artists'),
    ('Jewellery', 'Bridal Jewellery'),
    ('Invitation', 'Invitations'),
    ('DJ_Artist', 'DJs'),
    ('Entertainment', 'Music & Entertainment'),
    ('Travel_Transport', 'Wedding Cars & Travel'),
    ('Pandit', 'Pandits & Priests'),
]
CATEGORY_NAMES = dict(CUSTOMER_CATEGORIES)
RATING_OPTIONS = (4.0, 4.5)
SORTS = ('relevance', 'rating', 'newest')

GOOGLE_RATING_RE = re.compile(r'Rated ([\d.]+)★ on Google \((\d+) reviews?\)')

# Words that describe *what* or *where*, not a vendor's name.
STOP_WORDS = {
    'in', 'near', 'at', 'for', 'with', 'and', 'or', 'the', 'a', 'an', 'my', 'me', 'of', 'to', 'on',
    'under', 'below', 'above', 'over', 'around', 'about', 'within', 'upto', 'up', 'from', 'between',
    'budget', 'price', 'cost', 'cheap', 'affordable', 'best', 'good', 'top', 'famous', 'popular',
    'wedding', 'marriage', 'reception', 'engagement', 'event', 'events', 'function', 'party', 'bridal',
    'people', 'persons', 'person', 'guests', 'guest', 'pax', 'members', 'capacity', 'seating',
    'lakh', 'lakhs', 'lac', 'lacs', 'crore', 'crores', 'rs', 'inr', 'thousand',
    'veg', 'vegetarian', 'non', 'nonveg', 'pure', 'food', 'parking', 'car', 'ac', 'air', 'conditioned',
    'chennai', 'service', 'services', 'artist', 'artists', 'vendor', 'vendors',
}
CATEGORY_WORDS = {w for phrases in si.CATEGORY_SYNONYMS.values() for p in phrases for w in p.split()}

# Signals that a word in the query names a place (used only to explain, never to filter).
LOCATION_PREPOSITIONS = {'in', 'near', 'at', 'around', 'opposite', 'beside', 'nearby'}
ROAD_ABBREVIATIONS = {'ecr', 'omr', 'gst'}
LOCALITY_SUFFIXES = ('nagar', 'pakkam', 'bakkam', 'puram', 'pet', 'salai', 'road', 'palayam', 'kottai', 'thangal')


def _rupees(value):
    if value >= 100_000:
        lakhs = value / 100_000
        return f'₹{lakhs:g} lakh'
    return f'₹{value:,}'


def _name_tokens(query, area):
    """Words that might be part of a vendor's name (used to rank, never to hide results)."""
    area_words = set(re.findall(r'[a-z]+', (area or '').lower()))
    words = re.findall(r'[a-z]{3,}', si.normalize(query))
    tokens = [w for w in words if w not in STOP_WORDS and w not in CATEGORY_WORDS and w not in area_words]
    return list(dict.fromkeys(tokens))[:3]


def _unmatched_location(query, area):
    """A place the customer named that isn't a known area (e.g. "ECR"), as they typed it."""
    if area or not query:
        return None
    words = re.findall(r'[A-Za-z][A-Za-z.]*', query)
    lower = [w.lower().strip('.') for w in words]
    for i, word in enumerate(lower):
        if word in STOP_WORDS or word in CATEGORY_WORDS or (len(word) < 3 and word not in ROAD_ABBREVIATIONS):
            continue
        after_preposition = i > 0 and lower[i - 1] in LOCATION_PREPOSITIONS
        looks_like_place = word in ROAD_ABBREVIATIONS or word.endswith(LOCALITY_SUFFIXES)
        if after_preposition or looks_like_place:
            return words[i].strip('.')
    return None


def _area_q(area):
    """Vendor's stored area, or the area appearing in its Google address ("T Nagar" ~ "T. Nagar")."""
    pattern = r'[ .]*'.join(re.escape(w) for w in re.findall(r'[A-Za-z]+', area))
    return Q(area_name__iexact=area) | Q(address__iregex=pattern)


def _category_label(category):
    key = next((k for k in CATEGORY_NAMES if k.lower() == (category or '').lower()), None)
    return CATEGORY_NAMES[key] if key else (category or '').replace('_', ' ')


def _google_reviews(description):
    m = GOOGLE_RATING_RE.search(description or '')
    return int(m.group(2)) if m else None


def _card(product):
    price_from = product.min_price or product.price_from
    price_to = product.max_price or product.price_to
    return {
        '_id': product._id,
        'name': product.name,
        'category': product.category,
        'category_label': _category_label(product.category),
        'area_name': product.area_name,
        'city': product.city,
        'image': str(product.image) if product.image else '',
        'rating': round(float(product.avg_rating), 1) if product.avg_rating is not None else None,
        'google_reviews': _google_reviews(product.description),
        'price_from': float(price_from) if price_from else None,
        'price_to': float(price_to) if price_to and price_to != price_from else None,
        'business_phone': product.business_phone,  # public business contact; personal_phone is never sent
        'is_available_today': product.is_available_today,
        'is_claimed': product.is_claimed,
    }


def _base_queryset():
    return Product.objects.filter(is_approved=True).annotate(
        avg_rating=Avg('services__rating', filter=Q(services__numReviews__gt=0)),
        price_from=Min('services__price', filter=Q(services__price__gt=0)),
        price_to=Max('services__price', filter=Q(services__price__gt=0)),
    )


def _filtered(category=None, area=None, min_rating=None, keyword_tokens=None):
    qs = _base_queryset()
    if category:
        qs = qs.filter(category__iexact=category)
    if area:
        qs = qs.filter(_area_q(area))
    if min_rating:
        qs = qs.filter(avg_rating__gte=min_rating)
    for token in keyword_tokens or []:  # keyword-only searches: every word must appear somewhere
        qs = qs.filter(Q(name__icontains=token) | Q(description__icontains=token) | Q(category__icontains=token)
                       | Q(area_name__icontains=token) | Q(address__icontains=token))
    return qs


def _notes(intent, area_param, area, unmatched_location=None):
    notes = []
    if intent['budget_min'] or intent['budget_max']:
        if intent['budget_min'] and intent['budget_max']:
            budget = f"{_rupees(intent['budget_min'])}–{_rupees(intent['budget_max'])}"
        elif intent['budget_max']:
            budget = f"under {_rupees(intent['budget_max'])}"
        else:
            budget = f"above {_rupees(intent['budget_min'])}"
        notes.append(f'We noted your budget ({budget}), but most vendors haven’t listed prices yet, so results '
                     f'aren’t filtered by price. Use “Get a free quote” to ask vendors directly.')
    if intent['capacity']:
        notes.append(f"We noted {intent['capacity']} guests, but venue capacities aren’t available yet, "
                     f'so results aren’t filtered by capacity.')
    unverified = [label for field, label in (('food_preference', 'food preference'),
                                             ('parking_required', 'parking'), ('ac_required', 'AC'))
                  if intent[field] is not None]
    if unverified:
        notes.append(f"Vendors’ {', '.join(unverified)} details aren’t verified yet, so results aren’t filtered by "
                     f'{"them" if len(unverified) > 1 else "it"}.')
    if area_param and not area:
        notes.append(f'We couldn’t match “{area_param[:50]}” to a Chennai area, so we’re showing all of Chennai.')
    elif unmatched_location:
        notes.append(f'“{unmatched_location[:50]}” wasn’t matched to a known area, so location filtering wasn’t applied.')
    return notes


@api_view(['GET'])
@permission_classes([AllowAny])
def search_vendors(request):
    params = request.query_params
    query = si.redact((params.get('q') or '').strip())[:MAX_QUERY]
    category_param = (params.get('category') or '').strip()
    area_param = (params.get('area') or '').strip()[:100]
    sort = params.get('sort') if params.get('sort') in SORTS else 'relevance'
    try:
        min_rating = float(params.get('min_rating') or 0) or None
    except ValueError:
        min_rating = None
    if min_rating not in RATING_OPTIONS:
        min_rating = None
    try:
        page = max(int(params.get('page', 1)), 1)
    except ValueError:
        page = 1

    # Understand the query; explicit filter choices win over words in the query.
    intent = si.combine_intent(query, {'category': category_param, 'area_name': area_param})
    category, area = intent['category'], intent['area']
    structured = bool(category or area)
    name_tokens = _name_tokens(query, area)
    keyword_tokens = name_tokens if query and not structured else []

    qs = _filtered(category, area, min_rating, keyword_tokens)
    if name_tokens:  # vendor-name matches rank first (for name searches and structured ones)
        qs = qs.annotate(name_rank=sum(
            (Case(When(name__icontains=t, then=Value(1)), default=Value(0), output_field=IntegerField())
             for t in name_tokens), Value(0)))
    else:
        qs = qs.annotate(name_rank=Value(0, output_field=IntegerField()))
    if area:
        qs = qs.annotate(area_rank=Case(When(area_name__iexact=area, then=Value(2)), default=Value(1),
                                        output_field=IntegerField()))
    else:
        qs = qs.annotate(area_rank=Value(0, output_field=IntegerField()))

    rating_desc = F('avg_rating').desc(nulls_last=True)
    if sort == 'rating':
        qs = qs.order_by(rating_desc, '_id')
    elif sort == 'newest':
        qs = qs.order_by('-createdAt', '_id')
    else:
        qs = qs.order_by('-name_rank', '-area_rank', rating_desc, '_id')

    paginator = Paginator(qs, PAGE_SIZE)
    page_obj = paginator.get_page(page)
    count = paginator.count

    suggestions = []
    if count == 0:
        if area:
            n = _filtered(category, None, min_rating, keyword_tokens).count()
            if n:
                label = CATEGORY_NAMES.get(category, 'vendors')
                suggestions.append({'label': f'Show all {label} in Chennai', 'remove': 'area', 'count': n})
        if min_rating:
            n = _filtered(category, area, None, keyword_tokens).count()
            if n:
                suggestions.append({'label': 'Include all ratings', 'remove': 'min_rating', 'count': n})
        if category and (area or min_rating):
            n = _filtered(None, area, min_rating, keyword_tokens).count()
            if n:
                suggestions.append({'label': f'Show other vendors{" in " + area if area else ""}',
                                    'remove': 'category', 'count': n})

    return Response({
        'query': query,
        'count': count,
        'page': page_obj.number,
        'pages': paginator.num_pages,
        'interpreted': {**{k: intent[k] for k in si.INTENT_FIELDS if k != 'event_date'},
                        'category_label': CATEGORY_NAMES.get(category)},
        'applied': {'category': category, 'area': area, 'min_rating': min_rating, 'sort': sort},
        'notes': _notes(intent, area_param, area, _unmatched_location(query, area)),
        'suggestions': suggestions,
        'results': [_card(p) for p in page_obj.object_list],
        'options': {
            'categories': [{'key': k, 'label': v} for k, v in CUSTOMER_CATEGORIES],
            'ratings': list(RATING_OPTIONS),
            'sorts': list(SORTS),
        },
    }, status=status.HTTP_200_OK)
