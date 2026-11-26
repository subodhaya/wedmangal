"""Confirm an enquiry phone number with a code (see base/phone_check.py).

    POST /api/analytics/phone/send-code/  {"phone": "9876543210"}
    POST /api/analytics/phone/verify/     {"phone": "9876543210", "otp": "123456"}  → {"phone_token": "..."}

Same code sending, expiry, resend wait and wrong-code limit as phone login, under separate keys,
so a pending login code is never replaced. No account is created or touched.
"""
from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from base import analytics, phone_check
from base.views import user_views as codes

PURPOSE = 'enquiry'


class SendAnonThrottle(AnonRateThrottle):      # every code can cost an SMS
    scope, rate = 'enquiry_code_anon', '6/hour'


class SendUserThrottle(UserRateThrottle):
    scope, rate = 'enquiry_code_user', '10/hour'


def _phone(request):
    return analytics.normalize_indian_mobile(str(request.data.get('phone') or ''))


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([SendAnonThrottle, SendUserThrottle])
def send_code(request):
    phone = _phone(request)
    if not phone:
        return Response({'detail': 'Enter a valid 10-digit Indian mobile number.'}, status=status.HTTP_400_BAD_REQUEST)
    if cache.get(codes._cache_key_rate(phone, PURPOSE)):
        return Response({'detail': f'Please wait {codes.OTP_RATE_LIMIT} seconds before asking for a new code.'},
                        status=status.HTTP_429_TOO_MANY_REQUESTS)

    previous = cache.get(codes._cache_key_otp(phone, PURPOSE))
    code = codes._generate_otp()
    cache.set(codes._cache_key_otp(phone, PURPOSE), code, timeout=codes.OTP_EXPIRY_SECS)
    cache.set(codes._cache_key_rate(phone, PURPOSE), '1', timeout=codes.OTP_RATE_LIMIT)
    cache.delete(codes._cache_key_tries(phone, PURPOSE))

    sent, error, channel = codes._send_login_code(phone, code, previous is not None)
    if not sent:
        if previous:   # the code they already have keeps working
            cache.set(codes._cache_key_otp(phone, PURPOSE), previous, timeout=codes.OTP_EXPIRY_SECS)
        else:
            cache.delete(codes._cache_key_otp(phone, PURPOSE))
        cache.delete(codes._cache_key_rate(phone, PURPOSE))
        return Response({'detail': 'We couldn’t send the code. Please try again.'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response({'phone': phone, 'channel': channel})


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_code(request):
    phone = _phone(request)
    entered = str(request.data.get('otp') or '').strip()
    if not phone:
        return Response({'detail': 'Enter a valid 10-digit Indian mobile number.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(entered) != 6 or not entered.isdigit():
        return Response({'detail': 'Enter the 6-digit code.'}, status=status.HTTP_400_BAD_REQUEST)

    tries = cache.get(codes._cache_key_tries(phone, PURPOSE), 0)
    if tries >= codes.MAX_VERIFY_TRIES:
        return Response({'detail': 'Too many wrong codes. Please ask for a new one.'},
                        status=status.HTTP_429_TOO_MANY_REQUESTS)
    stored = cache.get(codes._cache_key_otp(phone, PURPOSE))
    if not stored:
        return Response({'detail': 'This code has expired. Please ask for a new one.'},
                        status=status.HTTP_400_BAD_REQUEST)
    if entered != stored:
        cache.set(codes._cache_key_tries(phone, PURPOSE), tries + 1, timeout=codes.OTP_EXPIRY_SECS)
        left = codes.MAX_VERIFY_TRIES - tries - 1
        return Response({'detail': f'Wrong code. {left} attempt(s) left.'}, status=status.HTTP_400_BAD_REQUEST)

    for key in (codes._cache_key_otp, codes._cache_key_tries, codes._cache_key_rate):
        cache.delete(key(phone, PURPOSE))
    return Response({'phone': phone, 'phone_token': phone_check.token_for(phone)})
