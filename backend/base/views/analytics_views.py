import logging
from datetime import date

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from base import analytics
from base.models import Product, QuoteRequest
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
