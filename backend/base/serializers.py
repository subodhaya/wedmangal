from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    Product, Order, OrderItem, ShippingAddress, Review,
    Service, ServiceImage, CartItem, Budget, Wishlist, ServiceOwnerClaim
)
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.exceptions import ValidationError


def validate_email(email):
    if User.objects.filter(email=email).exists():
        raise ValidationError("User with this email already exists.")


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField(read_only=True)
    _id = serializers.SerializerMethodField(read_only=True)
    isAdmin = serializers.SerializerMethodField(read_only=True)
    role = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ['id', '_id', 'username', 'email', 'name', 'isAdmin', 'role']

    def get__id(self, obj):
        return obj.id

    def get_isAdmin(self, obj):
        return obj.is_staff

    def get_name(self, obj):
        name = obj.first_name
        if name == '':
            name = obj.email
        return name

    def get_role(self, obj):
        return obj.profile.role

    def update(self, instance, validated_data):
        instance.username = validated_data.get('username', instance.username)
        instance.email = validated_data.get('email', instance.email)
        instance.first_name = validated_data.get('name', instance.first_name)
        instance.is_staff = validated_data.get('isAdmin', instance.is_staff)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserSerializerWithToken(UserSerializer):
    token = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ['id', '_id', 'username', 'email', 'name', 'isAdmin', 'role', 'token']

    def get_token(self, obj):
        token = RefreshToken.for_user(obj)
        return str(token.access_token)


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        serializer = UserSerializerWithToken(self.user).data
        data.update(serializer)
        return data


class ServiceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceImage
        fields = ['_id', 'image']


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['_id', 'name', 'description', 'price', 'countInStock']

    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.price = validated_data.get('price', instance.price)
        instance.countInStock = validated_data.get('countInStock', instance.countInStock)
        instance.save()
        return instance

class ProductSerializer(serializers.ModelSerializer):
    is_claimed = serializers.BooleanField(read_only=True)
    claimed_by_id = serializers.SerializerMethodField(read_only=True)
    average_rating = serializers.SerializerMethodField(read_only=True)
    total_num_reviews = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
    '_id', 'user', 'name', 'image', 'brand', 'category', 'description', 'createdAt',
    'city', 'area_name', 'address', 'business_phone', 'personal_phone',
    'opening_time', 'closing_time', 'is_approved',
    'is_available_today', 'available_since',
    'is_claimed', 'claimed_by_id',
    'attributes',
    'average_rating', 'total_num_reviews',
    'instagram_url', 'facebook_url',   
    'min_price', 'max_price',          
]

    def get_claimed_by_id(self, obj):
        return obj.claimed_by_id

    def get_average_rating(self, obj):
        # Use annotated value if present (avoids extra query)
        if hasattr(obj, 'avg_rating') and obj.avg_rating is not None:
            return float(obj.avg_rating)
        # Fallback: compute from prefetched services
        services = obj.services.all()
        if not services:
            return 1.0
        ratings = [s.rating for s in services if s.rating is not None]
        return round(sum(ratings) / len(ratings), 2) if ratings else 1.0

    def get_total_num_reviews(self, obj):
        # Use annotated value if present
        if hasattr(obj, 'num_reviews') and obj.num_reviews is not None:
            return obj.num_reviews
        # Fallback: sum from prefetched services
        services = obj.services.all()
        return sum(s.numReviews or 0 for s in services)

    def update(self, instance, validated_data):
        fields = [
    'name', 'image', 'brand', 'category', 'description',
    'city', 'area_name', 'address', 'business_phone', 'personal_phone',
    'opening_time', 'closing_time', 'is_approved',
    'instagram_url', 'facebook_url', 'min_price', 'max_price', 
]
        for field in fields:
            setattr(instance, field, validated_data.get(field, getattr(instance, field)))
        instance.save()
        return instance
    
# ── Service Owner Claim Serializer ────────────────────────────────────────────
class ServiceOwnerClaimSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    user_email   = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model  = ServiceOwnerClaim
        fields = ['id', 'product', 'product_name', 'user', 'user_email', 'phone', 'status', 'claimed_at']
        read_only_fields = ['id', 'status', 'claimed_at']


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'


class ShippingAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingAddress
        fields = '__all__'


class CartItemSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all())
    name = serializers.CharField(max_length=200)
    image = serializers.CharField(max_length=100)
    price = serializers.DecimalField(decimal_places=2, max_digits=10)
    countInStock = serializers.IntegerField(label='CountInStock')
    qty = serializers.IntegerField()
    bookingDate = serializers.DateTimeField()

    class Meta:
        model = CartItem
        fields = ['user', 'service', 'name', 'image', 'price', 'countInStock', 'qty', 'bookingDate']


class WishlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wishlist
        fields = ['user', 'product', 'weddingDate']


class OrderItemSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)
    product = ProductSerializer(read_only=True)
    orderId = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            '_id', 'service', 'product', 'orderId', 'user', 'name', 'qty',
            'price', 'image', 'start_date', 'end_date', 'start_time',
            'end_time', 'is_read'
        ]

    def get_orderId(self, obj):
        return obj.order._id if obj.order else None


class OrderSerializer(serializers.ModelSerializer):
    orderItems = serializers.SerializerMethodField(read_only=True)
    shippingAddress = serializers.SerializerMethodField(read_only=True)
    user = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Order
        fields = '__all__'

    def get_orderItems(self, obj):
        items = obj.orderitem_set.all()
        serializer = OrderItemSerializer(items, many=True)
        return serializer.data

    def get_shippingAddress(self, obj):
        try:
            address = ShippingAddressSerializer(obj.shippingaddress, many=False).data
        except:
            address = None
        return address

    def get_user(self, obj):
        user = obj.user
        serializer = UserSerializer(user, many=False)
        return serializer.data


class DetailedServiceSerializer(serializers.ModelSerializer):
    images = ServiceImageSerializer(many=True, required=False)

    class Meta:
        model = Service
        fields = ['_id', 'name', 'description', 'rating', 'numReviews',
                  'price', 'countInStock', 'images']

    def create(self, validated_data):
        images_data = validated_data.pop('images', [])
        service = Service.objects.create(**validated_data)
        for image_data in images_data:
            ServiceImage.objects.create(service=service, **image_data)
        return service

    def update(self, instance, validated_data):
        images_data = validated_data.pop('images', [])
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.price = validated_data.get('price', instance.price)
        instance.countInStock = validated_data.get('countInStock', instance.countInStock)
        instance.save()
        existing_images = {image.id: image for image in instance.images.all()}
        for image_data in images_data:
            image_id = image_data.get('_id')
            if image_id and image_id in existing_images:
                image = existing_images.pop(image_id)
                image.image = image_data.get('image', image.image)
                image.save()
            else:
                ServiceImage.objects.create(service=instance, **image_data)
        for image in existing_images.values():
            image.delete()
        return instance


class DetailedProductSerializer(serializers.ModelSerializer):
    services = DetailedServiceSerializer(many=True, required=False)
    is_claimed = serializers.BooleanField(read_only=True)
    claimed_by_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
    '_id', 'user', 'name', 'image', 'brand', 'category', 'description', 'createdAt',
    'city', 'area_name', 'address', 'business_phone', 'personal_phone',
    'opening_time', 'closing_time', 'is_approved', 'services',
    'is_claimed', 'claimed_by_id',
    'instagram_url', 'facebook_url',   # NEW
    'min_price', 'max_price',          # NEW
]

    def get_claimed_by_id(self, obj):
        return obj.claimed_by_id

    def create(self, validated_data):
        services_data = validated_data.pop('services', [])
        product = Product.objects.create(**validated_data)
        for service_data in services_data:
            Service.objects.create(product=product, **service_data)
        return product

    def update(self, instance, validated_data):
        services_data = validated_data.pop('services', [])
        instance.name = validated_data.get('name', instance.name)
        instance.image = validated_data.get('image', instance.image)
        instance.brand = validated_data.get('brand', instance.brand)
        instance.category = validated_data.get('category', instance.category)
        instance.description = validated_data.get('description', instance.description)
        instance.city = validated_data.get('city', instance.city)
        instance.area_name = validated_data.get('area_name', instance.area_name)
        instance.address = validated_data.get('address', instance.address)
        instance.business_phone = validated_data.get('business_phone', instance.business_phone)
        instance.personal_phone = validated_data.get('personal_phone', instance.personal_phone)
        instance.opening_time = validated_data.get('opening_time', instance.opening_time)
        instance.closing_time = validated_data.get('closing_time', instance.closing_time)
        instance.instagram_url = validated_data.get('instagram_url', instance.instagram_url)
        instance.facebook_url  = validated_data.get('facebook_url',  instance.facebook_url)
        instance.min_price     = validated_data.get('min_price',     instance.min_price)
        instance.max_price     = validated_data.get('max_price',     instance.max_price)
        instance.is_approved = validated_data.get('is_approved', instance.is_approved)
        instance.save()
        existing_services = {service._id: service for service in instance.services.all()}
        new_services = []
        for service_data in services_data:
            service_id = service_data.get('_id')
            if service_id and service_id in existing_services:
                service = existing_services.pop(service_id)
                service.name = service_data.get('name', service.name)
                service.description = service_data.get('description', service.description)
                service.price = service_data.get('price', service.price)
                service.countInStock = service_data.get('countInStock', service.countInStock)
                service.save()
            else:
                new_services.append(Service.objects.create(product=instance, **service_data))
        for service in existing_services.values():
            service.delete()
        return instance


class ProductReviewSerializer(serializers.ModelSerializer):
    services = serializers.SerializerMethodField()
    is_claimed = serializers.BooleanField(read_only=True)
    claimed_by_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
    '_id', 'user', 'name', 'image', 'brand', 'category', 'description',
    'createdAt', 'city', 'area_name', 'address', 'business_phone',
    'personal_phone', 'opening_time', 'closing_time', 'is_approved',
    'services', 'is_claimed', 'claimed_by_id',
    'instagram_url', 'facebook_url',   
    'min_price', 'max_price',         
]
    def get_claimed_by_id(self, obj):
        return obj.claimed_by_id

    def get_services(self, product):
        services = product.services.all()
        service_list = []
        for service in services:
            service_data = {
                '_id': service._id,
                'name': service.name,
                'description': service.description,
                'price': service.price,
                'countInStock': service.countInStock,
                'rating': service.rating,
                'numReviews': service.numReviews,
                'images': self.get_service_images(service),
                'reviews': self.get_service_reviews(service)
            }
            service_list.append(service_data)
        return service_list

    def get_service_images(self, service):
        images = service.images.all()
        return [{'image': image.image.url} for image in images]

    def get_service_reviews(self, service):
        reviews = service.reviews.all()
        return [{
            '_id': review._id,
            'user': f"{review.user.first_name} {review.user.last_name}" if review.user else "Anonymous",
            'rating': review.rating,
            'comment': review.comment,
            'createdAt': review.createdAt
        } for review in reviews]

    def create(self, validated_data):
        services_data = validated_data.pop('services', [])
        product = Product.objects.create(**validated_data)
        for service_data in services_data:
            reviews_data = service_data.pop('reviews', [])
            images_data = service_data.pop('images', [])
            service = Service.objects.create(product=product, **service_data)
            for image_data in images_data:
                ServiceImage.objects.create(service=service, **image_data)
            for review_data in reviews_data:
                Review.objects.create(service=service, **review_data)
        return product

    def update(self, instance, validated_data):
        services_data = validated_data.pop('services', [])
        instance.name = validated_data.get('name', instance.name)
        instance.image = validated_data.get('image', instance.image)
        instance.brand = validated_data.get('brand', instance.brand)
        instance.category = validated_data.get('category', instance.category)
        instance.description = validated_data.get('description', instance.description)
        instance.city = validated_data.get('city', instance.city)
        instance.area_name = validated_data.get('area_name', instance.area_name)
        instance.address = validated_data.get('address', instance.address)
        instance.business_phone = validated_data.get('business_phone', instance.business_phone)
        instance.personal_phone = validated_data.get('personal_phone', instance.personal_phone)
        instance.opening_time = validated_data.get('opening_time', instance.opening_time)
        instance.closing_time = validated_data.get('closing_time', instance.closing_time)
        instance.is_approved = validated_data.get('is_approved', instance.is_approved)
        instance.save()
        existing_services = {service._id: service for service in instance.services.all()}
        for service_data in services_data:
            service_id = service_data.get('_id')
            reviews_data = service_data.pop('reviews', [])
            images_data = service_data.pop('images', [])
            if service_id and service_id in existing_services:
                service = existing_services.pop(service_id)
                service.name = service_data.get('name', service.name)
                service.description = service_data.get('description', service.description)
                service.price = service_data.get('price', service.price)
                service.countInStock = service_data.get('countInStock', service.countInStock)
                service.save()
                for review_data in reviews_data:
                    Review.objects.update_or_create(
                        service=service,
                        user=review_data.get('user'),
                        defaults={
                            'name': review_data.get('user'),
                            'rating': review_data.get('rating'),
                            'comment': review_data.get('comment')
                        }
                    )
                for image_data in images_data:
                    ServiceImage.objects.update_or_create(
                        service=service,
                        defaults={'image': image_data.get('image')}
                    )
            else:
                new_service = Service.objects.create(product=instance, **service_data)
                for image_data in images_data:
                    ServiceImage.objects.create(service=new_service, **image_data)
                for review_data in reviews_data:
                    Review.objects.create(service=new_service, **review_data)
        for service in existing_services.values():
            service.delete()
        return instance


class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = ['user', 'total_budget', 'expenses']
