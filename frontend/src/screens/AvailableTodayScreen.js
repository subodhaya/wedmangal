// src/screens/AvailableTodayScreen.js
// Full page — /available-today route
// Shows all available vendors with full filter/sort support

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import FilterBar from '../components/FilterBar';
import { VendorCard } from '../components/EmergencySection';
import './AvailableTodayScreen.css';

const CATEGORIES = [
  { name: '', label: 'All' },
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

export default function AvailableTodayScreen() {
  const [vendors, setVendors]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filters, setFilters]             = useState({ sort: 'newest' });
  const [activeCategory, setActiveCategory] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        const params = {
          ...(activeCategory && { category: activeCategory }),
          ...(filters.city   && { city: filters.city }),
          sort: filters.sort || 'newest',
        };
        const { data } = await api.get('/api/products/available-today/', { params });
        setVendors(data);
      } catch { setVendors([]); }
      finally { setLoading(false); }
    };
    fetchVendors();
  }, [filters, activeCategory]);

  return (
    <div className="at-page">
      {/* ── Header ── */}
      <div className="at-hero">
        <button className="at-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="at-hero-content">
          <span className="at-pulse" />
          <div>
            <h1 className="at-title">🚨 Available Today</h1>
            <p className="at-subtitle">
              {loading ? 'Finding vendors...' : `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} available right now`}
            </p>
          </div>
        </div>
      </div>

      <div className="at-body">
        {/* ── Category pills ── */}
        <div className="at-categories">
          {CATEGORIES.map(c => (
            <button
              key={c.name}
              className={`at-cat-pill ${activeCategory === c.name ? 'active' : ''}`}
              onClick={() => setActiveCategory(c.name)}
            >{c.label}</button>
          ))}
        </div>

        {/* ── Filter bar ── */}
        <FilterBar
          category={activeCategory}
          filters={filters}
          onChange={setFilters}
        />

        {/* ── Vendors ── */}
        {loading ? (
          <div className="at-loading">
            <div className="at-spinner" />
            <p>Finding available vendors near you...</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="at-empty">
            <span>😔</span>
            <h3>No vendors available right now</h3>
            <p>Check back soon — vendors go live throughout the day!</p>
            <button className="at-browse-btn" onClick={() => navigate('/')}>Browse All Vendors</button>
          </div>
        ) : (
          <div className="at-grid">
            {vendors.map(v => (
              <VendorCard
                key={v._id}
                v={v}
                onClick={() => navigate(`/product/${v._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}