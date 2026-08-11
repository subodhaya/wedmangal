// src/components/ClaimModal.jsx
import React, { useState, useEffect } from 'react';
import PhoneOtpStep from './PhoneOtpStep';
import './ClaimModal.css';

export default function ClaimModal({ product, onClose, onClaimed }) {
  const [step, setStep] = useState('form');  // 'form' | 'success'

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── OTP verified — claim complete ──────────────────────
  const handleVerified = (data) => {
    // ── Update localStorage with new role + token ──
    if (data.user) {
      localStorage.setItem('userInfo', JSON.stringify(data.user));
    }
    setStep('success');
    setTimeout(() => onClaimed && onClaimed(product._id), 2200);
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

        {/* ── Phone + OTP steps ── */}
        {step === 'form' && (
          <PhoneOtpStep
            sendUrl="/api/users/claim/send-otp/"
            verifyUrl="/api/users/claim/verify-otp/"
            extraParams={{ product_id: product._id }}
            onVerified={handleVerified}
            phoneDesc="Enter the mobile number registered with your business. We'll send a 6-digit verification code via SMS."
            verifyButtonLabel="Verify & Claim Listing ✓"
          />
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