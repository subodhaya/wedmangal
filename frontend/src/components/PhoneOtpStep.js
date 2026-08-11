// src/components/PhoneOtpStep.jsx
// Shared phone → OTP step UI, used by ClaimModal, LoginScreen (phone tab)
// and AddPhoneScreen. Reuses the "claim-*" styles from ClaimModal.css.
import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

const RESEND_SECONDS = 60; // must match OTP_RATE_LIMIT in Django

export default function PhoneOtpStep({
  sendUrl,
  verifyUrl,
  extraParams = {},
  onVerified,
  phoneDesc,
  otpDescPrefix = 'A 6-digit code was sent to',
  sendButtonLabel = 'Send Verification Code →',
  verifyButtonLabel = 'Verify ✓',
}) {
  const [step, setStep] = useState('phone');   // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [resendTimer]);

  const handleSendOTP = async () => {
    setError('');
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      await api.post(sendUrl, { phone: cleaned, ...extraParams });
      setStep('otp');
      setResendTimer(RESEND_SECONDS);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleVerifyOTP = async () => {
    setError('');
    const entered = otp.join('');
    if (entered.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(verifyUrl, {
        phone: phone.replace(/\D/g, ''),
        otp: entered,
        ...extraParams,
      });
      onVerified && onVerified(data);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Verification failed. Please try again.';
      setError(msg);
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

  if (step === 'phone') {
    return (
      <div className="claim-body">
        {phoneDesc && <p className="claim-desc">{phoneDesc}</p>}
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
          {loading ? <span className="claim-spinner" /> : sendButtonLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="claim-body">
      <p className="claim-desc">
        {otpDescPrefix} <strong>+91 {phone}</strong>.
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
        {loading ? <span className="claim-spinner" /> : verifyButtonLabel}
      </button>

      <div className="claim-resend">
        {resendTimer > 0
          ? <span className="claim-timer">Resend in {resendTimer}s</span>
          : <button className="claim-resend-btn" onClick={handleResend}>Resend Code</button>
        }
        <button
          className="claim-back-btn"
          onClick={() => { setStep('phone'); setError(''); setOtp(['', '', '', '', '', '']); }}
        >
          ← Change Number
        </button>
      </div>
    </div>
  );
}
