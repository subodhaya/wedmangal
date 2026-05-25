// src/screens/WishlistScreen.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Message from '../components/Message';
import api from '../utils/api';
import './WishlistScreen.css';

function WishlistScreen() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo) { navigate('/login?redirect=' + location.pathname); return; }

    api.get('/api/products/wishlist/')
      .then(res => {
        const items = res.data.products ?? res.data ?? [];
        setWishlistItems(items);
        // Sync local cache so Product cards reflect current state
        localStorage.setItem('wishlistIds', JSON.stringify(items.map(i => i._id)));
      })
      .catch(err => console.error('Error loading wishlist:', err))
      .finally(() => setLoading(false));
  }, [navigate, location.pathname]);

  const removeFromWishlistHandler = async (id) => {
    setRemoving(id);
    try {
      await api.delete(`/api/products/wishlist/${id}/`);
      setTimeout(() => {
        setWishlistItems(prev => {
          const updated = prev.filter(item => item._id !== id);
          localStorage.setItem('wishlistIds', JSON.stringify(updated.map(i => i._id)));
          return updated;
        });
        setRemoving(null);
      }, 300);
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      setRemoving(null);
    }
  };

  // Price display helper
  const displayPrice = (price) => {
    const p = Number(price);
    if (!p || p === 0) return 'Contact for Price';
    return `₹${p.toLocaleString('en-IN')}`;
  };

  return (
    <div className="wl-root">

      {/* ── Page header ── */}
      <div className="wl-header">
        <h1 className="wl-title">❤️ My Wishlist</h1>
        <p className="wl-sub">
          {wishlistItems.length > 0
            ? `${wishlistItems.length} vendor${wishlistItems.length > 1 ? 's' : ''} saved`
            : 'Your saved vendors will appear here'}
        </p>
      </div>

      {loading ? (
        <div className="wl-empty">
          <div className="wl-empty-icon" style={{ opacity: 1 }}>⏳</div>
          <p className="wl-empty-sub">Loading your wishlist…</p>
        </div>
      ) : wishlistItems.length === 0 ? (
        <div className="wl-empty">
          <div className="wl-empty-icon">🤍</div>
          <h3 className="wl-empty-title">Nothing saved yet</h3>
          <p className="wl-empty-sub">Browse vendors and tap the heart icon to save them here</p>
          <Link to="/" className="wl-browse-btn">Explore Vendors →</Link>
        </div>
      ) : (
        <div className="wl-grid">
          {wishlistItems.map((item) => (
            <div
              key={item._id}
              className={`wl-card ${removing === item._id ? 'removing' : ''}`}
            >
              {/* Image */}
              <Link to={`/product/${item._id}`} className="wl-img-link">
                <div className="wl-img-box">
                  <img
                    src={item.image?.startsWith('http') ? item.image : `/static/images/${item.image}`}
                    alt={item.name}
                    className="wl-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.objectFit = 'contain';
                      e.target.style.padding = '1rem';
                      e.target.style.background = '#f7f0f4';
                    }}
                  />
                  {/* Category badge */}
                  {item.category && (
                    <span className="wl-badge">
                      {item.category.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </Link>

              {/* Body */}
              <div className="wl-body">
                <Link to={`/product/${item._id}`} className="wl-name-link">
                  <h3 className="wl-name">{item.name}</h3>
                </Link>

                {/* Location */}
                {(item.area_name || item.city) && (
                  <p className="wl-location">
                    📍 {item.area_name ? `${item.area_name}, ${item.city}` : item.city}
                  </p>
                )}

                {/* Price */}
                <p className={`wl-price ${(!item.price || Number(item.price) === 0) ? 'contact' : ''}`}>
                  {displayPrice(item.price)}
                </p>

                {/* Actions */}
                <div className="wl-actions">
                  <Link to={`/product/${item._id}`} className="wl-view-btn">
                    View Services →
                  </Link>
                  <button
                    className="wl-remove-btn"
                    onClick={() => removeFromWishlistHandler(item._id)}
                    aria-label="Remove from wishlist"
                    title="Remove from wishlist"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Back link */}
      {wishlistItems.length > 0 && (
        <div className="wl-footer">
          <Link to="/" className="wl-back-link">← Continue browsing vendors</Link>
        </div>
      )}
    </div>
  );
}

export default WishlistScreen;