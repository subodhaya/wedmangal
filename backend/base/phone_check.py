"""Enquiry phone numbers must belong to the person sending the enquiry.

A number counts as checked when either
  - the visitor is logged in and it is their account's phone (account phones are only ever
    set after a code: phone login, add-phone, or an admin registering a vendor), or
  - they typed the code we sent to it, and send back the signed `phone_token` we gave them.

The token says only "this number was checked"; it is signed, tied to the number, and
expires after TOKEN_MAX_AGE, so one check covers several enquiries in a visit.
Codes reuse the login sending (WhatsApp first, SMS otherwise) under their own cache keys.
"""
from django.core import signing

TOKEN_SALT = 'wedmangal.enquiry-phone'
TOKEN_MAX_AGE = 24 * 60 * 60
NEEDS_CHECK = 'Please confirm your mobile number with the code we send to it.'


def token_for(phone):
    return signing.dumps({'phone': phone}, salt=TOKEN_SALT, compress=True)


def account_phone(user):
    if not (user and user.is_authenticated):
        return ''
    profile = getattr(user, 'profile', None)
    return ''.join(ch for ch in str(getattr(profile, 'phone', '') or '') if ch.isdigit())[-10:]


def is_checked(request, phone, token):
    if phone and account_phone(request.user) == phone:
        return True
    if not isinstance(token, str) or not token:
        return False
    try:
        data = signing.loads(token, salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE)
    except signing.BadSignature:      # includes SignatureExpired
        return False
    return isinstance(data, dict) and data.get('phone') == phone


def needs_check_response():
    from rest_framework import status
    from rest_framework.response import Response
    return Response({'errors': {'phone': NEEDS_CHECK}, 'verify_phone': True},
                    status=status.HTTP_400_BAD_REQUEST)
