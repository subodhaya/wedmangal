// src/components/ClaimButton.js
// Usage: <ClaimButton product={product} />

import React, { useState } from 'react';
import ClaimModal from './ClaimModal';
import './ClaimButton.css';

export default function ClaimButton({ product }) {
  const [showModal, setShowModal]   = useState(false);
  const [claimed, setClaimed]       = useState(product?.is_claimed || false);

  const userInfo = (() => {
    try { return JSON.parse(localStorage.getItem('userInfo')) || null; }
    catch { return null; }
  })();

  const isOwnedByMe = claimed && product?.claimed_by_id === userInfo?.id;

  const handleClaimed = () => {
    setClaimed(true);
    setShowModal(false);
  };

  // ── Already claimed by someone else → just show verified badge ──
  if (claimed && !isOwnedByMe) {
    return (
      <div className="claim-already">
        <span className="claim-verified-chip">✓ Verified Business</span>
      </div>
    );
  }

  // ── Claimed by current user → show badge + dashboard link ──
  if (isOwnedByMe) {
    return (
      <div className="claim-owned">
        <span className="claim-verified-chip owned">✓ Your Verified Listing</span>
        <a href="/" className="claim-dashboard-link">
          Go to Dashboard →
        </a>
      </div>
    );
  }

  // ── Not yet claimed → show claim button ──
  return (
    <>
      <div className="claim-cta-wrap">
        <p className="claim-cta-label">Is this your business?</p>
        <button className="claim-cta-btn" onClick={() => setShowModal(true)}>
          🏷️ Claim This Listing
        </button>
      </div>

      {showModal && (
        <ClaimModal
          product={product}
          onClose={() => setShowModal(false)}
          onClaimed={handleClaimed}
        />
      )}
    </>
  );
}