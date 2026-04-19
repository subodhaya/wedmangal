// src/components/Product.jsx
import React, { useState, useEffect } from 'react';
import { Card, ListGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import Rating from './Rating';
import './Product.css';

function Product({ product }) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo) {
      const wishlists = JSON.parse(localStorage.getItem('wishlists')) || {};
      const userWishlist = wishlists[userInfo._id] || [];
      if (userWishlist.some(item => item._id === product._id)) {
        setIsWishlisted(true);
      }
    }
  }, [product._id]);

  const handleWishlistToggle = () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo) { navigate('/login'); return; }
    let wishlists = JSON.parse(localStorage.getItem('wishlists')) || {};
    let userWishlist = wishlists[userInfo._id] || [];
    if (isWishlisted) {
      userWishlist = userWishlist.filter(item => item._id !== product._id);
    } else {
      userWishlist.push(product);
    }
    wishlists[userInfo._id] = userWishlist;
    localStorage.setItem('wishlists', JSON.stringify(wishlists));
    setIsWishlisted(!isWishlisted);
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
    <Card className="product-card-byc">

      {/* ── Image ── */}
      <Link to={`/product/${product._id}`} className="product-img-link">
        <div className="product-img-box">
          {!imgError ? (
            <Card.Img
              src={`/images/${product.image}`}
              className="product-img"
              onError={() => setImgError(true)}
            />
          ) : (
            /* Placeholder when image fails */
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
          {/* Location */}
<ListGroup variant="flush" className="product-meta">
    <ListGroup.Item className="product-meta-item">
        <span className="meta-icon">📍</span>
        <span className="meta-text">
            {product.area_name
                ? `${product.area_name}, ${product.city}`
                : product.city}
        </span>
    </ListGroup.Item>

    {/* ADD: Price Range */}
    {(product.min_price || product.max_price) && (
        <ListGroup.Item className="product-meta-item">
            <span className="meta-icon">💰</span>
            <span className="meta-text">
                {product.min_price && product.max_price
                    ? `₹${Number(product.min_price).toLocaleString('en-IN')} – ₹${Number(product.max_price).toLocaleString('en-IN')}`
                    : product.min_price
                        ? `From ₹${Number(product.min_price).toLocaleString('en-IN')}`
                        : `Up to ₹${Number(product.max_price).toLocaleString('en-IN')}`
                }
            </span>
        </ListGroup.Item>
    )}

    {/* ADD: Social Links */}
    {(product.instagram_url || product.facebook_url) && (
        <ListGroup.Item className="product-meta-item">
            <span className="meta-icon">🔗</span>
            <span className="meta-text" style={{ display: 'flex', gap: '12px' }}>
                {product.instagram_url && (
                    <a href={product.instagram_url} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#E1306C', fontWeight: 600, textDecoration: 'none' }}>
                        Instagram
                    </a>
                )}
                {product.facebook_url && (
                    <a href={product.facebook_url} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#1877F2', fontWeight: 600, textDecoration: 'none' }}>
                        Facebook
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
              {product.area_name
                ? `${product.area_name}, ${product.city}`
                : product.city}
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
  );
}

export default Product;