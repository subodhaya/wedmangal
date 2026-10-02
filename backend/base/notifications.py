"""Tell a vendor about a new Get Quote enquiry.

Flow (called from create_quote_request once the quote is saved):

    schedule_vendor_notification(quote.id)
        → runs after the database commit, in a background thread
        → notify_vendor_of_quote(quote_id)
              claim: notified_at is set atomically, so each quote notifies at most once
              SMS:   Fast2SMS (existing account/route) to the vendor's business mobile
              email: only for claimed vendors, to the claimant's account email
              result stored on the quote: sms_status / email_status / notification_error

Nothing here ever raises into the request: a provider outage leaves the quote saved
and marks the notification as failed.

Shared with the vendor (the customer agreed to this in the Get Quote form): name,
mobile and event date by SMS; the same plus their message by email.
"""
import logging
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
Status = QuoteRequest.NotifyStatus


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
        if mobile:
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
            sms_status=sms_status, email_status=email_status, notification_error='; '.join(errors)[:255])
        level = logging.WARNING if Status.FAILED in (sms_status, email_status) else logging.INFO
        logger.log(level, 'Quote %s vendor notification: sms=%s email=%s %s',
                   quote_id, sms_status, email_status, '; '.join(errors))
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
