"""Admin: register a vendor's business for a client.

    GET  /api/products/admin/client-account/?phone=&email=   which account the business would go to
    POST /api/products/admin/register-for-client/            create/find the account + register the business

Clients often already have an account — made by logging in with their phone (OTP)
or e-mail — and ask WedMangal to list their business for them. The business is
added to THAT account, so whatever way they log in, they land on their business.

Accounts are found, never joined (see base/identity.py — joining needs proof):
  * phone  → the account whose Profile.phone is this number
  * e-mail → the account with this e-mail
  * both given but on two different accounts → refused; the admin picks one
  * neither found → a new account is created with what was given
A phone or e-mail is never attached to someone's existing account on the admin's word.
"""
import re

from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from base import identity
from base.models import Profile
from base.views.product_views import _is_admin, register_product_for

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def _clean_phone(raw):
    digits = re.sub(r'\D', '', raw or '')
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    if len(digits) == 11 and digits.startswith('0'):
        digits = digits[1:]
    return digits


def _describe(user):
    profile = getattr(user, 'profile', None)
    product = getattr(user, 'product', None)
    ways = []
    if profile and profile.phone:
        ways.append('phone')
    if user.email and user.has_usable_password():
        ways.append('email_password')
    if user.email:
        ways.append('google')
    return {
        'id': user.id,
        'name': user.first_name or '',
        'email': user.email or '',
        'phone': (profile.phone if profile else '') or '',
        'role': getattr(profile, 'role', '') or '',
        'is_staff': user.is_staff,
        'login_methods': ways,
        'business': {'id': product._id, 'name': product.name} if product else None,
        'joined': user.date_joined.date().isoformat() if user.date_joined else None,
    }


def _resolve(phone, email):
    """-> (user_or_None, problem_or_None). problem is a Response-ready dict."""
    if not phone and not email:
        return None, {'detail': "Enter the client's phone number or e-mail."}
    if phone and len(phone) != 10:
        return None, {'detail': 'Enter a valid 10-digit mobile number.'}
    if email and not EMAIL_RE.match(email):
        return None, {'detail': 'Enter a valid e-mail address.'}

    by_phone = None
    if phone:
        holder = Profile.objects.filter(phone=phone, user__is_active=True).select_related('user').first()
        by_phone = holder.user if holder else None
    by_email = identity.preferred_account(identity.users_with_email(email)) if email else None

    if by_phone and by_email and by_phone.id != by_email.id:
        return None, {
            'detail': 'This phone and this e-mail belong to two different accounts. '
                      'Keep only the one the client actually logs in with.',
            'conflict': {'phone_account': _describe(by_phone), 'email_account': _describe(by_email)},
        }
    return by_phone or by_email, None


def _admin_only(request):
    if not _is_admin(request.user):
        return Response({'detail': 'Admins only.'}, status=status.HTTP_403_FORBIDDEN)
    return None


def _blocker(user):
    """Why this account can't receive a business, or None."""
    if user.is_staff or getattr(getattr(user, 'profile', None), 'role', '') == 'admin':
        return 'This is a WedMangal admin account. Use the client\'s own phone or e-mail.'
    product = getattr(user, 'product', None)
    if product:
        return f'This account already has a business: "{product.name}" (#{product._id}). Edit it from the Services List instead.'
    return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_account(request):
    denied = _admin_only(request)
    if denied:
        return denied
    phone = _clean_phone(request.query_params.get('phone'))
    email = (request.query_params.get('email') or '').strip()
    user, problem = _resolve(phone, email)
    if problem:
        return Response(problem, status=status.HTTP_409_CONFLICT if 'conflict' in problem else status.HTTP_400_BAD_REQUEST)
    if user is None:
        return Response({'found': False, 'will_create': {'phone': phone, 'email': email}})
    return Response({
        'found': True,
        'matched_by': 'phone' if phone and getattr(user.profile, 'phone', None) == phone else 'email',
        'account': _describe(user),
        'blocked': _blocker(user),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_for_client(request):
    denied = _admin_only(request)
    if denied:
        return denied

    phone = _clean_phone(request.data.get('client_phone'))
    email = (request.data.get('client_email') or '').strip()
    name = (request.data.get('client_name') or '').strip()
    password = request.data.get('client_password') or ''

    user, problem = _resolve(phone, email)
    if problem:
        return Response(problem, status=status.HTTP_409_CONFLICT if 'conflict' in problem else status.HTTP_400_BAD_REQUEST)

    if user is not None:
        reason = _blocker(user)
        if reason:
            return Response({'detail': reason}, status=status.HTTP_400_BAD_REQUEST)
    elif not phone and not password:
        return Response({'detail': 'A new account needs the client\'s phone number (they log in with a code), '
                                   'or an e-mail with a temporary password.'},
                        status=status.HTTP_400_BAD_REQUEST)
    elif password and len(password) < 6:
        return Response({'detail': 'Temporary password must be at least 6 characters.'},
                        status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        created = user is None
        if created:
            username = email or phone
            if User.objects.filter(username__iexact=username).exists():
                return Response({'detail': f'An account with the username "{username}" already exists.'},
                                status=status.HTTP_400_BAD_REQUEST)
            user = User(username=username, email=email, first_name=name)
            if password:
                user.set_password(password)
            else:
                user.set_unusable_password()
            user.save()
            # base.signals created a blank Profile; fill the same cached instance
            user.profile.phone = phone or None
            user.profile.role = 'service-owner'
            user.profile.save()
        else:
            if name and not user.first_name:
                user.first_name = name
                user.save(update_fields=['first_name'])
            if user.profile.role == 'customer':
                user.profile.role = 'service-owner'
                user.profile.save(update_fields=['role'])

        response = register_product_for(user, request)
        if response.status_code >= 400:
            transaction.set_rollback(True)      # no half-made account or role change
            return response

    user.refresh_from_db()
    data = dict(response.data)
    data.update({'created_account': created, 'account': _describe(user)})
    return Response(data, status=status.HTTP_201_CREATED)
