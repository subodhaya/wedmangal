import React, { useEffect, useState } from 'react';
import { getSessionId, normalizeIndianMobile, postJSON } from '../utils/analytics';
import './QuoteModal.css';

const today = () => new Date().toISOString().slice(0, 10);

export function validateQuote(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Please enter your name.';
  if (!form.phone.trim()) errors.phone = 'Phone number is required.';
  else if (!normalizeIndianMobile(form.phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  if (form.message.length > 1000) errors.message = 'Message must be 1000 characters or fewer.';
  if (!form.consent) errors.consent = 'Please agree to share your details with the vendor.';
  return errors;
}

// Requirements the visitor chose in the discovery questions this session (same category only)
const discoveryRequirement = (vendor) => {
  try {
    const req = JSON.parse(sessionStorage.getItem('wm_discovery_requirement'));
    return req && req.category && req.category.toLowerCase() === String(vendor.category || '').toLowerCase() ? req : null;
  } catch { return null; }
};

export default function QuoteModal({ vendor, onClose }) {
  const [form, setForm] = useState({ name: '', phone: '', event_date: '', message: '', consent: false });
  const [requirement] = useState(() => discoveryRequirement(vendor));
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState('form'); // 'form' | 'sending' | 'done'
  const [submitError, setSubmitError] = useState('');

  // Lock body scroll; close on Escape
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
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(errs => ({ ...errs, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateQuote(form);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setStep('sending');
    setSubmitError('');
    const { ok, data } = await postJSON('/api/analytics/quotes/', {
      vendor_id: vendor._id,
      session_id: getSessionId(),
      path: window.location.pathname,
      name: form.name.trim(),
      phone: form.phone.trim(),
      event_date: form.event_date || null,
      message: form.message.trim(),
      consent: form.consent,
      ...(requirement && { requirements: requirement }),
    });
    if (ok) {
      setStep('done');
      return;
    }
    setStep('form');
    if (data && data.errors) setErrors(data.errors);
    else setSubmitError('We couldn’t send your enquiry. Please try again, or call or WhatsApp the vendor directly.');
  };

  const fieldError = (field) => errors[field] && (
    <span className="quote-error" role="alert" id={`quote-${field}-error`}>{errors[field]}</span>
  );

  return (
    <div className="quote-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="quote-modal" role="dialog" aria-modal="true" aria-labelledby="quote-title">
        <button type="button" className="quote-close" onClick={onClose} aria-label="Close">✕</button>

        {step === 'done' ? (
          <div className="quote-done">
            <div className="quote-done-icon">✓</div>
            <h2 id="quote-title" className="quote-title">Enquiry received</h2>
            <p className="quote-subtitle">
              Thank you! WedMangal will pass your details to {vendor.name} so they can contact you.
            </p>
            <button type="button" className="quote-submit" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h2 id="quote-title" className="quote-title">Get a free quote</h2>
            <p className="quote-subtitle">from {vendor.name}</p>

            <label className="quote-label" htmlFor="quote-name">Your name *</label>
            <input id="quote-name" className="quote-input" value={form.name} onChange={set('name')}
              autoComplete="name" maxLength={100}
              aria-invalid={!!errors.name} aria-describedby={errors.name ? 'quote-name-error' : undefined} />
            {fieldError('name')}

            <label className="quote-label" htmlFor="quote-phone">Mobile number *</label>
            <input id="quote-phone" className="quote-input" type="tel" inputMode="tel" value={form.phone}
              onChange={set('phone')} autoComplete="tel" placeholder="10-digit mobile number" maxLength={16}
              aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'quote-phone-error' : undefined} />
            {fieldError('phone')}

            <label className="quote-label" htmlFor="quote-date">Event date (optional)</label>
            <input id="quote-date" className="quote-input" type="date" min={today()}
              value={form.event_date} onChange={set('event_date')} />
            {fieldError('event_date')}

            <label className="quote-label" htmlFor="quote-message">Message (optional)</label>
            <textarea id="quote-message" className="quote-input quote-textarea" rows={3} maxLength={1000}
              value={form.message} onChange={set('message')}
              placeholder="Guest count, budget, what you're looking for…" />
            {fieldError('message')}

            <label className="quote-consent">
              <input type="checkbox" checked={form.consent} onChange={set('consent')}
                aria-invalid={!!errors.consent} aria-describedby={errors.consent ? 'quote-consent-error' : undefined} />
              <span>I agree that WedMangal may share my name, mobile number, event date{requirement ? ', message and the requirements I chose' : ' and message'} with {vendor.name} so they can contact me about this enquiry.</span>
            </label>
            {fieldError('consent')}

            {submitError && <p className="quote-error quote-submit-error" role="alert">{submitError}</p>}

            <button type="submit" className="quote-submit" disabled={step === 'sending' || !form.consent}
              aria-busy={step === 'sending' || undefined}
              aria-describedby={!form.consent ? 'quote-consent-needed' : undefined}>
              {step === 'sending' ? 'Sending…' : 'Send enquiry'}
            </button>
            {!form.consent && (
              <p className="quote-hint" id="quote-consent-needed">Tick the box above to send your enquiry.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
