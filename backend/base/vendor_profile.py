"""Vendor claim rules and profile completion.

Listing states (derived, nothing duplicated):
    unclaimed  Product.is_claimed is False (the listing came from the import, or
               its owner has not proven control of it)
    pending    the user has a ServiceOwnerClaim(status='pending') awaiting admin review
    claimed    Product.is_claimed — ownership was proven (code sent to the listing's
               own phone) or approved by an admin
    verified   Product.is_verified — set only by WedMangal staff, never by a claim

Category details live in Product.attributes, using the same keys the existing
category filters already read (food_type, capacity, ac, parking, ...).
Unknown is not No: a question nobody has answered is simply absent from
attributes — it is never stored as False, 0 or ''.
"""
from django.utils import timezone

from base.analytics import normalize_indian_mobile

# Owner accounts created by the vendor import all use this e-mail domain.
IMPORT_ACCOUNT_DOMAIN = '@bookyourcelebrations.com'

YES_NO = 'yes_no'
CHOICE = 'choice'
NUMBER = 'number'
TEXT = 'text'

FOOD_TYPE = {'key': 'food_type', 'label': 'Food', 'type': CHOICE,
             'choices': [('veg', 'Vegetarian only'), ('nonveg', 'Non-vegetarian only'),
                         ('both', 'Veg & non-veg')]}

# Only questions that help a customer decide or a search match. Categories not
# listed here (Jewellery, Invitation, Planners, ...) only use the basic fields.
CATEGORY_FIELDS = {
    'Halls': [
        {'key': 'capacity', 'label': 'Seating capacity (guests)', 'type': NUMBER, 'min': 10, 'max': 20000},
        {'key': 'hall_type', 'label': 'Type of venue', 'type': CHOICE,
         'choices': [('kalyana_mandapam', 'Kalyana mandapam'), ('banquet_hall', 'Banquet hall'),
                     ('hotel', 'Hotel'), ('resort', 'Resort'), ('convention_centre', 'Convention centre'),
                     ('open_lawn', 'Open lawn / garden')]},
        {'key': 'ac', 'label': 'Air-conditioned', 'type': YES_NO},
        {'key': 'parking', 'label': 'Parking available', 'type': YES_NO},
        dict(FOOD_TYPE, label='Food allowed'),
        {'key': 'in_house_catering', 'label': 'In-house catering', 'type': YES_NO},
        {'key': 'outside_catering', 'label': 'Outside caterers allowed', 'type': YES_NO},
        {'key': 'rooms', 'label': 'Rooms for guests', 'type': YES_NO},
    ],
    'Caterers': [
        FOOD_TYPE,
        {'key': 'cuisine', 'label': 'Cuisines', 'type': TEXT, 'max_length': 80},
        {'key': 'min_plates', 'label': 'Minimum order (plates)', 'type': NUMBER, 'min': 1, 'max': 20000},
    ],
    'Photographers': [
        {'key': 'shoot_type', 'label': 'Main speciality', 'type': CHOICE,
         'choices': [('wedding', 'Wedding'), ('pre-wedding', 'Pre-wedding'), ('candid', 'Candid')]},
        {'key': 'video_included', 'label': 'Videography offered', 'type': YES_NO},
        {'key': 'drone', 'label': 'Drone shoots', 'type': YES_NO},
    ],
    'Makeup_Artist': [
        {'key': 'type', 'label': 'Speciality', 'type': CHOICE,
         'choices': [('bridal', 'Bridal'), ('non-bridal', 'Non-bridal / party')]},
        {'key': 'trial_available', 'label': 'Trial session available', 'type': YES_NO},
        {'key': 'home_visit', 'label': 'Comes to your home / venue', 'type': YES_NO},
    ],
    'Mehandi_Artist': [
        {'key': 'type', 'label': 'Speciality', 'type': CHOICE,
         'choices': [('bridal', 'Bridal'), ('regular', 'Regular')]},
        {'key': 'home_visit', 'label': 'Comes to your home / venue', 'type': YES_NO},
    ],
    'DJ_Artist': [
        {'key': 'venue_type', 'label': 'Performs', 'type': CHOICE,
         'choices': [('indoor', 'Indoor'), ('outdoor', 'Outdoor')]},
        {'key': 'equipment_included', 'label': 'Sound & lights included', 'type': YES_NO},
    ],
    'Decorators': [
        {'key': 'stage_decoration', 'label': 'Stage decoration', 'type': YES_NO},
        {'key': 'flower_decoration', 'label': 'Flower decoration', 'type': YES_NO},
    ],
}

# Basic fields a vendor edits on the existing Manage page (update_product).
BASIC_FIELDS = ('name', 'category', 'description', 'city', 'area_name', 'address', 'business_phone',
                'opening_time', 'closing_time', 'instagram_url', 'website_url', 'min_price', 'max_price')


class ProfileError(ValueError):
    pass


def fields_for(category):
    return CATEGORY_FIELDS.get(category or '', [])


# ── Ownership ────────────────────────────────────────────────────────────────

def is_admin(user):
    profile = getattr(user, 'profile', None)
    return bool(user and user.is_authenticated and
                (user.is_staff or getattr(profile, 'role', None) == 'admin'))


def is_imported_account(user):
    return user is None or (user.email or '').lower().endswith(IMPORT_ACCOUNT_DOMAIN)


def can_manage(user, product):
    """The listing's owner account, the user whose claim was approved, or staff."""
    if not (user and user.is_authenticated):
        return False
    if is_admin(user):
        return True
    if product.user_id == user.id and not is_imported_account(user):
        return True
    return product.is_claimed and product.claimed_by_id == user.id


def listing_status(product):
    if product.is_claimed and product.is_verified:
        return 'verified'
    return 'claimed' if product.is_claimed else 'unclaimed'


def listed_mobile(product):
    return normalize_indian_mobile(product.business_phone or '')


def other_listing(user, product):
    """The listing this account already owns, if it isn't this one (one listing per account)."""
    owned = getattr(user, 'product', None) if user else None
    return owned if owned is not None and owned.pk != product.pk else None


def claim_blocker(user, product):
    """Why this user can't take over this listing at all, or None."""
    if product.is_claimed:
        return 'yours' if product.claimed_by_id == user.id else 'already_claimed'
    if other_listing(user, product):
        return 'has_other_listing'
    return None


def sms_claim_blocker(user, product):
    """Why the instant (code to the listing's phone) claim isn't possible, or None.
    Anything other than claim_blocker reasons can still go to admin review."""
    reason = claim_blocker(user, product)
    if reason:
        return reason
    if not is_imported_account(product.user) and product.user_id != user.id:
        return 'owned_by_account'   # never push out a real account automatically
    if not listed_mobile(product):
        return 'no_listed_mobile'
    return None


def mask_mobile(mobile):
    return f'+91 {mobile[:2]}••••••{mobile[-2:]}' if mobile else ''


# ── Category details ─────────────────────────────────────────────────────────

def _clean_value(field, value):
    """Validated value, or None meaning "unknown" (the key is removed)."""
    if value is None or value == '':
        return None
    kind = field['type']
    if kind == YES_NO:
        if isinstance(value, bool):
            return value
        raise ProfileError(f'{field["label"]}: answer yes, no, or leave it blank.')
    if kind == CHOICE:
        if value in {c for c, _ in field['choices']}:
            return value
        raise ProfileError(f'{field["label"]}: choose one of the listed options.')
    if kind == NUMBER:
        if isinstance(value, bool):
            raise ProfileError(f'{field["label"]}: enter a number.')
        try:
            number = int(str(value).strip())
        except (TypeError, ValueError):
            raise ProfileError(f'{field["label"]}: enter a whole number.')
        if not field['min'] <= number <= field['max']:
            raise ProfileError(f'{field["label"]}: enter a number between {field["min"]} and {field["max"]}.')
        return number
    text = str(value).strip()
    if len(text) > field['max_length']:
        raise ProfileError(f'{field["label"]}: keep it under {field["max_length"]} characters.')
    return text or None


def merge_attributes(product, submitted):
    """Apply a vendor's answers. Keys not submitted are left exactly as they were.

    Returns (new_attributes, changed_keys). Raises ProfileError for anything invalid.
    """
    if not isinstance(submitted, dict):
        raise ProfileError('attributes must be an object.')
    allowed = {f['key']: f for f in fields_for(product.category)}
    unknown = sorted(set(submitted) - set(allowed))
    if unknown:
        raise ProfileError(f'Not a question for this category: {", ".join(unknown)}.')
    attributes = dict(product.attributes or {})
    changed = []
    for key, raw in submitted.items():
        value = _clean_value(allowed[key], raw)
        if value is None:
            if key in attributes:
                del attributes[key]
                changed.append(key)
        elif attributes.get(key) != value or type(attributes.get(key)) is not type(value):
            attributes[key] = value
            changed.append(key)
    return attributes, changed


def stamp_sources(product, fields, source):
    """Record who supplied these fields (in memory; caller saves)."""
    if not fields:
        return
    sources = dict(product.data_sources or {})
    at = timezone.now().isoformat(timespec='seconds')
    for field in fields:
        sources[field] = {'source': source, 'at': at}
    product.data_sources = sources


def editor_source(user, product):
    return 'admin' if is_admin(user) and not can_manage_as_owner(user, product) else 'vendor'


def can_manage_as_owner(user, product):
    return (product.user_id == user.id and not is_imported_account(user)) or \
        (product.is_claimed and product.claimed_by_id == user.id)


def source_of(product, field, value):
    entry = (product.data_sources or {}).get(field)
    if entry:
        return entry['source']
    return 'imported' if value not in (None, '', [], {}) else 'unknown'


def _display(field, value):
    if field['type'] == YES_NO:
        return 'Yes' if value else 'No'
    if field['type'] == CHOICE:
        return dict(field['choices']).get(value, value)
    if field['type'] == NUMBER and field['key'] == 'capacity':
        return f'{value:,} guests'
    return str(value)


def public_details(product):
    """Known category details for the public profile. Unanswered questions are left out."""
    attributes = product.attributes or {}
    return [{'key': f['key'], 'label': f['label'], 'value': attributes[f['key']],
             'display': _display(f, attributes[f['key']])}
            for f in fields_for(product.category) if f['key'] in attributes]


# ── Completeness ─────────────────────────────────────────────────────────────

def _has_photo(product):
    image = str(product.image or '')
    if image and 'placeholder' not in image:
        return True
    return any(service.images.exists() for service in product.services.all())


def completeness(product):
    """A plain checklist; percent is the share of items done."""
    questions = fields_for(product.category)
    answered = sum(1 for f in questions if f['key'] in (product.attributes or {}))
    items = [
        ('description', 'A description of at least 80 characters', len((product.description or '').strip()) >= 80),
        ('location', 'Area and full address', bool((product.area_name or '').strip() and (product.address or '').strip())),
        ('contact', 'A mobile number customers can call or WhatsApp', bool(listed_mobile(product))),
        ('photos', 'At least one photo', _has_photo(product)),
        ('pricing', 'A starting price or price range', product.min_price is not None or product.max_price is not None),
        ('online', 'Website or Instagram link', bool(product.website_url or product.instagram_url)),
    ]
    checklist = [{'key': k, 'label': label, 'done': done} for k, label, done in items]
    if questions:
        checklist.append({'key': 'details', 'label': f'{product.category.replace("_", " ")} details '
                          f'({answered} of {len(questions)} answered)', 'done': answered == len(questions)})
    done = sum(1 for item in checklist if item['done'])
    return {'percent': round(100 * done / len(checklist)), 'checklist': checklist}


def schema_for(category):
    """Form description for the frontend."""
    return [{k: v for k, v in f.items()} | ({'choices': [{'value': c, 'label': l} for c, l in f['choices']]}
                                             if f['type'] == CHOICE else {})
            for f in fields_for(category)]


def owner_profile(product):
    """What the managing vendor sees: answers, provenance, completeness."""
    attributes = product.attributes or {}
    return {
        'vendor_id': product._id,
        'name': product.name,
        'category': product.category,
        'listing_status': listing_status(product),
        'fields': schema_for(product.category),
        'attributes': {f['key']: attributes[f['key']] for f in fields_for(product.category) if f['key'] in attributes},
        'sources': {
            **{f: source_of(product, f, getattr(product, f)) for f in BASIC_FIELDS},
            **{f'attributes.{f["key"]}': source_of(product, f'attributes.{f["key"]}', attributes.get(f['key']))
               for f in fields_for(product.category)},
        },
        'completeness': completeness(product),
    }
