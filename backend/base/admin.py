# base/admin.py
from django.contrib import admin
from django.contrib.auth.models import User
from .models import Profile, Product, Service, Review, Order, OrderItem, Budget, ShippingAddress, ServiceImage, CartItem, Wishlist, BlogPost, VendorEvent, QuoteRequest, ServiceOwnerClaim, DiscoveryLead, SavedRequirement
from django.db import transaction
from django.utils import timezone
from . import analytics, discovery, vendor_profile
from django.utils.html import format_html_join
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Profile'

class UserAdmin(BaseUserAdmin):
    inlines = (ProfileInline,)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj and obj.is_superuser:
            form.base_fields['is_staff'].widget.attrs['readonly'] = True
            form.base_fields['is_superuser'].widget.attrs['readonly'] = True
        return form

    def save_model(self, request, obj, form, change):
        # Allow only specific usernames to be set as superuser
        if obj.is_superuser and obj.username not in ['admin1', 'admin2', 'admin3']:
            raise ValueError("Only 'admin1', 'admin2', and 'admin3' can be superusers.")
        super().save_model(request, obj, form, change)

admin.site.unregister(User)
admin.site.register(User, UserAdmin)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'area_name', 'is_approved', 'is_claimed', 'is_verified', 'createdAt')
    list_filter = ('is_approved', 'is_claimed', 'is_verified', 'category')
    search_fields = ('name', 'area_name', 'business_phone')
    # Ownership changes only through the claim workflow (Service owner claims), so it stays audited.
    readonly_fields = ('is_claimed', 'claimed_by', 'claimed_at', 'verified_at', 'data_sources')
    actions = ('mark_verified', 'remove_verification', 'revoke_claim')

    def save_model(self, request, obj, form, change):
        if 'is_verified' in form.changed_data:
            obj.verified_at = timezone.now() if obj.is_verified else None
        if obj.is_verified and not obj.is_claimed:
            obj.is_verified, obj.verified_at = False, None
            self.message_user(request, 'Only a claimed listing can be verified — verification was not saved.',
                              level='warning')
        if change:
            changed = [f for f in form.changed_data if f in vendor_profile.BASIC_FIELDS]
            if 'attributes' in form.changed_data:
                old = form.initial.get('attributes') or {}
                new = obj.attributes or {}
                changed += [f'attributes.{k}' for k in set(old) | set(new) if old.get(k) != new.get(k)]
            vendor_profile.stamp_sources(obj, changed, 'admin')
        super().save_model(request, obj, form, change)

    @admin.action(description='Mark as verified by WedMangal (claimed listings only)')
    def mark_verified(self, request, queryset):
        n = queryset.filter(is_claimed=True, is_verified=False).update(is_verified=True, verified_at=timezone.now())
        skipped = queryset.filter(is_claimed=False).count()
        self.message_user(request, f'{n} listing(s) verified.' + (f' {skipped} unclaimed listing(s) skipped.' if skipped else ''))

    @admin.action(description='Remove verification')
    def remove_verification(self, request, queryset):
        n = queryset.filter(is_verified=True).update(is_verified=False, verified_at=None)
        self.message_user(request, f'Verification removed from {n} listing(s).')

    @admin.action(description='Revoke claim (listing becomes unclaimed)')
    def revoke_claim(self, request, queryset):
        n = 0
        for product in queryset.filter(is_claimed=True):
            with transaction.atomic():
                ServiceOwnerClaim.objects.filter(product=product, status='approved').update(
                    status='revoked', reviewed_by=request.user, reviewed_at=timezone.now())
                product.is_claimed, product.claimed_by, product.claimed_at = False, None, None
                product.is_verified, product.verified_at = False, None
                product.save(update_fields=['is_claimed', 'claimed_by', 'claimed_at', 'is_verified', 'verified_at'])
            n += 1
        self.message_user(request, f'{n} claim(s) revoked. The account still owns the listing until you change '
                                   f'its user; nobody can claim it again while that account owns it.')


@admin.register(ServiceOwnerClaim)
class ServiceOwnerClaimAdmin(admin.ModelAdmin):
    list_display = ('product', 'user', 'claimant_email', 'status', 'method', 'phone', 'claimed_at', 'reviewed_by')
    list_filter = ('status', 'method', 'claimed_at')
    search_fields = ('product__name', 'user__email', 'user__username', 'phone')
    readonly_fields = ('product', 'user', 'claimant_email', 'phone', 'method', 'message', 'status',
                       'claimed_at', 'reviewed_by', 'reviewed_at', 'listing_phone', 'listing_owner')
    fields = readonly_fields
    actions = ('approve_claims', 'reject_claims')

    def has_add_permission(self, request):
        return False

    @admin.display(description='Claimant e-mail')
    def claimant_email(self, obj):
        return obj.user.email

    @admin.display(description='Phone on the listing')
    def listing_phone(self, obj):
        return obj.product.business_phone

    @admin.display(description='Listing currently owned by')
    def listing_owner(self, obj):
        owner = obj.product.user
        if owner is None:
            return '—'
        return f'{owner.username} (imported placeholder)' if vendor_profile.is_imported_account(owner) else owner.username

    @admin.action(description='Approve selected pending claims')
    def approve_claims(self, request, queryset):
        from .views.claim_views import take_ownership
        approved, problems = 0, []
        for claim in queryset.filter(status='pending').select_related('product', 'user'):
            with transaction.atomic():
                product = Product.objects.select_for_update().get(pk=claim.product_id)
                reason = vendor_profile.claim_blocker(claim.user, product)
                if reason:
                    problems.append(f'{product}: {reason.replace("_", " ")}')
                    continue
                take_ownership(product, claim.user, method='admin_review', phone=claim.phone,
                               reviewer=request.user, claim=claim)
            analytics.record_event(VendorEvent.EventType.CLAIM_APPROVED, vendor=product, user=claim.user,
                                   source='admin', metadata={'channel': 'admin_review'}, dedupe=False)
            approved += 1
        self.message_user(request, f'{approved} claim(s) approved.')
        if problems:
            self.message_user(request, 'Not approved — ' + '; '.join(problems), level='warning')

    @admin.action(description='Reject selected pending claims')
    def reject_claims(self, request, queryset):
        n = queryset.filter(status='pending').update(status='rejected', reviewed_by=request.user,
                                                     reviewed_at=timezone.now())
        self.message_user(request, f'{n} claim(s) rejected.')
admin.site.register(Service)
admin.site.register(Review)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(ShippingAddress)
admin.site.register(ServiceImage)
admin.site.register(CartItem)
admin.site.register(Wishlist)
admin.site.register(Budget)


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display  = ('title', 'category', 'author', 'published', 'created_at', 'read_time')
    list_filter   = ('published', 'category')
    search_fields = ('title', 'excerpt', 'content', 'tags')
    prepopulated_fields = {'slug': ('title',)}
    list_editable = ('published',)
    ordering      = ('-created_at',)
    fieldsets = (
        ('Post Info', {
            'fields': ('title', 'slug', 'author', 'category', 'tags', 'published')
        }),
        ('Content', {
            'fields': ('excerpt', 'cover_image', 'content'),
            'description': 'Write the full post content in HTML. Use &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;strong&gt; etc.',
        }),
    )


@admin.register(QuoteRequest)
class QuoteRequestAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'vendor', 'event_date', 'status', 'sms_status', 'email_status', 'created_at')
    list_editable = ('status',)
    list_filter = ('status', 'sms_status', 'email_status', 'created_at')
    search_fields = ('name', 'phone', 'vendor__name')
    readonly_fields = ('vendor', 'user', 'session_id', 'consent', 'source', 'created_at', 'updated_at',
                       'notified_at', 'sms_status', 'email_status', 'notification_error')


@admin.register(VendorEvent)
class VendorEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'vendor', 'user', 'device_type', 'source', 'created_at')
    list_filter = ('event_type', 'device_type', 'created_at')
    search_fields = ('vendor__name',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(DiscoveryLead)
class DiscoveryLeadAdmin(admin.ModelAdmin):
    """Visitors who asked WedMangal to help them find vendors (with consent to be called)."""
    list_display = ('id', 'created_at', 'name', 'phone', 'looking_for', 'location', 'guests', 'budget', 'status')
    list_display_links = ('id', 'name')
    list_editable = ('status',)
    list_filter = ('status', 'category', 'created_at')
    search_fields = ('name', 'phone', 'message', 'notes')
    readonly_fields = ('requirement_summary', 'source_vendor', 'session_id', 'consent', 'created_at', 'updated_at',
                       'requirements')
    fields = ('status', 'notes', 'requirement_summary', 'name', 'phone', 'event_date', 'message', 'consent',
              'source_vendor', 'created_at', 'updated_at', 'session_id', 'requirements')

    def has_add_permission(self, request):
        return False

    def _req(self, obj, key):
        return (obj.requirements or {}).get(key) or {}

    @admin.display(description='Looking for')
    def looking_for(self, obj):
        return obj.category.replace('_', ' ') or '—'

    @admin.display(description='Location')
    def location(self, obj):
        loc = self._req(obj, 'location')
        return 'Anywhere' if loc.get('anywhere') else loc.get('area') or loc.get('other') or '—'

    @admin.display(description='Guests')
    def guests(self, obj):
        g = self._req(obj, 'guest_count')
        return discovery._range(g) if g else '—'

    @admin.display(description='Budget')
    def budget(self, obj):
        b = self._req(obj, 'budget')
        return 'Not sure' if b.get('unsure') else (discovery._range(b, '₹') if b else '—')

    @admin.display(description='Requirement')
    def requirement_summary(self, obj):
        lines = discovery.summary_lines(obj.requirements, obj.source_vendor)
        return format_html_join('', '<div>{}</div>', ((line,) for line in lines)) or '—'


@admin.register(SavedRequirement)
class SavedRequirementAdmin(admin.ModelAdmin):
    """Requirements visitors saved for themselves. Not consent to be contacted — see Discovery leads."""
    list_display = ('id', 'created_at', 'user', 'category', 'summary')
    list_filter = ('category', 'created_at')
    readonly_fields = ('user', 'category', 'requirements', 'source_vendor', 'created_at')

    def has_add_permission(self, request):
        return False

    @admin.display(description='Requirement')
    def summary(self, obj):
        return ' · '.join(discovery.summary_lines(obj.requirements)[1:4])
