// src/screens/WishlistScreen.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Message from '../components/Message';
import api from '../utils/api';
import './WishlistScreen.css';

function WishlistScreen() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [removing, setRemoving] = useState(null); // id of item being removed
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo) {
      const wishlists = JSON.parse(localStorage.getItem('wishlists')) || {};
      const userWishlist = wishlists[userInfo._id] || [];
      setWishlistItems(userWishlist);
    } else {
      navigate('/login?redirect=' + location.pathname);
    }
  }, [navigate, location.pathname]);

  const removeFromWishlistHandler = (id) => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    setRemoving(id);
    setTimeout(() => {
      const updatedWishlist = wishlistItems.filter((item) => item._id !== id);
      setWishlistItems(updatedWishlist);
      const allWishlists = JSON.parse(localStorage.getItem('wishlists')) || {};
      allWishlists[userInfo._id] = updatedWishlist;
      localStorage.setItem('wishlists', JSON.stringify(allWishlists));
      syncWishlist(updatedWishlist, userInfo.token);
      setRemoving(null);
    }, 300);
  };

  const syncWishlist = async (updatedWishlist, token) => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await api.post(
        '/api/products/wishlist/',
        { items: { [userInfo._id]: updatedWishlist } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error syncing wishlist:', error);
    }
  };

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const wishlists = JSON.parse(localStorage.getItem('wishlists')) || {};
    if (userInfo && wishlists[userInfo._id]?.length > 0) {
      syncWishlist(wishlists[userInfo._id], userInfo.token);
    }
  }, [wishlistItems]);

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

      {wishlistItems.length === 0 ? (
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
                    src={`/images/${item.image}`}
                    alt={item.name}
                    className="wl-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/images/placeholder.png';
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