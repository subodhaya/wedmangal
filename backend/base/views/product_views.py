from django.shortcuts import render

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Sum, Count, Avg
from django.utils.dateformat import format as date_format
from django.db import transaction
from rest_framework import generics
from rest_framework import status
from base.models import  Service,ServiceImage,CartItem,ShippingAddress,Order,Profile,Wishlist
from base.serializers import ProductSerializer,OrderSerializer, ServiceSerializer,DetailedServiceSerializer,ProductReviewSerializer,ServiceImageSerializer,DetailedProductSerializer,User
from rest_framework.permissions import IsAuthenticated
import os
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from base.models import Product, Review,OrderItem
from rest_framework import status
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from decimal import Decimal,InvalidOperation
from django.core.exceptions import ValidationError
from django.db.models import Avg
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from base.models import CartItem
from base.serializers import CartItemSerializer,WishlistSerializer
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.views import TokenRefreshView

import json
import urllib.request

from rest_framework import status
# product_view.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from base.permissions import IsAdminOrReadOnly, IsProductManager
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from base.decorators import admin_only, product_manager_only





@admin_only
def admin_view(request):
    # Your admin-specific logic
    return JsonResponse({'message': 'Admin view'})

@product_manager_only
def product_manager_view(request):
    # Your product manager-specific logic
    return JsonResponse({'message': 'Product manager view'})



@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsProductManager])
def product_list(request):
    if request.method == 'GET':
        products = Product.objects.all()
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)
    elif request.method == 'POST':
        serializer = ProductSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsProductManager])
def create_product(request):
    serializer = ProductSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def create_service(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        count_in_stock = request.POST.get('countInStock')
        image = request.FILES.get('image')

        service = Service.objects.create(
            name=name,
            countInStock=count_in_stock,
        )
        ServiceImage.objects.create(service=service, image=image)
        return JsonResponse({'message': 'Service created successfully'})



@api_view(['GET'])
def getRoutes(request):
   
    # Retrieve all routes from the database
    routes=[
        '/api/products/all',
        '/api/products/create/',
        '/api/products/upload/',
        '/api/products/<id>/reviews/',
        '/api/products/top/',
        '/api/products/<id>/',
        '/api/products/delete/<id>/',
        '/api/products/<update>/<id>/',
        '/api/products/bookings/<int:order_id>/dates/',
        '/api/products/search/'
    ]
    
    return Response(routes)



@api_view(['GET'])
def getProducts1(request):
    # Retrieve keyword from query parameters
    query = request.query_params.get('keyword', '')
    
    # Filter products based on keyword and approval status
    products = Product.objects.filter(name__icontains=query, is_approved=True).order_by('-createdAt')

    # Pagination setup
    page = request.query_params.get('page', 1)  # Default to page 1 if not provided
    paginator = Paginator(products, 8)  # Show 8 products per page

    try:
        products_page = paginator.page(page)
    except PageNotAnInteger:
        products_page = paginator.page(1)  # If page is not an integer, deliver first page
    except EmptyPage:
        products_page = paginator.page(paginator.num_pages)  # If page is out of range, deliver last page of results

    # Serialize the page of products
    serializer = ProductSerializer(products_page, many=True)
    #print(serializer.data)
    
    return Response({
        'products': serializer.data,
        'page': int(page),
        'pages': paginator.num_pages
    })





@api_view(['GET'])
def getProducts(request):
    # Get the keyword, category, and page number from the request
    keyword = request.query_params.get('keyword', '')
    category = request.query_params.get('category', '') 
    print("keyword:",keyword)
    print(category)
     # Get category filter
    page = request.query_params.get('page', 1)

    # Filter products based on keyword and category, only fetching approved products
    products_page = Product.objects.filter(is_approved=True)
    #print(products_page)
    
    if keyword:
        products_page=Product.objects.filter(category__icontains=keyword,is_approved=True)
        print(products_page)
        #products_page = products_page.filter(name__icontains=keyword)
       
    
    if category:
        

        products_page = Product.objects.filter(category__iexact=category,is_approved=True)
        #print(products_page)  # Case-insensitive match for category

    products_page = products_page.order_by('-createdAt')  # Order by newest

    # Pagination
    paginator = Paginator(products_page, 10)  # 10 products per page
    products_page = paginator.get_page(page)

    response_data = []

    for product in products_page:
        # Calculate total number of reviews and average rating from related services
        services = product.services.all()
        total_num_reviews = services.aggregate(total_reviews=Sum('numReviews'))['total_reviews'] or 0
        average_rating = services.aggregate(avg_rating=Avg('rating'))['avg_rating'] or 1.0  # Default rating is 1.0

        # Create a dictionary for the product with the additional fields
        product_data = {
            '_id': product._id,
            'name': product.name,
            'image': str(product.image),  # Convert ImageFieldFile to string path
            'brand': product.brand,
            'category': product.category,
            'description': product.description,
            'createdAt': product.createdAt,
            'city': product.city,
            'area_name': product.area_name, 
            'address': product.address,
            'business_phone': product.business_phone,
            'personal_phone': product.personal_phone,
            'opening_time': product.opening_time, 
            'closing_time': product.closing_time, 
            'is_approved': product.is_approved,
            'total_num_reviews': total_num_reviews,
            'average_rating': float(average_rating),  # Convert Decimal to float
        }
        
        response_data.append(product_data)

    return Response({
        'products': response_data,
        'page': int(page),
        'pages': paginator.num_pages
    })


class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    def get_object(self):
        # Override to get the object based on the provided ID
        pk = self.kwargs.get('pk')
        return Product.objects.get(pk=pk)
    



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_product(request, user_id):
    try:
        # Retrieve the product associated with the given user_id
        product = Product.objects.get(user_id=user_id)

        # Prepare the data to update the product
        product_data = {
            'name': request.data.get('name', product.name),
            'brand': request.data.get('brand', product.brand),
            'category': request.data.get('category', product.category),
            'description': request.data.get('description', product.description),
            'city': request.data.get('city', product.city),
            'area_name': request.data.get('area_name', product.area_name),
            'address': request.data.get('address', product.address),
            'business_phone': request.data.get('business_phone', product.business_phone),
            'personal_phone': request.data.get('personal_phone', product.personal_phone),
            'opening_time': request.data.get('opening_time', product.opening_time),
            'closing_time': request.data.get('closing_time', product.closing_time),
            'is_approved': request.data.get('isApproved', str(product.is_approved)) == 'true'
        }

        # Check if there's a new image to upload
        if 'image' in request.FILES:
            product_data['image'] = request.FILES['image']

        # Serialize and update product data
        product_serializer = ProductSerializer(product, data=product_data, partial=True)
        if product_serializer.is_valid():
            product_serializer.save()
            return Response({'detail': 'Product updated successfully'}, status=status.HTTP_200_OK)
        else:
            return Response(product_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Product.DoesNotExist:
        return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)


@csrf_exempt
@api_view(['POST'])

def cart_sync(request):
    items = request.data.get('items', [])
    print(items)
    
    if not items:
        return Response({"error": "No items provided"}, status=status.HTTP_400_BAD_REQUEST)

    for item in items:
        # Ensure 'userId' is renamed to 'user'
        item['user'] = item.pop('userId', None)
        
        # Check if user is valid
        if item['user'] is None:
            print(f"Invalid user field after renaming: {item}")
            return Response({"error": "Invalid or missing userId for one or more items"}, status=status.HTTP_400_BAD_REQUEST)

        # Set default value for countInStock
        if 'countInStock' not in item:
            item['countInStock'] = 50

        serializer = CartItemSerializer(data=item)
        if serializer.is_valid():
            serializer.save()
            print("Item saved successfully:", serializer.data)
        else:
            # Debugging output for serializer errors
            print(f"Validation errors for item {item}: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    return Response({"success": "Cart items synced successfully"}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_product(request):
    user = request.user
    try:
        # Directly access the user's product
        product = user.product  
        if product:
            serializer = ProductSerializer(product, many=False)
            return Response(serializer.data)
        else:
            return Response({"detail": "No product found."}, status=200)
    except Product.DoesNotExist:
        return Response({"product": None, "detail": "No product associated with this user."}, status=200)
    except Exception as e:
        return Response({"detail": str(e)}, status=500)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])        
def wishlist_sync(request):
    items = request.data.get('items', {})
    
    if not items:
        return Response({"error": "No items provided in the request."}, status=status.HTTP_400_BAD_REQUEST)
    
    if not isinstance(items, dict):
        print("Invalid items format")
        return Response({"error": "Invalid items format. Expected a dictionary."}, status=status.HTTP_400_BAD_REQUEST)
    
    for user_id, product_list in items.items():
        print(f"Processing wishlist for user ID: {user_id}")

        if not isinstance(product_list, list):
            return Response({"error": f"Invalid format for wishlist ID {user_id}. Expected a list of items."}, status=status.HTTP_400_BAD_REQUEST)

        # Get existing wishlist items for the user
        existing_wishlist_items = Wishlist.objects.filter(user=user_id)
        existing_product_ids = set(existing_wishlist_items.values_list('product_id', flat=True))

        # Extract incoming product IDs from the request
        incoming_product_ids = {int(item['_id']) for item in product_list if '_id' in item}
        
        # Determine items to delete (present in backend but not in the incoming list)
        to_delete = existing_wishlist_items.exclude(product_id__in=incoming_product_ids)
        to_delete_count = to_delete.count()
        to_delete.delete()
        if to_delete_count > 0:
            print(f"Deleted {to_delete_count} items from the wishlist for user {user_id}.")

        # Process each product in the wishlist
        for item in product_list:
            product_id = item.get('_id')
            if not product_id:
                return Response({"error": "Missing product ID in item"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                product = Product.objects.get(_id=int(product_id))
            except Product.DoesNotExist:
                print(f"Product with ID {product_id} does not exist.")
                return Response({"error": f"Product not found for product ID {product_id}"}, status=status.HTTP_400_BAD_REQUEST)

            # Check if the product is already in the wishlist
            if int(product_id) in existing_product_ids:
                print(f"Product {product_id} already exists in the wishlist for user {user_id}. Skipping...")
                continue

            # Prepare data for serializer
            item['user'] = int(user_id)
            item['product'] = product._id

            # Remove unnecessary fields
            item.pop('services', None)
            item.pop('_id', None)

            # Serialize and save
            serializer = WishlistSerializer(data=item)
            if serializer.is_valid():
                serializer.save()
                print(f"Added product {product_id} to the wishlist for user {user_id}.")
            else:
                print("Serializer errors:", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    return Response({"success": "Wishlist items synced successfully"}, status=status.HTTP_200_OK)

@api_view(['GET'])
def getProductRelated(request, pk):
    try:
        product = Product.objects.prefetch_related('services').get(_id=pk)
        serializer = ProductSerializer(product, many=False)
        return Response(serializer.data)
    except Product.DoesNotExist:
        return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)



@api_view(['GET'])
def getRelatedServices(request, pk):
    print("Inside service")

    try:
        # Get the current service based on the service ID (pk)
        current_service = get_object_or_404(Service, _id=pk)
        print(f"Current Service: {current_service}")
        
        # Get the product associated with this service
        product = current_service.product
        print(f"Product associated with service: {product}")
        
        # Serialize the product
        product_serializer = DetailedProductSerializer(product, many=False)
        # Print the serialized product data for debugging
        print(product_serializer.data)
        
        # Filter out only the required service from the product's services
        selected_service = next((service for service in product_serializer.data['services'] if service['_id'] == current_service._id), None)
        
        if selected_service is None:
            return Response({'detail': 'Service not found in the product'}, status=status.HTTP_404_NOT_FOUND)
        
        # Prepare the response with the product and the specific service
        response_data = {
            'product_related': {
                '_id': product_serializer.data['_id'],
                'name': product_serializer.data['name'],
                'image': product_serializer.data['image'],
                'brand': product_serializer.data['brand'],
                'category': product_serializer.data['category'],
                'description': product_serializer.data['description'],
                'city': product_serializer.data['city'],
                'area_name': product_serializer.data['area_name'],  # Include area_name
                'address': product_serializer.data['address'],  # Include address
                'business_phone': product_serializer.data['business_phone'],
                'personal_phone': product_serializer.data['personal_phone'],
                'opening_time': product_serializer.data['opening_time'],  # Include opening_time
                'closing_time': product_serializer.data['closing_time'],  # Include closing_time
                'is_approved': product_serializer.data.get('is_approved', None),  # Include is_approved if needed
            },
            'services': [  # Changed to a list
                {
                    '_id': selected_service['_id'],
                    'name': selected_service['name'],
                    'description': selected_service['description'],
                    'rating': selected_service['rating'],
                    'numReviews': selected_service['numReviews'],
                    'price': selected_service['price'],
                    'countInStock': selected_service['countInStock'],
                    'images': selected_service.get('images', []),  # Include images if available
                }
            ]
        }

        print(response_data)  # Print response data for debugging

        return Response(response_data)

    except Product.DoesNotExist:
        return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    except Service.DoesNotExist:
        return Response({'detail': 'Service not found'}, status=status.HTTP_404_NOT_FOUND)




#*********************************************************************************************************   
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_service_images(request, service_id):
    print("inside add image")
    try:
        # Fetch the service object based on the provided service_id
        service = Service.objects.get(_id=service_id)
        print("inside add image")

        # Handle multiple image uploads
        if request.FILES:
            print("inside add image if")
            uploaded_images = []
            for image_file in request.FILES.getlist('images'):
                # Create and save each image
                service_image = ServiceImage.objects.create(service=service, image=image_file)
                uploaded_images.append({
                    'id': service_image._id,
                    'image': service_image.image.url  # Return the URL of the uploaded image
                })

            return Response({"uploaded_images": uploaded_images}, status=status.HTTP_201_CREATED)
        else:
            return Response({"error": "No images uploaded"}, status=status.HTTP_400_BAD_REQUEST)

    except Service.DoesNotExist:
        return Response({"error": "Service not found"}, status=status.HTTP_404_NOT_FOUND)

################################################################################################################################################   
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_product(request):
    print("Received request to register product")
    print("Request FILES keys:", request.FILES.keys())
    print("Request DATA keys:", request.data.keys())
    print("Product data:", request.data)

    # Collect product data from the request
    product_data = {
        'user': request.user.id,
        'name': request.data.get('name'),
        'image': request.FILES.get('image'),
        'brand': request.data.get('brand'),
        'category': request.data.get('category'),
        'description': request.data.get('description'),
        'city': request.data.get('city'),
        'area_name': request.data.get('area_name'),  # New field
        'address': request.data.get('address'),  # New field
        'business_phone': request.data.get('business_phone'),
        'personal_phone': request.data.get('personal_phone'),
        'opening_time': request.data.get('opening_time'),  # New field
        'closing_time': request.data.get('closing_time'),  # New field
        'is_approved': request.data.get('is_approved') == 'true'
    }
    print("Product data:", product_data)

    # Check if a product with the same name already exists
    existing_product = Product.objects.filter(name=product_data['name']).first()
    print("Existing product:", existing_product)

    if existing_product:
        print("Product name already exists")
        return Response({'detail': 'Business name already exists. Please choose a different name.'}, status=status.HTTP_400_BAD_REQUEST)

    # Create product serializer with updated data
    product_serializer = ProductSerializer(data=product_data)
    if product_serializer.is_valid():
        print("Product data is valid, saving...")
        product = product_serializer.save()
        product_id = product._id
        print("Product created with ID:", product_id)

        # Handle services if provided
        services_data = []
        for key in request.data.keys():
            if key.startswith('services['):
                service_index = int(key.split('[')[1].split(']')[0])
                field_name = key.split(']')[1][1:]
                if len(services_data) <= service_index:
                    services_data.append({})
                services_data[service_index][field_name] = request.data.get(key)

        for i, service_data in enumerate(services_data):
            service = Service(
                product=product,
                name=service_data.get('name'),
                description=service_data.get('description'),
                rating=service_data.get('rating', 1),
                numReviews=service_data.get('numReviews', 1),
                price=service_data.get('price'),
                countInStock=service_data.get('countInStock')
            )
            service.save()
            print(f"Service created with ID: {service._id}")

            # Check if files for a particular service are in request.FILES
            service_image_keys = [key for key in request.FILES if key.startswith(f'services[{i}][images]')]
            print("Service image keys:", service_image_keys)

            for key in service_image_keys:
                image_file = request.FILES.get(key)
                if image_file:
                    ServiceImage.objects.create(service=service, image=image_file)
                    print(f"Image {key} added for service {i}")

        return Response({'productId': product_id, 'detail': 'Product and services registered successfully'}, status=status.HTTP_201_CREATED)

    else:
        print("Product serializer errors:", product_serializer.errors)
        return Response(product_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


################################################################################################################################################    



    
class ProductServicesView(generics.ListAPIView):
    serializer_class = ServiceSerializer

    def get_queryset(self):
        product_id = self.kwargs['product_id']
        return Service.objects.filter(product__id=product_id)




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_service(request):
    # Extract the product ID from the request
    product_id = request.data.get('_id')
    print(f"Received product ID: {product_id}")
    print(f"Received product data: {request.data}")

    # Validate the product ID
    if not product_id or not product_id.isdigit():
        return Response({'detail': 'Valid Product ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

    product_id = int(product_id)  # Convert to integer

    service_data = {
        'name': request.data.get('name', ''),
        'description': request.data.get('description', ''),
        'rating': request.data.get('rating', '0'),
        'numReviews': request.data.get('numReviews', '0'),
        'price': request.data.get('price', '0'),
        'countInStock': request.data.get('countInStock', '0'),
    }

    # Print service data for debugging
    print(f"Processing service data: {service_data}")

    try:
        # Convert fields to appropriate types
        rating = Decimal(service_data['rating']) if service_data['rating'] else Decimal(0)
        numReviews = int(service_data['numReviews']) if service_data['numReviews'] else 0
        price = Decimal(service_data['price']) if service_data['price'] else Decimal(0)
        countInStock = int(service_data['countInStock']) if service_data['countInStock'] else 0

        # Create and save the service
        service = Service(
            product_id=product_id,
            name=service_data['name'],
            description=service_data['description'],
            rating=rating,
            numReviews=numReviews,
            price=price,
            countInStock=countInStock
        )
        service.save()

         # Handle images if provided
        images = request.FILES.getlist('images')
        if images:
            for image in images:
                print("Processing image:", image)
                ServiceImage.objects.create(service=service, image=image)

        return Response({'detail': 'Service registered successfully', 'service_id': service._id}, status=status.HTTP_201_CREATED)

    except (InvalidOperation, ValueError) as e:
        return Response({'detail': f'Error processing service data: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
    except ValidationError as e:
        return Response({'detail': f'Validation error: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def my_business_view(request, user_id=None):
    # Get the product for the specified user ID
    product = get_object_or_404(Product, user_id=user_id)
    
    serializer = DetailedProductSerializer(product)
    print(serializer.data) 
    return Response(serializer.data)
    
 

@api_view(['PUT'])
@permission_classes([IsAuthenticated])  # Only authenticated users can approve
def approveProduct(request, pk):
    try:
        product = Product.objects.get(_id=pk)
        product.is_approved = True
        product.save()
        return Response({'detail': 'Product approved successfully'})
    except Product.DoesNotExist:
        return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

from datetime import timedelta
@api_view(['GET'])
def get_booked_dates(request, service_id):
    try:
        print("Fetching booked dates for service ID:", service_id)

        # Fetch all CartItems related to the given service ID
        overlapping_bookings = CartItem.objects.filter(service_id=service_id)

        print("Overlapping bookings found:", overlapping_bookings)

        # Collect all booked dates (range between bookingDate and bookingDate + duration)
        booked_dates = set()  # Use a set to avoid duplicates
        for cart_item in overlapping_bookings:
            booking_date = cart_item.bookingDate

            # Assuming the duration is 1 day for each booking; adjust if needed
            end_date = booking_date + timedelta(days=1)  # Change duration as per your requirement

            print(f"Processing cart item: {cart_item}, Booking date: {booking_date}, End date: {end_date}")

            # Add the booking date to the set
            current_date = booking_date
            while current_date < end_date:
                booked_dates.add(current_date.strftime('%Y-%m-%d'))  # Store dates as strings
                current_date += timedelta(days=1)  # Increment date by one day

        print("Booked dates:", booked_dates)
        return JsonResponse({'booked_dates': list(booked_dates)})  # Return a list of dates
    except Exception as e:
        print("Error:", e)
        return JsonResponse({'error': str(e)}, status=500)
    
#########&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&****************************#############@&&&&&&&&&&&%%%%%%%%%%%%%%%%%%3
@api_view(['GET'])
def getTopProducts(request):
    # Step 1: Get the top services with a rating of 2 or greater, along with their related product details
    top_services = Service.objects.filter(rating__gte=2).order_by('-rating')[:5].select_related('product')
    
    top_product_ids = [service.product._id for service in top_services]
    print(top_product_ids)
    # Step 3: Get the products using the product ids
    top_products = Product.objects.filter(_id__in=top_product_ids)
    # Step 4: Limit the results to 12 products (after the query is done)
    top_products = top_products[:12]

    # Serialize the results and return
    serializer = ProductSerializer(top_products, many=True)
    return Response(serializer.data)



@api_view(['GET'])
def getProduct(request, pk):
    product = Product.objects.get(_id=pk)
    print("product view")
    
    serializer = ProductReviewSerializer(product, many=False)
    print("review data:",serializer.data)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def createProduct(request):
    user = request.user
    product = Product.objects.create(
        user=user,
        name='Sample Name',
        price=0,
        brand='Sample Brand',
        countInStock=0,
        category='Sample Category',
        description=''
    )
    serializer = ProductSerializer(product, many=False)
    return Response(serializer.data)

@api_view(['POST'])
def save_shipping_address(request):
    data = request.data
    user = request.user

    # Create or update the shipping address
    shipping_address, created = ShippingAddress.objects.update_or_create(
        order=Order.objects.get(id=data['order_id']),
        defaults={
            'address': data['address'],
            'city': data['city'],
            'postalCode': data['postalCode'],
            'country': data['country'],
        }
    )
    return Response('Shipping Address saved!')

@api_view(['POST'])
def save_cart_items(request):
    data = request.data
    user = request.user
    
    # Clear current cart items for user
    CartItem.objects.filter(user=user).delete()

    # Add new cart items
    for item in data['cartItems']:
        cart_item = CartItem.objects.create(
            user=user,
            service_id=item['service'],
            name=item['name'],
            image=item['image'],
            price=item['price'],
            countInStock=item['countInStock'],
            qty=item['qty'],
            bookingDate=item['bookingDate'],
        )

    return Response('Cart Items saved!')


@api_view(['PUT'])
@permission_classes([IsAdminUser])
def updateProduct(request, pk):
    
    data = request.data
    product = Product.objects.get(_id=pk)
    print("update view")

    product.name = data['name']
    product.price = data['price']
    product.brand = data['brand']
    product.countInStock = data['countInStock']
    product.category = data['category']
    product.description = data['description']

    product.save()

    serializer = ProductSerializer(product, many=False)
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def deleteProduct(request, pk):
    product = Product.objects.get(_id=pk)
    product.delete()
    return Response('Producted Deleted')


@api_view(['POST'])
def uploadImage(request):
    data = request.data

    product_id = data['product_id']
    product = Product.objects.get(_id=product_id)

    product.image = request.FILES.get('image')
    product.save()

    return Response('Image was uploaded')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def createServiceReview(request, service_id):
    user = request.user
   
    try:
        # Fetch the service object
        service = Service.objects.get(_id=service_id)
        print(f"Service found: {service}")

        data = request.data
        print(f"Received data: {data}")

        # 1 - Check if the review already exists
        alreadyExists = service.reviews.filter(user=user).exists()
        print(f"Review already exists: {alreadyExists}")
        if alreadyExists:
            content = {'detail': 'Service already reviewed'}
            return Response(content, status=status.HTTP_400_BAD_REQUEST)

        # 2 - Validate rating
        if not data.get('rating') or data['rating'] == 0:
            content = {'detail': 'Please select a rating'}
            return Response(content, status=status.HTTP_400_BAD_REQUEST)

        # 3 - Create review
        review = Review.objects.create(
            user=user,
            service=service,
            name=user.first_name,
            rating=data['rating'],
            comment=data.get('comment', ''),  # Use an empty string if comment is not provided
        )

        # Update service ratings and number of reviews
        reviews = service.reviews.all()  # Get all reviews for the service
        service.numReviews = reviews.count()  # Count of reviews
        total = sum(r.rating for r in reviews)  # Calculate total rating
        service.rating = total / service.numReviews if service.numReviews > 0 else 0  # Average rating
        service.save()

        # Return the created review in the response
        review_data = {
            'id': review._id,
            'user': review.name,
            'rating': review.rating,
            'comment': review.comment,
            'createdAt': review.createdAt,  # If you have a timestamp field
        }

        return Response({'detail': 'Review Added', 'review': review_data}, status=status.HTTP_201_CREATED)

    except Service.DoesNotExist:
        content = {'detail': 'Service not found'}
        return Response(content, status=status.HTTP_404_NOT_FOUND)



    

@api_view(['GET'])
def searchProducts(request):
    data = request.data
    print(data)
    city = request.query_params.get('city')
    vendor = request.query_params.get('vendor')  # Using 'category' as 'vendor'

    print("City:", city)  # Debugging print statement
    print("Vendor:", vendor)  # Debugging print statement

    # Ensure city and vendor are not None before filtering
    if city and vendor:
        products = Product.objects.filter(city__icontains=city, category__icontains=vendor).order_by('-createdAt')
    else:
        # Return an empty queryset if either city or vendor is not provided
        products = Product.objects.none()
    
    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)



@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def remove_service_image(request, pk):
    print("out of try remove_service_image")
    try:
        print("inside try remove_service_image")
        service = Service.objects.get(_id=pk)
        image_data = request.data.get('image')
        image_id = image_data.get('_id')  # Expecting the ID of the image to remove

        print("Image ID to remove:", image_id)

        # Fetch the image object by ID
        image_obj = ServiceImage.objects.filter(_id=image_id).first()
        print("Image object found:", image_obj)

        if image_obj:
            # Check if the image is associated with the service
            if image_obj.service == service:
                image_obj.delete()  # Remove the image from the database
                return Response({"detail": "Image removed successfully"})
            else:
                return Response({"detail": "Image not associated with this service"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"detail": "Image not found"}, status=status.HTTP_404_NOT_FOUND)
    except Service.DoesNotExist:
        return Response({"detail": "Service not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def remove_business_image(request, pk):
    print("inside try remove_business_image")
    try:
        print("inside try remove_business_image")
        business = Product.objects.get(_id=pk)

        # Set the image field to None (null)
        business.image = None
        business.save()

        return Response({"detail": "Image removed successfully"})
    except Product.DoesNotExist:
        return Response({"detail": "Business not found"}, status=status.HTTP_404_NOT_FOUND)
    
from django.views.decorators.csrf import csrf_exempt
from rest_framework.request import Request

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def add_service(request):
    user = request.user
    print(request.data)
    
    # Extract the service data from the request body
    service_name = request.data.get('name')
    description = request.data.get('description')
    price = request.data.get('price')
    countInStock = request.data.get('countInStock')
    rating = request.data.get('rating', '1')  # Default to 1
    numReviews = request.data.get('numReviews', '0')  # Default to 0

    if not service_name:
        return Response({'detail': 'Service name is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Retrieve the user's product
    try:
        product = Product.objects.get(user=user)
        print(product)
    except Product.DoesNotExist:
        return Response({'detail': 'Product associated with this user not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Convert fields to appropriate types
    try:
        price = Decimal(price) if price else Decimal('0.00')
        countInStock = int(countInStock) if countInStock else 0
    except (ValueError, Decimal.InvalidOperation):
        return Response({'detail': 'Invalid price or countInStock format.'}, status=status.HTTP_400_BAD_REQUEST)


    # Create new service and associate with the product
    new_service = Service.objects.create(
        product=product,
        name=service_name,
        description=description,
        price=price,
        countInStock=countInStock,
        rating=rating,  # Default value
        numReviews=numReviews,  # Default value
    )
    
    # Handle image uploads
    images = request.FILES.getlist('images')
    for image in images:
        ServiceImage.objects.create(service=new_service, image=image)
    
    serializer = ServiceSerializer(new_service)
    return Response(serializer.data, status=status.HTTP_201_CREATED)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_service_images(request):
    images_data = request.data.get('images', [])
    for image_data in images_data:
        image_id = image_data.get('id')
        if image_id:
            try:
                image = ServiceImage.objects.get(id=image_id)
                image_serializer = ServiceImageSerializer(image, data=image_data, partial=True)
                if image_serializer.is_valid():
                    image_serializer.save()
                else:
                    return Response(image_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            except ServiceImage.DoesNotExist:
                return Response({'detail': f'ServiceImage with id {image_id} not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            ServiceImage.objects.create(**image_data)
    
    return Response({'detail': 'Service images updated successfully'}, status=status.HTTP_200_OK)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_service(request, service_id):
    print("inside delete")
    try:
        service = Service.objects.get(_id=service_id)
        print("inside delete try")
        # Ensure the service belongs to the current user
        if service.product.user != request.user:
            return Response({'detail': 'Not authorized to delete this service.'}, status=status.HTTP_403_FORBIDDEN)
        
        service.delete()
        return Response({'detail': 'Service deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
    except Service.DoesNotExist:
        return Response({'detail': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)
    

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_service(request, service_id):
    try:
        # Retrieve the service by ID
        service = Service.objects.get(_id=service_id)
        
        # Serialize and validate the service data
        service_serializer = ServiceSerializer(service, data=request.data, partial=True)
        
        if service_serializer.is_valid():
            # Save the updated service
            updated_service = service_serializer.save()
            
            # Handle image uploads
            images = request.FILES.getlist('images')
            if images:
                # Remove existing images
                ServiceImage.objects.filter(service=updated_service).delete()
                
                # Add new images
                for image in images:
                    ServiceImage.objects.create(service=updated_service, image=image)
            
            return Response({'detail': 'Service updated successfully'}, status=status.HTTP_200_OK)
        else:
            return Response(service_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    except Service.DoesNotExist:
        return Response({'detail': 'Service not found'}, status=status.HTTP_404_NOT_FOUND)  
    

##########appointment###############################################

@api_view(['GET'])
@permission_classes([IsAuthenticated])

def get_product_by_user(request, user_id):
    try:
        product = Product.objects.get(user_id=user_id)
        serializer = ProductSerializer(product, many=False)
        return Response(serializer.data)
    except Product.DoesNotExist:
        return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_services_by_product(request, product_id):
    
    services = Service.objects.filter(product_id=product_id)

    serializer = ServiceSerializer(services, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_appointments_by_product(request, product_id):
    appointments = OrderItem.objects.filter(service__product_id=product_id)
    print("product id", product_id)

    custom_appointments = []
    for item in appointments:
        order = item.order
        if order:
            if order.markasDone:
                status = 'Completed'
            elif order.isCancelled:
                status = 'Cancelled'
            else:
                status = 'Pending'
        else:
            status = 'Pending'

        custom_appointments.append({
            'id': item._id,
            'customerName': item.user.username if item.user else 'Unknown',
            'serviceName': item.service.name,
            'date': item.start_date,
            'time': item.start_time,
            'status': status,
            'orderId': order._id if order else None
        })

    print('🔍 Custom Appointments:', custom_appointments)
    return Response(custom_appointments)




@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def mark_order_as_done(request, pk):
    print("🔧 Mark order as done called")
    print("Order ID received:", pk)

    try:
        order = Order.objects.get(_id=pk)
    except Order.DoesNotExist:
        return Response({'detail': 'Order not found'}, status=404)

    status_type = request.data.get('status')

    if status_type == 'completed':
        order.markasDone = True
        order.isCancelled = False
        order.deliveredAt = timezone.now()
    elif status_type == 'cancelled':
        order.isCancelled = True
        order.markasDone = False
    else:
        return Response({'detail': 'Invalid status type'}, status=400)

    order.save()
    print("🔧 Marked updated")
    serializer = OrderSerializer(order, many=False)
    return Response(serializer.data)