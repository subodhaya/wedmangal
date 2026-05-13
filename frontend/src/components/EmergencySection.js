// src/components/EmergencySection.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import FilterBar from './FilterBar';
import './EmergencySection.css';

const CATEGORIES = [
  { name: 'Makeup_Artist',    label: 'Makeup' },
  { name: 'Photographers',    label: 'Photography' },
  { name: 'Caterers',         label: 'Caterers' },
  { name: 'Halls',            label: 'Halls' },
  { name: 'Decorators',       label: 'Decorators' },
  { name: 'Mehandi_Artist',   label: 'Mehandi' },
  { name: 'DJ_Artist',        label: 'DJ' },
  { name: 'Planners',         label: 'Planners' },
  { name: 'Invitation',       label: 'Invitation' },
  { name: 'Jewellery',        label: 'Jewellery' },
  { name: 'Travel_Transport', label: 'Transport' },
  { name: 'Entertainment',    label: 'Music' },
  { name: 'Pandit',           label: 'Pandit' },
];

// ── Shared vendor card used in both HomeScreen preview + full page ─────────────
export function VendorCard({ v, onClick }) {
  const [imgError, setImgError] = useState(false);
  const imgSrc = imgError || !v.image || v.image.includes('placeholder')
    ? null
    : `/static/images/${v.image}`;

  return (
    <div className="es-card" onClick={onClick}>
      <div className="es-card-img-wrap">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={v.name}
            className="es-card-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="es-card-img-placeholder">
            <span>{v.category?.replace(/_/g, ' ') || '🏪'}</span>
          </div>
        )}
        <span className="es-live-badge">● LIVE</span>
      </div>
      <div className="es-card-body">
        <p className="es-card-category">{v.category?.replace(/_/g, ' ')}</p>
        <h3 className="es-card-name">{v.name}</h3>
        <p className="es-card-city">📍 {v.area_name ? `${v.area_name}, ` : ''}{v.city}</p>
        <div className="es-card-meta">
          <span className="es-card-rating">⭐ {Number(v.average_rating).toFixed(1)}</span>
          {v.min_price && (
            <span className="es-card-price">from ₹{Number(v.min_price).toLocaleString()}</span>
          )}
        </div>
        {v.business_phone && (
          <a
            href={`tel:${v.business_phone}`}
            className="es-call-btn"
            onClick={e => e.stopPropagation()}
          >📞 Call Now</a>
        )}
      </div>
    </div>
  );
}

// ── Homepage preview — shows max 5, then "View All" button ───────────────────
export default function EmergencySection() {
  const [vendors, setVendors]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/api/products/available-today/');
        setVendors(data);
      } catch { setVendors([]); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const preview = vendors.slice(0, 5);

  return (
    <div className="es-wrap">
      {/* Header */}
      <div className="es-header">
        <div className="es-header-left">
          <span className="es-pulse" />
          <div>
            <h2 className="es-title">🚨 Available Today</h2>
            <p className="es-subtitle">Book instantly — these vendors are free right now</p>
          </div>
        </div>
        {!loading && vendors.length > 0 && (
          <span className="es-count">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Cards — max 5 */}
      {loading ? (
        <div className="es-loading">Finding available vendors...</div>
      ) : vendors.length === 0 ? (
        <div className="es-empty">
          <span className="es-empty-icon">🕐</span>
          <p>No vendors available right now — check back soon!</p>
        </div>
      ) : (
        <>
          <div className="es-grid">
            {preview.map(v => (
              <VendorCard
                key={v._id}
                v={v}
                onClick={() => navigate(`/product/${v._id}`)}
              />
            ))}
          </div>

          {/* View More button */}
          {vendors.length > 5 && (
            <div className="es-view-more-wrap">
              <button
                className="es-view-more-btn"
                onClick={() => navigate('/available-today')}
              >
                View All {vendors.length} Available Vendors →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}