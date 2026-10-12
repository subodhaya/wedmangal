// "Keep exploring" at the end of a vendor page: similar vendors with photos (same category, in and near the
// vendor's area first), the other wedding categories for the same area, and a way into the rest of WedMangal.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { imageSrc } from '../VendorResultCard';
import { trackEvent, EVENTS } from '../../utils/analytics';

// Customer-facing names, plural (same keys as the backend CUSTOMER_CATEGORIES)
const CATEGORIES = [
  ['Halls', 'Wedding halls', '🏛️'], ['Photographers', 'Photographers', '📷'], ['Caterers', 'Caterers', '🍽️'],
  ['Decorators', 'Decorators', '🌸'], ['Makeup_Artist', 'Bridal makeup', '💄'], ['Mehandi_Artist', 'Mehendi artists', '🌿'],
  ['DJ_Artist', 'DJs', '🎧'], ['Planners', 'Wedding planners', '📋'],
];
const MAX = 8;
const hasPhoto = (p) => p.image && !String(p.image).includes('placeholder');

export default function MoreVendors({ vendor }) {
  const [items, setItems] = useState([]);
  const key = CATEGORIES.find(([k]) => k.toLowerCase() === String(vendor.category || '').toLowerCase())?.[0];
  const label = CATEGORIES.find(([k]) => k === key)?.[1] || 'wedding vendors';
  const area = vendor.area_name || '';
  const city = vendor.city || 'Chennai';

  useEffect(() => {
    if (!vendor.category) return undefined;
    let active = true;
    const pick = (list, taken) => list.filter(p => p._id !== vendor._id && hasPhoto(p) && !taken.has(p._id));
    (async () => {
      const taken = new Set();
      let found = [];
      try {
        if (area) {   // in the area first, then its neighbours (server orders them that way)
          const { data } = await api.get('/api/products/all', { params: { category: vendor.category, area_name: area, page: 1 } });
          found = pick(data.products || [], taken);
          found.forEach(p => taken.add(p._id));
        }
        if (found.length < MAX) {   // top up with the same category across Chennai
          const { data } = await api.get('/api/products/all', { params: { category: vendor.category, city, sort: 'rating', page: 1 } });
          found = found.concat(pick(data.products || [], taken));
        }
      } catch { /* the section is optional — show nothing if the list can't load */ }
      if (active) setItems(found.slice(0, MAX));
    })();
    return () => { active = false; };
  }, [vendor._id, vendor.category, area, city]);

  const open = (other, position) => trackEvent(EVENTS.SEARCH_RESULT_CLICK, {
    vendorId: other._id, source: 'vendor_page_more', metadata: { position, category: vendor.category || '' },
  });
  const areaParam = area ? `&area=${encodeURIComponent(area)}` : (city !== 'Chennai' ? `&city=${encodeURIComponent(city)}` : '');

  return (
    <section className="vmore" aria-labelledby="vmore-title">
      {items.length > 0 && (
        <>
          <h2 className="vp-h2" id="vmore-title">More {label.toLowerCase()} {area ? `in and near ${area}` : `in ${city}`}</h2>
          <div className="vmore-row">
            {items.map((p, i) => (
              <Link key={p._id} to={`/product/${p._id}?ref=more`} className="vmore-card" onClick={() => open(p, i + 1)}>
                <img src={imageSrc(p.image)} alt={`${p.name}${p.area_name ? ` — ${p.area_name}` : ''}`} loading="lazy" />
                <span className="vmore-name">{p.name}</span>
                <span className="vmore-meta">
                  {p.area_name || 'Chennai'}
                  {p.total_num_reviews > 0 && p.average_rating ? ` · ★ ${Number(p.average_rating).toFixed(1)}` : ''}
                </span>
              </Link>
            ))}
          </div>
          {key && (
            <Link className="vmore-all" to={`/search/?category=${key}${areaParam}`}>
              See all {label.toLowerCase()}{area ? ` near ${area}` : ''} →
            </Link>
          )}
        </>
      )}

      <h2 className="vp-h2 vmore-plan">Planning the rest of your wedding?</h2>
      <div className="vmore-cats">
        {CATEGORIES.filter(([k]) => k !== key).map(([k, name, icon]) => (
          <Link key={k} to={`/search/?category=${k}${areaParam}`} className="vmore-cat"
            onClick={() => trackEvent(EVENTS.SEARCH_RESULT_CLICK, { vendorId: vendor._id, source: 'vendor_page_category', metadata: { category: k } })}>
            <span aria-hidden="true">{icon}</span> {name}
          </Link>
        ))}
      </div>
      <Link className="vmore-home" to="/">Explore all wedding vendors on WedMangal →</Link>
    </section>
  );
}
