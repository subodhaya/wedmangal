"""Public endpoints for unlisting, correction and copyright requests (no account needed).

    POST /api/removal-requests/            {vendor_id, request_type: unlist|incorrect_information,
                                            requester_name, requester_email, requester_phone,
                                            requester_relationship, reason?, description?, consent: true}
    POST /api/removal-requests/copyright/  multipart: {vendor_id, requester_*, disputed_content, description,
                                            consent, evidence_file?}
    POST /api/removal-requests/status/     {reference, email} → status only

Submitting never changes the listing — see base/removal_requests.py. `website` is a honeypot field that
people never see; bots fill it. Responses never include contact details or admin notes.
"""
import hmac
import logging

from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from base import removal_requests as rr
from base.models import Product, VendorRemovalRequest

logger = logging.getLogger(__name__)
RR = VendorRemovalRequest


class _IPThrottle(SimpleRateThrottle):
    """Per IP address, logged in or not."""
    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class SubmitBurstThrottle(_IPThrottle):
    scope, rate = 'removal_submit_burst', '5/hour'


class SubmitDailyThrottle(_IPThrottle):
    scope, rate = 'removal_submit_daily', '15/day'


class StatusThrottle(_IPThrottle):
    scope, rate = 'removal_status', '20/hour'


def _vendor(data):
    value = data.get('vendor_id')
    if value in (None, '') or isinstance(value, bool):
        return None
    try:
        return Product.objects.filter(_id=int(value)).first()
    except (TypeError, ValueError):
        return None


def _submit(request, request_type, evidence=None):
    data = request.data
    if str(data.get('website') or '').strip():
        logger.info('Removal request honeypot filled — dropped')
        return Response({'detail': 'We could not accept this request.'}, status=status.HTTP_400_BAD_REQUEST)
    vendor = _vendor(data)
    try:
        cleaned = rr.clean_submission(data, request_type, evidence)
    except rr.RequestError as exc:
        errors = exc.errors
    else:
        errors = {}
    if vendor is None:
        errors['vendor_id'] = 'This listing could not be found.'
    if errors:
        return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

    if rr.open_duplicate(vendor, request_type, cleaned['requester_email']):
        # Don't create a second request or send another e-mail; don't reveal the reference either.
        return Response({'duplicate': True,
                         'detail': 'You already have an open request about this listing. We will reply to the '
                                   'e-mail address you used — your reference number is in our first e-mail.'},
                        status=status.HTTP_200_OK)

    req = rr.create_request(vendor, cleaned, evidence)
    logger.info('Removal request %s (%s) saved for vendor %s', req.reference, request_type, vendor._id)
    return Response({'reference': req.reference, 'status': req.status}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([SubmitBurstThrottle, SubmitDailyThrottle])
def submit_request(request):
    request_type = str(request.data.get('request_type') or '')
    if request_type not in (RR.RequestType.UNLIST, RR.RequestType.INCORRECT_INFORMATION):
        return Response({'errors': {'request_type': 'Choose unlisting or incorrect information.'}},
                        status=status.HTTP_400_BAD_REQUEST)
    if request.FILES:
        return Response({'errors': {'evidence_file': 'Files can only be attached to a copyright complaint.'}},
                        status=status.HTTP_400_BAD_REQUEST)
    return _submit(request, request_type)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([SubmitBurstThrottle, SubmitDailyThrottle])
def submit_copyright(request):
    files = request.FILES.getlist('evidence_file') if request.FILES else []
    if len(files) > 1:
        return Response({'errors': {'evidence_file': 'Attach one file.'}}, status=status.HTTP_400_BAD_REQUEST)
    return _submit(request, RR.RequestType.COPYRIGHT, files[0] if files else None)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([StatusThrottle])
def request_status(request):
    reference = str(request.data.get('reference') or '').strip().upper()
    email = rr.clean_email(request.data.get('email'))
    req = RR.objects.filter(reference=reference).first() if reference and email else None
    if req is None or not hmac.compare_digest(req.requester_email.lower(), email):
        return Response({'detail': 'No request matches this reference number and e-mail address.'},
                        status=status.HTTP_404_NOT_FOUND)
    return Response({
        'reference': req.reference,
        'request_type': req.request_type,
        'request_type_label': req.get_request_type_display(),
        'status': req.status,
        'status_label': req.get_status_display(),
        'vendor_name': req.vendor_name,
        'submitted_at': req.created_at,
        'updated_at': req.updated_at,
    })
