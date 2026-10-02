"""Customer-intent tracking: event recording rules and vendor metrics.

Privacy: no IP addresses or raw user-agent strings are stored. Referrers are
reduced to scheme + host + path (query strings can carry personal data), and
client metadata is limited to a small whitelist of short scalar values.
"""
import re
from datetime import timedelta
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from django.db.models import Count
from django.utils import timezone

from base.models import VendorEvent, QuoteRequest

EventType = VendorEvent.EventType
IST = ZoneInfo('Asia/Kolkata')

# Events only the server records: a quote is actually saved, or a vendor
# claims / edits a listing. The browser cannot report (or inflate) these.
SERVER_EVENT_TYPES = {
    EventType.GET_QUOTE_SUBMITTED, EventType.CLAIM_STARTED, EventType.CLAIM_SUBMITTED,
    EventType.CLAIM_APPROVED, EventType.PROFILE_UPDATED,
}

# Events the browser may report.
CLIENT_EVENT_TYPES = set(EventType.values) - SERVER_EVENT_TYPES

# Events that must name a vendor.
VENDOR_EVENT_TYPES = {
    EventType.VENDOR_PAGE_VIEW, EventType.PHONE_CLICK, EventType.WHATSAPP_CLICK,
    EventType.GET_QUOTE_STARTED, EventType.GET_QUOTE_SUBMITTED,
    EventType.EXTERNAL_CONTACT_CLICK, EventType.EXTERNAL_BOOKING_CLICK,
    EventType.SEARCH_RESULT_CLICK, EventType.FAVORITE, EventType.SHARE,
}

# Repeats of the same event from the same visitor within this window are not
# counted again (React re-renders, refreshes, double taps).
DEDUPE_WINDOWS = {
    EventType.VENDOR_PAGE_VIEW:       timedelta(minutes=30),
    EventType.SESSION_START:          timedelta(minutes=30),
    EventType.GET_QUOTE_STARTED:      timedelta(minutes=10),
    EventType.PHONE_CLICK:            timedelta(seconds=10),
    EventType.WHATSAPP_CLICK:         timedelta(seconds=10),
    EventType.EXTERNAL_CONTACT_CLICK: timedelta(seconds=10),
    EventType.EXTERNAL_BOOKING_CLICK: timedelta(seconds=10),
}

METADATA_KEYS = {'channel', 'host', 'query', 'city', 'position', 'label'}
MAX_METADATA_VALUE = 100

SESSION_ID_RE = re.compile(r'^[A-Za-z0-9-]{8,64}$')
SOURCE_RE = re.compile(r'^[a-z0-9_-]{1,50}$')
BOT_RE = re.compile(r'bot|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|pagespeed|preview', re.I)
TABLET_RE = re.compile(r'ipad|tablet|kindle|playbook|silk', re.I)
MOBILE_RE = re.compile(r'mobi|android|iphone|ipod|blackberry|opera mini|iemobile', re.I)

RANGES = {'7d': 7, '30d': 30, '90d': 90}
DEFAULT_RANGE = 'month'


def is_bot(user_agent):
    return not user_agent or bool(BOT_RE.search(user_agent))


def device_type(user_agent):
    ua = user_agent or ''
    if TABLET_RE.search(ua):
        return VendorEvent.DeviceType.TABLET
    if MOBILE_RE.search(ua):
        return VendorEvent.DeviceType.MOBILE
    return VendorEvent.DeviceType.DESKTOP if ua else ''


def clean_session_id(value):
    value = (value or '').strip() if isinstance(value, str) else ''
    return value if SESSION_ID_RE.match(value) else ''


def clean_source(value):
    value = (value or '').strip().lower() if isinstance(value, str) else ''
    return value if SOURCE_RE.match(value) else ''


def clean_path(value):
    """Keep only a site-relative path, without query string or fragment."""
    if not isinstance(value, str) or not value.startswith('/'):
        return ''
    return urlsplit(value).path[:300]


def clean_referrer(value):
    if not isinstance(value, str) or not value:
        return ''
    parts = urlsplit(value)
    if parts.scheme not in ('http', 'https') or not parts.netloc:
        return ''
    return f'{parts.scheme}://{parts.netloc}{parts.path}'[:300]


def clean_metadata(value):
    if not isinstance(value, dict):
        return {}
    cleaned = {}
    for key in METADATA_KEYS & set(value):
        item = value[key]
        if isinstance(item, bool) or not isinstance(item, (str, int)):
            continue
        cleaned[key] = item.strip()[:MAX_METADATA_VALUE] if isinstance(item, str) else item
    return cleaned


def normalize_indian_mobile(value):
    """Return a 10-digit Indian mobile number, or '' if the input isn't one.

    Accepts optional +91 / 91 / 0 prefixes and spaces or dashes.
    """
    if not isinstance(value, str):
        return ''
    digits = re.sub(r'[\s\-()]', '', value.strip())
    if digits.startswith('+'):
        digits = digits[1:]
    if not digits.isdigit():
        return ''
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith('0'):
        digits = digits[1:]
    return digits if re.fullmatch(r'[6-9]\d{9}', digits) else ''


def is_duplicate(event_type, vendor, user, session_id):
    window = DEDUPE_WINDOWS.get(event_type)
    if not window:
        return False
    recent = VendorEvent.objects.filter(
        event_type=event_type, vendor=vendor, created_at__gte=timezone.now() - window,
    )
    if user is not None:
        recent = recent.filter(user=user)
    elif session_id:
        recent = recent.filter(session_id=session_id)
    else:
        return False
    return recent.exists()


def record_event(event_type, *, vendor=None, user=None, session_id='', source='', path='',
                 referrer='', user_agent='', metadata=None, dedupe=True):
    """Save an event. Returns the event, or None if it was a duplicate."""
    if dedupe and is_duplicate(event_type, vendor, user, session_id):
        return None
    return VendorEvent.objects.create(
        event_type=event_type, vendor=vendor, user=user, session_id=session_id,
        source=source, path=path, referrer=referrer, device_type=device_type(user_agent),
        metadata=metadata or {},
    )


def date_range(range_key):
    """Return (key, start, end) for '7d' / '30d' / '90d' / 'month' (India time)."""
    now = timezone.now()
    if range_key in RANGES:
        return range_key, now - timedelta(days=RANGES[range_key]), now
    month_start = now.astimezone(IST).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return DEFAULT_RANGE, month_start, now


def metrics(start, end, vendor=None):
    """Counts for the dashboard. With vendor=None, totals across all vendors."""
    events = VendorEvent.objects.filter(created_at__gte=start, created_at__lte=end)
    quotes = QuoteRequest.objects.filter(created_at__gte=start, created_at__lte=end)
    if vendor is not None:
        events = events.filter(vendor=vendor)
        quotes = quotes.filter(vendor=vendor)
    counts = dict(events.values_list('event_type').annotate(n=Count('id')))
    return {
        'listing_views':           counts.get(EventType.VENDOR_PAGE_VIEW, 0),
        'whatsapp_clicks':         counts.get(EventType.WHATSAPP_CLICK, 0),
        'phone_clicks':            counts.get(EventType.PHONE_CLICK, 0),
        'quote_starts':            counts.get(EventType.GET_QUOTE_STARTED, 0),
        'quote_submissions':       quotes.count(),
        'external_contact_clicks': counts.get(EventType.EXTERNAL_CONTACT_CLICK, 0),
        'external_booking_clicks': counts.get(EventType.EXTERNAL_BOOKING_CLICK, 0),
    }
