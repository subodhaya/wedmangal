// Request to unlist a business, report incorrect information, or report a photo / copyright concern.
// No account needed. Submitting changes nothing on the listing — WedMangal reviews every request
// (backend: base/removal_requests.py).
import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../utils/api';
import { normalizeIndianMobile, postJSON } from '../utils/analytics';
import { publicOrigin } from '../utils/native';
import './QuoteModal.css';
import './RemovalRequestModal.css';

export const REQUEST_TYPES = {
  unlist: {
    title: 'Request to unlist this business',
    intro: 'Tell us why this listing should be removed. We check that the request comes from the business owner or someone authorised to represent it before removing anything.',
  },
  incorrect_information: {
    title: 'Report incorrect information',
    intro: 'Tell us what is wrong on this listing and we will check and correct it.',
  },
  copyright: {
    title: 'Report a photo or copyright concern',
    intro: 'Report a specific photo, video or text that is shown without permission. We review it separately and remove only the disputed content.',
  },
};

const RELATIONSHIPS = {
  business: [
    ['owner', 'Business owner'],
    ['representative', 'Authorised representative'],
    ['other', 'Other'],
  ],
  copyright: [
    ['content_owner', 'I created or own the content'],
    ['content_agent', 'Authorised on behalf of the content owner'],
    ['owner', 'Business owner'],
    ['other', 'Other'],
  ],
};

const REASONS = [
  ['owner_opt_out', "I own this business and don't want it listed."],
  ['incorrect', 'This business information is incorrect.'],
  ['no_photo_permission', "I don't have permission to use these photographs."],
  ['duplicate', 'Duplicate listing.'],
  ['closed', 'Business permanently closed.'],
  ['other', 'Other.'],
];

const EVIDENCE_TYPES = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const MAX_EVIDENCE = 5 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validPhone = (value) => !!normalizeIndianMobile(value)
  || /^\+[1-9]\d{7,14}$/.test(value.replace(/[\s\-()]/g, ''));

export function validateRemovalRequest(type, form) {
  const errors = {};
  if (!form.requester_name.trim()) errors.requester_name = 'Please enter your name.';
  if (!form.requester_phone.trim()) errors.requester_phone = 'Phone number is required.';
  else if (!validPhone(form.requester_phone.trim())) errors.requester_phone = 'Enter a valid 10-digit mobile number (or an international number with +).';
  if (!EMAIL_RE.test(form.requester_email.trim())) errors.requester_email = 'Enter a valid e-mail address.';
  if (!form.requester_relationship) errors.requester_relationship = 'Please choose your relationship.';
  if (type === 'unlist') {
    if (!form.reason) errors.reason = 'Please choose a reason.';
    else if (form.reason === 'other' && !form.description.trim()) errors.description = 'Please tell us the reason.';
  }
  if (type === 'incorrect_information' && !form.description.trim()) errors.description = 'Please tell us what is incorrect.';
  if (type === 'copyright') {
    if (!form.disputed_content.trim()) errors.disputed_content = 'Tell us which photo or content you are reporting.';
    if (!form.description.trim()) errors.description = 'Please explain your complaint.';
    if (form.evidence_file) {
      const name = form.evidence_file.name.toLowerCase();
      if (!EVIDENCE_TYPES.some(ext => name.endsWith(ext))) errors.evidence_file = 'Upload a PDF, JPG, PNG or WEBP file.';
      else if (form.evidence_file.size > MAX_EVIDENCE) errors.evidence_file = 'The file must be 5 MB or smaller.';
    }
  }
  if (form.description.length > 3000) errors.description = 'Please keep this under 3000 characters.';
  if (!form.consent) errors.consent = 'Please confirm the information is accurate and you are authorised to make this request.';
  return errors;
}

async function postForm(path, formData) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, { method: 'POST', credentials: 'omit', body: formData });
    let data = null;
    try { data = await response.json(); } catch { /* empty body */ }
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

const listingUrl = (vendor) => `${publicOrigin()}/product/${vendor._id}`;

export default function RemovalRequestModal({ vendor, type, onClose }) {
  const [form, setForm] = useState({
    requester_name: '', requester_phone: '', requester_email: '', requester_relationship: '',
    reason: '', description: '', disputed_content: '', evidence_file: null, consent: false, website: '',
  });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState('form'); // 'form' | 'sending' | 'done'
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const copy = REQUEST_TYPES[type];
  const isCopyright = type === 'copyright';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const set = (field) => (e) => {
    const { type: inputType, checked, value, files } = e.target;
    const next = inputType === 'checkbox' ? checked : inputType === 'file' ? (files[0] || null) : value;
    setForm(f => ({ ...f, [field]: next }));
    if (errors[field]) setErrors(errs => ({ ...errs, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateRemovalRequest(type, form);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setStep('sending');
    setSubmitError('');
    const fields = {
      vendor_id: vendor._id,
      requester_name: form.requester_name.trim(),
      requester_phone: form.requester_phone.trim(),
      requester_email: form.requester_email.trim(),
      requester_relationship: form.requester_relationship,
      description: form.description.trim(),
      consent: form.consent,
      website: form.website,
    };
    let response;
    if (isCopyright) {
      const body = new FormData();
      Object.entries({ ...fields, disputed_content: form.disputed_content.trim() })
        .forEach(([key, value]) => body.append(key, String(value)));
      if (form.evidence_file) body.append('evidence_file', form.evidence_file);
      response = await postForm('/api/removal-requests/copyright/', body);
    } else {
      response = await postJSON('/api/removal-requests/', {
        ...fields, request_type: type, ...(type === 'unlist' && { reason: form.reason }),
      });
    }
    const { ok, status, data } = response;
    if (ok) {
      setResult(data);
      setStep('done');
      return;
    }
    setStep('form');
    if (data && data.errors) setErrors(data.errors);
    else if (status === 429) setSubmitError('Too many requests from this connection. Please try again later.');
    else setSubmitError('We couldn’t send your request. Please try again, or write to us from the Contact Us page.');
  };

  const fieldError = (field) => errors[field] && (
    <span className="quote-error" role="alert" id={`rmr-${field}-error`}>{errors[field]}</span>
  );
  const invalid = (field) => ({
    'aria-invalid': !!errors[field],
    'aria-describedby': errors[field] ? `rmr-${field}-error` : undefined,
  });

  return (
    <div className="quote-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="quote-modal rmr-modal" role="dialog" aria-modal="true" aria-labelledby="rmr-title">
        <button type="button" className="quote-close" onClick={onClose} aria-label="Close">✕</button>

        {step === 'done' ? (
          <div className="quote-done">
            <div className="quote-done-icon">✓</div>
            <h2 id="rmr-title" className="quote-title">Request received</h2>
            {result && result.reference ? (
              <>
                <p className="quote-subtitle">
                  Your reference number is <strong className="rmr-reference">{result.reference}</strong>.
                  We have e-mailed it to you.
                </p>
                <p className="rmr-note">
                  We will review your request and reply by e-mail. The listing stays as it is until the review is
                  finished. You can check the status on the <a href="/removal-request">removal requests page</a>.
                </p>
              </>
            ) : (
              <p className="quote-subtitle">{result && result.detail}</p>
            )}
            <button type="button" className="quote-submit" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h2 id="rmr-title" className="quote-title">{copy.title}</h2>
            <p className="quote-subtitle">{copy.intro}</p>

            <div className="rmr-listing">
              <span className="rmr-listing-label">Business</span>
              <span className="rmr-listing-name">{vendor.name}</span>
              <span className="rmr-listing-url">{listingUrl(vendor)}</span>
            </div>

            {/* Honeypot: hidden from people and screen readers; bots fill it in */}
            <div className="rmr-hp" aria-hidden="true">
              <label htmlFor="rmr-website">Website</label>
              <input id="rmr-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
            </div>

            <label className="quote-label" htmlFor="rmr-name">Your name *</label>
            <input id="rmr-name" className="quote-input" value={form.requester_name} onChange={set('requester_name')}
              autoComplete="name" maxLength={100} {...invalid('requester_name')} />
            {fieldError('requester_name')}

            <label className="quote-label" htmlFor="rmr-phone">Phone number *</label>
            <input id="rmr-phone" className="quote-input" type="tel" inputMode="tel" value={form.requester_phone}
              onChange={set('requester_phone')} autoComplete="tel" placeholder="10-digit mobile number" maxLength={20}
              {...invalid('requester_phone')} />
            {fieldError('requester_phone')}

            <label className="quote-label" htmlFor="rmr-email">E-mail address *</label>
            <input id="rmr-email" className="quote-input" type="email" inputMode="email" value={form.requester_email}
              onChange={set('requester_email')} autoComplete="email" maxLength={254} {...invalid('requester_email')} />
            {fieldError('requester_email')}

            <label className="quote-label" htmlFor="rmr-relationship">
              {isCopyright ? 'Your relationship to the content *' : 'Your relationship with the business *'}
            </label>
            <select id="rmr-relationship" className="quote-input" value={form.requester_relationship}
              onChange={set('requester_relationship')} {...invalid('requester_relationship')}>
              <option value="">Choose…</option>
              {RELATIONSHIPS[isCopyright ? 'copyright' : 'business'].map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {fieldError('requester_relationship')}

            {type === 'unlist' && (
              <fieldset className="rmr-reasons" {...invalid('reason')}>
                <legend className="quote-label">Reason for removal *</legend>
                {REASONS.map(([value, label]) => (
                  <label key={value} className="rmr-radio">
                    <input type="radio" name="rmr-reason" value={value} checked={form.reason === value}
                      onChange={set('reason')} />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
            )}
            {fieldError('reason')}

            {isCopyright && (
              <>
                <label className="quote-label" htmlFor="rmr-disputed">Which photo or content? *</label>
                <textarea id="rmr-disputed" className="quote-input quote-textarea" rows={2} maxLength={1000}
                  value={form.disputed_content} onChange={set('disputed_content')}
                  placeholder="Paste the image link, or describe it (e.g. “the third photo of the stage”)"
                  {...invalid('disputed_content')} />
                {fieldError('disputed_content')}
              </>
            )}

            <label className="quote-label" htmlFor="rmr-description">
              {type === 'unlist' ? 'Additional details (optional)'
                : type === 'incorrect_information' ? 'What is incorrect? *' : 'Explain your complaint *'}
            </label>
            <textarea id="rmr-description" className="quote-input quote-textarea" rows={3} maxLength={3000}
              value={form.description} onChange={set('description')} {...invalid('description')}
              placeholder={type === 'incorrect_information' ? 'e.g. the phone number or address is wrong — please include the correct details' : ''} />
            {fieldError('description')}

            {isCopyright && (
              <>
                <label className="quote-label" htmlFor="rmr-evidence">Proof of ownership (optional)</label>
                <input id="rmr-evidence" className="quote-input rmr-file" type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  onChange={set('evidence_file')} {...invalid('evidence_file')} />
                <span className="rmr-hint">PDF, JPG, PNG or WEBP, up to 5 MB. Only WedMangal staff can see it.</span>
                {fieldError('evidence_file')}
              </>
            )}

            <label className="quote-consent">
              <input type="checkbox" checked={form.consent} onChange={set('consent')} {...invalid('consent')} />
              <span>I confirm the information I have given is accurate and that I am authorised to make this request. WedMangal may contact me about it.</span>
            </label>
            {fieldError('consent')}

            {submitError && <p className="quote-error quote-submit-error" role="alert">{submitError}</p>}

            <button type="submit" className="quote-submit" disabled={step === 'sending'}
              aria-busy={step === 'sending' || undefined}>
              {step === 'sending' ? 'Sending…' : 'Send request'}
            </button>
            <p className="quote-hint">
              Your contact details are only seen by the WedMangal team — never shown on the website.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
