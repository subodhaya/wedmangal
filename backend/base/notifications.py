"""Tell a vendor about a new Get Quote enquiry.

Flow (called from create_quote_request once the quote is saved):

    schedule_vendor_notification(quote.id)
        → runs after the database commit, in a background thread
        → notify_vendor_of_quote(quote_id)
              claim:    notified_at is set atomically, so each quote notifies at most once
              WhatsApp: official Fast2SMS WhatsApp API, approved Utility template (preferred channel)
              SMS:      Fast2SMS Quick route — only when WhatsApp is not configured or the provider
                        rejected the message / could not be reached (never just because a delivery
                        report hasn't arrived yet). A later "failed" delivery webhook triggers one SMS.
              email:    only for claimed vendors, to the claimant's account email
              result stored on the quote: whatsapp_status / sms_status / email_status / notification_error

The customer's mobile is shared with the vendor free of charge (the customer consented in the
Get Quote form). It never goes into analytics, and logs/errors only ever contain masked numbers.

Nothing here ever raises into the request: a provider outage leaves the quote saved
and marks the notification as failed.

Shared with the vendor (the customer agreed to this in the Get Quote form): name,
mobile and event date by SMS; the same plus their message by email.
"""
import hmac
import logging
import os
import re
import threading

import requests
from django.conf import settings
from django.core.mail import send_mail
from django.db import close_old_connections, transaction
from django.utils import timezone

from base.analytics import normalize_indian_mobile
from base.models import QuoteRequest

logger = logging.getLogger(__name__)

FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2'
FAST2SMS_WHATSAPP_URL = 'https://www.fast2sms.com/dev/whatsapp'   # docs.fast2sms.com/reference/sendwhatsappmessage
Status = QuoteRequest.NotifyStatus
WA = QuoteRequest.WhatsAppStatus

# Order of WhatsApp states: a late or repeated webhook never moves a quote backwards
WA_RANK = {'': 0, WA.SKIPPED: 0, WA.ACCEPTED: 1, WA.SENT: 2, WA.DELIVERED: 3, WA.READ: 4}

PHONE_RE = re.compile(r'(?<!\d)(\+?91)?([6-9]\d)(\d{6})(\d{2})(?!\d)')


def mask_phones(text):
    """98•••••••12 — for anything that may end up in logs or the admin error column."""
    return PHONE_RE.sub(lambda m: f'{m.group(2)}••••••{m.group(4)}', str(text or ''))


def _setting(name):
    return str(getattr(settings, name, '') or os.environ.get(name, '') or '').strip()


def whatsapp_config():
    """(phone_number_id, message_id) of the WedMangal WhatsApp sender + approved template, or None."""
    phone_number_id, message_id = _setting('FAST2SMS_WHATSAPP_PHONE_NUMBER_ID'), _setting('FAST2SMS_WHATSAPP_MESSAGE_ID')
    return (phone_number_id, message_id) if phone_number_id and message_id and _fast2sms_key() else None


def _fast2sms_key():
    from base.views.user_views import FAST2SMS_API_KEY  # same .env setting the OTP login uses
    return FAST2SMS_API_KEY


def sms_text(quote):
    vendor = (quote.vendor.name or 'your business').strip()[:40]
    when = f', event {quote.event_date:%d %b %Y}' if quote.event_date else ''
    return (f'New WedMangal enquiry for {vendor}: {quote.name.strip()[:30]}, {quote.phone}{when}. '
            f'Please call them back. - WedMangal')


def email_content(quote):
    vendor = quote.vendor.name or 'your business'
    lines = [
        f'You have a new enquiry on WedMangal for {vendor}.',
        '',
        f'Customer: {quote.name}',
        f'Mobile: {quote.phone}',
        f'Event date: {quote.event_date:%d %b %Y}' if quote.event_date else 'Event date: not given',
    ]
    if quote.message:
        lines += ['', 'Their message:', quote.message]
    lines += ['', 'The customer agreed to share these details with you. Please contact them directly.',
              '', '— WedMangal']
    return f'New WedMangal enquiry from {quote.name}', '\n'.join(lines)


# ── WhatsApp message content ───────────────────────────────────────────────────
# Template (submitted for approval as UTILITY, 4 body variables):
#
#   🔔 New customer enquiry – WedMangal
#
#   {{1}} is looking for {{2}}.
#
#   {{3}}
#
#   📞 Customer: {{4}}
#
#   This customer sent an enquiry for your business on WedMangal. Please call them if you can
#   take this booking.
#
#   – WedMangal

CATEGORY_PHRASES = {
    'halls': 'a wedding hall', 'photographers': 'a wedding photographer', 'makeup_artist': 'bridal makeup',
    'caterers': 'a caterer', 'decorators': 'a wedding decorator', 'mehandi_artist': 'a mehandi artist',
    'dj_artist': 'a DJ', 'planners': 'a wedding planner', 'invitation': 'wedding invitations',
    'jewellery': 'wedding jewellery', 'pandit': 'a pandit for the wedding', 'travel_transport': 'wedding transport',
    'entertainment': 'wedding entertainment',
}


def _one_line(text, limit):
    """WhatsApp template variables can't contain new lines, tabs or long runs of spaces; | separates them."""
    text = re.sub(r'[\r\n\t]+', ' ', str(text or '')).replace('|', '/')
    text = re.sub(r' {2,}', ' ', text).strip()
    return text if len(text) <= limit else text[:limit - 1].rstrip() + '…'


def whatsapp_variables(quote):
    """[customer name, what they want, requirement summary, customer mobile] — only real enquiry data."""
    from base import discovery
    req = quote.requirements or {}
    category = (quote.vendor.category or '').strip().lower()
    wants = CATEGORY_PHRASES.get(category, 'a wedding vendor')
    guests = req.get('guest_count') or {}
    if category == 'caterers' and guests:
        wants += f' for {discovery._range(guests)} guests'
    location = (req.get('location') or {})
    place = location.get('area') or location.get('other')
    if place:
        wants += f' in {place}'

    details = []
    if quote.event_date:
        details.append(f'📅 {quote.event_date:%d %b %Y}')
    elif req.get('timeframe') in discovery.TIMEFRAMES:
        details.append(f'📅 {discovery.TIMEFRAMES[req["timeframe"]]}')
    if guests and category != 'caterers':
        details.append(f'👥 {discovery._range(guests)} guests')
    budget = req.get('budget') or {}
    if budget and not budget.get('unsure'):
        details.append(f'💰 {discovery._range(budget, "₹")}{" per plate" if budget.get("per") == "plate" else ""}')
    must = [discovery.REQUIREMENT_KEYS[k]['label'] for k in req.get('must_have') or [] if k in discovery.REQUIREMENT_KEYS]
    if must:
        details.append('✅ ' + ', '.join(must))
    avoid = [discovery.REQUIREMENT_KEYS[k]['label'] for k in req.get('avoid') or [] if k in discovery.REQUIREMENT_KEYS]
    if avoid:
        details.append('🚫 Not: ' + ', '.join(avoid))
    if quote.message:
        details.append(f'💬 “{_one_line(quote.message, 160)}”')
    summary = ' · '.join(details) or 'No further details given — please ask the customer.'
    return [_one_line(quote.name, 40), _one_line(wants, 120), _one_line(summary, 700), quote.phone]


def send_whatsapp(mobile, variables, quote_id):
    """Returns (whatsapp_status, request_id, error). Accepted means the provider took it — not delivered."""
    config = whatsapp_config()
    if config is None:
        return WA.SKIPPED, '', 'whatsapp: not configured'
    phone_number_id, message_id = config
    try:
        response = requests.get(FAST2SMS_WHATSAPP_URL, timeout=10, headers={'Authorization': _fast2sms_key()}, params={
            'message_id': message_id, 'phone_number_id': phone_number_id, 'numbers': mobile,
            'variables_values': '|'.join(variables), 'udf1': f'quote:{quote_id}',
        })
        data = response.json()
    except Exception as exc:   # timeout, network error, non-JSON reply
        return WA.FAILED, '', mask_phones(f'whatsapp: {type(exc).__name__}: {exc}')[:200]
    if data.get('status') is True or data.get('return') is True:
        return WA.ACCEPTED, str(data.get('request_id') or '')[:64], ''
    message = data.get('message', 'rejected')
    return WA.FAILED, '', mask_phones(f'whatsapp: {message[0] if isinstance(message, list) else message}')[:200]


def send_sms(mobile, text):
    """Returns (status, error). Uses the Fast2SMS Quick route, like the OTP login."""
    key = _fast2sms_key()
    if not key:
        return Status.SKIPPED, 'sms: no Fast2SMS key configured'
    try:
        response = requests.get(FAST2SMS_URL, timeout=10, headers={'cache-control': 'no-cache'}, params={
            'authorization': key, 'route': 'q', 'message': text, 'language': 'english', 'numbers': mobile,
        })
        data = response.json()
    except Exception as exc:  # network error, timeout, non-JSON reply
        return Status.FAILED, f'sms: {type(exc).__name__}: {exc}'[:200]
    if data.get('return') is True:
        return Status.SENT, ''
    message = data.get('message', 'delivery failed')
    return Status.FAILED, f'sms: {message[0] if isinstance(message, list) else message}'[:200]


def _vendor_email(vendor):
    """Only claimed vendors: unclaimed listings have scraper-generated placeholder accounts."""
    if not vendor.is_claimed:
        return None
    owner = vendor.claimed_by or vendor.user
    return owner.email.strip() if owner and owner.email and owner.email.strip() else None


def send_vendor_email(address, quote):
    subject, body = email_content(quote)
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [address], fail_silently=False)
    except Exception as exc:
        return Status.FAILED, f'email: {type(exc).__name__}: {exc}'[:200]
    return Status.SENT, ''


def notify_vendor_of_quote(quote_id):
    """Notify the vendor once. Returns 'notified', 'duplicate' or 'error'. Never raises."""
    try:
        claimed = QuoteRequest.objects.filter(pk=quote_id, notified_at__isnull=True).update(notified_at=timezone.now())
        if not claimed:
            return 'duplicate'  # already notified (or being notified) — never send twice
        quote = QuoteRequest.objects.select_related('vendor', 'vendor__user', 'vendor__claimed_by').get(pk=quote_id)
        errors = []

        mobile = normalize_indian_mobile(quote.vendor.business_phone or '')
        wa_status, wa_request_id = '', ''
        if mobile:
            wa_status, wa_request_id, error = send_whatsapp(mobile, whatsapp_variables(quote), quote_id)
            if error and wa_status != WA.SKIPPED:
                errors.append(error)
            if wa_status == WA.ACCEPTED:
                sms_status, error = Status.SKIPPED, ''          # WhatsApp took it; SMS only if it later fails
            else:
                sms_status, error = send_sms(mobile, sms_text(quote))
        else:
            sms_status, error = Status.SKIPPED, 'sms: vendor has no mobile number'
        if error:
            errors.append(error)

        address = _vendor_email(quote.vendor)
        if address:
            email_status, error = send_vendor_email(address, quote)
        else:
            email_status, error = Status.SKIPPED, ''
        if error:
            errors.append(error)

        QuoteRequest.objects.filter(pk=quote_id).update(
            whatsapp_status=wa_status, whatsapp_request_id=wa_request_id,
            whatsapp_updated_at=timezone.now() if wa_status else None,
            sms_status=sms_status, email_status=email_status, notification_error=mask_phones('; '.join(errors))[:255])
        level = logging.WARNING if Status.FAILED in (sms_status, email_status) else logging.INFO
        logger.log(level, 'Quote %s vendor notification: whatsapp=%s sms=%s email=%s %s',
                   quote_id, wa_status or '-', sms_status, email_status, mask_phones('; '.join(errors)))
        return 'notified'
    except Exception:
        logger.exception('Quote %s vendor notification crashed', quote_id)
        try:
            QuoteRequest.objects.filter(pk=quote_id).update(
                sms_status=Status.FAILED, notification_error='unexpected error — see server log')
        except Exception:
            pass
        return 'error'


def _run(quote_id):
    try:
        notify_vendor_of_quote(quote_id)
    finally:
        close_old_connections()  # this runs in its own thread with its own DB connection


def schedule_vendor_notification(quote_id):
    """Notify after the quote is committed, without making the customer wait for SMS/email."""
    if getattr(settings, 'QUOTE_NOTIFICATIONS_SYNC', False):
        transaction.on_commit(lambda: notify_vendor_of_quote(quote_id))
    else:
        transaction.on_commit(lambda: threading.Thread(
            target=_run, args=(quote_id,), daemon=True, name=f'quote-notify-{quote_id}').start())


# ── WhatsApp delivery reports (Fast2SMS webhook) ──────────────────────────────

WEBHOOK_STATUSES = {'sent': WA.SENT, 'delivered': WA.DELIVERED, 'read': WA.READ, 'failed': WA.FAILED}


def webhook_secret_ok(received):
    expected = _setting('FAST2SMS_WEBHOOK_SECRET')
    return bool(expected) and hmac.compare_digest(str(received or ''), expected)


def apply_whatsapp_status(request_id, udf1, status, error=''):
    """Record a delivery report. Returns 'updated', 'ignored' or 'unknown'. A 'failed' report sends
    the SMS fallback once (unless an SMS already went out)."""
    new = WEBHOOK_STATUSES.get(str(status or '').strip().lower())
    if new is None:
        return 'ignored'
    quote = None
    match = re.fullmatch(r'quote:(\d+)', str(udf1 or ''))
    if match:
        quote = QuoteRequest.objects.filter(pk=int(match.group(1))).first()
    if quote is None and request_id:
        quote = QuoteRequest.objects.filter(whatsapp_request_id=str(request_id)[:64]).first()
    if quote is None or (request_id and quote.whatsapp_request_id and quote.whatsapp_request_id != str(request_id)[:64]):
        return 'unknown'

    current = quote.whatsapp_status
    if new == WA.FAILED:
        if WA_RANK.get(current, 0) >= WA_RANK[WA.DELIVERED]:
            return 'ignored'                              # it reached the vendor; a stray failure doesn't count
    elif current == WA.FAILED or WA_RANK[new] <= WA_RANK.get(current, 0):
        return 'ignored'                                  # never move backwards
    QuoteRequest.objects.filter(pk=quote.pk).update(whatsapp_status=new, whatsapp_updated_at=timezone.now())

    if new == WA.FAILED:
        note = mask_phones(f'whatsapp failed: {error}' if error else 'whatsapp failed')[:120]
        claimed = QuoteRequest.objects.filter(pk=quote.pk, sms_fallback_at__isnull=True).exclude(
            sms_status=Status.SENT).update(sms_fallback_at=timezone.now())
        if claimed:
            quote.refresh_from_db()
            mobile = normalize_indian_mobile(quote.vendor.business_phone or '')
            sms_status, sms_error = send_sms(mobile, sms_text(quote)) if mobile else (Status.SKIPPED, 'sms: no mobile')
            errors = '; '.join(x for x in (quote.notification_error, note, sms_error) if x)
            QuoteRequest.objects.filter(pk=quote.pk).update(sms_status=sms_status, notification_error=mask_phones(errors)[:255])
            logger.warning('Quote %s WhatsApp failed after acceptance; SMS fallback %s', quote.pk, sms_status)
    return 'updated'
