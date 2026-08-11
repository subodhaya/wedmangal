// src/components/TopRatedVendors.jsx
// Live "top rated" listings widget embedded in blog posts — always reflects
// real, current approved vendors instead of names hardcoded into blog content.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './TopRatedVendors.css';

// Product IDs to never surface in this widget, regardless of category/rating
const EXCLUDED_IDS = new Set([789, 790, 791, 792]);

const CATEGORY_LABELS = {
  Halls: 'Wedding Halls',
  Makeup_Artist: 'Makeup Artists',
  Decorators: 'Decorators',
  Photographers: 'Photographers',
  Caterers: 'Caterers',
  Jewellery: 'Jewellery',
  DJ_Artist: 'DJ / Music Artists',
  Mehandi_Artist: 'Mehandi Artists',
  Travel_Transport: 'Travel & Transport',
  Invitation: 'Invitation Designers',
};

export default function TopRatedVendors({ category, city, limit = 3 }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    setLoading(true);

    const params = { category, sort: 'rating', page: 1 };
    if (city) params.city = city;

    api.get('/api/products/all', { params })
      .then(({ data }) => {
        if (cancelled) return;
        const rated = (data.products || [])
          .filter(p => p.total_num_reviews > 0 && !EXCLUDED_IDS.has(p._id))
          .slice(0, limit);
        setVendors(rated);
      })
      .catch(() => { if (!cancelled) setVendors([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [category, city, limit]);

  // Nothing to show yet (or still loading) — don't render an empty box on a public page
  if (loading || vendors.length === 0) return null;

  const label = CATEGORY_LABELS[category] || category;

  return (
    <div className="trv-widget">
      <h3 className="trv-title">⭐ Top Rated {label}{city ? ` in ${city}` : ' Near You'}</h3>
      <div className="trv-list">
        {vendors.map(v => (
          <Link to={`/product/${v._id}`} key={v._id} className="trv-card">
            <img src={v.image} alt={v.name} className="trv-img" />
            <div className="trv-info">
              <span className="trv-name">{v.name}</span>
              {v.city && <span className="trv-city">{v.city}</span>}
              <span className="trv-rating">★ {Number(v.average_rating).toFixed(1)} ({v.total_num_reviews} reviews)</span>
            </div>
          </Link>
        ))}
      </div>
      <Link to={`/category/${category}`} className="trv-more">See all {label.toLowerCase()} →</Link>
    </div>
  );
}
