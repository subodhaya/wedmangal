// Confirms an enquiry phone number with a 6-digit code (backend: base/phone_check.py).
// Shown only when the server says the number isn't confirmed yet; a logged-in visitor's
// own account phone never needs it. The confirmation is kept for this browser tab, so
// enquiring with several vendors asks for the code once.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { postJSON } from '../utils/analytics';
import './PhoneCodeCheck.css';

const KEY = 'wm_phone_checks';
const RESEND_SECONDS = 60;   // OTP_RATE_LIMIT in Django

export function savedPhoneToken(phone) {
  try { return JSON.parse(sessionStorage.getItem(KEY) || '{}')[phone] || ''; } catch { return ''; }
}

function savePhoneToken(phone, token) {
  try {
    const all = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    sessionStorage.setItem(KEY, JSON.stringify({ ...all, [phone]: token }));
  } catch { /* the visitor is asked again next time */ }
}

// The logged-in visitor's account phone, to fill the form with
export function accountPhone() {
  try { return String(JSON.parse(localStorage.getItem('userInfo'))?.phone || '').replace(/\D/g, '').slice(-10); }
  catch { return ''; }
}

export default function PhoneCodeCheck({ phone, onVerified, onChangeNumber }) {
  const [code, setCode] = useState('');
  const [state, setState] = useState({ busy: false, sent: false, channel: 'sms', error: '' });
  const [wait, setWait] = useState(0);
  const input = useRef(null);
  const first = useRef('');   // send automatically once per number (React may mount effects twice)

  const send = useCallback(async () => {
    setState(s => ({ ...s, busy: true, error: '' }));
    const { ok, status, data } = await postJSON('/api/analytics/phone/send-code/', { phone });
    if (ok) {
      setState({ busy: false, sent: true, channel: data?.channel === 'whatsapp' ? 'whatsapp' : 'sms', error: '' });
      setWait(RESEND_SECONDS);
      setTimeout(() => input.current?.focus(), 0);
    } else {
      setState(s => ({ ...s, busy: false, error: data?.detail || (status === 429
        ? 'Too many codes asked for. Please try again later.' : 'We couldn’t send the code. Please try again.') }));
      if (status === 429) setWait(RESEND_SECONDS);
    }
  }, [phone]);

  useEffect(() => { if (first.current !== phone) { first.current = phone; send(); } }, [phone, send]);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { setState(s => ({ ...s, error: 'Enter the 6-digit code.' })); return; }
    setState(s => ({ ...s, busy: true, error: '' }));
    const { ok, data } = await postJSON('/api/analytics/phone/verify/', { phone, otp: code });
    if (ok && data?.phone_token) {
      savePhoneToken(phone, data.phone_token);
      onVerified(data.phone_token);
      return;
    }
    setCode('');
    setState(s => ({ ...s, busy: false, error: data?.detail || 'That didn’t work. Please try again.' }));
  };

  const masked = `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
  return (
    <form className="pcc" onSubmit={verify} noValidate>
      <h2 className="pcc-title">Confirm your mobile number</h2>
      <p className="pcc-text" aria-live="polite">
        {state.sent
          ? <>We sent a 6-digit code {state.channel === 'whatsapp' ? 'on WhatsApp ' : 'by SMS '}to <strong>{masked}</strong>. It is valid for 5 minutes.</>
          : <>Sending a code to <strong>{masked}</strong>…</>}
      </p>
      <p className="pcc-why">This makes sure the vendor can reach you. You only do it once.</p>

      <label className="pcc-label" htmlFor="pcc-code">6-digit code</label>
      <input id="pcc-code" ref={input} className="pcc-input" inputMode="numeric" autoComplete="one-time-code"
        maxLength={6} value={code} disabled={!state.sent}
        onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); if (state.error) setState(s => ({ ...s, error: '' })); }}
        aria-invalid={!!state.error} aria-describedby={state.error ? 'pcc-error' : undefined} />
      {state.error && <p className="pcc-error" id="pcc-error" role="alert">{state.error}</p>}

      <button type="submit" className="pcc-submit" disabled={state.busy || code.length !== 6}>
        {state.busy && state.sent ? 'Checking…' : 'Confirm and send'}
      </button>

      <div className="pcc-row">
        {wait > 0
          ? <span className="pcc-muted">Send again in {wait}s</span>
          : <button type="button" className="pcc-link" onClick={send} disabled={state.busy}>
              {state.channel === 'whatsapp' ? 'Send by SMS instead' : 'Send the code again'}
            </button>}
        <button type="button" className="pcc-link" onClick={onChangeNumber}>Change number</button>
      </div>
    </form>
  );
}
