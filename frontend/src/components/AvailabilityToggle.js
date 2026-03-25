// src/components/AvailabilityToggle.js
// Drop inside ManagePage to let vendors toggle availability.
// Usage: <AvailabilityToggle />

import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './AvailabilityToggle.css';

export default function AvailabilityToggle() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [since, setSince]             = useState(null);

  // ── Fetch current status ──────────────────────────────
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await api.get('/api/products/mine/');
        const product = Array.isArray(data) ? data[0] : data?.product || data;
        if (product) {
          setIsAvailable(product.is_available_today || false);
          setSince(product.available_since || null);
        }
      } catch (e) {}
    };
    fetchStatus();
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/products/toggle-availability/');
      setIsAvailable(data.is_available_today);
      setSince(data.available_since);
    } catch (e) {
      alert('Could not update availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sinceText = since
    ? new Date(since).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={`av-wrap ${isAvailable ? 'av-on' : 'av-off'}`}>
      <div className="av-left">
        <div className="av-icon">{isAvailable ? '🟢' : '⚪'}</div>
        <div className="av-text">
          <span className="av-label">
            {isAvailable ? 'Available Today' : 'Not Available Today'}
          </span>
          <span className="av-hint">
            {isAvailable
              ? `Customers can book you instantly · since ${sinceText}`
              : 'Turn on to appear in "Available Today" section'}
          </span>
        </div>
      </div>
      <button
        className={`av-btn ${isAvailable ? 'av-btn-off' : 'av-btn-on'}`}
        onClick={handleToggle}
        disabled={loading}
      >
        {loading ? '...' : isAvailable ? 'Turn Off' : 'Go Live 🚀'}
      </button>
    </div>
  );
}