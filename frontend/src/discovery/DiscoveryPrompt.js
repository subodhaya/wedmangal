// "Looking for more options?" — shown on a vendor page after the vendor's own information.
// Deliberately tiny: the questions (DiscoveryFlow) download only when someone taps the button.
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { trackEvent, EVENTS } from '../utils/analytics';

const DiscoveryFlow = lazy(() => import('./DiscoveryFlow'));

const COPY = {
  halls: ['Looking for a wedding venue?', 'Tell us a few details and we’ll find more suitable venues in Chennai.', 'venues'],
  caterers: ['Comparing caterers?', 'Tell us your guest count and food preference — we’ll show caterers that fit.', 'caterers'],
  photographers: ['Comparing photographers?', 'Tell us your budget and style — we’ll show photographers that fit.', 'photographers'],
  makeup_artist: ['Looking for a bridal makeup artist?', 'A few quick questions and we’ll show artists that fit.', 'makeup artists'],
  mehandi_artist: ['Looking for a mehandi artist?', 'A few quick questions and we’ll show artists that fit.', 'mehandi artists'],
  decorators: ['Comparing decorators?', 'Tell us your budget and what you need — we’ll show decorators that fit.', 'decorators'],
  dj_artist: ['Looking for a DJ?', 'A few quick questions and we’ll show DJs that fit.', 'DJs'],
};
const GENERIC = ['Planning a wedding?', 'Tell us what you’re looking for and we’ll help you find suitable wedding vendors.', 'vendors'];

export default function DiscoveryPrompt({ vendor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [title, text, noun] = COPY[(vendor.category || '').toLowerCase()] || GENERIC;

  useEffect(() => {   // "CTA seen" — once, only when it actually scrolls into view
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        trackEvent(EVENTS.DISCOVERY_PROMPT_VIEWED, { vendorId: vendor._id, source: 'vendor_page', metadata: { category: vendor.category || '' } });
        observer.disconnect();
      }
    }, { threshold: 0.6 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [vendor._id, vendor.category]);

  const start = () => {
    setOpen(true);
    trackEvent(EVENTS.DISCOVERY_STARTED, { vendorId: vendor._id, source: 'vendor_page', metadata: { category: vendor.category || '' } });
  };

  return (
    <section className="vp-discovery" ref={ref} aria-labelledby="vp-discovery-title">
      <h2 className="vp-discovery-title" id="vp-discovery-title">{title}</h2>
      <p>{text}</p>
      {!open ? (
        <button type="button" className="vp-discovery-btn" onClick={start}>Help me find {noun}</button>
      ) : (
        <Suspense fallback={<p className="vp-discovery-loading">Loading questions…</p>}>
          <DiscoveryFlow category={vendor.category} sourceVendorId={vendor._id} sourceArea={vendor.area_name}
            onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </section>
  );
}
