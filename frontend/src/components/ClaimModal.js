// src/components/ClaimModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';  // uses your existing interceptor (auto-refreshes JWT)
import './ClaimModal.css';

const RESEND_SECONDS = 60; // must match OTP_RATE_LIMIT in Django

export default function ClaimModal({ product, onClose, onClaimed }) {
  const [step, setStep]               = useState('phone');  // 'phone' | 'otp' | 'success'
  const [phone, setPhone]             = useState('');
  const [otp, setOtp]                 = useState(['', '', '', '', '', '']);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef([]);
  const timerRef  = useRef(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [resendTimer]);

  // ── Step 1: Send OTP via Django ────────────────────────
  const handleSendOTP = async () => {
    setError('');
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/users/claim/send-otp/', { phone: cleaned, product_id: product._id });
      setStep('otp');
      setResendTimer(RESEND_SECONDS);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send code. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── OTP box handlers ───────────────────────────────────
  const handleOtpChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    setError('');
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  // ── Step 2: Verify OTP via Django ──────────────────────
  const handleVerifyOTP = async () => {
    setError('');
    const entered = otp.join('');
    if (entered.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/users/claim/verify-otp/', { phone: phone.replace(/\D/g, ''), otp: entered, product_id: product._id });

      // ── Update localStorage with new role + token ──
      if (data.user) {
        localStorage.setItem('userInfo', JSON.stringify(data.user));
      }

      setStep('success');
      setTimeout(() => onClaimed && onClaimed(product._id), 2200);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Verification failed. Please try again.';
      setError(msg);
      // Clear boxes on wrong OTP
      if (err.response?.status === 400) {
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    setError('');
    await handleSendOTP();
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="claim-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="claim-modal">

        <button className="claim-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Header */}
        <div className="claim-header">
          <div className="claim-icon">🏷️</div>
          <h2 className="claim-title">Claim This Listing</h2>
          <p className="claim-subtitle">
            {product?.name
              ? <><strong>{product.name}</strong> · {product.city}</>
              : 'Verify your business ownership'}
          </p>
        </div>

        {/* ── Phone step ── */}
        {step === 'phone' && (
          <div className="claim-body">
            <p className="claim-desc">
              Enter the mobile number registered with your business.
              We'll send a 6-digit verification code via SMS.
            </p>
            <div className="claim-input-group">
              <span className="claim-country-code">🇮🇳 +91</span>
              <input
                className="claim-phone-input"
                type="tel"
                placeholder="98765 43210"
                maxLength={10}
                value={phone}
                onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                autoFocus
              />
            </div>
            {error && <p className="claim-error">⚠ {error}</p>}
            <button
              className="claim-btn-primary"
              onClick={handleSendOTP}
              disabled={loading || phone.replace(/\D/g, '').length !== 10}
            >
              {loading ? <span className="claim-spinner" /> : 'Send Verification Code →'}
            </button>
          </div>
        )}

        {/* ── OTP step ── */}
        {step === 'otp' && (
          <div className="claim-body">
            <p className="claim-desc">
              A 6-digit code was sent to <strong>+91 {phone}</strong>.
              <br />
              <span className="claim-hint">It expires in 5 minutes.</span>
            </p>

            <div className="claim-otp-row" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  className={`claim-otp-box ${digit ? 'filled' : ''} ${error ? 'shake' : ''}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(e.target.value, i)}
                  onKeyDown={e => handleOtpKeyDown(e, i)}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && <p className="claim-error">⚠ {error}</p>}

            <button
              className="claim-btn-primary"
              onClick={handleVerifyOTP}
              disabled={loading || otp.join('').length < 6}
            >
              {loading ? <span className="claim-spinner" /> : 'Verify & Claim Listing ✓'}
            </button>

            <div className="claim-resend">
              {resendTimer > 0
                ? <span className="claim-timer">Resend in {resendTimer}s</span>
                : <button className="claim-resend-btn" onClick={handleResend}>Resend Code</button>
              }
              <button
                className="claim-back-btn"
                onClick={() => { setStep('phone'); setError(''); setOtp(['','','','','','']); }}
              >
                ← Change Number
              </button>
            </div>
          </div>
        )}

        {/* ── Success step ── */}
        {step === 'success' && (
          <div className="claim-body claim-success-body">
            <div className="claim-success-icon">🎉</div>
            <h3 className="claim-success-title">Listing Claimed!</h3>
            <p className="claim-success-msg">
              <strong>{product?.name}</strong> is now verified under your account.
              Redirecting to your dashboard...
            </p>
            <div className="claim-verified-badge">
              <span>✓</span> Verified Service Owner
            </div>
          </div>
        )}

      </div>
    </div>
  );
}