"""Discovery journey: save a visitor's requirement when they ask WedMangal to contact them.

    POST /api/discovery/leads/
      {session_id, source_vendor_id?, name, phone, event_date?, message?, consent: true,
       requirements: {...see base/discovery.py}}

No login and no account: the lead is reviewed and called by WedMangal (Django admin →
Discovery leads). Consent must be explicitly true — it is never assumed.
"""
import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from base import analytics, discovery
from base.models import DiscoveryLead, Product, SavedRequirement, VendorEvent

logger = logging.getLogger(__name__)
RETRY_WINDOW = timedelta(minutes=10)


class LeadAnonThrottle(AnonRateThrottle):
    scope, rate = 'discovery_lead_anon', '10/hour'


class LeadUserThrottle(UserRateThrottle):
    scope, rate = 'discovery_lead_user', '20/hour'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LeadAnonThrottle, LeadUserThrottle])
def create_lead(request):
    data = request.data if isinstance(request.data, dict) else {}
    errors = {}
    name = discovery.clean_name(data.get('name'))
    if not name:
        errors['name'] = 'Please enter your name.'
    phone = discovery.clean_phone(data.get('phone'))
    if not phone:
        errors['phone'] = 'Enter a valid 10-digit Indian mobile number.'
    if data.get('consent') is not True:
        errors['consent'] = 'Please agree to be contacted by WedMangal about your requirement.'
    try:
        requirements = discovery.clean_requirements(data.get('requirements') or {})
    except discovery.RequirementError as exc:
        errors['requirements'] = str(exc)
        requirements = None
    try:
        event_date = discovery.clean_event_date(data.get('event_date'))
    except discovery.RequirementError as exc:
        errors['event_date'] = str(exc)
        event_date = None
    message = str(data.get('message') or '').strip()
    if len(message) > 1000:
        errors['message'] = 'Please keep this under 1000 characters.'
    if errors:
        return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

    session_id = analytics.clean_session_id(data.get('session_id'))
    source_vendor = None
    if data.get('source_vendor_id') not in (None, '') and not isinstance(data.get('source_vendor_id'), bool):
        try:
            source_vendor = Product.objects.filter(_id=int(data['source_vendor_id']), is_approved=True).first()
        except (TypeError, ValueError):
            source_vendor = None
    if event_date:
        requirements['event_date'] = event_date

    # A double tap or retry from the same visitor is the same lead
    recent = DiscoveryLead.objects.filter(phone=phone, created_at__gte=timezone.now() - RETRY_WINDOW)
    recent = recent.filter(session_id=session_id) if session_id else recent.filter(name=name)
    existing = recent.first()
    if existing:
        return Response({'id': existing.id}, status=status.HTTP_201_CREATED)

    lead = DiscoveryLead.objects.create(
        session_id=session_id, source_vendor=source_vendor, category=requirements.get('category') or '',
        requirements=requirements, name=name, phone=phone, event_date=event_date, message=message, consent=True,
    )
    try:
        analytics.record_event(
            VendorEvent.EventType.DISCOVERY_CONTACT_SUBMITTED, vendor=source_vendor,
            user=request.user if request.user.is_authenticated else None, session_id=session_id,
            source='discovery', user_agent=request.META.get('HTTP_USER_AGENT', ''),
            metadata={'category': lead.category}, dedupe=False)
    except Exception:
        logger.exception('Could not record discovery_contact_submitted for lead %s', lead.id)
    logger.info('Discovery lead %s saved', lead.id)
    return Response({'id': lead.id}, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def saved_requirements(request):
    """GET: this account's saved requirements. POST {requirements, source_vendor_id?}: save one.

    Saving is for the visitor's own convenience — it is not consent to be contacted.
    """
    if request.method == 'GET':
        items = SavedRequirement.objects.filter(user=request.user)[:10]
        return Response([{'id': s.id, 'category': s.category, 'requirements': s.requirements,
                          'summary': discovery.summary_lines(s.requirements), 'created_at': s.created_at} for s in items])

    data = request.data if isinstance(request.data, dict) else {}
    try:
        requirements = discovery.clean_requirements(data.get('requirements') or {})
    except discovery.RequirementError as exc:
        return Response({'errors': {'requirements': str(exc)}}, status=status.HTTP_400_BAD_REQUEST)
    source_vendor = None
    if data.get('source_vendor_id') not in (None, '') and not isinstance(data.get('source_vendor_id'), bool):
        try:
            source_vendor = Product.objects.filter(_id=int(data['source_vendor_id']), is_approved=True).first()
        except (TypeError, ValueError):
            source_vendor = None
    # Saving the same requirement twice (e.g. after logging in) keeps one copy
    existing = SavedRequirement.objects.filter(user=request.user, requirements=requirements).first()
    if existing:
        return Response({'id': existing.id, 'saved': True}, status=status.HTTP_200_OK)
    saved = SavedRequirement.objects.create(user=request.user, category=requirements.get('category') or '',
                                            requirements=requirements, source_vendor=source_vendor)
    return Response({'id': saved.id, 'saved': True}, status=status.HTTP_201_CREATED)
