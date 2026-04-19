// src/components/FilterBar.js
// Drop-in filter bar. Works on HomeScreen and EmergencySection.
// Usage: <FilterBar category={keyword} filters={filters} onChange={setFilters} />

import React, { useState } from 'react';
import './FilterBar.css';
import AreaDropdown from './AreaDropdown';

// ── Category-specific filter config ──────────────────────────────────────────
const CATEGORY_FILTERS = {
  Makeup_Artist: [
    { key: 'makeup_type', label: 'Type', type: 'select', options: ['bridal', 'non-bridal'] },
    { key: 'trial', label: 'Trial Available', type: 'toggle' },
  ],
  Photographers: [
    { key: 'shoot_type', label: 'Shoot Type', type: 'select', options: ['wedding', 'pre-wedding', 'candid'] },
  ],
  Caterers: [
    { key: 'food_type', label: 'Food Type', type: 'select', options: ['veg', 'nonveg', 'both'] },
  ],
  Halls: [
    { key: 'hall_capacity', label: 'Min Capacity', type: 'select', options: ['100', '200', '300', '500'] },
    { key: 'hall_ac', label: 'AC', type: 'toggle' },
    { key: 'hall_parking', label: 'Parking', type: 'toggle' },
  ],
  DJ_Artist: [
    { key: 'dj_venue', label: 'Venue', type: 'select', options: ['indoor', 'outdoor'] },
    { key: 'dj_equipment', label: 'Equipment Included', type: 'toggle' },
  ],
  Mehandi_Artist: [
    { key: 'mehandi_type', label: 'Type', type: 'select', options: ['bridal', 'regular'] },
    { key: 'home_visit', label: 'Home Visit', type: 'toggle' },
  ],
};
// DELETE THISconst CITIES = ['Chennai', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Coimbatore', 'Madurai'];
const SORT_OPTIONS = [
  { value: 'newest',     label: '🕐 Newest' },
  { value: 'rating',     label: '⭐ Top Rated' },
  { value: 'price_asc',  label: '💰 Price: Low to High' },
  { value: 'price_desc', label: '💰 Price: High to Low' },
];



export default function FilterBar({ category, filters = {}, onChange }) {
  const [open, setOpen] = useState(false);

  const catFilters = CATEGORY_FILTERS[category] || [];

  const set = (key, val) => {
    onChange(prev => ({ ...(prev || {}), [key]: val }));
  };
  const clear = () => onChange({ sort: 'newest' });

  const activeCount = Object.keys(filters || {}).filter(k => k !== 'sort' && filters[k]).length;

  return (
    <div className="fb-wrap">
      {/* ── Top bar ── */}
      <div className="fb-topbar">
        {/* Sort */}
        <select
          className="fb-sort-select"
          value={filters.sort || 'newest'}
          onChange={e => set('sort', e.target.value)}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* City 
        <select
          className="fb-city-select"
          value={filters.city || ''}
          onChange={e => set('city', e.target.value)}
        >
          <option value="">📍 All Cities</option>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>*/}
        {/* Area */}
        <AreaDropdown value={filters.area_name || ''}  onChange={(area) => set('area_name', area)}/>
        {/* Filter toggle button */}
        <button className={`fb-filter-btn ${open ? 'active' : ''}`} onClick={() => setOpen(p => !p)}>
          ⚙️ Filters {activeCount > 0 && <span className="fb-badge">{activeCount}</span>}
        </button>

        {activeCount > 0 && (
          <button className="fb-clear-btn" onClick={clear}>✕ Clear</button>
        )}
      </div>

      {/* ── Expanded filter panel ── */}
      {open && (
        <div className="fb-panel">
          {/* Price range */}
          <div className="fb-group">
            <span className="fb-group-label">💰 Price Range (₹)</span>
            <div className="fb-price-row">
              <input
                type="number"
                className="fb-price-input"
                placeholder="Min"
                value={filters.min_price || ''}
                onChange={e => set('min_price', e.target.value)}
              />
              <span className="fb-price-dash">—</span>
              <input
                type="number"
                className="fb-price-input"
                placeholder="Max"
                value={filters.max_price || ''}
                onChange={e => set('max_price', e.target.value)}
              />
            </div>
          </div>

          {/* Rating */}
          <div className="fb-group">
            <span className="fb-group-label">⭐ Min Rating</span>
            <div className="fb-stars">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  className={`fb-star ${Number(filters.min_rating) >= r ? 'lit' : ''}`}
                  onClick={() => set('min_rating', filters.min_rating == r ? '' : r)}
                >★</button>
              ))}
            </div>
          </div>

          {/* Category-specific */}
          {catFilters.map(f => (
            <div key={f.key} className="fb-group">
              <span className="fb-group-label">{f.label}</span>
              {f.type === 'select' ? (
                <div className="fb-chips">
                  {f.options.map(opt => (
                    <button
                      key={opt}
                      className={`fb-chip ${filters[f.key] === opt ? 'selected' : ''}`}
                      onClick={() => set(f.key, filters[f.key] === opt ? '' : opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  className={`fb-toggle-btn ${filters[f.key] === 'true' ? 'on' : ''}`}
                  onClick={() => set(f.key, filters[f.key] === 'true' ? '' : 'true')}
                >
                  {filters[f.key] === 'true' ? '✓ Yes' : 'Any'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}