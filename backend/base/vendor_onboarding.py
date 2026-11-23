"""Add a vendor whose details came by WhatsApp (Django admin → Products → "Add vendor from WhatsApp").

The listing always goes to the vendor's OWN account, found by their phone first, then their e-mail:

    phone already on an account        → that account (it is theirs: they logged in with it)
    no phone, but e-mail on an account → that account; the phone is attached to it
    neither                            → a new account with the phone attached, no password, no made-up e-mail
                                         (they log in with their phone and get a code on WhatsApp)

It refuses, instead of guessing, when the phone and the e-mail belong to two different accounts, when the
account already runs a listing (one listing per account), when the account is switched off, or when a
listing with the same name or phone already exists (unless the admin ticks "create anyway").
"""
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from base import areas, identity
from base.analytics import normalize_indian_mobile
from base.models import Product, Profile

CATEGORIES = [
    ('Halls', 'Wedding halls / venues'), ('Photographers', 'Photographers'), ('Makeup_Artist', 'Makeup artists'),
    ('Caterers', 'Caterers'), ('Decorators', 'Decorators'), ('Mehandi_Artist', 'Mehandi artists'),
    ('DJ_Artist', 'DJ artists'), ('Planners', 'Wedding planners'), ('Invitation', 'Invitations'),
    ('Jewellery', 'Jewellery'), ('Pandit', 'Pandits'), ('Travel_Transport', 'Travel & transport'),
    ('Entertainment', 'Entertainment'), ('Return_Gifts', 'Return gifts'),
]
SOURCE = 'admin_whatsapp'


class OnboardingError(Exception):
    """Shown to the admin as-is; nothing has been saved."""


def clean_phone(value, label):
    phone = normalize_indian_mobile(str(value or ''))
    if not phone:
        raise OnboardingError(f'{label}: enter a 10-digit Indian mobile number (with or without +91).')
    return phone


def clean_city(value):
    city = areas.canonical_city(value)
    if not city:
        raise OnboardingError(f'City "{value}" is not one we list. Choose one of: {", ".join(areas.CITIES)}.')
    return city


def clean_area(value):
    """Known area → its exact spelling; anything else → Title Case as typed ('keelkattalai' → 'Keelkattalai')."""
    value = ' '.join(str(value or '').split())
    if not value:
        return ''
    return areas.canonical(value) or value.title()


def find_owner(phone, email):
    """(account or None, how it was found). Raises OnboardingError when it can't be decided safely."""
    holder = Profile.objects.filter(phone=phone).select_related('user').first()
    by_phone = holder.user if holder else None
    by_email = identity.preferred_account(identity.users_with_email(email)) if email else None
    if by_phone and by_email and by_phone.id != by_email.id:
        raise OnboardingError(
            f'The phone {phone} belongs to account #{by_phone.id} ({by_phone.email or by_phone.username}) but the '
            f'e-mail {email} belongs to account #{by_email.id}. Ask the vendor which one they use, then fix the '
            f'accounts in Users first.')
    owner = by_phone or by_email
    if owner is None:
        return None, 'new'
    if not owner.is_active:
        raise OnboardingError(f'Account #{owner.id} ({owner.email or owner.username}) is switched off. '
                              f'Switch it on in Users first if it is really theirs.')
    listing = Product.objects.filter(user=owner).first()
    if listing:
        raise OnboardingError(f'Account #{owner.id} already runs listing #{listing._id} ({listing.name}). '
                              f'One account manages one listing — edit that listing instead.')
    return owner, 'phone' if by_phone else 'email'


def duplicates(name, phones):
    phones = [p for p in phones if p]
    found = Product.objects.filter(name__iexact=name.strip())
    for phone in phones:
        found = found | Product.objects.filter(business_phone__endswith=phone) | \
            Product.objects.filter(personal_phone__endswith=phone)
    return list(found.distinct().order_by('_id')[:5])


def _new_account(phone, email, owner_name):
    username = phone if not User.objects.filter(username=phone).exists() else f'vendor-{phone}'
    if User.objects.filter(username=username).exists():
        raise OnboardingError(f'A user named "{username}" already exists. Check Users for this phone first.')
    user = User(username=username, email=email or '', first_name=(owner_name or '')[:150])
    user.set_unusable_password()            # phone login (WhatsApp code) or Google with this e-mail
    user.save()
    return user


@transaction.atomic
def create_vendor(data, admin_user, image=None, allow_duplicate=False):
    """data: name, category, city, area, address, business_phone, owner_phone, owner_name, owner_email,
    description, instagram_url, website_url, min_price, max_price, approve. Returns (product, owner, how)."""
    name = ' '.join(str(data.get('name') or '').split())
    if not name:
        raise OnboardingError('Business name is required.')
    if data.get('category') not in dict(CATEGORIES):
        raise OnboardingError('Choose a category.')
    city = clean_city(data.get('city'))
    business_phone = clean_phone(data.get('business_phone'), 'Business phone')
    owner_phone = clean_phone(data.get('owner_phone') or business_phone, "Owner's phone")
    email = str(data.get('owner_email') or '').strip().lower()

    found = duplicates(name, [business_phone, owner_phone])
    if found and not allow_duplicate:
        listed = '; '.join(f'#{p._id} {p.name} ({p.business_phone or "no phone"})' for p in found)
        raise OnboardingError(f'Possible duplicate listing: {listed}. Open it and edit it instead, or tick '
                              f'"create anyway" if this really is a different business.')
    if Product.objects.filter(name__iexact=name).exists():
        raise OnboardingError(f'A listing is already called "{name}" — listing names must be unique.')

    owner, how = find_owner(owner_phone, email)
    if owner is None:
        owner = _new_account(owner_phone, email, data.get('owner_name'))
    elif email and not owner.email:
        owner.email = email
        owner.save(update_fields=['email'])
    try:
        profile = owner.profile                 # the cached instance, so the returned owner stays up to date
    except Profile.DoesNotExist:
        profile = Profile.objects.create(user=owner)
    if profile.phone != owner_phone:
        # Admin enters the number the vendor messaged from; any throwaway phone-only account loses it.
        if identity.phone_blocker(owner, owner_phone):
            raise OnboardingError(f'The phone {owner_phone} is already on another account. Check Users first.')
        identity.attach_phone(owner, owner_phone)
        profile.refresh_from_db()
    if profile.role != 'service-owner':
        profile.role = 'service-owner'
        profile.save(update_fields=['role'])

    now = timezone.now()
    product = Product(
        user=owner, name=name, category=data['category'], city=city, area_name=clean_area(data.get('area')) or None,
        address=(data.get('address') or '').strip() or None, business_phone=business_phone,
        personal_phone=owner_phone, description=(data.get('description') or '').strip() or None,
        instagram_url=data.get('instagram_url') or None, website_url=data.get('website_url') or None,
        min_price=data.get('min_price') or None, max_price=data.get('max_price') or None,
        is_approved=bool(data.get('approve')), is_claimed=True, claimed_by=owner, claimed_at=now,
        data_sources={'_created': {'source': SOURCE, 'by': admin_user.username, 'at': now.isoformat(timespec='seconds'),
                                   'owner_found_by': how}},
    )
    if image:
        product.image = image
    product.save()
    return product, owner, how


def whatsapp_reply(product):
    """Text the admin can paste back to the vendor."""
    return (f'Your business "{product.name}" is now on WedMangal: https://www.wedmangal.com/product/{product._id}\n\n'
            f'To manage it, log in at https://www.wedmangal.com/login with your phone number '
            f'{product.personal_phone}. You will get a code on WhatsApp. Then tap "Manage my business" to add '
            f'photos, prices and details.')
