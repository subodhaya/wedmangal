from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    wedding_date = models.DateField(null=True, blank=True)
    role = models.CharField(max_length=50, choices=[
        ('customer', 'Customer'),
        ('service-owner', 'Service Owner'),
        ('product-manager', 'Product Manager'),
        ('admin', 'Admin')
    ], default='customer')

    def __str__(self):
        return self.user.username


class Product(models.Model):
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True)
    name = models.CharField(max_length=200, unique=True, null=True, blank=True)
    image = models.ImageField(null=True, blank=True, default='/static/images/placeholder.png')
    brand = models.CharField(max_length=200, null=True, blank=True)
    category = models.CharField(max_length=200, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    _id = models.AutoField(primary_key=True, editable=False)
    city = models.CharField(max_length=100, null=True, blank=True)
    area_name = models.CharField(max_length=150, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    business_phone = models.CharField(max_length=15, null=True, blank=True)
    personal_phone = models.CharField(max_length=15, null=True, blank=False)
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    # ── Social links ───────────────────────────────────────
    instagram_url = models.URLField(max_length=300, null=True, blank=True)
    facebook_url  = models.URLField(max_length=300, null=True, blank=True)

# ── Price range ────────────────────────────────────────
    min_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_approved = models.BooleanField(default=False)

    # ── Claim ─────────────────────────────────────────────
    is_claimed = models.BooleanField(default=False)
    claimed_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='claimed_listings'
    )
    claimed_at = models.DateTimeField(null=True, blank=True)

    # ── Emergency availability ────────────────────────────
    is_available_today = models.BooleanField(default=False)
    available_since    = models.DateTimeField(null=True, blank=True)

    # ── Category-specific filter attributes ───────────────
    # Stored as flat JSON dict. Examples:
    # Makeup_Artist:  { "type": "bridal|non-bridal", "trial_available": true }
    # Photographers:  { "shoot_type": "wedding|pre-wedding|candid" }
    # Caterers:       { "food_type": "veg|nonveg|both", "cuisine": "South Indian" }
    # Halls:          { "capacity": "500", "ac": true, "parking": true }
    # DJ_Artist:      { "venue_type": "indoor|outdoor", "equipment_included": true }
    # Mehandi_Artist: { "type": "bridal|regular", "home_visit": true }
    attributes = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.name if self.name else 'Unnamed business'


class Service(models.Model):
    product = models.ForeignKey(Product, related_name='services', on_delete=models.CASCADE)
    name = models.CharField(max_length=200, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    rating = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, default=1.0)
    numReviews = models.IntegerField(null=True, blank=True, default=0)
    price = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    countInStock = models.IntegerField(null=True, blank=True, default=0)
    _id = models.AutoField(primary_key=True, editable=False)

    def __str__(self):
        return self.name if self.name else 'Unnamed service'


class ServiceImage(models.Model):
    service = models.ForeignKey(Service, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='service_images/')
    _id = models.AutoField(primary_key=True, editable=False)

    def clean(self):
        if self.service.images.count() >= 10:
            raise ValidationError('A service can have a maximum of 10 images.')

    def __str__(self):
        return f'Image for {self.service.name if self.service.name else "Unnamed service"}'


class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    isCancelled = models.BooleanField(default=False)
    paymentMethod = models.CharField(max_length=200, null=True, blank=True)
    taxPrice = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    shippingPrice = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    totalPrice = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    isPaid = models.BooleanField(default=False)
    paidAt = models.DateTimeField(auto_now_add=False, null=True, blank=True)
    markasDone = models.BooleanField(default=False)
    deliveredAt = models.DateTimeField(auto_now_add=False, null=True, blank=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    _id = models.AutoField(primary_key=True, editable=False)

    def __str__(self):
        return str(self.createdAt)


class OrderItem(models.Model):
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True)
    service = models.ForeignKey(Service, related_name='bookings', on_delete=models.CASCADE, default=1)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    is_read = models.BooleanField(default=False)
    start_date = models.DateField(default='2020-01-01')
    end_date = models.DateField(default='2020-01-01')
    start_time = models.TimeField(default='00:00:00')
    end_time = models.TimeField(default='23:59:59')
    name = models.CharField(max_length=200, null=True, blank=True)
    qty = models.IntegerField(null=True, blank=True, default=0)
    price = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    image = models.CharField(max_length=200, null=True, blank=True)
    _id = models.AutoField(primary_key=True, editable=False)

    def __str__(self):
        return str(self.name)


class ShippingAddress(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, null=True, blank=True)
    address = models.CharField(max_length=200, null=True, blank=True)
    city = models.CharField(max_length=200, null=True, blank=True)
    postalCode = models.CharField(max_length=200, null=True, blank=True)
    country = models.CharField(max_length=200, null=True, blank=True)
    shippingPrice = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, default=100.00)
    _id = models.AutoField(primary_key=True, editable=False)

    def __str__(self):
        return str(self.address)


class CartItem(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    image = models.ImageField(upload_to='images/')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    countInStock = models.IntegerField()
    qty = models.IntegerField()
    bookingDate = models.DateTimeField()

    def __str__(self):
        return f'{self.name} - {self.user}'


class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    weddingDate = models.DateField(null=True, blank=True)

    def __str__(self):
        return f'{self.user.username} - {self.product.name}'


class Review(models.Model):
    service = models.ForeignKey(Service, related_name="reviews", on_delete=models.SET_NULL, null=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    name = models.CharField(max_length=200, null=True, blank=True)
    rating = models.IntegerField(null=True, blank=True, default=0)
    comment = models.TextField(null=True, blank=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    _id = models.AutoField(primary_key=True, editable=False)

    def __str__(self):
        return str(self.rating)


class Budget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    total_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expenses = models.JSONField(default=dict)


class UnavailableDate(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='unavailable_dates')
    date = models.DateField()
    reason = models.CharField(max_length=200, blank=True, default='Unavailable')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('product', 'date')
        ordering = ['date']

    def __str__(self):
        return f"{self.product.name} — {self.date}"


class ServiceOwnerClaim(models.Model):
    STATUS_CHOICES = [('approved', 'Approved'), ('revoked', 'Revoked')]
    product    = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='service_owner_claims')
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='service_owner_claims')
    phone      = models.CharField(max_length=15)
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='approved')
    claimed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-claimed_at']

    def __str__(self):
        return f"{self.user.email} claimed {self.product.name} [{self.status}]"