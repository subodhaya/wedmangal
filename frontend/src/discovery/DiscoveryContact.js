// "Want us to help?" — offered only after a visitor has told us their requirement and seen matches.
// Consent is never pre-ticked, and the server rejects a lead without it.
import React, { useState } from 'react';
import { getSessionId, normalizeIndianMobile, postJSON, trackEvent, EVENTS } from '../utils/analytics';
import './Discovery.css';

export default function DiscoveryContact({ requirement, sourceVendorId }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', event_date: '', message: '', consent: false });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle');   // idle | sending | done | failed
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: key === 'consent' ? e.target.checked : e.target.value }));

  const openForm = () => {
    setOpen(true);
    trackEvent(EVENTS.DISCOVERY_CONTACT_OPENED, { vendorId: sourceVendorId, source: 'discovery', metadata: { category: requirement.category || '' } });
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = 'Please enter your name.';
    if (!normalizeIndianMobile(form.phone)) found.phone = 'Enter a valid 10-digit Indian mobile number.';
    if (!form.consent) found.consent = 'Please agree to be contacted.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setState('sending');
    const { ok, data } = await postJSON('/api/discovery/leads/', {
      session_id: getSessionId(), source_vendor_id: sourceVendorId || null, requirements: requirement,
      name: form.name.trim(), phone: form.phone, event_date: form.event_date || null, message: form.message.trim(),
      consent: form.consent,
    });
    if (ok) { setState('done'); return; }
    setErrors(data?.errors || {});
    setState('failed');
  };

  if (state === 'done') {
    const mobile = normalizeIndianMobile(form.phone);
    return (
      <section className="dsc-contact dsc-done" role="status">
        <h2>Thank you, {form.name.trim()}</h2>
        <p>WedMangal will call you on +91 {mobile.slice(0, 2)}••••••{mobile.slice(-2)} about your requirement. You can keep browsing in the meantime.</p>
      </section>
    );
  }

  return (
    <section className="dsc-contact" aria-labelledby="dsc-contact-title">
      <h2 id="dsc-contact-title">Want us to help you find the right vendors?</h2>
      <p>A WedMangal team member can call you, understand your wedding plans and suggest suitable vendors. It’s free, and you don’t need it to keep browsing.</p>
      {!open ? (
        <button type="button" className="dsc-primary" onClick={openForm}>Get help from WedMangal</button>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="dsc-field">
            <label htmlFor="dsc-name">Your name</label>
            <input id="dsc-name" autoComplete="name" maxLength={100} value={form.name} onChange={set('name')} aria-invalid={!!errors.name} />
            {errors.name && <p className="dsc-error">{errors.name}</p>}
          </div>
          <div className="dsc-field">
            <label htmlFor="dsc-phone">Mobile number</label>
            <input id="dsc-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={16} value={form.phone} onChange={set('phone')} aria-invalid={!!errors.phone} />
            {errors.phone && <p className="dsc-error">{errors.phone}</p>}
          </div>
          <div className="dsc-field">
            <label htmlFor="dsc-date">Wedding date (if you know it)</label>
            <input id="dsc-date" type="date" value={form.event_date} onChange={set('event_date')} />
            {errors.event_date && <p className="dsc-error">{errors.event_date}</p>}
          </div>
          <div className="dsc-field">
            <label htmlFor="dsc-message">Anything else you’re looking for? (optional)</label>
            <textarea id="dsc-message" maxLength={1000} value={form.message} onChange={set('message')} />
          </div>
          <label className="dsc-consent">
            <input type="checkbox" checked={form.consent} onChange={set('consent')} />
            <span>I agree to be contacted by WedMangal by phone about my wedding requirements.</span>
          </label>
          {errors.consent && <p className="dsc-error">{errors.consent}</p>}
          {errors.requirements && <p className="dsc-error">{errors.requirements}</p>}
          {state === 'failed' && !Object.keys(errors).length && <p className="dsc-error">Couldn’t send right now. Please try again.</p>}
          <button type="submit" className="dsc-primary" disabled={!form.consent || state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Get help'}
          </button>
        </form>
      )}
    </section>
  );
}
