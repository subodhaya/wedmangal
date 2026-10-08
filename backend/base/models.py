from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils.text import slugify
from django.utils import timezone


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    wedding_date = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=15, unique=True, null=True, blank=True)
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
    website_url   = models.URLField(max_length=300, null=True, blank=True)

# ── Price range ────────────────────────────────────────
    min_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    max_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    is_approved = models.BooleanField(default=False)

    # ── Claim ─────────────────────────────────────────────
    is_claimed = models.BooleanField(default=False)
    claimed_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='claimed_listings'
    )
    claimed_at = models.DateTimeField(null=True, blank=True)

    # ── Verification (admin-only; a claim alone never makes a listing verified) ──
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)

    # ── Emergency availability ────────────────────────────
    is_available_today = models.BooleanField(default=False)
    available_since    = models.DateTimeField(null=True, blank=True)

    # ── Video ─────────────────────────────────────────────
    video_url         = models.CharField(max_length=500, null=True, blank=True, db_index=True)
    video_thumb       = models.CharField(max_length=500, null=True, blank=True, db_index=True)
    video_duration    = models.FloatField(null=True, blank=True)
    video_uploaded_at = models.DateTimeField(null=True, blank=True)

    # ── Category-specific filter attributes ───────────────
    # Stored as flat JSON dict. Examples:
    # Makeup_Artist:  { "type": "bridal|non-bridal", "trial_available": true }
    # Photographers:  { "shoot_type": "wedding|pre-wedding|candid" }
    # Caterers:       { "food_type": "veg|nonveg|both", "cuisine": "South Indian" }
    # Halls:          { "capacity": "500", "ac": true, "parking": true }
    # DJ_Artist:      { "venue_type": "indoor|outdoor", "equipment_included": true }
    # Mehandi_Artist: { "type": "bridal|regular", "home_visit": true }
    # Allowed keys per category: base/vendor_profile.py. A missing key means
    # "unknown" — never store False/0 for information nobody has given.
    attributes = models.JSONField(default=dict, blank=True)

    # Who supplied each profile value: {"description": {"source": "vendor", "at": "..."},
    # "attributes.parking": {...}}. Values without an entry came from the import.
    data_sources = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.name if self.name else 'Unnamed business'


class ProductVideo(models.Model):
    _id     = models.AutoField(primary_key=True, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='videos')
    video_url         = models.CharField(max_length=500)
    video_thumb       = models.CharField(max_length=500, null=True, blank=True)
    video_duration    = models.FloatField(null=True, blank=True)
    video_uploaded_at = models.DateTimeField(auto_now_add=True)
    order             = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'video_uploaded_at']

    def __str__(self):
        return f"Video {self._id} — {self.product.name}"


class Service(models.Model):
    product = models.ForeignKey(Product, related_name='services', on_delete=models.CASCADE)
    name = models.CharField(max_length=200, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    rating = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, default=1.0)
    numReviews = models.IntegerField(null=True, blank=True, default=0)
    price = models.DecimalField(max_digits=13, decimal_places=1, null=True, blank=True)
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
    """A request to take ownership of a listing, and the audit trail of claims."""
    STATUS_CHOICES = [('pending', 'Pending review'), ('approved', 'Approved'),
                      ('rejected', 'Rejected'), ('revoked', 'Revoked')]
    METHOD_CHOICES = [('listed_phone_otp', 'Code sent to the listing\'s phone'),
                      ('admin_review', 'Reviewed by WedMangal')]
    product    = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='service_owner_claims')
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='service_owner_claims')
    phone      = models.CharField(max_length=15)  # number verified, or the claimant's contact number
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    claimed_at = models.DateTimeField(auto_now_add=True)
    method      = models.CharField(max_length=20, choices=METHOD_CHOICES, blank=True, default='')
    message     = models.TextField(blank=True, default='')  # claimant's explanation, admin review only
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='reviewed_owner_claims')
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-claimed_at']

    def __str__(self):
        return f"{self.user.email} claimed {self.product.name} [{self.status}]"

class BlogPost(models.Model):
    CATEGORY_CHOICES = [
        ('tamil-weddings',    'Tamil Weddings'),
        ('wedding-rituals',   'Wedding Rituals'),
        ('wedding-tips',      'Wedding Tips'),
        ('vendor-tips',       'Vendor Tips'),
        ('real-weddings',     'Real Weddings'),
    ]

    title        = models.CharField(max_length=255)
    slug         = models.SlugField(max_length=255, unique=True, blank=True)
    excerpt      = models.TextField(max_length=300, help_text='Short summary shown on blog listing (max 300 chars)')
    content      = models.TextField(help_text='Full HTML content of the post')
    cover_image  = models.ImageField(upload_to='blog/', blank=True, null=True)
    author       = models.CharField(max_length=100, default='WedMangal Team')
    category     = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='tamil-weddings')
    tags         = models.CharField(max_length=300, blank=True, help_text='Comma-separated tags e.g. Tamil, Brahmin, Rituals')
    published    = models.BooleanField(default=False, help_text='Only published posts appear on the website')
    created_at   = models.DateTimeField(default=timezone.now)
    updated_at   = models.DateTimeField(auto_now=True)

    # Optional: show a "Top Rated Near You" widget of real, live listings on this
    # post — matches Product.category (e.g. 'Halls', 'Makeup_Artist'). City is
    # optional; blank shows top-rated listings across all cities.
    related_category = models.CharField(max_length=200, blank=True, null=True)
    related_city      = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)
            slug = base
            n = 1
            while BlogPost.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base}-{n}'
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def read_time(self):
        words = len(self.content.split())
        minutes = max(1, round(words / 200))
        return minutes

    def __str__(self):
        return self.title


# ── Customer intent tracking ─────────────────────────────────────────────────

class VendorEvent(models.Model):
    """A customer action on WedMangal, e.g. viewing a vendor or tapping WhatsApp.

    Deliberately stores no IP address and no raw user-agent string.
    """

    class EventType(models.TextChoices):
        VENDOR_PAGE_VIEW       = 'vendor_page_view', 'Vendor page view'
        PHONE_CLICK            = 'phone_click', 'Phone click'
        WHATSAPP_CLICK         = 'whatsapp_click', 'WhatsApp click'
        GET_QUOTE_STARTED      = 'get_quote_started', 'Get Quote started'
        GET_QUOTE_SUBMITTED    = 'get_quote_submitted', 'Get Quote submitted'
        EXTERNAL_CONTACT_CLICK = 'external_contact_click', 'External contact click'
        EXTERNAL_BOOKING_CLICK = 'external_booking_click', 'External booking click'
        SEARCH                 = 'search', 'Search'
        SEARCH_RESULT_CLICK    = 'search_result_click', 'Search result click'
        FAVORITE               = 'favorite', 'Favorite'
        SHARE                  = 'share', 'Share'
        SESSION_START          = 'session_start', 'Session start'
        # Vendor-side events, recorded by the server only
        CLAIM_STARTED          = 'claim_started', 'Claim started'
        CLAIM_SUBMITTED        = 'claim_submitted', 'Claim submitted'
        CLAIM_APPROVED         = 'claim_approved', 'Claim approved'
        PROFILE_UPDATED        = 'profile_updated', 'Profile updated'
        # Discovery journey (vendor page → questions → matching vendors → optional contact)
        DISCOVERY_PROMPT_VIEWED      = 'discovery_prompt_viewed', 'Discovery prompt viewed'
        DISCOVERY_STARTED            = 'discovery_started', 'Discovery started'
        DISCOVERY_QUESTION_ANSWERED  = 'discovery_question_answered', 'Discovery question answered'
        DISCOVERY_COMPLETED          = 'discovery_requirements_completed', 'Discovery requirements completed'
        DISCOVERY_MATCHING_RESULTS   = 'discovery_matching_results', 'Discovery matching results'
        DISCOVERY_CONTACT_OPENED     = 'discovery_contact_opened', 'Discovery contact opened'
        DISCOVERY_CONTACT_SUBMITTED  = 'discovery_contact_submitted', 'Discovery contact submitted'
        DISCOVERY_BUDGET_OPENED      = 'discovery_budget_opened', 'Discovery budget planner opened'
        DISCOVERY_SAVE_STARTED       = 'discovery_save_started', 'Discovery save requirements started'
        BUDGET_SAVED                 = 'budget_saved', 'Budget saved'

    class DeviceType(models.TextChoices):
        MOBILE  = 'mobile', 'Mobile'
        TABLET  = 'tablet', 'Tablet'
        DESKTOP = 'desktop', 'Desktop'

    event_type  = models.CharField(max_length=32, choices=EventType.choices)
    vendor      = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True, related_name='events')
    user        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='vendor_events')
    session_id  = models.CharField(max_length=64, blank=True, default='')
    source      = models.CharField(max_length=50, blank=True, default='')
    path        = models.CharField(max_length=300, blank=True, default='')
    referrer    = models.CharField(max_length=300, blank=True, default='')
    device_type = models.CharField(max_length=10, choices=DeviceType.choices, blank=True, default='')
    metadata    = models.JSONField(default=dict, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vendor', 'event_type', 'created_at'], name='vendorevent_vendor_type_time'),
            models.Index(fields=['event_type', 'created_at'], name='vendorevent_type_time'),
        ]

    def __str__(self):
        return f'{self.event_type} – {self.vendor_id or "-"} – {self.created_at:%Y-%m-%d %H:%M}'


class QuoteRequest(models.Model):
    """A customer's Get Quote enquiry for a vendor (a lead)."""

    class Status(models.TextChoices):
        NEW       = 'new', 'New'
        CONTACTED = 'contacted', 'Contacted'
        CONVERTED = 'converted', 'Converted'
        CLOSED    = 'closed', 'Closed'

    vendor     = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='quote_requests')
    user       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='quote_requests')
    session_id = models.CharField(max_length=64, blank=True, default='')
    name       = models.CharField(max_length=100)
    phone      = models.CharField(max_length=10)  # normalised 10-digit Indian mobile
    event_date = models.DateField(null=True, blank=True)
    message    = models.TextField(blank=True, default='')
    consent    = models.BooleanField(default=False)  # customer agreed to share details with the vendor
    source     = models.CharField(max_length=30, default='wedmangal')
    status     = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Vendor notification (base/notifications.py). notified_at doubles as the claim
    # that makes each enquiry notify the vendor at most once.
    class NotifyStatus(models.TextChoices):
        SENT    = 'sent', 'Sent'
        FAILED  = 'failed', 'Failed'
        SKIPPED = 'skipped', 'Skipped'

    notified_at        = models.DateTimeField(null=True, blank=True)
    sms_status         = models.CharField(max_length=8, choices=NotifyStatus.choices, blank=True, default='')
    email_status       = models.CharField(max_length=8, choices=NotifyStatus.choices, blank=True, default='')
    notification_error = models.CharField(max_length=255, blank=True, default='')

    # WhatsApp (preferred channel). Statuses follow the provider: accepted is not delivered.
    class WhatsAppStatus(models.TextChoices):
        ACCEPTED  = 'accepted', 'Accepted by provider'
        SENT      = 'sent', 'Sent'
        DELIVERED = 'delivered', 'Delivered'
        READ      = 'read', 'Read'
        FAILED    = 'failed', 'Failed'
        SKIPPED   = 'skipped', 'Skipped'

    whatsapp_status     = models.CharField(max_length=10, choices=WhatsAppStatus.choices, blank=True, default='')
    whatsapp_request_id = models.CharField(max_length=64, blank=True, default='', db_index=True)
    whatsapp_updated_at = models.DateTimeField(null=True, blank=True)
    sms_fallback_at     = models.DateTimeField(null=True, blank=True)   # claim for one late SMS after a WhatsApp failure

    # Discovery answers the customer chose to send with this enquiry (base/discovery.py structure)
    requirements        = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['vendor', 'created_at'], name='quoterequest_vendor_time')]

    def __str__(self):
        return f'{self.name} → {self.vendor} ({self.get_status_display()})'


class SearchQuery(models.Model):
    """One customer search and the structured intent extracted from it.

    Used only in aggregate (search-intent analytics). The raw query has phone
    numbers and email addresses removed before it is stored.
    """

    class Source(models.TextChoices):
        KEYWORD     = 'keyword', 'Search box'
        FILTERS     = 'filters', 'Filter bar'
        CATEGORY    = 'category', 'Category page filters'
        SEARCH_PAGE = 'search_page', 'Search page'
        DISCOVERY   = 'discovery', 'Discovery questions'

    # Same values as Product.attributes["food_type"] and the food_type filter
    class Food(models.TextChoices):
        VEG    = 'veg', 'Vegetarian'
        NONVEG = 'nonveg', 'Non-vegetarian'
        BOTH   = 'both', 'Veg & non-veg'

    user             = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='search_queries')
    session_id       = models.CharField(max_length=64, blank=True, default='')
    source           = models.CharField(max_length=20, choices=Source.choices)
    query            = models.CharField(max_length=200, blank=True, default='')
    normalized_query = models.CharField(max_length=200, blank=True, default='')
    filters          = models.JSONField(default=dict, blank=True)
    result_count     = models.PositiveIntegerField(null=True, blank=True)

    # Structured intent — null whenever it couldn't be determined confidently
    category         = models.CharField(max_length=32, null=True, blank=True)  # a CATEGORY_LABELS key
    area             = models.CharField(max_length=150, null=True, blank=True)
    city             = models.CharField(max_length=100, null=True, blank=True)
    capacity         = models.PositiveIntegerField(null=True, blank=True)
    budget_min       = models.PositiveIntegerField(null=True, blank=True)  # INR
    budget_max       = models.PositiveIntegerField(null=True, blank=True)  # INR
    food_preference  = models.CharField(max_length=10, choices=Food.choices, null=True, blank=True)
    parking_required = models.BooleanField(null=True, blank=True)
    ac_required      = models.BooleanField(null=True, blank=True)
    event_date       = models.DateField(null=True, blank=True)

    created_at       = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', 'created_at'], name='searchquery_category_time'),
            models.Index(fields=['area', 'created_at'], name='searchquery_area_time'),
        ]

    def __str__(self):
        return f'{self.get_source_display()}: {self.query or self.filters} ({self.created_at:%Y-%m-%d})'


class DiscoveryLead(models.Model):
    """A visitor's wedding requirement, left with consent for WedMangal (not a vendor) to call them.

    Created from the discovery journey. No user account is created. `requirements` follows
    base/discovery.py: location, guest_count, budget, must_have, prefer, avoid, dont_care, ...
    """

    class Status(models.TextChoices):
        NEW       = 'new', 'New'
        CONTACTED = 'contacted', 'Contacted'
        MATCHED   = 'matched', 'Matched with vendors'
        CLOSED    = 'closed', 'Closed'

    session_id    = models.CharField(max_length=64, blank=True, default='')
    source_vendor = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name='discovery_leads')
    category      = models.CharField(max_length=32, blank=True, default='')
    requirements  = models.JSONField(default=dict, blank=True)
    name          = models.CharField(max_length=100)
    phone         = models.CharField(max_length=10)        # normalised 10-digit Indian mobile
    event_date    = models.DateField(null=True, blank=True)
    message       = models.TextField(blank=True, default='')
    consent       = models.BooleanField(default=False)     # agreed to be contacted by WedMangal
    status        = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW)
    notes         = models.TextField(blank=True, default='')  # founder's call notes (admin only)
    created_at    = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Lead #{self.pk} – {self.name} ({self.get_status_display()})'


class SavedRequirement(models.Model):
    """A logged-in visitor's discovery requirement, saved so they can come back to it.

    Saving is NOT consent to be contacted — only DiscoveryLead carries that.
    """
    user          = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_requirements')
    category      = models.CharField(max_length=32, blank=True, default='')
    requirements  = models.JSONField(default=dict, blank=True)   # same structure as DiscoveryLead.requirements
    source_vendor = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name='saved_requirements')
    created_at    = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} – {self.category or "requirement"} ({self.created_at:%Y-%m-%d})'


# ── Vendor prospects (internal research only) ────────────────────────────────

class VendorProspect(models.Model):
    """A business found during research. NOT a WedMangal vendor.

    Isolated on purpose: no public view, serializer, search, sitemap or vendor page reads this table,
    and nothing here creates a User, Product, Service or Review. See docs/prospects.md and base/prospects.py.
    `attributes` uses the Product.attributes keys and rule: a missing key means unknown, never False.
    """

    class AreaStatus(models.TextChoices):
        LOCATED_IN = 'located_in', 'Located in the area'
        SERVES     = 'serves', 'Serves the area'
        UNKNOWN    = 'unknown', 'Unknown'

    class DataSource(models.TextChoices):
        OFFICIAL  = 'official', 'Official website'
        DIRECTORY = 'directory', 'Directory'
        GOOGLE    = 'google', 'Google'
        OTHER     = 'other', 'Other'

    class Decision(models.TextChoices):
        NEW                = 'new', 'New'                              # passed the gates, awaiting a person
        NEEDS_REVIEW       = 'needs_review', 'Needs review'
        KEEP               = 'keep', 'Keep'
        REJECT             = 'reject', 'Reject'
        DUPLICATE          = 'duplicate', 'Duplicate'
        READY_FOR_OUTREACH = 'ready_for_outreach', 'Ready for outreach'

    class Verification(models.TextChoices):
        UNVERIFIED      = 'unverified', 'Unverified'
        SOURCE_CHECKED  = 'source_checked', 'Source page fetched and parsed'
        MANUALLY_CHECKED = 'manually_checked', 'Checked by a person'

    # Identity
    business_name     = models.CharField(max_length=200)
    normalized_name   = models.CharField(max_length=200, db_index=True)
    categories        = models.JSONField(default=list, blank=True)      # CUSTOMER_CATEGORIES keys
    category_evidence = models.JSONField(default=list, blank=True)      # [{"category", "source_url", "quote"}]

    # Location
    business_area = models.CharField(max_length=150, blank=True, default='')   # one of CHENNAI_AREAS, or blank
    area_status   = models.CharField(max_length=12, choices=AreaStatus.choices, default=AreaStatus.UNKNOWN)
    service_area  = models.CharField(max_length=150, blank=True, default='')
    city          = models.CharField(max_length=100, blank=True, default='')
    address       = models.TextField(blank=True, default='')
    pincode       = models.CharField(max_length=6, blank=True, default='')
    area_evidence = models.JSONField(default=list, blank=True)          # [{"source_url", "quote"}]

    # Contact (public business details only)
    phone       = models.CharField(max_length=15, blank=True, default='', db_index=True)   # 10-digit, validated
    website_url = models.URLField(max_length=300, blank=True, default='')
    website_domain = models.CharField(max_length=200, blank=True, default='', db_index=True)

    # Sources
    source_name        = models.CharField(max_length=100, blank=True, default='')
    source_url         = models.URLField(max_length=500, blank=True, default='')       # page where it was found
    source_listing_url = models.URLField(max_length=500, blank=True, default='', db_index=True)  # its own page
    sources            = models.JSONField(default=list, blank=True)    # [{"url", "name", "fetched_at", "status"}]
    data_source        = models.CharField(max_length=10, choices=DataSource.choices, default=DataSource.DIRECTORY)
    google_place_id    = models.CharField(max_length=200, blank=True, default='', db_index=True)
    research_category  = models.CharField(max_length=32, blank=True, default='')       # what we searched for
    research_area      = models.CharField(max_length=150, blank=True, default='')

    # Facts — only what a source states
    rating        = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    review_count  = models.PositiveIntegerField(null=True, blank=True)
    rating_source = models.CharField(max_length=300, blank=True, default='')
    description   = models.TextField(blank=True, default='')
    services      = models.JSONField(default=list, blank=True)
    attributes    = models.JSONField(default=dict, blank=True)          # Product.attributes keys; missing = unknown
    capacity      = models.JSONField(null=True, blank=True)             # {"value", "source_url", "quote"} if stated
    pricing       = models.JSONField(null=True, blank=True)             # {"value", "source_url", "quote"} if stated

    # Workflow
    scraped_at          = models.DateTimeField(null=True, blank=True)
    verification_status = models.CharField(max_length=20, choices=Verification.choices, default=Verification.UNVERIFIED)
    decision            = models.CharField(max_length=20, choices=Decision.choices, default=Decision.NEW, db_index=True)
    decision_by         = models.CharField(max_length=10, default='auto')   # 'auto' (import rules) or 'person'
    quality_passed      = models.BooleanField(default=False, db_index=True)
    quality_score       = models.PositiveSmallIntegerField(default=0)
    quality_failures    = models.JSONField(default=list, blank=True)
    missing_fields      = models.JSONField(default=list, blank=True)
    duplicate_of        = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True,
                                            related_name='duplicates')
    matches_product     = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True,
                                            related_name='+')   # recorded only; the Product is never changed
    notes               = models.TextField(blank=True, default='')
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-quality_score', 'business_name']

    def __str__(self):
        return f'{self.business_name} ({", ".join(self.categories) or "no category"}, {self.business_area or "area unknown"})'
