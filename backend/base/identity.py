"""One person, one account — reachable by email+password, Google or a phone code.

Accounts are joined only on proof, never on a guess:
  * email + password  → the account with that e-mail (or username) whose password matches
  * Google            → the account with that e-mail, and only if Google says it is verified
  * phone code        → the account whose profile holds that phone (Profile.phone, unique)

A phone joins an account when its holder proves it with a code while logged in
(Add phone, or a successful listing claim). If the phone currently sits on an
empty phone-only account — one created automatically by a past phone login, with
no e-mail, no password, no listing and no orders — it is moved; that account
could only ever be reached with this same phone, so nothing is taken from anyone.
"""
from django.contrib.auth.models import User
from django.db import transaction

from base.models import Order, Profile


def users_with_email(email):
    email = (email or '').strip()
    return list(User.objects.filter(email__iexact=email, is_active=True)) if email else []


def preferred_account(users):
    """Several accounts can share an e-mail (legacy data). Prefer the one that runs a
    business, then staff, then the most recently used, then the oldest."""
    def rank(u):
        runs_business = hasattr(u, 'product') or u.claimed_listings.exists()
        return (not runs_business, not u.is_staff, -(u.last_login.timestamp() if u.last_login else 0), u.id)
    return min(users, key=rank) if users else None


def user_for_password_login(identifier, password):
    """Username or e-mail (any case). Returns the account whose password matches, or None."""
    identifier = (identifier or '').strip()
    if not identifier or not password:
        return None
    candidates = list(User.objects.filter(username=identifier, is_active=True))
    if not candidates:
        candidates = users_with_email(identifier)
    matches = [u for u in candidates if u.check_password(password)]
    return preferred_account(matches)


def is_disposable_phone_account(user):
    """An account that exists only because someone once logged in with this phone."""
    return (not user.email and not user.has_usable_password() and not user.is_staff
            and not hasattr(user, 'product') and not user.claimed_listings.exists()
            and not Order.objects.filter(user=user).exists())


def phone_blocker(user, phone):
    """None if this phone may be attached to user, else a reason."""
    holder = Profile.objects.filter(phone=phone).exclude(user=user).select_related('user').first()
    if holder is None or is_disposable_phone_account(holder.user):
        return None
    return 'in_use'


@transaction.atomic
def attach_phone(user, phone):
    """Attach a phone the user has just proven with a code. Returns True if attached."""
    holder = Profile.objects.select_for_update().filter(phone=phone).exclude(user=user).first()
    if holder is not None:
        if not is_disposable_phone_account(holder.user):
            return False
        _merge_light_data(holder.user, user)
        holder.phone = None
        holder.save(update_fields=['phone'])
        holder.user.is_active = False          # it had no other way in; keep it from being reused
        holder.user.save(update_fields=['is_active'])
    profile = Profile.objects.select_for_update().get(user=user)
    profile.phone = phone
    profile.save(update_fields=['phone'])
    user.profile.phone = phone                 # keep the cached instance in step for serializers
    return True


def _merge_light_data(source, target):
    """Bring over what a phone-only customer may have saved (wishlist, cart, budget, enquiries)."""
    from base.models import Budget, CartItem, QuoteRequest, Wishlist
    for model in (Wishlist, CartItem, Budget, QuoteRequest):
        model.objects.filter(user=source).update(user=target)
