// src/screens/CartScreen.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Message from '../components/Message';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import api from '../utils/api';
import './CartScreen.css';

function CartScreen() {
  const [cartItems, setCartItems]         = useState([]);
  const [editingDateFor, setEditingDateFor] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage]     = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo) {
      const items         = JSON.parse(localStorage.getItem('cartItems')) || [];
      const userCartItems = items.filter(item => item.userId === userInfo._id);
      setCartItems(userCartItems);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (successMessage || errorMessage) {
      const t = setTimeout(() => { setSuccessMessage(''); setErrorMessage(''); }, 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage, errorMessage]);

  const removeFromCartHandler = (id) => {
    const userInfo       = JSON.parse(localStorage.getItem('userInfo'));
    const updatedCart    = cartItems.filter((item) => item.service !== id);
    setCartItems(updatedCart);
    const allCartItems         = JSON.parse(localStorage.getItem('cartItems')) || [];
    const updatedAllCartItems  = allCartItems.filter(
      item => !(item.service === id && item.userId === userInfo._id)
    );
    localStorage.setItem('cartItems', JSON.stringify(updatedAllCartItems));
  };

  const checkoutHandler = async () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    if (userInfo) {
      try {
        await api.post('/api/products/cart/', {
          items: cartItems,
          user: userInfo._id,
        }, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        navigate('/location');
      } catch (error) {
        setErrorMessage('Error syncing cart with the database.');
        setSuccessMessage('');
      }
    } else {
      navigate('/login');
    }
  };

  const handleDateChange = (date, service) => {
    const userInfo    = JSON.parse(localStorage.getItem('userInfo'));
    const updatedCart = cartItems.map((x) =>
      x.service === service ? { ...x, bookingDate: date } : x
    );
    setCartItems(updatedCart);
    const allCartItems        = JSON.parse(localStorage.getItem('cartItems')) || [];
    const updatedAllCartItems = allCartItems.map((x) =>
      x.service === service && x.userId === userInfo._id ? { ...x, bookingDate: date } : x
    );
    localStorage.setItem('cartItems', JSON.stringify(updatedAllCartItems));
    console.log(cartItems);
    setEditingDateFor(null);
  };

  const servicesPrice = cartItems.reduce((acc, item) => acc + item.qty * item.price, 0).toFixed(2);
  const shippingPrice = 100;
  const taxPrice      = (servicesPrice * 0.1).toFixed(2);
  const totalPrice    = (parseFloat(servicesPrice) + parseFloat(shippingPrice) + parseFloat(taxPrice)).toFixed(2);
  const totalItems    = cartItems.reduce((acc, item) => acc + item.qty, 0);

  const displayPrice  = (price) => {
    const p = Number(price);
    if (!p || p === 0) return '—';
    return `₹${p.toLocaleString('en-IN')}`;
  };

  return (
    <div className="cs-root">

      {/* Ambient orbs */}
      <div className="cs-orb cs-orb--1" />
      <div className="cs-orb cs-orb--2" />

      {/* Alerts */}
      {successMessage && <div className="cs-alert cs-alert--success">{successMessage}</div>}
      {errorMessage   && <div className="cs-alert cs-alert--danger">{errorMessage}</div>}

      {/* Header */}
      <header className="cs-header">
        <p className="cs-eyebrow">✦ Almost there ✦</p>
        <h1 className="cs-title">Booking Details</h1>
        <div className="cs-header-rule">
          <span /><span className="cs-diamond">◆</span><span />
        </div>
      </header>

      {cartItems.length === 0 ? (
        <div className="cs-empty">
          <div className="cs-empty-icon">🛒</div>
          <h3 className="cs-empty-title">Your cart is empty</h3>
          <p className="cs-empty-sub">Browse vendors and add services to get started</p>
          <Link to="/" className="cs-browse-btn">Explore Vendors →</Link>
        </div>
      ) : (
        <div className="cs-layout">

          {/* ── Left: cart items ── */}
          <div className="cs-items-col">
            {cartItems.map((item, idx) => (
              <div
                key={item.service}
                className="cs-item-card"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Image */}
                <Link to={`/product/service/${item.service}`} className="cs-item-img-link">
                  <div className="cs-item-img-box">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="cs-item-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.objectFit = 'contain';
                        e.target.style.padding   = '1rem';
                        e.target.style.background = '#f5eaf0';
                      }}
                    />
                  </div>
                </Link>

                {/* Details */}
                <div className="cs-item-details">
                  <Link to={`/product/service/${item.service}`} className="cs-item-name-link">
                    <h3 className="cs-item-name">{item.name}</h3>
                  </Link>

                  <p className="cs-item-price">
                    {displayPrice(item.price)}
                    {item.qty > 1 && (
                      <span className="cs-item-qty"> × {item.qty}</span>
                    )}
                  </p>

                  {/* Date picker */}
                  <div className="cs-date-section">
                    {editingDateFor === item.service ? (
                      <div className="cs-calendar-wrap">
                        <p className="cs-calendar-label">📅 Select your booking date</p>
                        <Calendar
                          onChange={(date) => handleDateChange(date, item.service)}
                          value={item.bookingDate ? new Date(item.bookingDate) : new Date()}
                          minDate={new Date()}
                        />
                      </div>
                    ) : (
                      <button
                        className="cs-date-btn"
                        onClick={() => setEditingDateFor(item.service)}
                      >
                        <span className="cs-date-icon">📅</span>
                        <span>
                          {item.bookingDate
                            ? new Date(item.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                            : 'Select booking date'}
                        </span>
                        <span className="cs-date-chevron">›</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Remove */}
                <button
                  className="cs-remove-btn"
                  onClick={() => removeFromCartHandler(item.service)}
                  aria-label="Remove from cart"
                  title="Remove"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>

          {/* ── Right: order summary ── */}
          <div className="cs-summary-col">
            <div className="cs-summary-card">
              <h2 className="cs-summary-title">Booking Summary</h2>
              <div className="cs-summary-rule" />

              <div className="cs-summary-rows">
                <div className="cs-summary-row">
                  <span>Subtotal ({totalItems} item{totalItems > 1 ? 's' : ''})</span>
                  <span>₹{Number(servicesPrice).toLocaleString('en-IN')}</span>
                </div>
                <div className="cs-summary-row">
                  <span>
                    Conveyance
                    <span className="cs-summary-note"> (adjusted by distance)</span>
                  </span>
                  <span>₹{shippingPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="cs-summary-row">
                  <span>GST (10%)</span>
                  <span>₹{Number(taxPrice).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="cs-summary-total-row">
                <span>Total</span>
                <span className="cs-summary-total-amt">
                  ₹{Number(totalPrice).toLocaleString('en-IN')}
                </span>
              </div>

              <button
                className="cs-checkout-btn"
                disabled={cartItems.length === 0}
                onClick={checkoutHandler}
              >
                <span>Proceed to Book</span>
                <span className="cs-checkout-arrow">→</span>
              </button>

              <p className="cs-summary-note-bottom">
                🔒 Secure checkout · Free cancellation within 24h
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default CartScreen;