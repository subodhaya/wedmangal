"""Unlisting, correction and copyright requests about a vendor listing.

Anyone can submit one without an account (base/views/removal_views.py). Submitting changes nothing on
the listing: a person reviews the request in Django admin (Vendor removal requests), and only a decision
there acts on the listing:

  unlist                 approved → listing hidden with the existing switch (Product.is_approved = False),
                         which already removes it from search, category pages, the carousel, the sitemap
                         and the SSR page (old links 301 to similar vendors). Needs ownership verified first.
  incorrect_information  the admin corrects the listing in Products, then marks the request completed.
  copyright              approved → the admin removes only the disputed photos/videos; the listing stays.

Nothing is deleted from the database except the disputed photo/video rows, and every change is written
to VendorRemovalRequestEvent. Requester contact details and admin notes are never returned by a public API.
"""
import logging
import os
import re
import secrets
import threading
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import close_old_connections, transaction
from django.utils import timezone

from base.analytics import normalize_indian_mobile
from base.models import Product, ProductVideo, ServiceImage, VendorRemovalRequest, VendorRemovalRequestEvent

logger = logging.getLogger(__name__)

RR = VendorRemovalRequest
SITE = 'https://www.wedmangal.com'

RELATIONSHIPS = {
    RR.RequestType.UNLIST: (RR.Relationship.OWNER, RR.Relationship.REPRESENTATIVE, RR.Relationship.OTHER),
    RR.RequestType.INCORRECT_INFORMATION: (RR.Relationship.OWNER, RR.Relationship.REPRESENTATIVE,
                                           RR.Relationship.OTHER),
    RR.RequestType.COPYRIGHT: (RR.Relationship.CONTENT_OWNER, RR.Relationship.CONTENT_AGENT,
                               RR.Relationship.OWNER, RR.Relationship.OTHER),
}

MAX_DESCRIPTION = 3000
MAX_DISPUTED = 1000
MAX_EVIDENCE_BYTES = 5 * 1024 * 1024
# extension → magic bytes the file must start with (a renamed .exe is refused)
EVIDENCE_TYPES = {
    '.pdf': (b'%PDF',),
    '.jpg': (b'\xff\xd8\xff',),
    '.jpeg': (b'\xff\xd8\xff',),
    '.png': (b'\x89PNG\r\n\x1a\n',),
    '.webp': (b'RIFF',),
}
REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'   # no 0/O or 1/I


class RequestError(Exception):
    def __init__(self, errors):
        super().__init__('invalid request')
        self.errors = errors


# ── Validation ───────────────────────────────────────────────────────────────

def _text(value, limit=None):
    text = str(value or '').strip()
    return text if limit is None else text[:limit + 1]   # one over the limit so the length check still fires


def clean_contact_phone(value):
    """A 10-digit Indian mobile, or an international number written with + (copyright holders abroad)."""
    raw = str(value or '').strip()
    indian = normalize_indian_mobile(raw)
    if indian:
        return indian
    digits = re.sub(r'[\s\-()]', '', raw)
    if re.fullmatch(r'\+[1-9]\d{7,14}', digits) and not digits.startswith('+91'):
        return digits
    return ''


def clean_email(value):
    email = str(value or '').strip().lower()
    if not email or len(email) > 254:
        return ''
    try:
        validate_email(email)
    except ValidationError:
        return ''
    return email


def clean_evidence(upload):
    """Return an error message, or '' if the uploaded file is acceptable."""
    ext = Path(upload.name or '').suffix.lower()
    if ext not in EVIDENCE_TYPES:
        return 'Upload a PDF, JPG, PNG or WEBP file.'
    if upload.size > MAX_EVIDENCE_BYTES:
        return 'The file must be 5 MB or smaller.'
    head = upload.read(12)
    upload.seek(0)
    if not head.startswith(EVIDENCE_TYPES[ext]) or (ext == '.webp' and head[8:12] != b'WEBP'):
        return 'This file does not look like a real PDF or image.'
    return ''


def clean_submission(data, request_type, evidence=None):
    """Validate a public submission. Returns cleaned fields (without vendor) or raises RequestError."""
    errors, cleaned = {}, {'request_type': request_type}

    name = re.sub(r'\s+', ' ', _text(data.get('requester_name')))
    if not 1 <= len(name) <= 100:
        errors['requester_name'] = 'Please enter your name.'
    cleaned['requester_name'] = name

    email = clean_email(data.get('requester_email'))
    if not email:
        errors['requester_email'] = 'Enter a valid e-mail address.'
    cleaned['requester_email'] = email

    phone = clean_contact_phone(data.get('requester_phone'))
    if not phone:
        errors['requester_phone'] = 'Enter a valid 10-digit mobile number (or an international number with +).'
    cleaned['requester_phone'] = phone

    relationship = _text(data.get('requester_relationship'))
    if relationship not in RELATIONSHIPS[request_type]:
        errors['requester_relationship'] = 'Please choose your relationship.'
    cleaned['requester_relationship'] = relationship

    description = _text(data.get('description'), MAX_DESCRIPTION)
    if len(description) > MAX_DESCRIPTION:
        errors['description'] = f'Please keep this under {MAX_DESCRIPTION} characters.'
    cleaned['description'] = description

    reason = _text(data.get('reason'))
    if request_type == RR.RequestType.UNLIST:
        if reason not in RR.Reason.values:
            errors['reason'] = 'Please choose a reason.'
        elif reason == RR.Reason.OTHER and not description:
            errors['description'] = 'Please tell us the reason.'
    elif request_type == RR.RequestType.INCORRECT_INFORMATION:
        reason = RR.Reason.INCORRECT
        if not description:
            errors['description'] = 'Please tell us what is incorrect.'
    else:
        reason = ''
        if not description:
            errors['description'] = 'Please explain your complaint.'
    cleaned['reason'] = reason

    disputed = _text(data.get('disputed_content'), MAX_DISPUTED)
    if request_type == RR.RequestType.COPYRIGHT:
        if not disputed:
            errors['disputed_content'] = 'Tell us which photo or content you are reporting.'
        elif len(disputed) > MAX_DISPUTED:
            errors['disputed_content'] = f'Please keep this under {MAX_DISPUTED} characters.'
    else:
        disputed = ''
    cleaned['disputed_content'] = disputed

    if evidence is not None:
        if request_type != RR.RequestType.COPYRIGHT:
            errors['evidence_file'] = 'Files can only be attached to a copyright complaint.'
        else:
            problem = clean_evidence(evidence)
            if problem:
                errors['evidence_file'] = problem

    if data.get('consent') not in (True, 'true', 'True', '1', 1):
        errors['consent'] = 'Please confirm the information is accurate and you are authorised to make this request.'
    cleaned['consent'] = True

    if errors:
        raise RequestError(errors)
    return cleaned


# ── Submission ───────────────────────────────────────────────────────────────

def new_reference():
    while True:
        ref = 'RR-' + ''.join(secrets.choice(REFERENCE_ALPHABET) for _ in range(8))
        if not RR.objects.filter(reference=ref).exists():
            return ref


def open_duplicate(vendor, request_type, email):
    return RR.objects.filter(vendor=vendor, request_type=request_type, requester_email=email,
                             status__in=RR.OPEN_STATUSES).first()


def log(req, action, actor=None, detail='', from_status='', to_status=''):
    return VendorRemovalRequestEvent.objects.create(
        request=req, action=action, actor=actor if actor and actor.is_authenticated else None,
        detail=detail, from_status=from_status, to_status=to_status)


def create_request(vendor, cleaned, evidence=None):
    with transaction.atomic():
        req = RR(vendor=vendor, vendor_name=vendor.name or '', listing_url=f'{SITE}/product/{vendor._id}',
                 reference=new_reference(), **cleaned)
        if evidence is not None:
            req.evidence_name = Path(evidence.name).name[:200]
            req.evidence_file = evidence
        req.save()
        log(req, 'submitted', to_status=req.status,
            detail=f'{req.get_request_type_display()}' + (f' — {req.get_reason_display()}' if req.reason else ''))
        after_commit(send_submission_emails, req.pk)
    return req


# ── Decisions (Django admin) ─────────────────────────────────────────────────

ALLOWED = {
    RR.Status.PENDING: {RR.Status.UNDER_REVIEW, RR.Status.APPROVED, RR.Status.REJECTED},
    RR.Status.UNDER_REVIEW: {RR.Status.PENDING, RR.Status.APPROVED, RR.Status.REJECTED},
    RR.Status.APPROVED: {RR.Status.COMPLETED},
    RR.Status.REJECTED: {RR.Status.UNDER_REVIEW},
    RR.Status.COMPLETED: set(),
}


def decision_problem(req, new_status, ownership_verified=None, verification_method=None):
    """Why this status change is not allowed, or '' if it is."""
    if new_status == req.status:
        return ''
    if new_status not in ALLOWED[req.status]:
        return f'A request that is {req.get_status_display().lower()} cannot be moved to ' \
               f'{RR.Status(new_status).label.lower()}.'
    verified = req.ownership_verified if ownership_verified is None else ownership_verified
    method = req.verification_method if verification_method is None else verification_method
    if new_status == RR.Status.APPROVED and req.request_type == RR.RequestType.UNLIST:
        if req.vendor_id is None:
            return 'The listing no longer exists.'
        if not (verified and method):
            return 'Verify that the requester owns or represents the business (tick "ownership verified" and ' \
                   'choose how) before approving an unlisting.'
    return ''


def change_status(req, new_status, actor):
    """Apply a reviewed status change with its side effects. The caller has checked decision_problem()."""
    old = req.status
    if new_status == old:
        return
    with transaction.atomic():
        req.status = new_status
        if new_status in (RR.Status.APPROVED, RR.Status.REJECTED):
            req.reviewed_by, req.reviewed_at = actor, timezone.now()
        req.save()
        log(req, 'status_changed', actor, from_status=old, to_status=new_status)
        if new_status == RR.Status.APPROVED and req.request_type == RR.RequestType.UNLIST:
            unlist_vendor(req, actor)
        if new_status in (RR.Status.APPROVED, RR.Status.REJECTED):
            after_commit(send_decision_email, req.pk)


def unlist_vendor(req, actor):
    vendor = Product.objects.select_for_update().get(pk=req.vendor_id)
    if not vendor.is_approved:
        log(req, 'vendor_already_hidden', actor, detail=f'Listing #{vendor._id} was already hidden.')
        return
    vendor.is_approved = False
    vendor.is_available_today = False
    vendor.save(update_fields=['is_approved', 'is_available_today'])
    log(req, 'vendor_unlisted', actor, detail=f'Listing #{vendor._id} hidden from the website (record kept).')


def unlisted_by_request(vendor):
    """The approved unlisting request that hid this listing, if any."""
    return RR.objects.filter(vendor=vendor, request_type=RR.RequestType.UNLIST,
                             status__in=(RR.Status.APPROVED, RR.Status.COMPLETED)).first()


# ── Disputed content (copyright) ─────────────────────────────────────────────

def content_choices(vendor):
    """[(key, label)] of the photos and videos shown on the listing, for the admin to pick from."""
    if vendor is None:
        return []
    choices = []
    if vendor.image and 'placeholder' not in vendor.image.name:
        choices.append(('product_image', f'Main photo — {vendor.image.name}'))
    for image in ServiceImage.objects.filter(service__product=vendor).select_related('service'):
        choices.append((f'service_image:{image._id}', f'Service photo "{image.service}" — {image.image.name}'))
    for video in ProductVideo.objects.filter(product=vendor):
        choices.append((f'video:{video._id}', f'Video #{video._id} — {video.video_url}'))
    if vendor.video_url and not vendor.videos.filter(video_url=vendor.video_url).exists():
        choices.append(('product_video', f'Profile video — {vendor.video_url}'))
    return choices


def remove_content(req, keys, actor):
    """Take the chosen photos/videos off the listing. Files stay on disk; the audit log keeps their paths."""
    vendor = req.vendor
    removed = []
    with transaction.atomic():
        for key in keys:
            kind, _, pk = key.partition(':')
            if kind == 'product_image' and vendor.image:
                removed.append(f'main photo {vendor.image.name}')
                vendor.image = None
                vendor.save(update_fields=['image'])
            elif kind == 'product_video' and vendor.video_url:
                removed.append(f'profile video {vendor.video_url}')
                vendor.video_url = vendor.video_thumb = None
                vendor.video_duration = vendor.video_uploaded_at = None
                vendor.save(update_fields=['video_url', 'video_thumb', 'video_duration', 'video_uploaded_at'])
            elif kind == 'service_image':
                image = ServiceImage.objects.filter(_id=pk, service__product=vendor).first()
                if image:
                    removed.append(f'service photo {image.image.name}')
                    image.delete()
            elif kind == 'video':
                video = ProductVideo.objects.filter(_id=pk, product=vendor).first()
                if video:
                    removed.append(f'video {video.video_url}')
                    video.delete()
        if removed:
            log(req, 'content_removed', actor, detail='Removed from listing: ' + '; '.join(removed))
    return removed


# ── E-mail ───────────────────────────────────────────────────────────────────

def admin_recipients():
    configured = os.environ.get('REMOVAL_REQUEST_ADMIN_EMAILS') or getattr(settings, 'REMOVAL_REQUEST_ADMIN_EMAILS', '')
    if isinstance(configured, str):
        configured = [e.strip() for e in configured.split(',')]
    recipients = [e for e in configured if e]
    if not recipients and settings.EMAIL_HOST_USER:
        recipients = [settings.EMAIL_HOST_USER]
    return recipients


def _send(req, kind, subject, body, recipients):
    if not recipients:
        log(req, 'email_skipped', detail=f'{kind}: no recipient configured')
        return False
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, recipients, fail_silently=False)
    except Exception as exc:
        logger.warning('Removal request %s %s e-mail failed: %s', req.reference, kind, type(exc).__name__)
        log(req, 'email_failed', detail=f'{kind}: {type(exc).__name__}'[:200])
        return False
    log(req, 'email_sent', detail=kind)
    return True


def acknowledgement_content(req):
    subject = f'We received your request {req.reference} – WedMangal'
    body = (
        f'Dear {req.requester_name},\n\n'
        f'Thank you for contacting WedMangal. We have received your request about the listing '
        f'"{req.vendor_name}" ({req.listing_url}).\n\n'
        f'Request type: {req.get_request_type_display()}\n'
        f'Reference number: {req.reference}\n\n'
        'What happens next: a member of our team will review your request. For an unlisting we first confirm '
        'that the request comes from the business owner or someone authorised to represent it — we may '
        'call the number on the listing or contact you. The listing stays as it is until the review is '
        'finished.\n\n'
        f'You can check the status at {SITE}/removal-request using your reference number and this e-mail '
        'address.\n\n'
        'If you did not make this request, you can ignore this e-mail.\n\n'
        'WedMangal\n'
    )
    return subject, body


def admin_alert_content(req):
    subject = f'[WedMangal] New request {req.reference}: {req.get_request_type_display()} – {req.vendor_name}'
    body = (
        f'Listing: {req.vendor_name} ({req.listing_url})\n'
        f'Type: {req.get_request_type_display()}\n'
        + (f'Reason: {req.get_reason_display()}\n' if req.reason else '')
        + f'Requester relationship: {req.get_requester_relationship_display()}\n'
        f'Evidence attached: {"yes" if req.evidence_file else "no"}\n\n'
        f'Review it in Django admin: {SITE}/admin/base/vendorremovalrequest/{req.pk}/change/\n\n'
        'Nothing has changed on the listing. Contact details are in the admin only.\n'
    )
    return subject, body


DECISION_TEXT = {
    (RR.RequestType.UNLIST, RR.Status.APPROVED):
        'We have removed the listing from WedMangal. It no longer appears in search results, category pages '
        'or our sitemap. Search engines may take a few weeks to update their own results.',
    (RR.RequestType.INCORRECT_INFORMATION, RR.Status.APPROVED):
        'We have reviewed the information and updated the listing.',
    (RR.RequestType.COPYRIGHT, RR.Status.APPROVED):
        'We have reviewed your complaint and removed the disputed content from the listing.',
}
REJECTED_TEXT = ('After reviewing your request we have not made the change you asked for. If you can '
                 'give us more information — for example proof that you own or represent the business, or '
                 'own the content — please reply to this e-mail or submit a new request.')


def decision_content(req):
    outcome = 'approved' if req.status == RR.Status.APPROVED else 'not approved'
    subject = f'Your request {req.reference} has been {outcome} – WedMangal'
    text = DECISION_TEXT.get((req.request_type, req.status), REJECTED_TEXT) \
        if req.status == RR.Status.APPROVED else REJECTED_TEXT
    note = f'\n\nMessage from our team:\n{req.message_to_requester.strip()}' if req.message_to_requester.strip() else ''
    body = (
        f'Dear {req.requester_name},\n\n'
        f'Your request {req.reference} ({req.get_request_type_display().lower()}) about "{req.vendor_name}" '
        f'has been {outcome}.\n\n{text}{note}\n\nWedMangal\n'
    )
    return subject, body


def send_submission_emails(pk):
    req = RR.objects.get(pk=pk)
    _send(req, 'acknowledgement', *acknowledgement_content(req), [req.requester_email])
    _send(req, 'admin_alert', *admin_alert_content(req), admin_recipients())


def send_decision_email(pk):
    req = RR.objects.get(pk=pk)
    _send(req, f'decision_{req.status}', *decision_content(req), [req.requester_email])


def _run(fn, pk):
    try:
        fn(pk)
    except Exception:
        logger.exception('Removal request %s: %s crashed', pk, fn.__name__)
    finally:
        close_old_connections()


def after_commit(fn, pk):
    """Send e-mail after the row is committed, without making the visitor (or admin) wait for SMTP."""
    if getattr(settings, 'REMOVAL_NOTIFICATIONS_SYNC', False):
        transaction.on_commit(lambda: fn(pk))
    else:
        transaction.on_commit(lambda: threading.Thread(
            target=_run, args=(fn, pk), daemon=True, name=f'removal-email-{pk}').start())
