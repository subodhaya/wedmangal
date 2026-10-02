import logging
from datetime import date, timedelta

from django.db.models import Count, Q
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from base import analytics, notifications, search_intent
from base.models import Product, QuoteRequest, SearchQuery
from base.views.product_views import _is_admin

EventType = analytics.EventType
logger = logging.getLogger(__name__)


class EventAnonThrottle(AnonRateThrottle):
    scope, rate = 'analytics_anon', '120/min'


class EventUserThrottle(UserRateThrottle):
    scope, rate = 'analytics_user', '120/min'


class QuoteAnonThrottle(AnonRateThrottle):
    scope, rate = 'quote_anon', '10/hour'


class QuoteUserThrottle(UserRateThrottle):
    scope, rate = 'quote_user', '20/hour'


class SearchAnonThrottle(AnonRateThrottle):
    scope, rate = 'search_anon', '60/min'


class SearchUserThrottle(UserRateThrottle):
    scope, rate = 'search_user', '60/min'


def _approved_vendor(vendor_id):
    if isinstance(vendor_id, bool):
        return None
    try:
        return Product.objects.filter(_id=int(vendor_id), is_approved=True).first()
    except (TypeError, ValueError):
        return None


def _visitor(request, data):
    user = request.user if request.user.is_authenticated else None
    return user, analytics.clean_session_id(data.get('session_id'))


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([EventAnonThrottle, EventUserThrottle])
def log_event(request):
    """Record a customer action. Never needed for the action itself to work."""
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    if analytics.is_bot(user_agent):
        return Response(status=status.HTTP_204_NO_CONTENT)

    data = request.data if isinstance(request.data, dict) else {}
    event_type = data.get('event_type')
    if event_type not in analytics.CLIENT_EVENT_TYPES:
        return Response({'detail': 'Invalid event_type.'}, status=status.HTTP_400_BAD_REQUEST)

    user, session_id = _visitor(request, data)
    if user is None and not session_id:
        return Response({'detail': 'A valid session_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    vendor = None
    if event_type in analytics.VENDOR_EVENT_TYPES:
        vendor = _approved_vendor(data.get('vendor_id'))
        if vendor is None:
            return Response({'detail': 'Vendor not found.'}, status=status.HTTP_404_NOT_FOUND)

    event = analytics.record_event(
        event_type, vendor=vendor, user=user, session_id=session_id,
        source=analytics.clean_source(data.get('source')),
        path=analytics.clean_path(data.get('path')),
        referrer=analytics.clean_referrer(data.get('referrer')),
        user_agent=user_agent,
        metadata=analytics.clean_metadata(data.get('metadata')),
    )
    if event is None:
        return Response({'recorded': False}, status=status.HTTP_200_OK)
    return Response({'recorded': True}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([QuoteAnonThrottle, QuoteUserThrottle])
def create_quote_request(request):
    """Save a Get Quote enquiry. Name, a valid Indian mobile number and consent are required."""
    data = request.data if isinstance(request.data, dict) else {}
    vendor = _approved_vendor(data.get('vendor_id'))
    if vendor is None:
        return Response({'detail': 'Vendor not found.'}, status=status.HTTP_404_NOT_FOUND)

    errors = {}
    name = data.get('name') if isinstance(data.get('name'), str) else ''
    name = name.strip()
    if not name:
        errors['name'] = 'Please enter your name.'
    elif len(name) > 100:
        errors['name'] = 'Name must be 100 characters or fewer.'

    raw_phone = data.get('phone') if isinstance(data.get('phone'), str) else ''
    phone = analytics.normalize_indian_mobile(raw_phone)
    if not raw_phone.strip():
        errors['phone'] = 'Phone number is required.'
    elif not phone:
        errors['phone'] = 'Enter a valid 10-digit Indian mobile number.'

    event_date = None
    raw_date = data.get('event_date')
    if raw_date:
        try:
            event_date = date.fromisoformat(str(raw_date))
        except ValueError:
            errors['event_date'] = 'Enter a valid date.'
        else:
            if event_date < timezone.now().astimezone(analytics.IST).date():
                errors['event_date'] = 'Event date cannot be in the past.'

    message = data.get('message') if isinstance(data.get('message'), str) else ''
    message = message.strip()
    if len(message) > 1000:
        errors['message'] = 'Message must be 1000 characters or fewer.'

    if data.get('consent') not in (True, 'true', 'on', '1', 1):
        errors['consent'] = 'Please agree to share your details with the vendor.'

    if errors:
        return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

    # A retried/double-submitted identical enquiry returns the existing quote:
    # no second lead, no second vendor notification.
    recent = QuoteRequest.objects.filter(
        vendor=vendor, phone=phone, name=name, event_date=event_date, message=message,
        created_at__gte=timezone.now() - timedelta(minutes=2),
    ).order_by('-created_at').first()
    if recent:
        return Response({'id': recent.id, 'detail': 'Your enquiry has been received.'},
                        status=status.HTTP_201_CREATED)

    user, session_id = _visitor(request, data)
    quote = QuoteRequest.objects.create(
        vendor=vendor, user=user, session_id=session_id, name=name, phone=phone,
        event_date=event_date, message=message, consent=True,
    )
    try:
        analytics.record_event(
            EventType.GET_QUOTE_SUBMITTED, vendor=vendor, user=user, session_id=session_id,
            source='quote_form', path=analytics.clean_path(data.get('path')),
            user_agent=request.META.get('HTTP_USER_AGENT', ''), dedupe=False,
        )
    except Exception:
        # The enquiry is already saved; analytics must never fail the customer's action.
        logger.exception('Could not record get_quote_submitted for quote %s', quote.id)
    try:
        # SMS/email go out after the commit, in the background; failures never affect this response.
        notifications.schedule_vendor_notification(quote.id)
    except Exception:
        logger.exception('Could not schedule vendor notification for quote %s', quote.id)
    return Response({'id': quote.id, 'detail': 'Your enquiry has been received.'},
                    status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_summary(request):
    """This vendor's performance. Vendors only ever get their own listing;
    admins may pass ?vendor_id= to view any vendor."""
    vendor_id = request.query_params.get('vendor_id')
    if vendor_id:
        try:
            vendor = Product.objects.filter(_id=int(vendor_id)).first()
        except ValueError:
            vendor = None
        if vendor is None:
            return Response({'detail': 'Vendor not found.'}, status=status.HTTP_404_NOT_FOUND)
        if vendor.user_id != request.user.id and not _is_admin(request.user):
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
    else:
        vendor = Product.objects.filter(user=request.user).first()
        if vendor is None:
            return Response({'detail': 'You do not have a vendor listing.'}, status=status.HTTP_404_NOT_FOUND)

    range_key, start, end = analytics.date_range(request.query_params.get('range'))
    return Response({
        'range': range_key,
        'start': start,
        'end': end,
        'vendor': {'id': vendor._id, 'name': vendor.name},
        'metrics': analytics.metrics(start, end, vendor=vendor),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_summary(request):
    """Site-wide totals for admins."""
    if not _is_admin(request.user):
        return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
    range_key, start, end = analytics.date_range(request.query_params.get('range'))
    return Response({
        'range': range_key,
        'start': start,
        'end': end,
        'metrics': analytics.metrics(start, end),
    })


# ── Search intent (Step 8) ───────────────────────────────────────────────────

SEARCH_DEDUPE_WINDOW = timedelta(seconds=60)


def _result_count(value):
    if isinstance(value, bool):
        return None
    try:
        count = int(value)
    except (TypeError, ValueError):
        return None
    return count if 0 <= count <= 100_000 else None


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([SearchAnonThrottle, SearchUserThrottle])
def log_search(request):
    """Record a search and its structured intent. The intent is always
    re-derived on the server; structured values from the browser are not trusted."""
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    if analytics.is_bot(user_agent):
        return Response(status=status.HTTP_204_NO_CONTENT)

    data = request.data if isinstance(request.data, dict) else {}
    source = data.get('source')
    if source not in SearchQuery.Source.values:
        return Response({'detail': 'Invalid source.'}, status=status.HTTP_400_BAD_REQUEST)

    user, session_id = _visitor(request, data)
    if user is None and not session_id:
        return Response({'detail': 'A valid session_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    raw_query = data.get('query') if isinstance(data.get('query'), str) else ''
    raw_query = raw_query.strip()[:200]
    query = search_intent.redact(raw_query)
    filters = dict(sorted(search_intent.clean_filters(data.get('filters')).items()))
    if not query and not set(filters) - {'sort'}:
        return Response({'detail': 'Nothing to record.'}, status=status.HTTP_400_BAD_REQUEST)

    normalized = search_intent.normalize(raw_query)[:200]
    visitor = {'user': user} if user is not None else {'session_id': session_id}
    if SearchQuery.objects.filter(created_at__gte=timezone.now() - SEARCH_DEDUPE_WINDOW,
                                  normalized_query=normalized, filters=filters, **visitor).exists():
        return Response({'recorded': False}, status=status.HTTP_200_OK)

    intent = search_intent.combine_intent(query, filters)
    SearchQuery.objects.create(
        user=user, session_id=session_id, source=source, query=query, normalized_query=normalized,
        filters=filters, result_count=_result_count(data.get('result_count')), **intent,
    )
    try:
        analytics.record_event(
            EventType.SEARCH, user=user, session_id=session_id, source=source,
            path=analytics.clean_path(data.get('path')), user_agent=user_agent,
            metadata=analytics.clean_metadata({'query': query, 'city': intent['city'] or ''}), dedupe=False,
        )
    except Exception:
        logger.exception('Could not record search event')
    return Response({'recorded': True, 'intent': intent}, status=status.HTTP_201_CREATED)


CAPACITY_BUCKETS = [  # (aggregate alias, display label, condition)
    ('cap_under_100', 'Under 100', Q(capacity__lt=100)),
    ('cap_100_299', '100–299', Q(capacity__gte=100, capacity__lt=300)),
    ('cap_300_499', '300–499', Q(capacity__gte=300, capacity__lt=500)),
    ('cap_500_999', '500–999', Q(capacity__gte=500, capacity__lt=1000)),
    ('cap_1000_plus', '1,000+', Q(capacity__gte=1000)),
]

# Uses budget_max when given, otherwise budget_min. Upper bounds are inclusive,
# so "under 2 lakh" (200000) counts as ₹1–2 lakh.
BUDGET_BUCKETS = [
    ('budget_under_1l', 'Under ₹1 lakh', Q(budget__lt=100_000)),
    ('budget_1_2l', '₹1–2 lakh', Q(budget__gte=100_000, budget__lte=200_000)),
    ('budget_2_5l', '₹2–5 lakh', Q(budget__gt=200_000, budget__lte=500_000)),
    ('budget_5l_plus', '₹5 lakh+', Q(budget__gt=500_000)),
]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_summary(request):
    """Aggregated search intent for admins. Never returns individual searches or queries."""
    if not _is_admin(request.user):
        return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
    range_key, start, end = analytics.date_range(request.query_params.get('range'))
    searches = SearchQuery.objects.filter(created_at__gte=start, created_at__lte=end)

    def top(field, limit=10):
        return list(searches.filter(**{f'{field}__isnull': False})
                    .values(field).annotate(count=Count('id')).order_by('-count', field)[:limit])

    capacity = searches.aggregate(**{key: Count('id', filter=cond) for key, _, cond in CAPACITY_BUCKETS})
    budget = searches.annotate(budget=Coalesce('budget_max', 'budget_min')).aggregate(
        **{key: Count('id', filter=cond) for key, _, cond in BUDGET_BUCKETS})
    food_labels = dict(SearchQuery.Food.choices)
    any_intent = Q()
    for field in search_intent.INTENT_FIELDS:
        any_intent |= Q(**{f'{field}__isnull': False})

    return Response({
        'range': range_key,
        'start': start,
        'end': end,
        'total_searches': searches.count(),
        'searches_with_intent': searches.filter(any_intent).count(),
        'top_areas': top('area'),
        'top_categories': [{**row, 'label': search_intent.CATEGORY_LABELS.get(row['category'], row['category'])}
                           for row in top('category')],
        'capacity_ranges': [{'label': label, 'count': capacity[key]} for key, label, _ in CAPACITY_BUCKETS],
        'budget_ranges': [{'label': label, 'count': budget[key]} for key, label, _ in BUDGET_BUCKETS],
        'food_preferences': [{**row, 'label': food_labels.get(row['food_preference'], row['food_preference'])}
                             for row in top('food_preference')],
        'parking': {
            'required': searches.filter(parking_required=True).count(),
            'not_required': searches.filter(parking_required=False).count(),
        },
    })


# ── Recent sign-ups (admin dashboard) ────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_signups(request):
    """Newest accounts first, for admins. Phone numbers are never returned."""
    if not _is_admin(request.user):
        return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        limit = min(max(int(request.query_params.get('limit', 10)), 1), 50)
    except ValueError:
        limit = 10
    from django.contrib.auth.models import User
    now = timezone.now()
    _, month_start, _ = analytics.date_range('month')
    users = User.objects.select_related('profile').order_by('-date_joined')[:limit]
    return Response({
        'counts': {
            'last_7_days': User.objects.filter(date_joined__gte=now - timedelta(days=7)).count(),
            'this_month': User.objects.filter(date_joined__gte=month_start).count(),
            'total': User.objects.count(),
        },
        'users': [{
            'id': u.id,
            'name': u.get_full_name() or '',
            'username': u.username,
            'email': u.email,
            'role': getattr(getattr(u, 'profile', None), 'role', None),
            'is_staff': u.is_staff,
            'phone_linked': bool(getattr(getattr(u, 'profile', None), 'phone', None)),
            'date_joined': u.date_joined,
        } for u in users],
    })
