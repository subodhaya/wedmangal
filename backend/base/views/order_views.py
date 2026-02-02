from django.shortcuts import render

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
import json 
from django.utils.dateparse import parse_date, parse_time

import requests
from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone

from base.models import Product, Order, OrderItem, ShippingAddress,Service,ServiceImage,User
from base.serializers import ProductSerializer, OrderSerializer,OrderItemSerializer

from rest_framework import status
from datetime import datetime

# order_view.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from base.permissions import IsAdminOrReadOnly
from base.models import Budget
from base.serializers import BudgetSerializer
from rest_framework.views import APIView




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_cashfree_payment(request, pk):
    try:
        order = Order.objects.get(_id=pk)

        API_URL = "https://api.cashfree.com/pg/orders"  # Use production URL

        headers = {
            "Content-Type": "application/json",
            "x-api-version": "2022-09-01",
            "x-client-id": settings.CASHFREE_CLIENT_ID,
            "x-client-secret": settings.CASHFREE_SECRET_KEY,
        }

        order_amount = float(order.totalPrice)

        # ✅ Fix: Use only `amount`, remove `percentage`
        order_splits = []
        order_items = OrderItem.objects.filter(order=order)

        for item in order_items:
            vendor_id = f"vendor_{item.service.product.user.id}"  
            split_amount = float(item.qty) * float(item.price)  

            order_splits.append({
                "vendor_id": vendor_id,
                "amount": split_amount  # ✅ Use only `amount`, remove `percentage`
            })

        data = {
            "order_id": f"order_{order._id}",
            "order_amount": order_amount,
            "order_currency": "INR",
            "customer_details": {
                "customer_id": f"user_{order.user.id}",
                "customer_email": order.user.email,
                "customer_phone": "9999999999",  # Ensure valid phone number
            },
            #"order_splits": order_splits,  # ✅ Fixed order_splits
            "order_meta": {
                "return_url": f"https://www.bookyourcelebration.com/payment-success?order_id={order._id}"
            }
        }

        response = requests.post(API_URL, json=data, headers=headers)
        response_data = response.json()

        # ✅ Debugging: Print API Response
        print("Cashfree API Response:", json.dumps(response_data, indent=4))

        if response.status_code == 200 and "payment_session_id" in response_data:
            return JsonResponse({
                "order_id": response_data["order_id"],
                "payment_session_id": response_data["payment_session_id"]
            })

        return JsonResponse({"error": response_data}, status=response.status_code)

    except Order.DoesNotExist:
        return JsonResponse({"error": "Order not found"}, status=404)

    except Exception as e:
        print("Unexpected Error:", str(e))
        return JsonResponse({"error": str(e)}, status=500)



    
@csrf_exempt
def cashfree_webhook(request):
    try:
        data = request.POST  
        order_id = data.get("order_id").replace("order_", "")
        payment_status = data.get("order_status")

        if payment_status == "PAID":
            order = Order.objects.get(id=order_id)
            order.isPaid = True
            order.paidAt = timezone.now()
            order.save()
            return JsonResponse({"message": "Payment updated successfully"})

        return JsonResponse({"error": "Payment failed"}, status=400)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    
@csrf_exempt    
@api_view(['PUT'])
@permission_classes([IsAuthenticated])  # Ensure the user is authenticated
def updateOrderToPaid(request, pk):
    print("inside update order pay")
    try:
        # Retrieve the order and ensure it belongs to the user
        order = Order.objects.get(_id=pk)

        if order.user != request.user:
            return Response({"detail": "You do not have permission to update this order."}, status=403)

        # Ensure that only unpaid orders are marked as paid
        if order.isPaid:
            return Response({"detail": "This order has already been paid."}, status=400)

        # Mark the order as paid
        order.isPaid = True
        order.paidAt = timezone.now()
        order.save()

        # Optionally update related OrderItems if needed
        order_items = OrderItem.objects.filter(order=order)
        # Example: Mark items as processed or do any other necessary updates
        for item in order_items:
            item.status = 'Processed'  # Just an example status change
            item.save()

        # Serialize the order along with the related order items
        order_serializer = OrderSerializer(order)
        return Response({
            "order": order_serializer.data,
            "order_items": OrderItemSerializer(order_items, many=True).data
        })

    except Order.DoesNotExist:
        return Response({"detail": "Order not found"}, status=404)


from dateutil import parser
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_list(request):
    if request.user.is_staff:
        orders = Order.objects.all()
    else:
        orders = Order.objects.filter(user=request.user)
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def addOrderItems(request):
    user = request.user
    data = request.data
    print(data)
    
    orderItems = data.get('orderItems', [])

    if not orderItems or len(orderItems) == 0:
        return Response({'detail': 'No Order Items'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # (1) Create order
        order = Order.objects.create(
            user=user,
            paymentMethod=data['paymentMethod'],
            taxPrice=data['taxPrice'],
            shippingPrice=data['shippingPrice'],
            totalPrice=data['totalPrice']
        )

        # (2) Create shipping address
        shipping = ShippingAddress.objects.create(
            order=order,
            address=data['shippingAddress']['address'],
            city=data['shippingAddress']['city'],
            postalCode=data['shippingAddress']['postalCode'],
            country=data['shippingAddress']['country'],
        )

        # (3) Create order items
        for i in orderItems:
            service_id = i.get('service')
            if not service_id:
                return Response({'detail': 'Service not found in order item'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                service = Service.objects.get(_id=service_id)
            except Service.DoesNotExist:
                return Response({'detail': f'Service with id {service_id} does not exist'}, status=status.HTTP_400_BAD_REQUEST)
            
            service_image = service.images.first()

            booking_date_str = i.get('bookingDate')  # expecting something like "2025-04-24T18:30:00.000Z"
            booking_date_str = i.get('bookingDate')  # expecting something like "2025-04-24T18:30:00.000Z"
            if booking_date_str:
                booking_date = parser.isoparse(booking_date_str).date()
            else:
                booking_date = datetime.today().date()  

            start_time_str = i.get('startTime', '00:00')
            try:
                start_time_obj = datetime.strptime(start_time_str, "%H:%M").time()
            except ValueError:
                start_time_obj = datetime.strptime(start_time_str, "%H:%M:%S").time()

            dt_start = datetime.combine(booking_date, start_time_obj)
            dt_end = dt_start + timedelta(hours=1)
            end_time_obj = dt_end.time()


            item = OrderItem.objects.create(
                service=service,
                order=order,
                user=user,
                name=service.name,
                qty=int(i['qty']),
                price=i['price'],
                image=service_image.image.url if service_image else '',
                start_date=booking_date,
                end_date=booking_date,
                start_time=start_time_obj,
                end_time=end_time_obj,
            )

            if service.product:
                service.countInStock -= int(item.qty)
                service.save()

        # (4) Serialize order and return response
        serializer = OrderSerializer(order, many=False)
        return Response(serializer.data)

    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getMyOrders(request):
    print("order get")
    user = request.user
    orders = user.order_set.all()
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


from datetime import datetime, timedelta

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getOrders(request):
    try:
        user_role = request.user.profile.role

        if user_role == 'admin':
            # Admin: Return all orders sorted by creation date (most recent first)
            orders = Order.objects.all().order_by('-createdAt')
            print("All Orders:", orders)

        elif user_role == 'service-owner':
            # Service owner: Return orders for their services
            services_owned = Service.objects.filter(product__user=request.user)
            print("Services Owned:", services_owned)
            
            order_items = OrderItem.objects.filter(service__in=services_owned)
            print("Order Items:", order_items)
            
            order_ids = order_items.values_list('order_id', flat=True)
            print("Order IDs:", order_ids)
            
            if not order_ids:
                return Response({'newBookingCount': 0, 'detail': 'No orders found for these services.'}, status=status.HTTP_404_NOT_FOUND)

            orders = Order.objects.filter(_id__in=order_ids).order_by('-createdAt')  # Sort by creation date descending

            # Calculate new orders (e.g., last 24 hours or orders with a "new" status)
            new_orders = orders.filter(createdAt__gte=datetime.now() - timedelta(hours=24))  # Adjust time range as needed
            new_booking_count = new_orders.count()

            # Include the count of new bookings
            return Response({
                'orders': OrderSerializer(orders, many=True).data,
                'newBookingCount': new_booking_count
            })

        else:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)

    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getUnreadOrders(request):
    try:
        user = request.user
        if user.profile.role != 'service-owner':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        owned_services = Service.objects.filter(product__user=user)

        unread_order_ids = (
            OrderItem.objects.filter(service__in=owned_services, is_read=False)
            .values('order_id')
            .distinct()
        )
        unread_count = unread_order_ids.count()

        new_orders = OrderItem.objects.filter(
            service__in=owned_services,
            order__createdAt__gte=datetime.now() - timedelta(hours=24)
        ).values('order_id').distinct()
        new_booking_count = new_orders.count()

        message = "You have no unread orders at the moment."
       
        notifications = []
        if unread_count > 0:
            notifications.append(f"You have {unread_count} unread order{'s' if unread_count > 1 else ''}.")
        if new_booking_count > 0:
            notifications.append(f"{new_booking_count} new booking{'s' if new_booking_count > 1 else ''} arrived in the last 24 hours.")
        if not notifications:
            notifications.append("You have no new notifications at the moment.")

        return Response({
            'unread_count': unread_count,
            'newBookingCount': new_booking_count,
            'notifications': notifications
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    
@api_view(['POST'])
def mark_notifications_as_read(request):
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user = request.user
        # Mark all unread orders for the authenticated user as read
        owned_services = Service.objects.filter(product__user=user)

        # Count unread orders based on the `is_read` field
        unread_orders = (
            OrderItem.objects.filter(service__in=owned_services, is_read=False)  # Only filter based on `is_read=False`
            .values('order_id')
            .distinct()
            
        )

 

        print("unread_count1:",unread_orders) 
        if unread_orders.exists():
            unread_orders.update(is_read=True)  # Mark as read

            # Reset new booking count after marking as read
            unread_count = OrderItem.objects.filter(user=user, is_read=False).count() 
            print("unread_count:",unread_count) # Count unread orders after reset

            return Response({
                "message": "Notifications marked as read.",
                "unreadCount": unread_count
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "message": "No unread notifications found.",
                "newBookingCount": 0,
                "unreadCount": 0
            }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getOrderById(request, pk):
    user = request.user
    try:
        order = Order.objects.get(_id=pk)

        # Check if the user is a service-owner and owns the service in the order
        if request.user.profile.role == 'service-owner':
            services_owned = Service.objects.filter(product__user=request.user)
            order_items = OrderItem.objects.filter(order=order, service__in=services_owned)

            if order_items.exists():
                serializer = OrderSerializer(order, many=False)
                return Response(serializer.data)
            else:
                return Response({'detail': 'Not authorized to view this order'}, status=status.HTTP_403_FORBIDDEN)

        # If the user is an admin or the customer who placed the order
        elif user.is_staff or order.user == user:
            serializer = OrderSerializer(order, many=False)
            return Response(serializer.data)
        else:
            return Response({'detail': 'Not authorized to view this order'}, status=status.HTTP_403_FORBIDDEN)

    except Order.DoesNotExist:
        return Response({'detail': 'Order does not exist'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getUnreadBookings(request):
    user = request.user
    if user.profile.role != 'service-owner':
        return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    orders = Order.objects.filter(orderItems__product__user=user, isNotified=False)
    return Response({'count': orders.count()})




@api_view(['PUT'])
@permission_classes([IsAdminUser])
def updateOrderToDelivered(request, pk):
    order = Order.objects.get(_id=pk)

    order.isDelivered = True
    order.deliveredAt = datetime.now()
    order.save()

    return Response('Order was delivered')




@api_view(['GET'])
@permission_classes([IsAuthenticated])  # Ensure the user is authenticated
def get_budget(request, pk):
    try:
        print("Fetching budget for user:", request.user.username)
        
        # Fetch the first budget for the user
        budget = Budget.objects.filter(user=request.user).first()

        if budget:
            # If budget exists, serialize and return the data
            serializer = BudgetSerializer(budget)
            print("Budget found:", serializer.data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # Return empty budget data if no budget exists
            print("No budget found for user.")
            return Response({'total_budget': 0, 'expenses': {}, 'custom_expenses': {}}, status=status.HTTP_200_OK)  # Include custom_expenses here

    except ObjectDoesNotExist:
        # Catch case where the user does not exist in the database
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        print(f"An error occurred: {e}")
        return Response({'detail': 'Internal Server Error. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])  # Allow authenticated users to update their budget
def update_budget(request, pk):
    try:
        # Save or update budget data for the user
        budget, created = Budget.objects.get_or_create(user=request.user)
        print("Updating budget:")

        # Create a serializer and validate the incoming data
        serializer = BudgetSerializer(budget, data=request.data, partial=True)
        
        if serializer.is_valid():
            print("Valid budget data:", serializer.validated_data)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        
        # If serializer is invalid, return the errors
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        print(f"An error occurred: {e}")
        return Response({'detail': 'Internal Server Error. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_service_appointments(request, product_id):
    user = request.user
    order_items = OrderItem.objects.filter(product__user=user, product__id=product_id)
    serializer = OrderItemSerializer(order_items, many=True)
    return Response(serializer.data)