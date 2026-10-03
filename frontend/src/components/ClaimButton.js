// src/components/ClaimButton.js
// Usage: <ClaimButton product={product} />
// Shows the listing's status (Claimed / Verified only when true) and, on an
// unclaimed listing, a quiet "Is this your business?" link into the claim flow.

import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import ClaimModal from './ClaimModal';
import './ClaimButton.css';

const loggedIn = () => {
  try { return !!JSON.parse(localStorage.getItem('userInfo'))?.token; }
  catch { return false; }
};

export default function ClaimButton({ product, hideStatus = false }) {
  const [state, setState] = useState({ listing_status: product?.listing_status || 'unclaimed' });
  const [loaded, setLoaded] = useState(!loggedIn());   // logged-in users wait for their claim state
  const [showModal, setShowModal] = useState(false);
  const [afterClose, setAfterClose] = useState(null);   // applied once the success screen is closed

  const vendorId = product?._id;
  useEffect(() => {
    if (!vendorId || !loggedIn()) return;
    let live = true;
    api.get(`/api/vendors/${vendorId}/claim/`)
      .then(({ data }) => { if (live) setState(data); })
      .catch(() => {})
      .finally(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, [vendorId]);

  useEffect(() => {
    if (loaded && loggedIn() && new URLSearchParams(window.location.search).get('claim') === '1'
        && state.listing_status === 'unclaimed' && !state.can_manage && !state.claim_pending) {
      setShowModal(true);
    }
  }, [loaded, state.listing_status, state.can_manage, state.claim_pending]);

  const status = state.listing_status;

  if (state.can_manage) {
    return (
      <div className="claim-owned">
        <span className="claim-verified-chip owned">✓ You manage this listing</span>
        <a href="/manage-my-page" className="claim-dashboard-link">Complete your profile →</a>
      </div>
    );
  }

  if (status === 'verified' || status === 'claimed') {
    if (hideStatus) return null;   // the page already shows the status next to the name
    return (
      <div className="claim-already">
        <span className={`claim-verified-chip ${status === 'claimed' ? 'claimed' : ''}`}
          title={status === 'verified'
            ? 'WedMangal has verified this business'
            : 'The business owner manages this listing'}>
          {status === 'verified' ? '✓ Verified by WedMangal' : '✓ Claimed by the business'}
        </span>
      </div>
    );
  }

  if (state.claim_pending) {
    return (
      <div className="claim-cta-wrap">
        <p className="claim-cta-label">Your claim for this listing is being reviewed by WedMangal.</p>
      </div>
    );
  }

  if (!loaded) return null;

  const start = () => setShowModal(true);   // the dialog explains first, then asks logged-out users to log in

  return (
    <>
      <div className="claim-cta-wrap">
        <p className="claim-cta-label">Is this your business?</p>
        <button type="button" className="claim-cta-btn" onClick={start}>Claim this listing</button>
      </div>

      {showModal && (
        <ClaimModal
          product={product}
          claimState={state}
          loggedIn={loggedIn()}
          onClose={() => {
            setShowModal(false);
            if (afterClose) setState(s => ({ ...s, ...afterClose }));
          }}
          onDone={setAfterClose}
        />
      )}
    </>
  );
}
