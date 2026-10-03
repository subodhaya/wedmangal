// Photo hero for a vendor profile: the vendor's own photos only (business photo +
// service photos). No stock images — with no photos we show a plain name card.
import React, { useCallback, useEffect, useRef, useState } from 'react';

export const vendorPhotos = (product) => {
  const seen = new Set();
  const photos = [];
  const add = (src, alt) => {
    if (!src || typeof src !== 'string' || src.includes('placeholder') || seen.has(src)) return;
    seen.add(src);
    photos.push({ src, alt });
  };
  add(product.image, product.name);
  (product.services || []).forEach(s => (s.images || []).forEach(img => add(img.image, s.name || product.name)));
  return photos;
};

const initials = (name = '') =>
  name.split(/\s+/).filter(w => /[A-Za-z]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'W';

function Lightbox({ photos, start, onClose }) {
  const listRef = useRef(null);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    listRef.current?.children[start]?.scrollIntoView?.({ block: 'start' });
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [start, onClose]);

  return (
    <div className="vg-lightbox" role="dialog" aria-modal="true" aria-label="All photos">
      <div className="vg-lightbox-bar">
        <span>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
        <button type="button" className="vg-lightbox-close" onClick={onClose} aria-label="Close photos">✕</button>
      </div>
      <div className="vg-lightbox-list" ref={listRef}>
        {photos.map((p, i) => (
          <img key={p.src} src={p.src} alt={`${p.alt} — photo ${i + 1}`} loading="lazy" decoding="async" />
        ))}
      </div>
    </div>
  );
}

export default function VendorGallery({ product }) {
  const photos = vendorPhotos(product);
  const [open, setOpen] = useState(null);       // index to start the lightbox at
  const [current, setCurrent] = useState(0);    // mobile swipe position
  const stripRef = useRef(null);
  const close = useCallback(() => setOpen(null), []);

  if (photos.length === 0) {
    return (
      <div className="vg-empty" aria-hidden="true">
        <span className="vg-monogram">{initials(product.name)}</span>
        <span className="vg-empty-label">{(product.category || '').replace(/_/g, ' ')}</span>
      </div>
    );
  }

  const onScroll = () => {
    const el = stripRef.current;
    if (el) setCurrent(Math.round(el.scrollLeft / el.clientWidth));
  };
  const img = (p, i, cls) => (
    <button type="button" key={p.src} className={`vg-tile ${cls || ''}`} onClick={() => setOpen(i)}
      aria-label={`Open photo ${i + 1} of ${photos.length}`}>
      <img src={p.src} alt={i === 0 ? product.name : `${p.alt} — photo ${i + 1}`} width="800" height="600"
        loading={i === 0 ? 'eager' : 'lazy'} fetchpriority={i === 0 ? 'high' : undefined} decoding="async" />
    </button>
  );
  const grid = photos.slice(0, 5);

  return (
    <div className="vg">
      {/* Desktop / tablet: one large photo + up to four smaller ones */}
      <div className={`vg-grid vg-count-${grid.length}`}>
        {grid.map((p, i) => img(p, i, i === 0 ? 'vg-main' : ''))}
      </div>

      {/* Phone: swipeable full-width strip */}
      <div className="vg-strip" ref={stripRef} onScroll={onScroll}>
        {photos.map((p, i) => img(p, i))}
      </div>
      {photos.length > 1 && (
        <span className="vg-counter" aria-hidden="true">{Math.min(current + 1, photos.length)} / {photos.length}</span>
      )}

      {photos.length > 1 && (
        <button type="button" className="vg-all" onClick={() => setOpen(0)}>
          View all {photos.length} photos
        </button>
      )}
      {open !== null && <Lightbox photos={photos} start={open} onClose={close} />}
    </div>
  );
}
