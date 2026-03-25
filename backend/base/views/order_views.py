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

from base.models import Product, Order, OrderItem, ShippingAddress, Service, ServiceImage, User
from base.serializers import ProductSerializer, OrderSerializer, OrderItemSerializer

from rest_framework import status
from datetime import datetime

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from base.permissions import IsAdminOrReadOnly
from base.models import Budget
from base.serializers import BudgetSerializer
from rest_framework.views import APIView


# ─────────────────────────────────────────────────────────────────────────────
#  CASHFREE PAYMENT
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_cashfree_payment(request, pk):
    try:
        order = Order.objects.get(_id=pk)

        API_URL = "https://api.cashfree.com/pg/orders"

        headers = {
            "Content-Type": "application/json",
            "x-api-version": "2022-09-01",
            "x-client-id": settings.CASHFREE_CLIENT_ID,
            "x-client-secret": settings.CASHFREE_SECRET_KEY,
        }

        order_amount = float(order.totalPrice)

        order_splits = []
        order_items = OrderItem.objects.filter(order=order)

        for item in order_items:
            vendor_id = f"vendor_{item.service.product.user.id}"
            split_amount = float(item.qty) * float(item.price)
            order_splits.append({
                "vendor_id": vendor_id,
                "amount": split_amount
            })

        data = {
            "order_id": f"order_{order._id}",
            "order_amount": order_amount,
            "order_currency": "INR",
            "customer_details": {
                "customer_id": f"user_{order.user.id}",
                "customer_email": order.user.email,
                "customer_phone": "9999999999",  # TODO: use order.user.profile.phone
            },
            # "order_splits": order_splits,
            "order_meta": {
                "return_url": f"https://www.bookyourcelebration.com/payment-success?order_id={order._id}"
            }
        }

        response = requests.post(API_URL, json=data, headers=headers)
        response_data = response.json()
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


# ─────────────────────────────────────────────────────────────────────────────
#  UPDATE ORDER TO PAID
#  ✅ UPDATED: now supports toggle (mark paid OR unpaid) for MyAppointmentsScreen
#  ✅ UPDATED: customers can also call this (not just the order owner check)
# ─────────────────────────────────────────────────────────────────────────────

@csrf_exempt
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def updateOrderToPaid(request, pk):
    print("inside update order pay")
    try:
        order = Order.objects.get(_id=pk)

        # Only the customer who placed the order (or admin) can mark it
        if order.user != request.user and not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to update this order."},
                status=403
            )

        # ── TOGGLE: accept isPaid from request body ──────────────────────────
        # MyAppointmentsScreen sends { isPaid: true/false }
        # Old Cashfree flow sends nothing → defaults to True
        new_paid_status = request.data.get('isPaid', True)

        order.isPaid = new_paid_status
        order.paidAt = timezone.now() if new_paid_status else None
        order.save()

        # Update related OrderItems status
        order_items = OrderItem.objects.filter(order=order)
        for item in order_items:
            item.status = 'Processed' if new_paid_status else 'Pending'
            item.save()

        order_serializer = OrderSerializer(order)
        return Response({
            "order": order_serializer.data,
            "order_items": OrderItemSerializer(order_items, many=True).data
        })

    except Order.DoesNotExist:
        return Response({"detail": "Order not found"}, status=404)


# ─────────────────────────────────────────────────────────────────────────────
#  UPDATE ORDER TO DELIVERED
#  ✅ UPDATED: was admin-only + always True. Now customer/vendor can toggle.
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def updateOrderToDelivered(request, pk):
    try:
        order = Order.objects.get(_id=pk)

        # Allow: admin, the customer who placed the order,
        #        or the service-owner who owns a service in the order
        is_owner_of_service = False
        if request.user.profile.role == 'service-owner':
            owned_services = Service.objects.filter(product__user=request.user)
            is_owner_of_service = OrderItem.objects.filter(
                order=order, service__in=owned_services
            ).exists()

        has_permission = (
            request.user.is_staff
            or order.user == request.user
            or is_owner_of_service
        )

        if not has_permission:
            return Response(
                {"detail": "You do not have permission to update this order."},
                status=403
            )

        # ── TOGGLE: accept isDelivered from request body ─────────────────────
        # MyAppointmentsScreen sends { isDelivered: true/false }
        new_delivered_status = request.data.get('isDelivered', True)

        order.isDelivered = new_delivered_status
        order.deliveredAt = timezone.now() if new_delivered_status else None
        order.save()

        return Response({'message': 'Order delivery status updated', 'isDelivered': order.isDelivered})

    except Order.DoesNotExist:
        return Response({'detail': 'Order not found'}, status=404)
    except Exception as e:
        return Response({'detail': str(e)}, status=500)


# ─────────────────────────────────────────────────────────────────────────────
#  ORDER LIST (read-only helper — kept as-is)
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
#  ADD ORDER ITEMS
# ─────────────────────────────────────────────────────────────────────────────
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
        order = Order.objects.create(
            user=user,
            paymentMethod=data['paymentMethod'],
            taxPrice=data['taxPrice'],
            shippingPrice=data['shippingPrice'],
            totalPrice=data['totalPrice']
        )

        ShippingAddress.objects.create(
            order=order,
            address=data['shippingAddress']['address'],
            city=data['shippingAddress']['city'],
            postalCode=data['shippingAddress']['postalCode'],
            country=data['shippingAddress']['country'],
        )

        for i in orderItems:
            service_id = i.get('service')
            if not service_id:
                return Response({'detail': 'Service not found in order item'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                service = Service.objects.get(_id=service_id)
            except Service.DoesNotExist:
                return Response({'detail': f'Service with id {service_id} does not exist'}, status=status.HTTP_400_BAD_REQUEST)

            service_image = service.images.first()

            # ── Booking date ──────────────────────────────────────
            booking_date_str = i.get('bookingDate')
            if booking_date_str:
                booking_date = parser.isoparse(booking_date_str).date()
            else:
                booking_date = datetime.today().date()

            # ── Start time ────────────────────────────────────────
            start_time_str = i.get('startTime', '00:00')
            try:
                start_time_obj = datetime.strptime(start_time_str, "%H:%M").time()
            except ValueError:
                start_time_obj = datetime.strptime(start_time_str, "%H:%M:%S").time()

            # ── End time (from frontend, fallback +1 hr) ──────────
            end_time_str = i.get('endTime', '')
            print("startTime:", start_time_str, "| endTime:", end_time_str)  # debug
            if end_time_str:
                try:
                    end_time_obj = datetime.strptime(end_time_str, "%H:%M").time()
                except ValueError:
                    end_time_obj = datetime.strptime(end_time_str, "%H:%M:%S").time()
            else:
                # fallback only if frontend didn't send endTime
                dt_start = datetime.combine(booking_date, start_time_obj)
                end_time_obj = (dt_start + timedelta(hours=1)).time()

            # ── Create order item ─────────────────────────────────
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

        serializer = OrderSerializer(order, many=False)
        return Response(serializer.data)

    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ─────────────────────────────────────────────────────────────────────────────
#  GET MY ORDERS  ← called by MyAppointmentsScreen
#  Returns plain list (not wrapped in dict) so frontend .map() works directly
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getMyOrders(request):
    print("order get")
    user = request.user
    orders = user.order_set.all().order_by('-createdAt')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)   # ← plain list, matches MyAppointmentsScreen: setOrders(data)


from datetime import datetime, timedelta


# ─────────────────────────────────────────────────────────────────────────────
#  GET ALL ORDERS (admin / service-owner)
#  ✅ FIXED: admin now also returns { orders: [...] } so frontend is consistent
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getOrders(request):
    try:
        user_role = request.user.profile.role

        if user_role == 'admin':
            orders = Order.objects.all().order_by('-createdAt')
            new_booking_count = orders.filter(
                createdAt__gte=datetime.now() - timedelta(hours=24)
            ).count()
            return Response({
                'orders': OrderSerializer(orders, many=True).data,
                'newBookingCount': new_booking_count
            })

        elif user_role == 'service-owner':
            services_owned = Service.objects.filter(product__user=request.user)
            print("Services Owned:", services_owned)

            order_items = OrderItem.objects.filter(service__in=services_owned)
            print("Order Items:", order_items)

            order_ids = order_items.values_list('order_id', flat=True)
            print("Order IDs:", order_ids)

            if not order_ids:
                return Response(
                    {'orders': [], 'newBookingCount': 0},
                    status=status.HTTP_200_OK
                )

            orders = Order.objects.filter(_id__in=order_ids).order_by('-createdAt')

            new_orders = orders.filter(createdAt__gte=datetime.now() - timedelta(hours=24))
            new_booking_count = new_orders.count()

            return Response({
                'orders': OrderSerializer(orders, many=True).data,
                'newBookingCount': new_booking_count
            })

        else:
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────────────────────
#  UNREAD ORDERS / NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getUnreadOrders(request):
    try:
        user = request.user
        if user.profile.role != 'service-owner':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        owned_services = Service.objects.filter(product__user=user)

        unread_items = OrderItem.objects.filter(
            service__in=owned_services, is_read=False
        ).select_related('order', 'order__user', 'service').order_by('-order__createdAt')

        unread_count = unread_items.values('order_id').distinct().count()

        new_booking_count = OrderItem.objects.filter(
            service__in=owned_services,
            order__createdAt__gte=datetime.now() - timedelta(hours=24)
        ).values('order_id').distinct().count()

        # ── Build items list for dropdown ──
        seen, items = set(), []
        for item in unread_items:
            if item.order_id not in seen:
                seen.add(item.order_id)
                items.append({
                    'order_id': str(item.order_id),
                    'customer_name': item.order.user.get_full_name() or item.order.user.username,
                    'service_name': item.service.name,
                    'booked_at': item.order.createdAt.strftime('%d %b %Y, %I:%M %p'),
                    'total': str(item.order.totalPrice),
                    'is_read': False,
                })

        return Response({
            'count': unread_count,
            'unread_count': unread_count,
            'newBookingCount': new_booking_count,
            'items': items,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def mark_notifications_as_read(request):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication credentials were not provided."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        user = request.user
        owned_services = Service.objects.filter(product__user=user)

        unread_orders = (
            OrderItem.objects.filter(service__in=owned_services, is_read=False)
            .values('order_id')
            .distinct()
        )

        print("unread_count1:", unread_orders)
        if unread_orders.exists():
            unread_orders.update(is_read=True)
            unread_count = OrderItem.objects.filter(user=user, is_read=False).count()
            print("unread_count:", unread_count)
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


# ─────────────────────────────────────────────────────────────────────────────
#  GET ORDER BY ID
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getOrderById(request, pk):
    user = request.user
    try:
        order = Order.objects.get(_id=pk)

        if request.user.profile.role == 'service-owner':
            services_owned = Service.objects.filter(product__user=request.user)
            order_items = OrderItem.objects.filter(order=order, service__in=services_owned)
            if order_items.exists():
                serializer = OrderSerializer(order, many=False)
                return Response(serializer.data)
            else:
                return Response({'detail': 'Not authorized to view this order'}, status=status.HTTP_403_FORBIDDEN)

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


# ─────────────────────────────────────────────────────────────────────────────
#  BUDGET
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_budget(request, pk):
    try:
        print("Fetching budget for user:", request.user.username)
        budget = Budget.objects.filter(user=request.user).first()
        if budget:
            serializer = BudgetSerializer(budget)
            print("Budget found:", serializer.data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            print("No budget found for user.")
            return Response(
                {'total_budget': 0, 'expenses': {}, 'custom_expenses': {}},
                status=status.HTTP_200_OK
            )
    except Exception as e:
        print(f"An error occurred: {e}")
        return Response(
            {'detail': 'Internal Server Error. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_budget(request, pk):
    try:
        budget, created = Budget.objects.get_or_create(user=request.user)
        print("Updating budget:")
        serializer = BudgetSerializer(budget, data=request.data, partial=True)
        if serializer.is_valid():
            print("Valid budget data:", serializer.validated_data)
            serializer.save()
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"An error occurred: {e}")
        return Response(
            {'detail': 'Internal Server Error. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ─────────────────────────────────────────────────────────────────────────────
#  GET SERVICE APPOINTMENTS
#  ✅ FIXED: was filtering on product__user / product__id (wrong FK path)
#            Now correctly filters via service__product__user
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_service_appointments(request, product_id):
    user = request.user
    # OrderItem → service (FK) → product (FK) → user
    order_items = OrderItem.objects.filter(
        service__product__user=user,
        service__product___id=product_id   # _id is your custom PK field
    )
    serializer = OrderItemSerializer(order_items, many=True)
    return Response(serializer.data)



# ─────────────────────────────────────────────────────────────────────────────
# ADD THESE VIEWS TO order_views.py  (or a separate calendar_views.py)
# Also add UnavailableDate to your models import line
# ─────────────────────────────────────────────────────────────────────────────

# At top of file, add UnavailableDate to the models import:
# from base.models import Product, Order, OrderItem, ShippingAddress, Service, ServiceImage, User, UnavailableDate

from base.models import UnavailableDate   # add this import


# ── GET calendar data for vendor ─────────────────────────────────────────────
# Returns:
#   booked_dates   : dates that have confirmed orders
#   unavailable_dates : dates the vendor manually blocked
#
# Frontend calls: GET /api/orders/calendar/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_vendor_calendar(request):
    """
    Returns all booked dates (from orders) and manually unavailable dates
    for the currently logged-in service-owner.
    """
    try:
        user = request.user
        if user.profile.role != 'service-owner':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        # Get the vendor's product
        try:
            product = Product.objects.get(user=user)
        except Product.DoesNotExist:
            return Response({'booked_dates': [], 'unavailable_dates': []})

        # ── Booked dates from confirmed orders ──
        booked = (
            OrderItem.objects
            .filter(service__product=product, start_date__isnull=False)
            .values_list('start_date', flat=True)
            .distinct()
        )
        booked_dates = [str(d) for d in booked]

        # ── Manually blocked dates ──
        blocked = UnavailableDate.objects.filter(product=product)
        unavailable_dates = [
            {'date': str(u.date), 'reason': u.reason, '_id': u.id}
            for u in blocked
        ]

        return Response({
            'booked_dates': booked_dates,
            'unavailable_dates': unavailable_dates,
            'product_id': product._id,
        })

    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── ADD unavailable date ──────────────────────────────────────────────────────
# Frontend calls: POST /api/orders/calendar/block/
# Body: { date: "2025-04-15", reason: "Holiday" }
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_unavailable_date(request):
    """
    Vendor manually blocks a date (marks it as unavailable).
    """
    try:
        user = request.user
        if user.profile.role != 'service-owner':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        try:
            product = Product.objects.get(user=user)
        except Product.DoesNotExist:
            return Response({'detail': 'No product found for this vendor'}, status=404)

        date_str = request.data.get('date')
        reason   = request.data.get('reason', 'Unavailable')

        if not date_str:
            return Response({'detail': 'Date is required'}, status=400)

        unavailable, created = UnavailableDate.objects.get_or_create(
            product=product,
            date=date_str,
            defaults={'reason': reason}
        )

        if not created:
            # Already exists — update reason
            unavailable.reason = reason
            unavailable.save()

        return Response({
            '_id': unavailable.id,
            'date': str(unavailable.date),
            'reason': unavailable.reason,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── REMOVE unavailable date ───────────────────────────────────────────────────
# Frontend calls: DELETE /api/orders/calendar/block/<id>/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_unavailable_date(request, pk):
    """
    Vendor unblocks a date they previously marked as unavailable.
    """
    try:
        user = request.user
        if user.profile.role != 'service-owner':
            return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        try:
            product = Product.objects.get(user=user)
        except Product.DoesNotExist:
            return Response({'detail': 'No product found'}, status=404)

        unavailable = UnavailableDate.objects.get(id=pk, product=product)
        unavailable.delete()

        return Response({'message': 'Date unblocked successfully'})

    except UnavailableDate.DoesNotExist:
        return Response({'detail': 'Date not found'}, status=404)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)