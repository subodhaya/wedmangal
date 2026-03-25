// src/components/ProductCarousel.jsx
import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Link } from 'react-router-dom';
import Loader from './Loader';
import Message from './Message';
import './ProductCarousel.css';

function ProductCarousel() {
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [hoveredId, setHoveredId]     = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef                      = useRef(null);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/api/products/all/top/');
        setProducts(data.slice(0, 12));
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTopProducts();

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredProducts = products.filter(p => p.image !== '/images/placeholder.png');
  const itemsPerSlide    = windowWidth < 576 ? 1 : windowWidth < 992 ? 2 : 4;

  const slides = [];
  for (let i = 0; i < filteredProducts.length; i += itemsPerSlide) {
    slides.push(filteredProducts.slice(i, i + itemsPerSlide));
  }

  // ── Auto-scroll (fixed: no stale closure) ─────────────────
  useEffect(() => {
    if (slides.length <= 1) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % slides.length);
    }, 3800);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  const goTo = (i) => {
    setActiveIndex(i);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % slides.length);
    }, 3800);
  };

  const goPrev = () => goTo((activeIndex - 1 + slides.length) % slides.length);
  const goNext = () => goTo((activeIndex + 1) % slides.length);

  return (
    <div className="pc-section">
      <div className="pc-bg-pattern" aria-hidden="true" />
      <div className="pc-top-accent" />

      <div className="pc-header">
        <span className="pc-eyebrow">✦ Featured Vendors ✦</span>
        <h2 className="pc-title">Top-Rated Wedding Services</h2>
        <div className="pc-divider">
          <div className="pc-divider-line" />
          <span className="pc-divider-gem">◆</span>
          <div className="pc-divider-line pc-divider-line--right" />
        </div>
      </div>

      {loading ? (
        <div className="pc-loader-wrap"><Loader /></div>
      ) : error ? (
        <div className="pc-error-wrap"><Message variant="danger">{error}</Message></div>
      ) : (
        <div className="pc-wrapper">
          <div className="pc-viewport">
            <div
              className="pc-track"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {slides.map((slide, idx) => (
                <div key={idx} className="pc-slide">
                  {slide.map(product => (
                    <Link
                      key={product._id}
                      to={`/product/${product._id}`}
                      className={`pc-card ${hoveredId === product._id ? 'pc-card--hovered' : ''}`}
                      onMouseEnter={() => setHoveredId(product._id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="pc-img-box">
                        <img
                          src={product.image}
                          alt={product.name}
                          className={`pc-img ${hoveredId === product._id ? 'pc-img--zoom' : ''}`}
                        />
                        <div className={`pc-img-overlay ${hoveredId === product._id ? 'pc-img-overlay--visible' : ''}`} />
                        {product.category && (
                          <span className="pc-badge">
                            {product.category.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>

                      <div className="pc-card-body">
                        <h4 className="pc-card-name">{product.name}</h4>
                        {product.area_name && (
                          <p className="pc-card-area">📍 {product.area_name}</p>
                        )}
                        <div className="pc-card-footer">
                          {product.rating > 0 && (
                            <span className="pc-rating">
                              {'★'.repeat(Math.round(product.rating))}
                              <span className="pc-rating-num"> {Number(product.rating).toFixed(1)}</span>
                            </span>
                          )}
                          <span className="pc-view-btn">View →</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {slides.length > 1 && (
            <>
              <button className="pc-nav pc-nav--prev" onClick={goPrev} aria-label="Previous">‹</button>
              <button className="pc-nav pc-nav--next" onClick={goNext} aria-label="Next">›</button>
            </>
          )}

          {slides.length > 1 && (
            <div className="pc-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={`pc-dot ${i === activeIndex ? 'pc-dot--active' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pc-bottom-accent" />
    </div>
  );
}

export default ProductCarousel;