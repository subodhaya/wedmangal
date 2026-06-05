import { Link, useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Carousel } from 'react-bootstrap';
import Rating from '../components/Rating';
import Loader from '../components/Loader';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './ProductScreen.css';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useLocation } from 'react-router-dom';
import ClaimButton from '../components/ClaimButton';
import SlotPicker from '../components/SlotPicker';
import { Helmet } from 'react-helmet-async'; 

const debounce = (func, delay) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => func.apply(null, args), delay); };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatPrice = (price) => {
  if (!price || Number(price) === 0) return null;
  return `₹${Number(price).toLocaleString('en-IN')}`;
};

const formatTime = (t) => {
  if (!t || t === 'null' || t === 'undefined') return 'By Appointment';
  return t.slice(0, 5);
};

const normalizePhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned || cleaned === '0000') return '';
  if (cleaned.startsWith('0') && cleaned.length >= 10) return '91' + cleaned.slice(1);
  if (cleaned.length === 10) return '91' + cleaned;
  return cleaned;
};

// ── PhoneBlock ────────────────────────────────────────────────────────────────
const PhoneBlock = ({ label, phone, businessName }) => {
  if (!phone) return null;
  const clean = normalizePhone(phone);
  if (!clean) return null;
  const msg = encodeURIComponent(
    `Hi, I found you on WedMangal! I'm interested in your ${businessName || ''} services. Can you please share more details?`
  );
  return (
    <div className="ps-phone-row">
      <div className="ps-phone-info">
        <span className="ps-phone-label">{label}</span>
        <span className="ps-phone-number">{phone}</span>
      </div>
      <div className="ps-phone-actions">
        <a href={`tel:${clean}`} className="ps-contact-btn ps-call-btn" title="Call">
          <i className="fas fa-phone-alt"></i>
        </a>
        <a
          href={`https://wa.me/${clean}?text=${msg}`}
          target="_blank" rel="noreferrer"
          className="ps-contact-btn ps-wa-btn" title="WhatsApp"
        >
          <i className="fab fa-whatsapp"></i>
        </a>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
function ProductScreen() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct]                       = useState(null);
  const [loading, setLoading]                       = useState(true);
  const [error, setError]                           = useState('');
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [selectedDates, setSelectedDates]           = useState({});
  const [bookedDates, setBookedDates]               = useState({});
  const [selectedStartTimes, setSelectedStartTimes] = useState({});
  const [selectedDurations, setSelectedDurations]   = useState({});
  const [selectedEndTimes, setSelectedEndTimes]     = useState({});
  const [reviewData, setReviewData]                 = useState({});
  const [reviewState, setReviewState]               = useState({});
  const [reviewedServices, setReviewedServices]     = useState({});
  const [expandedCalendar, setExpandedCalendar]     = useState(null);
  const [errorMessage, setErrorMessage]             = useState('');
  const videoRef                                    = useRef(null);
  const [videoPlaying, setVideoPlaying]             = useState(true);
  const [videoMuted, setVideoMuted]                 = useState(true);
  const [videoIndex, setVideoIndex]                 = useState(0);

  const userInfo = (() => {
    try { return JSON.parse(localStorage.getItem('userInfo')) || null; }
    catch { return null; }
  })();

  // ── Fetch product ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await api.get(`/api/products/${id}/`);
        const normalized = {
          ...data,
          services: (data.services || []).map(s => ({ ...s, reviews: s.reviews || [] })),
        };
        setProduct(normalized);

        if (userInfo?._id) {
          const reviewed = {};
          normalized.services.forEach(svc => {
            const already = svc.reviews.some(
              r => r.user === userInfo.name
                || r.user === `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim()
            );
            if (already) reviewed[svc._id] = true;
          });
          setReviewedServices(reviewed);
        }
      } catch (err) {
        const status = err.response?.status;
        if (status === 404 || status === 500) {
          setError('This vendor could not be found. They may have been removed or the link is incorrect.');
        } else {
          setError('Failed to load vendor. Please check your connection and try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  useEffect(() => {
    if (product?.services)
      product.services.forEach(s => fetchBookedDates(s._id));
  }, [product]);

  useEffect(() => {
    setSelectedDates({});
    setSelectedStartTimes({});
    setSelectedDurations({});
  }, [location.pathname]);

  const fetchBookedDates = async (serviceId) => {
    try {
      const { data } = await api.get(`/api/products/bookings/${serviceId}/dates`);
      const formatted = (data.booked_dates || []).map(d => new Date(d).toISOString().split('T')[0]);
      setBookedDates(prev => ({ ...prev, [serviceId]: formatted }));
    } catch {}
  };

  // ── Cart & booking ────────────────────────────────────────────────────────
  const buildItem = (serviceId) => {
    const service = product.services.find(s => s._id === serviceId);
    return {
      userId:      userInfo._id,
      service:     serviceId,
      name:        service.name,
      image:       service.images?.[0]?.image || product.image,
      price:       service.price,
      qty:         selectedQuantities[serviceId] || 1,
      bookingDate: selectedDates[serviceId].toLocaleDateString('en-CA'),
      startTime:   selectedStartTimes[serviceId] || '',
      endTime:     selectedEndTimes[serviceId]   || '',
      duration:    selectedDurations[serviceId]  || '',
    };
  };

  const addToCartHandler = (serviceId) => {
  if (!userInfo) return navigate('/login?redirect=' + location.pathname);
  if (!selectedDates[serviceId])      { setErrorMessage('Please select a booking date.'); return; }
  if (!selectedStartTimes[serviceId]) { setErrorMessage('Please select a start time.'); return; }

  const item = buildItem(serviceId);
  const cart = JSON.parse(localStorage.getItem('cartItems')) || [];
  const exists = cart.find(x => x.service === serviceId && x.userId === userInfo._id);
  localStorage.setItem('cartItems', JSON.stringify(
    exists ? cart.map(x => x.service === serviceId ? item : x) : [...cart, item]
  ));

  // ── Save provider contact for WhatsApp notification later ──
  localStorage.setItem('bookingProviderPhone', product.business_phone || product.personal_phone || '');
  localStorage.setItem('bookingProviderName',  product.name || '');

  navigate('/cart');
};

const handleDirectBooking = async (serviceId) => {
  if (!userInfo) return navigate('/login?redirect=' + location.pathname);
  if (!selectedDates[serviceId])      { setErrorMessage('Please select a booking date.'); return; }
  if (!selectedStartTimes[serviceId]) { setErrorMessage('Please select a start time.'); return; }

  const item = buildItem(serviceId);
  try {
    await api.post('/api/products/cart/', { items: [item] }, {
      headers: { Authorization: `Bearer ${userInfo.token}` },
    });
    localStorage.setItem('directBookingItem', JSON.stringify(item));

    // ── Save provider contact for WhatsApp notification later ──
    localStorage.setItem('bookingProviderPhone', product.business_phone || product.personal_phone || '');
    localStorage.setItem('bookingProviderName',  product.name || '');

    navigate('/location');
  } catch {
    setErrorMessage('Error occurred while booking. Please try again.');
  }
};

  const handleDateChange = (serviceId, date) => {
    const blocked = bookedDates[serviceId]?.some(
      d => new Date(d).toDateString() === date.toDateString()
    );
    if (blocked) { setErrorMessage('This date is not available.'); return; }
    setSelectedDates(prev => ({ ...prev, [serviceId]: date }));
  };

  // ── Reviews ───────────────────────────────────────────────────────────────
  const handleReviewChange = useCallback(
    debounce((serviceId, field, value) => {
      setReviewData(prev => ({ ...prev, [serviceId]: { ...prev[serviceId], [field]: value } }));
    }, 300), []
  );

  const submitReviewHandler = async (e, serviceId) => {
    e.preventDefault();
    if (!userInfo) return navigate('/login?redirect=' + location.pathname);
    const { rating, comment } = reviewData[serviceId] || {};
    if (!rating) {
      setReviewState(prev => ({ ...prev, [serviceId]: { loading: false, success: false, error: 'Rating is required' } }));
      return;
    }
    setReviewState(prev => ({ ...prev, [serviceId]: { loading: true, success: false, error: '' } }));
    try {
      const { data: json } = await api.post(`/api/products/${serviceId}/reviews/`,
        { rating, comment: comment?.trim() || '' },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      setProduct(prev => ({
        ...prev,
        services: prev.services.map(s =>
          s._id === serviceId ? { ...s, reviews: [json.review, ...s.reviews] } : s
        ),
      }));
      setReviewedServices(prev => ({ ...prev, [serviceId]: true }));
      setReviewState(prev => ({ ...prev, [serviceId]: { loading: false, success: true, error: '' } }));
      setReviewData(prev => ({ ...prev, [serviceId]: { rating: 0, comment: '' } }));
      setTimeout(() => setReviewState(prev => ({ ...prev, [serviceId]: { ...prev[serviceId], success: false } })), 3000);
    } catch (err) {
      setReviewState(prev => ({ ...prev, [serviceId]: { loading: false, success: false, error: err.message } }));
    }
  };

  const tileClassName = ({ date, view }, serviceId) => {
    if (view !== 'month') return null;
    const ds = date.toISOString().split('T')[0];
    return bookedDates[serviceId]?.includes(ds) ? 'booked-date' : 'available-date';
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    
   <div className="ps-page">
      {product && (
        <Helmet>
          <title>{`${product.name} | ${(product.category || '').replace(/_/g, ' ')} in ${product.city || ''} | WedMangal`}</title>
          <meta name="description" content={product.description?.slice(0, 155) || `Book ${product.name}, a trusted ${product.category?.replace(/_/g, ' ')} in ${product.city}. View services, pricing and reviews on WedMangal.`} />
          <link rel="canonical" href={`https://www.wedmangal.com/product/${product._id}`} />

          <meta property="og:type" content="business.business" />
          <meta property="og:title" content={`${product.name} | WedMangal`} />
          <meta property="og:description" content={product.description?.slice(0, 155)} />
          <meta property="og:image" content={`https://www.wedmangal.com/static/images/${product.image}`} />
          <meta property="og:url" content={`https://www.wedmangal.com/product/${product._id}`} />
          <meta property="og:site_name" content="WedMangal" />

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={`${product.name} | WedMangal`} />
          <meta name="twitter:description" content={product.description?.slice(0, 155)} />
          <meta name="twitter:image" content={`https://www.wedmangal.com/static/images/${product.image}`} />

          <script type="application/ld+json">{JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: product.name,
            description: product.description,
            url: `https://www.wedmangal.com/product/${product._id}`,
            image: `https://www.wedmangal.com/static/images/${product.image}`,
            telephone: product.business_phone || product.personal_phone,
            address: {
              '@type': 'PostalAddress',
              streetAddress: product.address || product.area_name || '',
              addressLocality: product.city || 'Chennai',
              addressRegion: 'Tamil Nadu',
              addressCountry: 'IN',
            },
            areaServed: product.city || 'Chennai',
            priceRange: product.min_price ? `₹${product.min_price}${product.max_price ? ` – ₹${product.max_price}` : '+'}` : undefined,
            ...(product.services?.some(s => s.numReviews > 0) && {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: product.services.reduce((sum, s) => sum + (s.average_rating || 0), 0) / product.services.filter(s => s.numReviews > 0).length || undefined,
                reviewCount: product.services.reduce((sum, s) => sum + (s.numReviews || 0), 0),
                bestRating: 5,
                worstRating: 1,
              }
            }),
            sameAs: [`https://www.wedmangal.com/product/${product._id}`],
          })}</script>
        </Helmet>
      )}

      <Link to="/" className="ps-back-btn">
        <i className="fas fa-arrow-left"></i> Go Back
      </Link>

      {errorMessage && <div className="ps-alert ps-alert-danger">{errorMessage}</div>}

      {loading ? (
        <Loader />
      ) : error ? (
        <div className="ps-alert ps-alert-danger">{error}</div>
      ) : product ? (
        <>


          {/* ── Video Player (TikTok style) ──────────────────────── */}
          {product.videos?.length > 0 && (() => {
            const allVideos = product.videos;
            const cur   = allVideos[videoIndex] || allVideos[0];
            const total = allVideos.length;
            const goPrev = () => { setVideoIndex(i => (i - 1 + total) % total); setVideoPlaying(true); };
            const goNext = () => { setVideoIndex(i => (i + 1) % total); setVideoPlaying(true); };
            const svcWithRating = (product.services || []).filter(s => s.numReviews > 0);
            const avgRating = svcWithRating.length
              ? (svcWithRating.reduce((sum, s) => sum + (Number(s.rating) || 0), 0) / svcWithRating.length).toFixed(1)
              : null;
            const totalReviews = (product.services || []).reduce((sum, s) => sum + (s.numReviews || 0), 0);
            return (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '430px', aspectRatio: '9 / 16', maxHeight: '85svh', overflow: 'hidden', borderRadius: '16px', background: '#000', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                  <video
                    key={cur._id}
                    ref={videoRef}
                    src={cur.video_url}
                    poster={cur.video_thumb || undefined}
                    autoPlay muted loop playsInline
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    onClick={() => {
                      const v = videoRef.current;
                      if (v.paused) { v.play(); setVideoPlaying(true); }
                      else          { v.pause(); setVideoPlaying(false); }
                    }}
                  />

                  {/* Pause overlay */}
                  {!videoPlaying && (
                    <div onClick={() => { videoRef.current.play(); setVideoPlaying(true); }}
                      style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                      <div style={{ background: 'rgba(0,0,0,0.45)', borderRadius: '50%', width: '68px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#fff' }}>▶</div>
                    </div>
                  )}

                  {/* Prev / Next for multi-video */}
                  {total > 1 && (
                    <>
                      <button onClick={goPrev} style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '20px', cursor: 'pointer', zIndex: 3 }}>‹</button>
                      <button onClick={goNext} style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '20px', cursor: 'pointer', zIndex: 3 }}>›</button>
                    </>
                  )}

                  {/* Bottom gradient overlay */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.65) 100%)', padding: '80px 16px 10px', zIndex: 2 }}>
                    {/* Vendor name */}
                    <div style={{ color: '#fff', fontSize: '15px', fontWeight: 500, marginBottom: '2px', lineHeight: 1.3 }}>{product.name}</div>
                    {/* Category · City */}
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '10px' }}>
                      {[product.category?.replace(/_/g, ' '), product.city].filter(Boolean).join(' · ')}
                    </div>
                    {/* Rating row + dots + Mute */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {avgRating && (
                          <span style={{ color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ color: '#FFD700' }}>★</span>
                            {avgRating}
                            {totalReviews > 0 && <span style={{ opacity: 0.7 }}>({totalReviews})</span>}
                          </span>
                        )}
                        {total > 1 && (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {allVideos.map((_, i) => (
                              <button key={i} onClick={() => { setVideoIndex(i); setVideoPlaying(true); }}
                                style={{ width: i === videoIndex ? '18px' : '6px', height: '6px', borderRadius: '3px', background: i === videoIndex ? '#fff' : 'rgba(255,255,255,0.4)', border: 'none', padding: 0, cursor: 'pointer', transition: 'width 0.2s' }} />
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => { const v = videoRef.current; v.muted = !v.muted; setVideoMuted(v.muted); }}
                        style={{ background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '16px', cursor: 'pointer', color: '#fff', flexShrink: 0 }}
                      >
                        {videoMuted ? '🔇' : '🔊'}
                      </button>
                    </div>
                    {/* Scroll hint */}
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '11px', letterSpacing: '0.03em' }}>scroll for more ↓</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Vendor Info Bar ──────────────────────────────────── */}
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px 0 8px' }}>

            {/* Avatar + Name + Category */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              {product.image ? (
                <img src={product.image} alt={product.name}
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(0,0,0,0.08)' }} />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f3e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>🏪</div>
              )}
              <div>
                <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>{product.name}</h1>
                <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  {product.category && (
                    <span className="ps-category-badge">🎊 {product.category.replace(/_/g, ' ')}</span>
                  )}
                  {product.city && (
                    <span style={{ fontSize: '12px', color: '#777' }}>📍 {product.city}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#555', lineHeight: 1.6 }}>{product.description}</p>
            )}

            {/* Phone blocks */}
            {product.business_phone && (
              <PhoneBlock label="📞 Business Phone" phone={product.business_phone} businessName={product.name} />
            )}
            {product.personal_phone && product.personal_phone !== product.business_phone && (
              <PhoneBlock label="📱 Personal Phone" phone={product.personal_phone} businessName={product.name} />
            )}

            {/* Info grid */}
            <div className="ps-info-grid" style={{ marginTop: '8px' }}>

              {product.area_name && (
                <div className="ps-info-item">
                  <span className="ps-info-icon">📍</span>
                  <div><div className="ps-info-label">Area</div><div className="ps-info-value">{product.area_name}</div></div>
                </div>
              )}

              {product.address && (
                <div className="ps-info-item">
                  <span className="ps-info-icon">🏠</span>
                  <div><div className="ps-info-label">Address</div><div className="ps-info-value">{product.address}</div></div>
                </div>
              )}

              <div className="ps-info-item">
                <span className="ps-info-icon">⏰</span>
                <div>
                  <div className="ps-info-label">Working Hours</div>
                  <div className={`ps-info-value ${!product.opening_time ? 'appointment' : ''}`}>
                    {product.opening_time && product.opening_time !== 'null'
                      ? `${formatTime(product.opening_time)} – ${formatTime(product.closing_time)}`
                      : 'By Appointment'}
                  </div>
                </div>
              </div>

              {(product.min_price || product.max_price) && (
                <div className="ps-info-item">
                  <span className="ps-info-icon">💰</span>
                  <div>
                    <div className="ps-info-label">Price Range</div>
                    <div className="ps-info-value">
                      {product.min_price && product.max_price
                        ? `₹${Number(product.min_price).toLocaleString('en-IN')} – ₹${Number(product.max_price).toLocaleString('en-IN')}`
                        : product.min_price
                          ? `From ₹${Number(product.min_price).toLocaleString('en-IN')}`
                          : `Up to ₹${Number(product.max_price).toLocaleString('en-IN')}`
                      }
                    </div>
                  </div>
                </div>
              )}

              {(product.instagram_url || product.website_url) && (
                <div className="ps-info-item">
                  <span className="ps-info-icon">🔗</span>
                  <div style={{ width: '100%' }}>
                    <div className="ps-info-label">Social Media</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                      {product.instagram_url && (
                        <a href={product.instagram_url} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#E1306C', fontWeight: 600, textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                          <i className="fab fa-instagram"></i>
                          {(() => { try { return new URL(product.instagram_url).hostname.replace('www.', ''); } catch { return product.instagram_url; } })()}
                        </a>
                      )}
                      {product.website_url && (
                        <a href={product.website_url} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#5e143f', fontWeight: 600, textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                          <i className="fas fa-globe"></i>
                          {(() => { try { return new URL(product.website_url).hostname.replace('www.', ''); } catch { return product.website_url; } })()}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="ps-info-item ps-claim-row">
                <ClaimButton product={product} />
              </div>

            </div>
          </div>

          {/* ── Services ─────────────────────────────────────────── */}
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 className="ps-section-title">✨ Services Offered</h2>

          <Row>
            {product.services?.map((service) => {
              const priceFormatted = formatPrice(service.price);
              const isCalOpen      = expandedCalendar === service._id;
              const dateSelected   = selectedDates[service._id];
              const timeSelected   = selectedStartTimes[service._id];
              const canBook        = !!dateSelected && !!timeSelected && !!selectedEndTimes[service._id];

              return (
                <Col key={service._id} md={6}>
                  <div className="ps-service-card">

                    {/* Service Header */}
                    <div className="ps-service-header">
                      <h3 className="ps-service-name">{service.name}</h3>
                      <div className="ps-service-rating">
                        ⭐ {Number(service.rating || 0).toFixed(1)}
                        <span style={{ opacity: 0.7 }}>({service.numReviews})</span>
                      </div>
                    </div>

                    {/* Images */}
                    <div className="ps-carousel-wrap">
                      {service.images?.length > 0 ? (
                        <Carousel interval={null}>
                          {service.images.map(img => (
                            <Carousel.Item key={img._id || img.image}>
                              <img
                                className="d-block w-100"
                                src={img.image}
                                alt={service.name}
                                style={{ maxHeight: '260px', objectFit: 'contain' }}
                              />
                            </Carousel.Item>
                          ))}
                        </Carousel>
                      ) : (
                        <div className="ps-no-image">📷</div>
                      )}
                    </div>

                    <div className="ps-service-body">

                      {/* Description */}
                      {service.description && (
                        <p className="ps-service-desc">{service.description}</p>
                      )}

                      {/* Price */}
                      <div className="ps-price-row">
                        <span className="ps-price-label">Price</span>
                        {priceFormatted ? (
                          <span className="ps-price-value">{priceFormatted}</span>
                        ) : (
                          <span className="ps-price-value contact">📞 Contact for Price</span>
                        )}
                      </div>

                      {/* ── Booking ── */}
                      <div className="ps-booking-section">
                        <div className="ps-booking-title">📅 Select Date & Time</div>

                        <button
                          className={`ps-cal-toggle ${isCalOpen ? 'active' : ''}`}
                          onClick={() => setExpandedCalendar(isCalOpen ? null : service._id)}
                        >
                          {dateSelected
                            ? `📅 ${dateSelected.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} — Change Date`
                            : '📅 Pick a Date'}
                        </button>

                        {isCalOpen && (
                          <>
                            <div className="ps-legend">
                              <div className="ps-legend-item">
                                <div className="ps-legend-dot booked"></div> Not available
                              </div>
                              <div className="ps-legend-item">
                                <div className="ps-legend-dot available"></div> Available
                              </div>
                            </div>
                            <Calendar
                              onChange={(date) => {
                                handleDateChange(service._id, date);
                                setExpandedCalendar(null);
                              }}
                              value={dateSelected || new Date()}
                              minDate={new Date()}
                              tileClassName={props => tileClassName(props, service._id)}
                              tileDisabled={({ date }) =>
                                bookedDates[service._id]?.some(
                                  d => new Date(d).toDateString() === date.toDateString()
                                ) || date < new Date()
                              }
                            />
                          </>
                        )}

                        {dateSelected && (
                          <div className="ps-slot-wrap">
                            <SlotPicker
                              selectedTime={selectedStartTimes[service._id] || ''}
                              selectedEndTime={selectedEndTimes[service._id] || ''}
                              onTimeChange={(time) => setSelectedStartTimes(prev => ({ ...prev, [service._id]: time }))}
                              onEndTimeChange={(time) => setSelectedEndTimes(prev => ({ ...prev, [service._id]: time }))}
                            />
                          </div>
                        )}
                      </div>

                      {/* ── Buttons ── */}
                      <div className="ps-btn-row">
                        <button
                          className="ps-btn ps-btn-shortlist"
                          onClick={() => addToCartHandler(service._id)}
                          disabled={!canBook}
                          title={!canBook ? 'Select date and time first' : ''}
                        >
                          🔖 Shortlist
                        </button>
                        <button
                          className="ps-btn ps-btn-book"
                          onClick={() => handleDirectBooking(service._id)}
                          disabled={!canBook}
                          title={!canBook ? 'Select date and time first' : ''}
                        >
                          ✨ Book Now
                        </button>
                      </div>

                      {/* ── Reviews ── */}
                      <div className="ps-reviews-section">
                        <div className="ps-reviews-title">💬 Customer Reviews</div>

                        {service.reviews?.length === 0 ? (
                          <div className="ps-no-reviews">No reviews yet — be the first!</div>
                        ) : (
                          service.reviews.map(review => (
                            <div key={review._id} className="ps-review-card">
                              <div className="ps-review-header">
                                <span className="ps-reviewer-name">{review.user}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Rating value={review.rating} color="#f8e825" />
                                  <span className="ps-review-date">
                                    {review.createdAt
                                      ? new Date(review.createdAt).toLocaleDateString('en-IN')
                                      : ''}
                                  </span>
                                </div>
                              </div>
                              <p className="ps-review-comment">
                                {review.comment || <em style={{ opacity: 0.6 }}>No comment provided.</em>}
                              </p>
                            </div>
                          ))
                        )}

                        {/* Write a Review */}
                        <div className="ps-write-review">
                          <div className="ps-write-review-title">✍️ Write a Review</div>

                          {!userInfo ? (
                            <div className="ps-login-prompt">
                              Please <Link to="/login">sign in</Link> to write a review
                            </div>
                          ) : reviewedServices[service._id] ? (
                            <div className="ps-reviewed-badge">
                              ✅ You've already reviewed this service. Thank you!
                            </div>
                          ) : (
                            <form onSubmit={e => submitReviewHandler(e, service._id)}>
                              <div className="ps-form-group">
                                <label className="ps-form-label">Rating</label>
                                <select
                                  className="ps-select"
                                  value={reviewData[service._id]?.rating || ''}
                                  onChange={e => handleReviewChange(service._id, 'rating', e.target.value)}
                                >
                                  <option value="">Select rating...</option>
                                  <option value="1">⭐ 1 – Poor</option>
                                  <option value="2">⭐⭐ 2 – Fair</option>
                                  <option value="3">⭐⭐⭐ 3 – Good</option>
                                  <option value="4">⭐⭐⭐⭐ 4 – Very Good</option>
                                  <option value="5">⭐⭐⭐⭐⭐ 5 – Excellent</option>
                                </select>
                              </div>

                              <div className="ps-form-group">
                                <label className="ps-form-label">Comment (optional)</label>
                                <textarea
                                  className="ps-textarea"
                                  rows="3"
                                  placeholder="Share your experience..."
                                  value={reviewData[service._id]?.comment || ''}
                                  onChange={e => setReviewData(prev => ({
                                    ...prev,
                                    [service._id]: { ...prev[service._id], comment: e.target.value }
                                  }))}
                                />
                              </div>

                              {reviewState[service._id]?.success && (
                                <div className="ps-alert ps-alert-success">✅ Review submitted!</div>
                              )}
                              {reviewState[service._id]?.error && (
                                <div className="ps-alert ps-alert-danger">{reviewState[service._id].error}</div>
                              )}
                              {reviewState[service._id]?.loading && <Loader />}

                              <button type="submit" className="ps-submit-btn">Submit Review</button>
                            </form>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
          </div>
        </>
      ) : (
        <div className="ps-alert ps-alert-danger">Product not found</div>
      )}
    </div>
  );
}

export default ProductScreen;