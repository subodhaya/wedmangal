import random
import string
import requests as http_requests
from datetime import timedelta

from django.shortcuts import render, get_object_or_404
from django.contrib.auth.models import User
from django.core.cache import cache          # uses Django's cache (Redis in prod / LocMemCache in dev)
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from base.serializers import ProductSerializer, UserSerializer, UserSerializerWithToken
from base.permissions import IsAdmin
from base.models import Profile, Product, ServiceOwnerClaim

import os

# ── Config ─────────────────────────────────────────────────────────────────────
FAST2SMS_API_KEY  = os.environ.get('FAST2SMS_API_KEY', '')   # set in .env
OTP_EXPIRY_SECS   = 300          # OTP valid for 5 minutes
OTP_RATE_LIMIT    = 60           # seconds between resend requests per phone
MAX_VERIFY_TRIES  = 5            # lock out after 5 wrong attempts


# ── Helpers ────────────────────────────────────────────────────────────────────

def _generate_otp():
    """Secure 6-digit numeric OTP."""
    return ''.join(random.choices(string.digits, k=6))


def _cache_key_otp(phone):
    return f"claim_otp:{phone}"

def _cache_key_tries(phone):
    return f"claim_otp_tries:{phone}"

def _cache_key_rate(phone):
    return f"claim_otp_rate:{phone}"


def _send_otp_fast2sms(phone, otp):
    """
    Calls Fast2SMS Quick Transactional route (no website verification needed).
    Returns (success: bool, error_msg: str)
    """
    if not FAST2SMS_API_KEY:
        # Dev mode — just print, don't actually call API
        print(f"[DEV] OTP for {phone}: {otp}")
        return True, None

    url = "https://www.fast2sms.com/dev/bulkV2"
    params = {
        "authorization": FAST2SMS_API_KEY,
        "route":         "q",                        # q = Quick Transactional, no website verify needed
        "message":       f"{otp} is your WedMangal verification code. Valid for 5 minutes.",
        "language":      "english",
        "numbers":       phone,
    }
    try:
        resp = http_requests.get(url, params=params, timeout=10,
                                 headers={"cache-control": "no-cache"})
        data = resp.json()
        if data.get("return") is True:
            return True, None
        else:
            error = data.get("message", ["SMS delivery failed"])
            return False, error[0] if isinstance(error, list) else error
    except Exception as e:
        return False, str(e)


# ── Auth ───────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def getRoutes(request):
    routes = [
        '/api/users/',
        '/api/users/login/',
        '/api/users/register/',
        '/api/users/owner-register/',
        '/api/users/profile/',
        '/api/users/profile/update/',
        '/api/users/wedding-date/',
        '/api/users/claim/send-otp/',
        '/api/users/claim/verify-otp/',
        '/api/users/claim/<product_id>/',
        '/api/users/my-claims/',
    ]
    return Response(routes)


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        serializer = UserSerializerWithToken(self.user).data
        for k, v in serializer.items():
            data[k] = v
        return data


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


# ── User management ────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def user_list(request):
    users = User.objects.all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def wedding_date(request, user_id=None):
    user = request.user
    if request.method == 'POST':
        wedding_date = request.data.get('weddingDate')
        profile = Profile.objects.get(user=user)
        profile.wedding_date = wedding_date
        profile.save()
        return Response({'message': 'Wedding date saved successfully'})
    if request.method == 'GET' and user_id:
        profile = Profile.objects.get(user=user)
        return Response({'weddingDate': profile.wedding_date})


@csrf_exempt
@api_view(['POST'])
def registerUser(request):
    data = request.data
    try:
        user = User.objects.create_user(
            username=data['email'],
            email=data['email'],
            password=data['password'],
            first_name=data['name'],
        )
        profile, _ = Profile.objects.get_or_create(user=user, defaults={'role': 'customer'})
        serializer = UserSerializer(user, many=False)
        response_data = serializer.data
        response_data['role'] = profile.role
        return Response(response_data)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def registerOwner(request):
    data = request.data
    try:
        user = User.objects.create_user(
            username=data['email'],
            email=data['email'],
            password=data['password'],
            first_name=data['name'],
        )
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.role = 'service-owner'
        profile.save()
        serializer = UserSerializer(user, many=False)
        response_data = serializer.data
        response_data['role'] = profile.role
        return Response(response_data)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def updateUserProfile(request):
    data = request.data
    user = request.user
    try:
        user.first_name = data.get('name', user.first_name)
        user.email = data.get('email', user.email)
        password = data.get('password')
        if password:
            user.set_password(password)
        user.save()
        serializer = UserSerializer(user, many=False)
        return Response(serializer.data)
    except ValidationError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getUserProfile(request):
    user = request.user
    serializer = UserSerializer(user, many=False)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def getUsers(request):
    users = User.objects.all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def getUserById(request, pk):
    user = User.objects.get(id=pk)
    serializer = UserSerializer(user, many=False)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def updateUser(request, pk):
    user = User.objects.get(id=pk)
    data = request.data
    user.first_name = data['name']
    user.username   = data['email']
    user.email      = data['email']
    user.is_staff   = data['isAdmin']
    user.save()
    serializer = UserSerializer(user, many=False)
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def deleteUser(request, pk):
    userForDeletion = User.objects.get(id=pk)
    userForDeletion.delete()
    return Response('User was deleted')


# ── Service Owner Claim — OTP ──────────────────────────────────────────────────

@csrf_exempt
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def claim_send_otp(request):
    """
    POST /api/users/claim/send-otp/
    Body: { "phone": "9876543210", "product_id": 42 }

    Generates OTP, stores in cache, sends via Fast2SMS.
    Rate-limited: 1 request per 60 seconds per phone.
    """
    phone      = ''.join(filter(str.isdigit, request.data.get('phone', '')))
    product_id = request.data.get('product_id')

    # ── Validate phone ─────────────────────────────────
    if len(phone) != 10:
        return Response(
            {'detail': 'Please provide a valid 10-digit mobile number.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ── Validate product ───────────────────────────────
    product = get_object_or_404(Product, _id=product_id)

    # ── Already claimed by someone else ───────────────
    if product.is_claimed and product.claimed_by != request.user:
        return Response(
            {'detail': 'This listing is already claimed by another service owner.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ── Rate limit check ───────────────────────────────
    if cache.get(_cache_key_rate(phone)):
        return Response(
            {'detail': f'Please wait {OTP_RATE_LIMIT} seconds before requesting a new code.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    # ── Generate & store OTP ───────────────────────────
    otp = _generate_otp()
    cache.set(_cache_key_otp(phone),   otp, timeout=OTP_EXPIRY_SECS)
    cache.set(_cache_key_rate(phone),  '1', timeout=OTP_RATE_LIMIT)
    cache.delete(_cache_key_tries(phone))  # reset wrong attempts

    # ── Send SMS ───────────────────────────────────────
    success, error = _send_otp_fast2sms(phone, otp)
    if not success:
        return Response(
            {'detail': f'SMS delivery failed: {error}. Please try again.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    return Response({
        'detail': f'Verification code sent to +91 {phone}. Valid for 5 minutes.',
        'phone': phone,
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def claim_verify_otp(request):
    """
    POST /api/users/claim/verify-otp/
    Body: { "phone": "9876543210", "otp": "482916", "product_id": 42 }

    Verifies OTP. On success:
    - Marks product as claimed
    - Creates ServiceOwnerClaim audit record
    - Upgrades user role to service-owner
    - Returns fresh JWT token
    """
    phone      = ''.join(filter(str.isdigit, request.data.get('phone', '')))
    entered    = str(request.data.get('otp', '')).strip()
    product_id = request.data.get('product_id')
    user       = request.user

    # ── Basic validation ───────────────────────────────
    if len(phone) != 10:
        return Response({'detail': 'Invalid phone number.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(entered) != 6 or not entered.isdigit():
        return Response({'detail': 'OTP must be a 6-digit number.'}, status=status.HTTP_400_BAD_REQUEST)

    product = get_object_or_404(Product, _id=product_id)

    # ── Already claimed by this user ──────────────────
    if product.is_claimed and product.claimed_by == user:
        return Response({
            'detail': 'You have already claimed this listing.',
            'is_claimed': True,
            'claimed_by_me': True,
            'role': 'service-owner',
        }, status=status.HTTP_200_OK)

    # ── Already claimed by someone else ───────────────
    if product.is_claimed and product.claimed_by != user:
        return Response(
            {'detail': 'This listing is already claimed by another service owner.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ── Brute force protection ─────────────────────────
    tries = cache.get(_cache_key_tries(phone), 0)
    if tries >= MAX_VERIFY_TRIES:
        return Response(
            {'detail': 'Too many incorrect attempts. Please request a new code.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    # ── Fetch stored OTP ───────────────────────────────
    stored_otp = cache.get(_cache_key_otp(phone))
    if not stored_otp:
        return Response(
            {'detail': 'Verification code has expired. Please request a new one.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ── Wrong OTP ──────────────────────────────────────
    if entered != stored_otp:
        cache.set(_cache_key_tries(phone), tries + 1, timeout=OTP_EXPIRY_SECS)
        remaining = MAX_VERIFY_TRIES - tries - 1
        return Response(
            {'detail': f'Incorrect code. {remaining} attempt(s) remaining.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ── OTP correct — clean up cache ───────────────────
    cache.delete(_cache_key_otp(phone))
    cache.delete(_cache_key_tries(phone))
    cache.delete(_cache_key_rate(phone))

    # ── Claim the listing ──────────────────────────────
    product.is_claimed  = True
    product.claimed_by  = user
    product.claimed_at  = timezone.now()
    product.user        = user        # transfer ownership → ManagePage works immediately
    product.save()

    # ── Audit record ───────────────────────────────────
    ServiceOwnerClaim.objects.filter(product=product, status='approved').update(status='revoked')
    ServiceOwnerClaim.objects.create(
        product=product,
        user=user,
        phone=phone,
        status='approved',
    )

    # ── Upgrade role to service-owner ─────────────────
    profile = Profile.objects.get(user=user)
    profile.role = 'service-owner'
    profile.save()

    # ── Return fresh JWT so frontend updates instantly ─
    serializer = UserSerializerWithToken(user, many=False)
    return Response({
        'detail': 'Listing successfully claimed!',
        'is_claimed': True,
        'claimed_by_me': True,
        'role': 'service-owner',
        'user': serializer.data,   # frontend: localStorage.setItem('userInfo', JSON.stringify(data.user))
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_claimed_listings(request):
    """
    GET /api/users/my-claims/
    Returns all listings claimed by the logged-in service owner.
    """
    claims = ServiceOwnerClaim.objects.filter(
        user=request.user,
        status='approved'
    ).select_related('product')

    data = [{
        'claim_id':    c.id,
        'product_id':  c.product._id,
        'product_name': c.product.name,
        'product_city': c.product.city,
        'claimed_at':  c.claimed_at,
    } for c in claims]

    return Response(data, status=status.HTTP_200_OK)