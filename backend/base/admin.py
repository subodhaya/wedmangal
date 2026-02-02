# base/admin.py
from django.contrib import admin
from django.contrib.auth.models import User
from .models import Profile, Product, Service, Review, Order, OrderItem, Budget,ShippingAddress,ServiceImage,CartItem,Wishlist
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

admin.site.register(Product)
admin.site.register(Service)
admin.site.register(Review)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(ShippingAddress)
admin.site.register(ServiceImage)
admin.site.register(CartItem)
admin.site.register(Wishlist)
admin.site.register(Budget)
