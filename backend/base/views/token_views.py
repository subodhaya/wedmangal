
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.views import TokenRefreshView
from django.http import JsonResponse
from django.utils.decorators import method_decorator

# Properly define the refresh token view
@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenRefreshView(TokenRefreshView):
    pass

def cors_debug_view(request):
    print("🔍 CORS Debug - Request Headers:")
    for key, value in request.headers.items():
        print(f"{key}: {value}")

    return JsonResponse({"message": "CORS Debugging Successful"}, status=200)

@csrf_exempt
def refresh_token_view(request, *args, **kwargs):
    print("Received request to refresh token")
    response = TokenRefreshView.as_view()(request, *args, **kwargs)
    print("Token refresh response:", response.status_code)
    return response