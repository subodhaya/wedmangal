"""Claim a listing and complete its profile.

    GET   /api/vendors/<id>/claim/            this user's claim state for the listing
    POST  /api/vendors/<id>/claim/send-code/  text a code to the phone ON THE LISTING
    POST  /api/vendors/<id>/claim/verify/     enter that code → listing claimed
    POST  /api/vendors/<id>/claim/request/    no access to that phone → admin review
    GET   /api/vendors/<id>/profile/          owner: details form, sources, completeness
    PATCH /api/vendors/<id>/profile/          owner: save category details

Ownership is proven only by receiving a code on the number already listed for the
business (the number customers call). The claimant never chooses the number.
Everything else goes to a WedMangal admin (Django admin → Service owner claims).
"""
import hmac
import logging
import secrets

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from base import analytics, identity, notifications, vendor_profile as vp
from base.analytics import normalize_indian_mobile
from base.models import Product, Profile, ServiceOwnerClaim, VendorEvent

logger = logging.getLogger(__name__)
EventType = VendorEvent.EventType

CODE_TTL = 600            # a code is valid for 10 minutes
RESEND_AFTER = 60         # seconds between codes for one listing
MAX_CODES_PER_DAY = 3     # per listing — the vendor's phone must not be spammed
MAX_USER_CODES_PER_DAY = 5
MAX_TRIES = 5

BLOCKED = {
    'yours': 'You already manage this listing.',
    'already_claimed': 'This listing has already been claimed by its owner. '
                       'If you believe this is a mistake, contact WedMangal.',
    'has_other_listing': 'Your account already manages another listing. '
                         'Please use a separate account for each business.',
    'owned_by_account': 'This listing is linked to an existing account, so it needs a review by '
                        'WedMangal. Send a claim request instead.',
    'no_listed_mobile': 'This listing has no mobile number we can send a code to. '
                        'Send a claim request instead.',
}


def _vendor(pk):
    return get_object_or_404(Product, _id=pk, is_approved=True)


def _code_key(product, user):
    return f'vclaim:code:{product._id}:{user.id}'


def _tries_key(product, user):
    return f'vclaim:tries:{product._id}:{user.id}'


def _count(key, timeout):
    """Increment a counter in the cache; returns the new value."""
    if cache.add(key, 1, timeout):
        return 1
    try:
        return cache.incr(key)
    except ValueError:  # expired between add() and incr()
        cache.set(key, 1, timeout)
        return 1


def _event(event_type, request, product, metadata=None):
    try:
        analytics.record_event(event_type, vendor=product, user=request.user, source='claim',
                               user_agent=request.META.get('HTTP_USER_AGENT', ''),
                               metadata=metadata or {}, dedupe=False)
    except Exception:  # analytics must never break a claim
        logger.exception('Could not record %s for vendor %s', event_type, product._id)


def _blocked(reason):
    code = status.HTTP_409_CONFLICT if reason in ('already_claimed', 'yours') else status.HTTP_400_BAD_REQUEST
    return Response({'detail': BLOCKED[reason], 'reason': reason}, status=code)


def take_ownership(product, user, *, method, phone, reviewer=None, claim=None):
    """Give the user this listing. Caller holds a transaction and a row lock on product."""
    now = timezone.now()
    product.is_claimed = True
    product.claimed_by = user
    product.claimed_at = now
    product.user = user          # the existing Manage page edits the listing owned by request.user
    product.save(update_fields=['is_claimed', 'claimed_by', 'claimed_at', 'user'])

    ServiceOwnerClaim.objects.filter(product=product, status='approved').update(status='revoked')
    if claim is None:
        claim = ServiceOwnerClaim(product=product, user=user)
    claim.status, claim.method, claim.phone = 'approved', method, phone
    claim.reviewed_by, claim.reviewed_at = reviewer, now if reviewer else None
    claim.save()

    profile, _ = Profile.objects.get_or_create(user=user)
    if profile.role == 'customer':
        profile.role = 'service-owner'     # opens the Manage page; admins keep their role
        profile.save(update_fields=['role'])
    return claim


# ── Claim ────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def claim_state(request, pk):
    product = _vendor(pk)
    data = {'vendor_id': product._id, 'listing_status': vp.listing_status(product)}
    user = request.user
    if not user.is_authenticated:
        return Response(data | {'can_manage': False, 'logged_in': False})
    mobile = vp.listed_mobile(product)
    pending = ServiceOwnerClaim.objects.filter(product=product, user=user, status='pending').exists()
    data |= {
        'logged_in': True,
        'can_manage': vp.can_manage_as_owner(user, product),
        'claim_pending': pending,
        'blocked': vp.claim_blocker(user, product),
        'sms_blocked': vp.sms_claim_blocker(user, product),
        'listed_mobile': vp.mask_mobile(mobile),   # the number is already public on the listing
    }
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def claim_send_code(request, pk):
    product = _vendor(pk)
    user = request.user
    reason = vp.sms_claim_blocker(user, product)
    if reason:
        return _blocked(reason)

    if not cache.add(f'vclaim:resend:{product._id}', 1, RESEND_AFTER):
        return Response({'detail': 'A code was just sent. Please wait a minute before asking again.'},
                        status=status.HTTP_429_TOO_MANY_REQUESTS)
    if _count(f'vclaim:day:{product._id}', 86400) > MAX_CODES_PER_DAY or \
            _count(f'vclaim:userday:{user.id}', 86400) > MAX_USER_CODES_PER_DAY:
        return Response({'detail': 'Too many codes have been requested today. Please try again tomorrow, '
                                   'or send a claim request.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    code = f'{secrets.randbelow(10 ** 6):06d}'
    cache.set(_code_key(product, user), code, CODE_TTL)
    cache.delete(_tries_key(product, user))
    mobile = vp.listed_mobile(product)
    text = (f'{code} is your code to claim {(product.name or "your listing")[:40]} on WedMangal. '
            f'Valid 10 minutes. Do not share it with anyone.')
    sms_status, error = notifications.send_sms(mobile, text)
    if sms_status == notifications.Status.SKIPPED and settings.DEBUG:
        logger.warning('[DEV] claim code for vendor %s: %s', product._id, code)
    elif sms_status != notifications.Status.SENT:
        cache.delete(_code_key(product, user))
        cache.delete(f'vclaim:resend:{product._id}')
        logger.warning('Claim code for vendor %s not sent: %s', product._id, error)
        return Response({'detail': 'We could not send the code right now. Please try again later.'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    _event(EventType.CLAIM_STARTED, request, product, {'channel': 'sms'})
    return Response({'detail': f'We sent a 6-digit code to {vp.mask_mobile(mobile)}.',
                     'listed_mobile': vp.mask_mobile(mobile), 'expires_in': CODE_TTL})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def claim_verify(request, pk):
    from base.serializers import UserSerializerWithToken

    product = _vendor(pk)
    user = request.user
    entered = str(request.data.get('code', '')).strip()
    if not (len(entered) == 6 and entered.isdigit()):
        return Response({'detail': 'Enter the 6-digit code.'}, status=status.HTTP_400_BAD_REQUEST)

    tries = cache.get(_tries_key(product, user), 0)
    if tries >= MAX_TRIES:
        return Response({'detail': 'Too many incorrect attempts. Please request a new code.'},
                        status=status.HTTP_429_TOO_MANY_REQUESTS)
    stored = cache.get(_code_key(product, user))
    if not stored:
        return Response({'detail': 'This code has expired. Please request a new one.'},
                        status=status.HTTP_400_BAD_REQUEST)
    if not hmac.compare_digest(entered, stored):
        cache.set(_tries_key(product, user), tries + 1, CODE_TTL)
        return Response({'detail': f'Incorrect code. {MAX_TRIES - tries - 1} attempt(s) left.'},
                        status=status.HTTP_400_BAD_REQUEST)
    cache.delete(_code_key(product, user))
    cache.delete(_tries_key(product, user))

    with transaction.atomic():
        product = Product.objects.select_for_update().get(pk=product.pk)
        reason = vp.sms_claim_blocker(user, product)   # re-check under the lock
        if reason:
            return _blocked(reason)
        mobile = vp.listed_mobile(product)
        take_ownership(product, user, method='listed_phone_otp', phone=mobile)
        # The code proved this person holds the business phone, so let it log in to this
        # account too — only if the account has no phone yet and the number isn't someone else's.
        login_phone = ''
        current_phone = Profile.objects.filter(user=user).values_list('phone', flat=True).first()
        if not current_phone and not identity.phone_blocker(user, mobile):
            login_phone = vp.mask_mobile(mobile) if identity.attach_phone(user, mobile) else ''

    _event(EventType.CLAIM_SUBMITTED, request, product, {'channel': 'sms'})
    _event(EventType.CLAIM_APPROVED, request, product, {'channel': 'sms'})
    return Response({'detail': 'You now manage this listing.', 'listing_status': vp.listing_status(product),
                     'login_phone': login_phone, 'user': UserSerializerWithToken(user).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def claim_request(request, pk):
    product = _vendor(pk)
    user = request.user
    reason = vp.claim_blocker(user, product)
    if reason:
        return _blocked(reason)
    phone = normalize_indian_mobile(str(request.data.get('phone', '')))
    message = str(request.data.get('message', '')).strip()
    if not phone:
        return Response({'detail': 'Enter a 10-digit mobile number we can reach you on.'},
                        status=status.HTTP_400_BAD_REQUEST)
    if len(message) < 10:
        return Response({'detail': 'Tell us how you are connected to this business (at least 10 characters).'},
                        status=status.HTTP_400_BAD_REQUEST)
    claim, created = ServiceOwnerClaim.objects.get_or_create(
        product=product, user=user, status='pending',
        defaults={'phone': phone, 'message': message[:1000], 'method': 'admin_review'})
    if not created:
        return Response({'detail': 'Your request is already with WedMangal for review.', 'claim_pending': True})
    _event(EventType.CLAIM_SUBMITTED, request, product, {'channel': 'admin_review'})
    return Response({'detail': 'Thanks — WedMangal will review your request and contact you.',
                     'claim_pending': True}, status=status.HTTP_201_CREATED)


# ── Profile ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def vendor_profile(request, pk):
    product = get_object_or_404(Product, _id=pk)
    if not vp.can_manage(request.user, product):
        return Response({'detail': 'You do not manage this listing.'}, status=status.HTTP_403_FORBIDDEN)
    if request.method == 'GET':
        return Response(vp.owner_profile(product))

    # Only category details are accepted here; everything else (ownership, claim and
    # verification flags, provenance) is ignored by design. Basic fields stay on the Manage page.
    try:
        attributes, changed = vp.merge_attributes(product, request.data.get('attributes', {}))
    except vp.ProfileError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    if changed:
        product.attributes = attributes
        vp.stamp_sources(product, [f'attributes.{k}' for k in changed], vp.editor_source(request.user, product))
        product.save(update_fields=['attributes', 'data_sources'])
        _event(EventType.PROFILE_UPDATED, request, product, {'label': ','.join(changed)[:100]})
    return Response(vp.owner_profile(product) | {'changed': changed})
