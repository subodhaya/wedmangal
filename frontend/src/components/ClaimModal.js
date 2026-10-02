// src/components/ClaimModal.js
// Claim a listing. Ownership is proven by a code sent to the phone number that is
// already on the listing (the claimant never types that number). Anyone without
// access to it sends a request that WedMangal reviews.
import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import './ClaimModal.css';

const errorText = (err, fallback) => err.response?.data?.detail || fallback;

export default function ClaimModal({ product, claimState = {}, onClose, onDone }) {
  const smsPossible = !claimState.sms_blocked && !claimState.blocked;
  const [step, setStep] = useState(claimState.blocked ? 'blocked' : smsPossible ? 'intro' : 'request');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState(claimState.listed_mobile || '');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const base = `/api/vendors/${product._id}/claim`;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const run = async (fn, fallback) => {
    setError('');
    setLoading(true);
    try { await fn(); }
    catch (err) { setError(errorText(err, fallback)); }
    finally { setLoading(false); }
  };

  const sendCode = () => run(async () => {
    const { data } = await api.post(`${base}/send-code/`);
    setSentTo(data.listed_mobile);
    setStep('code');
  }, 'We could not send the code. Please try again.');

  const verify = () => {
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code.'); return; }
    run(async () => {
      const { data } = await api.post(`${base}/verify/`, { code });
      if (data.user) localStorage.setItem('userInfo', JSON.stringify(data.user));
      setStep('claimed');
      onDone && onDone({ listing_status: data.listing_status, can_manage: true });
    }, 'That code did not work. Please try again.');
  };

  const sendRequest = () => {
    if (phone.replace(/\D/g, '').length < 10) { setError('Enter a 10-digit mobile number we can reach you on.'); return; }
    if (message.trim().length < 10) { setError('Tell us how you are connected to this business.'); return; }
    run(async () => {
      await api.post(`${base}/request/`, { phone, message });
      setStep('requested');
      onDone && onDone({ claim_pending: true });
    }, 'We could not send your request. Please try again.');
  };

  return (
    <div className="claim-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="claim-modal" role="dialog" aria-modal="true" aria-labelledby="claim-title">
        <button className="claim-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="claim-header">
          <h2 className="claim-title" id="claim-title">Claim this listing</h2>
          <p className="claim-subtitle"><strong>{product?.name}</strong>{product?.city ? ` · ${product.city}` : ''}</p>
        </div>

        {step === 'blocked' && (
          <div className="claim-body">
            <p className="claim-desc">
              {claimState.blocked === 'has_other_listing'
                ? 'Your account already manages another listing. Please log in with a separate account for this business.'
                : 'This listing has already been claimed. If you believe this is a mistake, contact WedMangal.'}
            </p>
          </div>
        )}

        {step === 'intro' && (
          <div className="claim-body">
            <p className="claim-desc">
              To confirm you own this business, we'll text a 6-digit code to the phone number on this
              listing: <strong>{claimState.listed_mobile}</strong>.
            </p>
            {error && <p className="claim-error">⚠ {error}</p>}
            <button className="claim-btn-primary" onClick={sendCode} disabled={loading}>
              {loading ? <span className="claim-spinner" /> : 'Send code'}
            </button>
            <button className="claim-back-btn" onClick={() => { setError(''); setStep('request'); }}>
              I don't have access to this number
            </button>
          </div>
        )}

        {step === 'code' && (
          <div className="claim-body">
            <p className="claim-desc">Enter the code we sent to <strong>{sentTo}</strong>. It expires in 10 minutes.</p>
            <label className="claim-hint" htmlFor="claim-code">6-digit code</label>
            <input id="claim-code" className="claim-phone-input claim-code-input" inputMode="numeric"
              autoComplete="one-time-code" maxLength={6} value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && verify()} />
            {error && <p className="claim-error">⚠ {error}</p>}
            <button className="claim-btn-primary" onClick={verify} disabled={loading}>
              {loading ? <span className="claim-spinner" /> : 'Confirm and claim'}
            </button>
            <button className="claim-back-btn" onClick={sendCode} disabled={loading}>Send a new code</button>
          </div>
        )}

        {step === 'request' && (
          <div className="claim-body">
            <p className="claim-desc">
              {claimState.sms_blocked === 'no_listed_mobile' || claimState.sms_blocked === 'owned_by_account'
                ? 'We need to check this claim by hand. '
                : ''}
              Tell us how to reach you and how you're connected to the business. WedMangal will review it
              and contact you before giving you access.
            </p>
            <label className="claim-hint" htmlFor="claim-phone">Your mobile number</label>
            <div className="claim-input-group">
              <span className="claim-country-code">+91</span>
              <input id="claim-phone" className="claim-phone-input" inputMode="tel" maxLength={14} value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }} />
            </div>
            <label className="claim-hint" htmlFor="claim-message">How are you connected to this business?</label>
            <textarea id="claim-message" className="claim-phone-input claim-message-input" rows={3} maxLength={1000}
              value={message} onChange={e => { setMessage(e.target.value); setError(''); }}
              placeholder="e.g. I am the owner; the listed number is my old phone." />
            {error && <p className="claim-error">⚠ {error}</p>}
            <button className="claim-btn-primary" onClick={sendRequest} disabled={loading}>
              {loading ? <span className="claim-spinner" /> : 'Send claim request'}
            </button>
            {smsPossible && (
              <button className="claim-back-btn" onClick={() => { setError(''); setStep('intro'); }}>
                ← Use a code instead
              </button>
            )}
          </div>
        )}

        {step === 'claimed' && (
          <div className="claim-body claim-success-body">
            <h3 className="claim-success-title">You now manage this listing</h3>
            <p className="claim-success-msg">
              Customers will see it as claimed by the business. Add your capacity, prices and other details
              so customers can find you.
            </p>
            <a className="claim-btn-primary claim-link-btn" href="/manage-my-page">Complete your profile →</a>
          </div>
        )}

        {step === 'requested' && (
          <div className="claim-body claim-success-body">
            <h3 className="claim-success-title">Request sent</h3>
            <p className="claim-success-msg">
              WedMangal will review your request and contact you on the number you gave. Until then the
              listing stays as it is.
            </p>
            <button className="claim-btn-primary" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
