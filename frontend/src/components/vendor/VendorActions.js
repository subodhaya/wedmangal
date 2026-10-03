// WhatsApp / Call / Get Quote. Used inline under the vendor name, in the desktop
// sidebar and as the phone's bottom bar. Same tracking events as before.
import React from 'react';
import { trackEvent, EVENTS } from '../../utils/analytics';

export const normalizePhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned || cleaned === '0000') return '';
  if (cleaned.startsWith('0') && cleaned.length >= 10) return '91' + cleaned.slice(1);
  if (cleaned.length === 10) return '91' + cleaned;
  return cleaned;
};

export const whatsappLink = (phone, businessName) => {
  const msg = encodeURIComponent(
    `Hi, I found you on WedMangal! I'm interested in your ${businessName || ''} services. Can you please share more details?`
  );
  return `https://wa.me/${normalizePhone(phone)}?text=${msg}`;
};

export default function VendorActions({ product, onQuote, variant = 'inline', source = 'vendor_page', hidden = false }) {
  const phone = normalizePhone(product.business_phone);
  return (
    <div className={`va va-${variant}${hidden ? ' va-hidden' : ''}`}>
      {phone && (
        <a className="va-btn va-wa" href={whatsappLink(product.business_phone, product.name)} target="_blank"
          rel="noreferrer" onClick={() => trackEvent(EVENTS.WHATSAPP_CLICK, { vendorId: product._id, source })}>
          <i className="fab fa-whatsapp" aria-hidden="true"></i><span>WhatsApp</span>
        </a>
      )}
      {phone && (
        <a className="va-btn va-call" href={`tel:${phone}`}
          onClick={() => trackEvent(EVENTS.PHONE_CLICK, { vendorId: product._id, source })}>
          <i className="fas fa-phone-alt" aria-hidden="true"></i><span>Call</span>
        </a>
      )}
      <button type="button" className="va-btn va-quote" onClick={onQuote}>
        <i className="fas fa-file-alt" aria-hidden="true"></i><span>Get Quote</span>
      </button>
    </div>
  );
}
