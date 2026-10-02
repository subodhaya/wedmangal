import React from 'react';
import { Link } from 'react-router-dom';
import { normalizePhone } from '../screens/ProductScreen';
import { trackEvent, EVENTS } from '../utils/analytics';

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const priceText = (from, to) => {
  if (!from) return 'Price on request';
  return to ? `${inr(from)}–${inr(to)}` : `From ${inr(from)}`;
};

export const imageSrc = (image) => {
  if (!image) return '/static/images/placeholder.png';
  return image.startsWith('/') || image.startsWith('http') ? image : `/static/images/${image}`;
};

// One search result. Uses only the public search fields (no personal_phone).
export default function VendorResultCard({ vendor, position, query = '' }) {
  const phone = normalizePhone(vendor.business_phone);
  const profile = `/product/${vendor._id}?ref=search`;
  const source = 'search_results';
  const message = encodeURIComponent(
    `Hi, I found you on WedMangal! I'm interested in your ${vendor.name || ''} services. Can you please share more details?`
  );

  const openProfile = () => trackEvent(EVENTS.SEARCH_RESULT_CLICK, {
    vendorId: vendor._id, source, metadata: { position, ...(query && { query }) },
  });

  return (
    <article className="vr-card">
      <Link to={profile} onClick={openProfile} className="vr-media" tabIndex={-1} aria-hidden="true">
        <img src={imageSrc(vendor.image)} alt="" loading="lazy" />
        {vendor.is_available_today && <span className="vr-badge">Available today</span>}
      </Link>
      <div className="vr-body">
        <h3 className="vr-name">
          <Link to={profile} onClick={openProfile}>{vendor.name}</Link>
        </h3>
        <p className="vr-meta">
          {vendor.category_label}{(vendor.area_name || vendor.city) && ` · ${vendor.area_name || vendor.city}`}
        </p>
        {vendor.rating != null && (
          <p className="vr-rating">
            <span className="vr-star">★ {vendor.rating}</span>
            {vendor.google_reviews ? ` · ${vendor.google_reviews.toLocaleString('en-IN')} Google reviews` : ' on Google'}
          </p>
        )}
        <p className="vr-price">{priceText(vendor.price_from, vendor.price_to)}</p>
        <div className="vr-actions">
          <Link to={profile} onClick={openProfile} className="vr-btn vr-btn-primary">View profile</Link>
          {phone && (
            <>
              <a href={`tel:${phone}`} className="vr-btn" aria-label={`Call ${vendor.name}`}
                onClick={() => trackEvent(EVENTS.PHONE_CLICK, { vendorId: vendor._id, source })}>
                <i className="fas fa-phone-alt" aria-hidden="true"></i> Call
              </a>
              <a href={`https://wa.me/${phone}?text=${message}`} target="_blank" rel="noreferrer"
                className="vr-btn vr-btn-wa" aria-label={`WhatsApp ${vendor.name}`}
                onClick={() => trackEvent(EVENTS.WHATSAPP_CLICK, { vendorId: vendor._id, source })}>
                <i className="fab fa-whatsapp" aria-hidden="true"></i> WhatsApp
              </a>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
