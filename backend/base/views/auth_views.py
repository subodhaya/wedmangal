import logging
from google.auth.transport.requests import Request
from google.oauth2 import id_token
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.db import IntegrityError
from rest_framework.exceptions import AuthenticationFailed

from base import identity

logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = "729274233685-h48vkscuohkqt32n8o72ifik06g2cv0d.apps.googleusercontent.com"


def verify_google_token(token):
    """The verified identity in a Google ID token, or AuthenticationFailed."""
    try:
        idinfo = id_token.verify_oauth2_token(token, Request(), GOOGLE_CLIENT_ID)
    except ValueError as e:
        logger.warning(f"Google token verification failed: {e}")
        raise AuthenticationFailed("Invalid Google token")
    if not idinfo.get('email') or not idinfo.get('email_verified'):
        raise AuthenticationFailed("Your Google account has no verified e-mail address")
    return idinfo


def get_or_create_user_from_google(token):
    """Log in to the account that already uses this (Google-verified) e-mail, whichever way it
    was created; otherwise create a new customer account."""
    idinfo = verify_google_token(token)
    email = idinfo['email'].strip()
    user = identity.preferred_account(identity.users_with_email(email))
    if user is not None:
        logger.info(f"Google login to existing account {user.id}")
        return user

    name = idinfo.get('name', '')
    first_name, *last_name = name.split(' ', 1)
    username = email
    if User.objects.filter(username__iexact=username).exists():
        username = f"{email.split('@')[0]}_{User.objects.count()}"
    try:
        user = User.objects.create_user(
            username=username, email=email,
            first_name=first_name[:150], last_name=(last_name[0] if last_name else '')[:150],
        )
    except IntegrityError as e:
        logger.error(f"DB integrity error during Google user creation: {e}")
        raise AuthenticationFailed("Account creation failed, please try again")
    user.set_unusable_password()   # Google (or a phone code, once linked) is how this account logs in
    user.save(update_fields=['password'])
    logger.info(f"Created user {user.id} from Google login")
    return user


class GoogleLogin(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        from base.serializers import UserSerializerWithToken

        token = request.data.get('token')
        if not token:
            return Response({"error": "Token is required", "detail": "Token is required"}, status=400)
        try:
            user = get_or_create_user_from_google(token)
        except AuthenticationFailed as e:
            return Response({"error": e.detail, "detail": e.detail}, status=401)
        except Exception as e:
            logger.exception(f"Unhandled error in GoogleLogin: {e}")
            return Response({"error": "Something went wrong", "detail": "Something went wrong"}, status=500)

        refresh = RefreshToken.for_user(user)
        # Same shape as the password and phone logins, so the frontend treats them alike.
        data = dict(UserSerializerWithToken(user).data)
        data.update({'access': str(refresh.access_token), 'refresh': str(refresh), 'token': str(refresh.access_token)})
        return Response(data, status=200)
