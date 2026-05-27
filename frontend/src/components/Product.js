// src/components/Product.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Card, ListGroup } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Rating from './Rating';
import api from '../utils/api';
import './Product.css';

function VideoModal({ videoUrl, videoThumb, vendorName, onClose }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(92vw, 390px)',
          aspectRatio: '9/16',
          maxHeight: '88svh',
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#000',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          poster={videoThumb || undefined}
          autoPlay muted loop playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onClick={() => {
            const v = videoRef.current;
            if (v.paused) { v.play(); setPlaying(true); }
            else          { v.pause(); setPlaying(false); }
          }}
        />

        {/* Pause overlay */}
        {!playing && (
          <div
            onClick={() => { videoRef.current.play(); setPlaying(true); }}
            style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 2,
            }}
          >
            <div style={{
              background: 'rgba(0,0,0,0.5)', borderRadius: '50%',
              width: 68, height: 68,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: '#fff',
            }}>▶</div>
          </div>
        )}

        {/* Bottom gradient */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
          background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)',
          padding: '60px 14px 14px',
        }}>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{vendorName}</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { const v = videoRef.current; v.muted = !v.muted; setMuted(v.muted); }}
              style={{
                background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
                width: 36, height: 36, fontSize: 16, cursor: 'pointer', color: '#fff',
              }}
            >{muted ? '🔇' : '🔊'}</button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 4,
            background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
            width: 34, height: 34, fontSize: 18, color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}
        >✕</button>
      </div>
    </div>
  );
}

function Product({ product }) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const hasVideo = !!(product.video_url);

  // Check wishlist state from localStorage cache on mount (fast, no API call per card)
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo) return;
    const cache = JSON.parse(localStorage.getItem('wishlistIds')) || [];
    setIsWishlisted(cache.includes(product._id));
  }, [product._id]);

  const handleWishlistToggle = async () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo) { navigate('/login?redirect=' + location.pathname); return; }

    const next = !isWishlisted;
    setIsWishlisted(next);

    const cache = JSON.parse(localStorage.getItem('wishlistIds')) || [];
    const updated = next
      ? [...new Set([...cache, product._id])]
      : cache.filter(id => id !== product._id);
    localStorage.setItem('wishlistIds', JSON.stringify(updated));

    try {
      if (next) {
        await api.post('/api/products/wishlist/', { product_id: product._id });
      } else {
        await api.delete(`/api/products/wishlist/${product._id}/`);
      }
    } catch (err) {
      setIsWishlisted(!next);
      const reverted = next
        ? cache.filter(id => id !== product._id)
        : [...new Set([...cache, product._id])];
      localStorage.setItem('wishlistIds', JSON.stringify(reverted));
      console.error('Wishlist error:', err);
    }
  };

  const truncateText = (text, length) => {
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  const displayPrice = () => {
    const p = Number(product.price);
    if (!p || p === 0) return 'Contact for Price';
    return `₹${p.toLocaleString('en-IN')}`;
  };

  const isPriceFree = !product.price || Number(product.price) === 0;

  return (
    <>
      <Card className="product-card-byc">

        {/* ── Image ── */}
        <Link to={`/product/${product._id}`} className="product-img-link">
          <div className="product-img-box">
            {!imgError ? (
              <Card.Img
                src={`/static/images/${product.image}`}
                className="product-img"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="product-img-placeholder">
                <div className="placeholder-icon">🏮</div>
                <span className="placeholder-text">{product.category?.replace(/_/g, ' ') || 'Wedding Vendor'}</span>
              </div>
            )}

            {/* Category badge */}
            {product.category && (
              <span className="product-category-badge">
                {product.category.replace(/_/g, ' ')}
              </span>
            )}

            {/* Video badge — bottom-left */}
            {hasVideo && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setVideoOpen(true); }}
                className="product-video-badge"
                aria-label="Watch vendor reel"
              >
                ▶ Reel
              </button>
            )}

            {/* Location */}
            <ListGroup variant="flush" className="product-meta">
              <ListGroup.Item className="product-meta-item">
                <span className="meta-icon">📍</span>
                <span className="meta-text">
                  {product.area_name ? `${product.area_name}, ${product.city}` : product.city}
                </span>
              </ListGroup.Item>
              {(product.min_price || product.max_price) && (
                <ListGroup.Item className="product-meta-item">
                  <span className="meta-icon">💰</span>
                  <span className="meta-text">
                    {product.min_price && product.max_price
                      ? `₹${Number(product.min_price).toLocaleString('en-IN')} – ₹${Number(product.max_price).toLocaleString('en-IN')}`
                      : product.min_price
                        ? `From ₹${Number(product.min_price).toLocaleString('en-IN')}`
                        : `Up to ₹${Number(product.max_price).toLocaleString('en-IN')}`}
                  </span>
                </ListGroup.Item>
              )}
              {(product.instagram_url || product.website_url) && (
                <ListGroup.Item className="product-meta-item">
                  <span className="meta-icon">🔗</span>
                  <span className="meta-text" style={{ display: 'flex', gap: '12px' }}>
                    {product.instagram_url && (
                      <a href={product.instagram_url} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#E1306C', fontWeight: 600, textDecoration: 'none' }}>
                        Instagram
                      </a>
                    )}
                    {product.website_url && (
                      <a href={product.website_url} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#5e143f', fontWeight: 600, textDecoration: 'none' }}>
                        Website
                      </a>
                    )}
                  </span>
                </ListGroup.Item>
              )}
            </ListGroup>

            {/* Price chip */}
            <span className={`product-price-chip ${isPriceFree ? 'price-contact' : 'price-paid'}`}>
              {displayPrice()}
            </span>
          </div>
        </Link>

        {/* ── Body ── */}
        <Card.Body className="product-body">

          {/* Wishlist */}
          <button
            onClick={handleWishlistToggle}
            className="product-wishlist-btn"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <i className={`fa-heart ${isWishlisted ? 'fas' : 'far'} product-heart ${isWishlisted ? 'wishlisted' : ''}`} />
          </button>

          {/* Name */}
          <Link to={`/product/${product._id}`} className="text-decoration-none">
            <Card.Title className="product-name">
              {truncateText(product.name, 36)}
            </Card.Title>
          </Link>

          {/* Rating */}
          <Card.Text as="div" className="product-rating-row">
            <Rating
              value={product.average_rating}
              text={`${product.total_num_reviews} reviews`}
              color={'#c9973a'}
            />
          </Card.Text>

          <div className="product-divider" />

          {/* Location */}
          <ListGroup variant="flush" className="product-meta">
            <ListGroup.Item className="product-meta-item">
              <span className="meta-icon">📍</span>
              <span className="meta-text">
                {product.area_name ? `${product.area_name}, ${product.city}` : product.city}
              </span>
            </ListGroup.Item>
          </ListGroup>

          {/* CTA */}
          <Link to={`/product/${product._id}`} className="text-decoration-none">
            <button className="product-cta-btn">
              View Services <span className="cta-arrow">→</span>
            </button>
          </Link>

        </Card.Body>
      </Card>

      {/* ── Video Modal ── */}
      {videoOpen && (
        <VideoModal
          videoUrl={product.video_url}
          videoThumb={product.video_thumb || null}
          vendorName={product.name}
          onClose={() => setVideoOpen(false)}
        />
      )}
    </>
  );
}

export default Product;
