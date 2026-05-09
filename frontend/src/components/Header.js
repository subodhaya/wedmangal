// src/components/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SmartSearch from './SmartSearch';
import './Header.css';

const getUserInfo = () => {
  try { return JSON.parse(localStorage.getItem('userInfo')); }
  catch { return null; }
};

const clearUserInfo = () => {
  localStorage.removeItem('userInfo');
};

// ── Notification dropdown styles ──────────────────────────────
const ns = {
  wrap: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  },
  bell: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(249,231,159,0.10)',
    border: '1.5px solid rgba(249,231,159,0.22)',
    color: 'rgba(249,231,159,0.85)',
    fontSize: '0.9rem', cursor: 'pointer',
    transition: 'background 0.18s',
    outline: 'none',
  },
  bellActive: {
    background: 'rgba(249,231,159,0.22)',
    border: '1.5px solid rgba(249,231,159,0.5)',
    color: '#f9e79f',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    background: 'linear-gradient(135deg,#c0392b,#e74c3c)',
    color: '#fff', fontSize: '0.58rem', fontWeight: 700,
    minWidth: 17, height: 17, borderRadius: 9,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid #5e143f', padding: '0 3px', lineHeight: 1,
    fontFamily: "'DM Sans', sans-serif",
  },
  panel: {
    position: 'absolute', top: 46, right: 0,
    width: 320, maxHeight: 440,
    background: '#ffffff',
    borderRadius: 16, border: '1px solid #e8d5de',
    boxShadow: '0 8px 32px rgba(94,20,63,0.18)',
    zIndex: 9999, overflow: 'hidden',
    fontFamily: "'DM Sans', sans-serif",
  },
  panelHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px 10px',
    borderBottom: '1px solid #e8d5de',
    background: 'linear-gradient(135deg, #fdf0f6, #fdf8f0)',
  },
  panelTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '0.95rem', fontWeight: 600, color: '#5e143f', margin: 0,
  },
  markAllBtn: {
    fontSize: '0.75rem', fontWeight: 600, color: '#5e143f',
    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
    borderRadius: 6,
  },
  list: { overflowY: 'auto', maxHeight: 340 },
  item: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    padding: '12px 14px',
    borderBottom: '1px solid rgba(232,213,222,0.4)',
    cursor: 'pointer',
    transition: 'background 0.15s',
    textDecoration: 'none',
  },
  itemUnread: { background: 'rgba(94,20,63,0.04)' },
  itemRead:   { background: '#ffffff' },
  dot: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#5e143f', flexShrink: 0, marginTop: 5,
  },
  dotRead: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'transparent', border: '1.5px solid #d0b0c0',
    flexShrink: 0, marginTop: 5,
  },
  itemBody: { flex: 1, minWidth: 0 },
  itemName:  { fontSize: '0.85rem', fontWeight: 600, color: '#2a1a1f', margin: '0 0 2px', lineHeight: 1.4 },
  itemSub:   { fontSize: '0.76rem', color: '#9a7a85', margin: '0 0 2px' },
  itemTime:  { fontSize: '0.72rem', color: '#b8a0aa', margin: 0 },
  itemPrice: { fontSize: '0.78rem', fontWeight: 700, color: '#5e143f', margin: 0 },
  empty:     { padding: '28px 16px', textAlign: 'center', color: '#9a7a85', fontSize: '0.88rem' },
  emptyIcon: { fontSize: '2rem', display: 'block', marginBottom: 8 },
  footer: {
    padding: '10px 14px', borderTop: '1px solid #e8d5de', textAlign: 'center',
    background: '#fdf8f0',
  },
  footerLink: {
    fontSize: '0.82rem', fontWeight: 600, color: '#5e143f',
    textDecoration: 'none',
  },
};

// ── NotificationBell ──────────────────────────────────────────
function NotificationBell({ userInfo }) {
  const [open, setOpen]   = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const wrapRef           = useRef(null);
  const navigate          = useNavigate();
  const config            = { headers: { Authorization: `Bearer ${userInfo.token}` } };

  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get('/api/orders/unread/', config);
      setCount(data.count || 0);
      setItems(data.items || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async (e) => {
    e.stopPropagation();
    try {
      await axios.post('/api/orders/mark-read/', {}, config);
      setCount(0);
      setItems(prev => prev.map(i => ({ ...i, is_read: true })));
    } catch { /* silent */ }
  };

  const handleItemClick = async (orderId) => {
    setOpen(false);
    try { 
      await axios.post('/api/orders/mark-read/', {}, config); 
      setCount(0); 
    } catch { /* silent */ }
    navigate(`/order/${orderId}`);
  };

  const unreadItems = items.filter(i => !i.is_read);
  const readItems   = items.filter(i =>  i.is_read);

  return (
    <div style={{ ...ns.wrap, margin: '0 8px' }} ref={wrapRef}>
      <button
        style={{ ...ns.bell, ...(open ? ns.bellActive : {}) }}
        onClick={() => setOpen(o => !o)}
        aria-label={`${count} unread notifications`}
        title="Notifications"
      >
        <i className="fas fa-bell" />
        {count > 0 && <span style={ns.badge}>{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div style={ns.panel}>
          <div style={ns.panelHead}>
            <p style={ns.panelTitle}>
              🔔 Notifications {count > 0 && <span style={{ fontSize: '0.8rem', color: '#9a7a85' }}>({count} new)</span>}
            </p>
            {count > 0 && (
              <button style={ns.markAllBtn} onClick={markAllRead}>Mark all read</button>
            )}
          </div>

          <div style={ns.list}>
            {items.length === 0 ? (
              <div style={ns.empty}>
                <span style={ns.emptyIcon}>🎊</span>
                No new bookings yet
              </div>
            ) : (
              <>
                {unreadItems.length > 0 && (
                  <>
                    <div style={{ 
                      padding: '7px 14px 4px', 
                      fontSize: '0.7rem', 
                      fontWeight: 700, 
                      color: '#9a7a85', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.5px', 
                      background: '#fdf8f0' 
                    }}>
                      New
                    </div>
                    {unreadItems.map(item => (
                      <div
                        key={item.order_id}
                        style={{ ...ns.item, ...ns.itemUnread }}
                        onClick={() => handleItemClick(item.order_id)}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(94,20,63,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(94,20,63,0.04)'}
                      >
                        <div style={ns.dot} />
                        <div style={ns.itemBody}>
                          <p style={ns.itemName}>📋 {item.customer_name}</p>
                          <p style={ns.itemSub}>booked <strong>{item.service_name}</strong></p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={ns.itemTime}>{item.booked_at}</p>
                            {item.total && item.total !== '0' && (
                              <p style={ns.itemPrice}>₹{Number(item.total).toLocaleString('en-IN')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {readItems.length > 0 && (
                  <>
                    <div style={{ 
                      padding: '7px 14px 4px', 
                      fontSize: '0.7rem', 
                      fontWeight: 700, 
                      color: '#9a7a85', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.5px', 
                      background: '#fdf8f0' 
                    }}>
                      Earlier
                    </div>
                    {readItems.map(item => (
                      <div
                        key={item.order_id}
                        style={{ ...ns.item, ...ns.itemRead }}
                        onClick={() => handleItemClick(item.order_id)}
                        onMouseEnter={e => e.currentTarget.style.background = '#fdf8f0'}
                        onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                      >
                        <div style={ns.dotRead} />
                        <div style={ns.itemBody}>
                          <p style={{ ...ns.itemName, color: '#5a3a45' }}>📋 {item.customer_name}</p>
                          <p style={ns.itemSub}>booked <strong>{item.service_name}</strong></p>
                          <p style={ns.itemTime}>{item.booked_at}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          <div style={ns.footer}>
            <a href="/orderlist/" style={ns.footerLink} onClick={() => setOpen(false)}>
              View all bookings →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Header ───────────────────────────────────────────────
const Header = () => {
  const userInfo = getUserInfo();
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage]     = useState('');
  const [navExpanded, setNavExpanded]       = useState(false);

  const isServiceOwner = userInfo?.role === 'service-owner';

  const collapseNav = () => setNavExpanded(false);

  const redirectToLogin = (targetPath) => {
    if (userInfo) return targetPath;
    return { pathname: '/login', search: `?redirect=${encodeURIComponent(targetPath)}` };
  };

  const logoutHandler = async () => {
    collapseNav();
    try {
      if (userInfo) {
        const cartItems     = JSON.parse(localStorage.getItem('cartItems'))  || [];
        const wishlistItems = JSON.parse(localStorage.getItem('wishlists')) || [];
        await axios.post('/api/products/cart/',     
          { items: cartItems, userId: userInfo._id }, 
          { headers: { Authorization: `Bearer ${userInfo.token}` } }
        );
        await axios.post('/api/products/wishlist/', 
          { items: wishlistItems, user: userInfo._id },   
          { headers: { Authorization: `Bearer ${userInfo.token}` } }
        );
      }
    } catch (error) {
      console.error('Error syncing data on logout:', error.message);
    } finally {
      clearUserInfo();
      navigate('/login');
    }
  };

  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => { 
        setSuccessMessage(''); 
        setErrorMessage(''); 
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  return (
    <div>
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {errorMessage   && <div className="alert alert-danger">{errorMessage}</div>}

      <header>
        <Navbar
          className="header-navbar"
          expand="lg"
          expanded={navExpanded}
          onToggle={(val) => setNavExpanded(val)}
        >
          <Container fluid="lg">

            {/* ── Brand / Logo ── */}
            <LinkContainer to="/" onClick={collapseNav}>
              <Navbar.Brand className="brand-logo">
                <svg viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg" aria-label="WedMangal">
                  {/* Octagon badge */}
                  <polygon points="25,3 37,8 42,20 37,32 25,37 13,32 8,20 13,8" fill="#f9e79f"/>
                  <polygon points="25,6 35,10 39,20 35,30 25,34 15,30 11,20 15,10" fill="none" stroke="#5e143f" strokeWidth="1" opacity="0.4"/>
                  
                  {/* Flames */}
                  <ellipse cx="20" cy="4.5" rx="2"   ry="3"   fill="#5e143f" opacity="0.55"/>
                  <ellipse cx="25" cy="2.5" rx="2.8" ry="4"   fill="#5e143f"/>
                  <ellipse cx="30" cy="4.5" rx="2"   ry="3"   fill="#5e143f" opacity="0.55"/>
                  
                  {/* W */}
                  <text x="25" y="21" textAnchor="middle" dominantBaseline="central"
                    style={{fontFamily:'Georgia,serif', fontSize:'18px', fontWeight:700, fill:'#5e143f'}}>
                    W
                  </text>
                  
                  {/* WED */}
                  <text x="52" y="17"
                    style={{fontFamily:'Georgia,serif', fontSize:'13px', fontWeight:700, fill:'#f9e79f', letterSpacing:'3px'}}>
                    WED
                  </text>
                  
                  {/* Yellow bar */}
                  <rect x="50" y="22" width="145" height="18" rx="3" fill="#f9e79f"/>
                  
                  {/* MANGAL */}
                  <text x="53" y="34"
                    style={{fontFamily:'Georgia,serif', fontSize:'14px', fontWeight:700, fill:'#5e143f', letterSpacing:'2px'}}>
                    MANGAL
                  </text>
                </svg>
              </Navbar.Brand>
            </LinkContainer>

            <Navbar.Toggle aria-controls="basic-navbar-nav" className="custom-toggler" />

            <Navbar.Collapse id="basic-navbar-nav">
              {/* ✅ Single wrapper — any link click closes navbar on mobile */}
              <div onClick={collapseNav} style={{ display: 'contents' }}>

                {/* ── SmartSearch — hidden for service owners ── */}
                {!isServiceOwner && (
                  <div className="header-search-wrap" onClick={e => e.stopPropagation()}>
                    <SmartSearch variant="compact" />
                  </div>
                )}

                {/* ── Left nav ── */}
                <Nav className="me-auto align-items-center">
                  <LinkContainer to="/">
                    <Nav.Link>
                      <i className="fas fa-home" aria-hidden="true" /> Home
                    </Nav.Link>
                  </LinkContainer>

                  {!isServiceOwner && (
                    <>
                      <LinkContainer to="/budget">
                        <Nav.Link>
                          <i className="fas fa-chart-pie" aria-hidden="true" /> Budget
                        </Nav.Link>
                      </LinkContainer>
                      <LinkContainer to={redirectToLogin('/wishlist')}>
                        <Nav.Link>
                          <i className="fas fa-heart" aria-hidden="true" /> Wishlist
                        </Nav.Link>
                      </LinkContainer>
                      <LinkContainer to={redirectToLogin('/cart')}>
                        <Nav.Link>
                          <i className="fas fa-shopping-cart" aria-hidden="true" /> Cart
                        </Nav.Link>
                      </LinkContainer>
                    </>
                  )}
                </Nav>

                {/* ── Right nav ── */}
                <Nav className="ms-auto align-items-center">

                  {isServiceOwner && (
                    <>
                      <NavDropdown 
                        title="Owner Menu" 
                        id="owner-nav-dropdown" 
                        align="end"
                        onClick={e => e.stopPropagation()}
                      >
                        <LinkContainer to="/orderlist/">
                          <NavDropdown.Item onClick={collapseNav}>Booking List</NavDropdown.Item>
                        </LinkContainer>
                        <LinkContainer to="/my-appointment/">
                          <NavDropdown.Item onClick={collapseNav}>My Appointments</NavDropdown.Item>
                        </LinkContainer>
                      </NavDropdown>
                      <NotificationBell userInfo={userInfo} />
                    </>
                  )}

                  {userInfo?.role === 'admin' && (
                    <NavDropdown 
                      title="Admin Menu" 
                      id="admin-nav-dropdown" 
                      align="end"
                      onClick={e => e.stopPropagation()}
                    >
                      <LinkContainer to="/admin/productlist">
                        <NavDropdown.Item onClick={collapseNav}>Services List</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/admin/userlist">
                        <NavDropdown.Item onClick={collapseNav}>User List</NavDropdown.Item>
                      </LinkContainer>
                      <NavDropdown.Divider />
                      <LinkContainer to="/admin/orderlist">
                        <NavDropdown.Item onClick={collapseNav}>Booking List</NavDropdown.Item>
                      </LinkContainer>
                    </NavDropdown>
                  )}

                  {userInfo ? (
                    <NavDropdown
                      title={
                        <>
                          <i className="fas fa-user" aria-hidden="true" /> {userInfo.name}
                        </>
                      }
                      id="username"
                      align="end"
                      onClick={e => e.stopPropagation()}
                    >
                      <LinkContainer to="/profile">
                        <NavDropdown.Item onClick={collapseNav}>Profile / Bookings</NavDropdown.Item>
                      </LinkContainer>
                      <NavDropdown.Item onClick={logoutHandler}>
                        Logout
                      </NavDropdown.Item>
                    </NavDropdown>
                  ) : (
                    <LinkContainer to="/login">
                      <Nav.Link>Login</Nav.Link>
                    </LinkContainer>
                  )}

                </Nav>
              </div>
            </Navbar.Collapse>

          </Container>
        </Navbar>
      </header>
    </div>
  );
};

export default Header;