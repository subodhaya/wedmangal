from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth.models import User
from base.serializers import ProductSerializer, UserSerializer, UserSerializerWithToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.hashers import make_password
from rest_framework import status
from django.core.exceptions import ValidationError
from rest_framework.permissions import AllowAny

# user_view.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from base.permissions import IsAdmin
from base.models import User, Profile
from django.shortcuts import get_object_or_404


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def user_list(request):
    users = User.objects.all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)



@api_view(['GET'])
def getRoutes(request):
    routes = [
        '/api/users/',
        
        '/api/users/<id>/',
        '/api/users/delete/<id>/',
        '/api/users/<update>/<id>/',
        '/api/users/login/',  # Ensure this is included
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



@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def wedding_date(request, user_id=None):
    print("wedding date")
    user = request.user
    if request.method == 'POST':
        # Update the wedding date
        wedding_date = request.data.get('weddingDate')
        profile = Profile.objects.get(user=user)
        profile.wedding_date = wedding_date
        profile.save()
        return Response({'message': 'Wedding date saved successfully'})
    
    if request.method == 'GET' and user_id:
        # Fetch the wedding date
        profile = Profile.objects.get(user=user)
        return Response({'weddingDate': profile.wedding_date})

@api_view(['POST'])
def registerUser(request):
    data = request.data
    try:
        # Create the User object
        user = User.objects.create_user(
            username=data['email'],
            email=data['email'],
            password=data['password'],
            first_name=data['name'],
        )

        # Check if the profile already exists before creating it
        profile, created = Profile.objects.get_or_create(
            user=user,
            defaults={'role': 'Customer'}
        )

        # Serialize the User object
        serializer = UserSerializer(user, many=False)

        # Optionally, return the role in the response
        response_data = serializer.data
        response_data['role'] = profile.role

        return Response(response_data)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def registerOwner(request):
    data = request.data
    try:
        # Create the User object
        user = User.objects.create_user(
            username=data['email'],
            email=data['email'],
            password=data['password'],
            first_name=data['name'],
        )

        # Get or create the Profile and ensure the role is set to 'Service Owner'
        profile, created = Profile.objects.get_or_create(user=user)
        if not created:
            profile.role = 'service-owner'
        else:
            profile.role = 'service-owner'
        profile.save()

        # Serialize the User object
        serializer = UserSerializer(user, many=False)

        # Return the role in the response
        response_data = serializer.data
        response_data['role'] = profile.role

        return Response(response_data)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)





        
     

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def updateUserProfile(request):
    if request.method == 'PUT':
        data = request.data
        user = request.user
        
        try:
            # Update user fields based on provided data
            user.first_name = data.get('name', user.first_name)
            user.email = data.get('email', user.email)
            
            # Only update password if provided
            password = data.get('password')
            if password:
                user.set_password(password)
            
            user.save()
            
            # Serialize updated user data
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
    print(f"Authenticated user: {user}")
    serializer = UserSerializer(user, many=False)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def getUsers(request):
    users = User.objects.all()
    print("View users accessed")
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def getUserById(request, pk):
    user = User.objects.get(id=pk)
    print("View accessed")
    serializer = UserSerializer(user, many=False)
    print("View eaccessed")
    return Response(serializer.data)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def updateUser(request, pk):
    
    user = User.objects.get(id=pk)
    data = request.data
    user.first_name = data['name']
    user.username = data['email']
    user.email = data['email']
    user.is_staff = data['isAdmin']
    user.save()
    serializer = UserSerializer(user, many=False)
    return Response(serializer.data)

@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def deleteUser(request, pk):
    userForDeletion = User.objects.get(id=pk)
    userForDeletion.delete()
    return Response('User was deleted')


