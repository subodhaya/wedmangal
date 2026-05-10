import logging
from google.auth.transport.requests import Request
from google.oauth2 import id_token
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from rest_framework.exceptions import AuthenticationFailed

# Set up logging
logger = logging.getLogger(__name__)

def get_or_create_user_from_google(token):
    try:
        # Verify the token using Google's ID token verification endpoint
        GOOGLE_CLIENT_ID = "729274233685-h48vkscuohkqt32n8o72ifik06g2cv0d.apps.googleusercontent.com"
       # GOOGLE_CLIENT_ID = "280404144707-bmoon3dudmvgv3vuvihft0uem3elk32b.apps.googleusercontent.com"
        idinfo = id_token.verify_oauth2_token(token, Request(), GOOGLE_CLIENT_ID)

        logger.debug(f"Decoded Google ID token: {idinfo}")
        
        # Extract user details from the token
        email = idinfo.get('email')
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')
        first_name, *last_name = name.split(' ', 1)

        # Check if the user exists, otherwise create a new one
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,  # Use email as the username
                "first_name": first_name,
                "last_name": last_name[0] if last_name else '',
            }
        )

        logger.info(f"{'Created' if created else 'Found'} user: {user}")
        return user

    except ValueError as e:
        logger.error(f"Google token verification failed: {e}")
        raise AuthenticationFailed("Invalid Google token")
    except Exception as e:
        logger.error(f"Error during user creation: {e}")
        raise AuthenticationFailed(f"Error creating user: {str(e)}")
class GoogleLogin(APIView):
    def post(self, request, *args, **kwargs):
        logger.debug(f"Received data: {request.data}")
        
        token = request.data.get('token')
        if not token:
            return Response({"error": "Token is required"}, status=400)

        try:
            # Get or create the user from the Google token
            user = get_or_create_user_from_google(token)
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)

            # Check if the user is an admin
            is_admin = user.is_staff or user.is_superuser  # Assuming is_staff and is_superuser indicate admin status
            
            # Prepare the response payload
            response_data = {
                'access': access_token,
                'refresh': str(refresh),
                'token': access_token,  # Include this for backward compatibility if needed
            
                    'email': user.email,
                    'id': user.id,
                    '_id': user.id,  # Duplicate of `id` if your frontend expects `_id`
                    'username': user.username,
                    'name': user.first_name or user.username,  # Default to username if no first name
                    'role': user.profile.role if hasattr(user, 'profile') else 'customer',  # Use the role from the Profile model
                    'isAdmin': is_admin,  # Admin flag
                
            }

            # Return the response
            return Response(response_data, status=200)
        except AuthenticationFailed as e:
            return Response({"error": str(e)}, status=401)
        except Exception as e:
            logger.error(f"Unhandled error: {e}")
            return Response({"error": "Something went wrong"}, status=500)
