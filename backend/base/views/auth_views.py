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

logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = "729274233685-h48vkscuohkqt32n8o72ifik06g2cv0d.apps.googleusercontent.com"


def get_or_create_user_from_google(token):
    try:
        idinfo = id_token.verify_oauth2_token(token, Request(), GOOGLE_CLIENT_ID)

        email = idinfo.get('email')
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')
        first_name, *last_name = name.split(' ', 1)

        try:
            user = User.objects.get(email=email)
            created = False
        except User.DoesNotExist:
            # generate unique username if email is already taken as a username
            username = email
            if User.objects.filter(username=username).exists():
                username = f"{email.split('@')[0]}_{User.objects.count()}"
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name[0] if last_name else '',
            )
            created = True

        if created and picture and hasattr(user, 'profile'):
            try:
                user.profile.picture = picture
                user.profile.save()
            except Exception:
                pass

        logger.info(f"{'Created' if created else 'Found'} user: {user}")
        return user

    except ValueError as e:
        logger.error(f"Google token verification failed: {e}")
        raise AuthenticationFailed("Invalid Google token")

    except IntegrityError as e:
        logger.error(f"DB integrity error during user creation: {e}")
        raise AuthenticationFailed("Account creation failed, please try again")

    except Exception as e:
        logger.error(f"Error during user creation: {e}")
        raise AuthenticationFailed(f"Error creating user: {str(e)}")


class GoogleLogin(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        token = request.data.get('token')

        if not token:
            return Response({"error": "Token is required"}, status=400)

        try:
            user = get_or_create_user_from_google(token)

            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)

            response_data = {
                'access': access_token,
                'refresh': str(refresh),
                'token': access_token,
                'email': user.email,
                'id': user.id,
                '_id': user.id,
                'username': user.username,
                'name': user.first_name or user.username,
                'role': user.profile.role if hasattr(user, 'profile') else 'customer',
                'isAdmin': user.is_staff or user.is_superuser,
            }

            return Response(response_data, status=200)

        except AuthenticationFailed as e:
            return Response({"error": e.detail}, status=401)

        except Exception as e:
            logger.error(f"Unhandled error in GoogleLogin: {e}")
            return Response({"error": "Something went wrong"}, status=500)