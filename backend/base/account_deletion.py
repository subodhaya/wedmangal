"""Delete a person's account (POST /api/users/delete-account/, page /delete-account).

The User row is emptied and locked rather than removed: OrderItem.user cascades, so removing the row would
also erase the booking records vendors rely on. What stays holds nothing that identifies the person.

Listings the person managed:
  * created by or for them → hidden, and everything they supplied is erased
  * an existing listing they claimed → hidden and released, their private phone and videos erased;
    staff decide whether the public business information goes back online
"""
import logging
import secrets

from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from django.contrib.admin.models import LogEntry
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.authtoken.models import Token

from base import vendor_profile as vp
from base.models import (Budget, CartItem, Order, OrderItem, Product, QuoteRequest, Review, SavedRequirement,
                         SearchQuery, ServiceImage, ServiceOwnerClaim, ShippingAddress, VendorEvent, Wishlist)

logger = logging.getLogger(__name__)

DELETED_NAME = 'Deleted user'


class DeletionBlocked(Exception):
    """Shown to the person as it is."""


def delete_account(user):
    if vp.is_admin(user) or user.is_superuser:
        raise DeletionBlocked('Team accounts can’t be deleted here. Ask another admin to remove your access first.')
    if vp.is_imported_account(user):
        raise DeletionBlocked('This account can’t be deleted here. Please contact us.')
    with transaction.atomic():
        files = []
        for product in Product.objects.select_for_update().filter(Q(user=user) | Q(claimed_by=user)):
            files += _remove_listing(product, user)
        _cancel_upcoming_bookings(user)
        _erase_personal_rows(user)
        _empty_user(user)
        transaction.on_commit(lambda: _delete_files(files))
    logger.info('Account %s deleted at the person\'s request', user.pk)


# ── Listings ─────────────────────────────────────────────────────────────────

def _remove_listing(product, user):
    """Returns the files to delete once the database change is final."""
    claimed_existing = ServiceOwnerClaim.objects.filter(
        product=product, user=user, status__in=('approved', 'revoked')).exists()
    if product.user_id not in (None, user.pk) and product.claimed_by_id == user.pk:
        # Someone else's listing this account only had a claim on: just let go of it.
        product.is_claimed, product.claimed_by, product.claimed_at = False, None, None
        product.is_verified, product.verified_at = False, None
        product.save()
        return []

    files = []
    for video in product.videos.all():
        files.append(('video', (video.video_url, video.video_thumb)))
    if product.video_url:
        files.append(('video', (product.video_url, product.video_thumb)))
    product.videos.all().delete()
    product.video_url = product.video_thumb = product.video_duration = product.video_uploaded_at = None

    product.is_approved = product.is_claimed = product.is_verified = product.is_available_today = False
    product.user = product.claimed_by = product.claimed_at = product.verified_at = None
    product.personal_phone = ''

    if not claimed_existing:
        images = ServiceImage.objects.filter(service__product=product)
        files += [('image', i.image.name) for i in images if i.image]
        images.delete()
        if product.image:
            files.append(('image', product.image.name))
        product.image = Product._meta.get_field('image').default
        product.name = f'Deleted listing {product._id}'
        for field in ('brand', 'custom_category', 'description', 'area_name', 'address', 'business_phone',
                      'instagram_url', 'website_url', 'opening_time', 'closing_time', 'min_price', 'max_price'):
            setattr(product, field, None)
        product.attributes, product.data_sources = {}, {}
        product.services.update(description='')      # service names stay: customers' bookings show them
        product.unavailable_dates.all().delete()
    product.save()
    return files


def _delete_files(files):
    from base.views.product_views import _delete_video_files
    storage = Product._meta.get_field('image').storage
    for kind, value in files:
        try:
            if kind == 'video':
                _delete_video_files(*value)
                continue
            # Never a bundled picture, a path outside the upload folder, or one another listing still uses
            if value.startswith('/') or 'placeholder' in value:
                continue
            if not (Product.objects.filter(image=value).exists() or ServiceImage.objects.filter(image=value).exists()):
                storage.delete(value)
        except Exception:      # the account is already deleted; a leftover file must not turn that into an error
            logger.exception('Could not delete a file of a deleted account')


# ── The person's own data ────────────────────────────────────────────────────

def _cancel_upcoming_bookings(user):
    upcoming = OrderItem.objects.filter(user=user, start_date__gte=timezone.localdate()).values('order_id')
    Order.objects.filter(user=user, pk__in=upcoming, markasDone=False).update(isCancelled=True)


def _erase_personal_rows(user):
    for model in (CartItem, Wishlist, Budget, SavedRequirement, ServiceOwnerClaim,
                  SocialAccount, EmailAddress, Token, LogEntry):
        model.objects.filter(user=user).delete()
    ShippingAddress.objects.filter(order__user=user).update(address='', city='', postalCode='', country='')
    # Enquiries stay countable for the vendor, without the person in them
    QuoteRequest.objects.filter(user=user).update(
        user=None, session_id='', name=DELETED_NAME, phone='', message='', event_date=None, requirements={})
    Review.objects.filter(user=user).update(user=None, name=DELETED_NAME)
    VendorEvent.objects.filter(user=user).update(user=None, session_id='')
    SearchQuery.objects.filter(user=user).update(user=None, session_id='', query='', normalized_query='')


def _empty_user(user):
    profile = user.profile
    profile.phone = profile.wedding_date = None
    profile.role = 'customer'
    profile.save()
    user.username = f'deleted-{user.pk}-{secrets.token_hex(4)}'
    user.first_name, user.last_name, user.email = DELETED_NAME, '', ''
    user.last_login = None
    user.is_active = False          # also makes every login token already issued useless
    user.set_unusable_password()
    user.save()
    user.groups.clear()
    user.user_permissions.clear()
