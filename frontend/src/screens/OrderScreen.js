import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import Loader from '../components/Loader';
import Message from '../components/Message';
import {  useLocation } from 'react-router-dom';


const s = {
  page: { fontFamily: "'DM Sans', sans-serif", background: "#fdf8f0", minHeight: "100vh", padding: "0 0 60px" },

  // ── Header ──
  header: { background: "linear-gradient(135deg, #3d0d29, #5e143f, #7d1d54)", padding: "32px 32px 28px", position: "relative", overflow: "hidden" },
  glow1: { position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", background: "rgba(249,231,159,0.07)", borderRadius: "50%", pointerEvents: "none" },
  headerInner: { position: "relative", zIndex: 1 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: "6px", color: "rgba(249,231,159,0.7)", textDecoration: "none", fontSize: "0.83rem", fontWeight: 600, marginBottom: "14px", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0 },
  headerTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" },
  headerTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color: "#f9e79f", margin: "0 0 4px" },
  headerSub: { fontSize: "0.83rem", color: "rgba(249,231,159,0.65)", margin: 0 },
  headerBadge: { display: "inline-flex", alignItems: "center", gap: "6px", borderRadius: "50px", padding: "7px 16px", fontSize: "0.83rem", fontWeight: 700 },

  // ── Body ──
  body: { padding: "24px 16px", maxWidth: "1000px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", alignItems: "start" },

  // ── Card ──
  card: { background: "#ffffff", borderRadius: "20px", border: "1px solid #e8d5de", boxShadow: "0 4px 20px rgba(94,20,63,0.08)", overflow: "hidden", marginBottom: "18px" },
  cardHeader: { background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)", borderBottom: "1px solid #e8d5de", padding: "16px 22px", display: "flex", alignItems: "center", gap: "10px" },
  cardIcon: { fontSize: "1.1rem" },
  cardTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 600, color: "#5e143f", margin: 0 },
  cardBody: { padding: "20px 22px" },

  // ── Info rows ──
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  infoItem: { },
  infoLabel: { fontSize: "0.72rem", fontWeight: 700, color: "#9a7a85", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" },
  infoValue: { fontSize: "0.9rem", color: "#2a1a1f", fontWeight: 500, margin: 0, lineHeight: 1.5 },
  infoLink: { fontSize: "0.9rem", color: "#5e143f", fontWeight: 600, textDecoration: "none" },

  // ── Status banner ──
  statusBannerGreen: { display: "flex", alignItems: "center", gap: "10px", background: "rgba(46,125,82,0.08)", border: "1px solid rgba(46,125,82,0.2)", borderRadius: "12px", padding: "12px 16px", marginTop: "14px" },
  statusBannerYellow: { display: "flex", alignItems: "center", gap: "10px", background: "rgba(212,168,67,0.10)", border: "1px solid rgba(212,168,67,0.25)", borderRadius: "12px", padding: "12px 16px", marginTop: "14px" },
  statusText: { fontSize: "0.88rem", fontWeight: 600, margin: 0 },

  // ── Booking items ──
  bookingItem: { display: "flex", alignItems: "center", gap: "14px", padding: "14px 0", borderBottom: "1px solid rgba(232,213,222,0.5)" },
  bookingImg: { width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover", border: "1px solid #e8d5de", background: "#fdf0f6", flexShrink: 0 },
  bookingImgPlaceholder: { width: "56px", height: "56px", borderRadius: "10px", background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)", border: "1px solid #e8d5de", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 },
  bookingInfo: { flex: 1 },
  bookingName: { fontWeight: 600, fontSize: "0.92rem", color: "#2a1a1f", margin: "0 0 3px" },
  bookingMeta: { fontSize: "0.78rem", color: "#9a7a85", margin: 0 },
  bookingPrice: { fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 700, color: "#5e143f", textAlign: "right", whiteSpace: "nowrap" },

  // ── Summary card ──
  summaryRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(232,213,222,0.4)" },
  summaryLabel: { fontSize: "0.88rem", color: "#5a3a45" },
  summaryValue: { fontSize: "0.88rem", fontWeight: 600, color: "#2a1a1f" },
  summaryTotalRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0 4px" },
  summaryTotalLabel: { fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#5e143f" },
  summaryTotalValue: { fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "#5e143f" },

  // ── Deliver button ──
  deliverBtn: { width: "100%", padding: "13px", borderRadius: "50px", border: "none", background: "linear-gradient(135deg, #2e7d52, #388e3c)", color: "#ffffff", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(46,125,82,0.25)", marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },

  // ── Success banner ──
  successBanner: { background: "rgba(46,125,82,0.08)", border: "1px solid rgba(46,125,82,0.22)", borderRadius: "14px", padding: "16px 20px", marginBottom: "18px", display: "flex", alignItems: "flex-start", gap: "12px" },
  successIcon: { fontSize: "1.4rem", flexShrink: 0 },
  successText: { fontSize: "0.9rem", color: "#1a7a42", fontWeight: 600, margin: 0, lineHeight: 1.5 },

  // ── Redirect banner ──
  redirectBanner: { background: "rgba(212,168,67,0.10)", border: "1px solid rgba(212,168,67,0.28)", borderRadius: "14px", padding: "14px 18px", marginBottom: "16px", fontSize: "0.85rem", color: "#8a6010", fontWeight: 600, textAlign: "center" },

  spinner: { width: "13px", height: "13px", borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.7s linear infinite" },
};

const OrderScreen = () => {
  const { id: orderId } = useParams();
  const navigate        = useNavigate();
  const [order, setOrder]                   = useState({ orderItems: [] });
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading]               = useState(true);
  const [loadingDeliver, setLoadingDeliver] = useState(false);
  const [error, setError]                   = useState(null);
  const [countdown, setCountdown]           = useState(null);

  const location = useLocation();
  const justBooked = location.state?.justBooked === true;

  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  useEffect(() => {
    if (!userInfo) { navigate('/login'); return; }

    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/api/orders/${orderId}/`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        setOrder(data || { orderItems: [] });
        setLoading(false);

        // ── Auto-redirect after 14s (show order for 8s, then show countdown) ──
        // replace the setTimeout block with:
if (justBooked) {
        setTimeout(() => {
          setSuccessMessage('Booking confirmed! 🎊 Redirecting to homepage…');
          let secs = 6;
          setCountdown(secs);
          const interval = setInterval(() => {
            secs -= 1;
            setCountdown(secs);
            if (secs <= 0) { clearInterval(interval); navigate('/'); }
          }, 1000);
        }, 8000);
}

      } catch (err) {
        setError(err.response?.data?.detail || 'Could not load order');
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, navigate]);

  const deliverHandler = async () => {
    try {
      setLoadingDeliver(true);
      await api.put(`/api/orders/${order._id}/deliver/`, { isDelivered: true }, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userInfo.token}` },
      });
      setOrder(prev => ({ ...prev, isDelivered: true, deliveredAt: new Date().toISOString() }));
    } catch {
      setError('Could not update completion status');
    } finally {
      setLoadingDeliver(false);
    }
  };

  const itemsPrice = (order.orderItems || []).reduce((acc, item) => acc + item.qty * item.price, 0);

  const isAdmin       = userInfo?.isAdmin;
  const isOwner       = userInfo?.role === 'service-owner';
  const isCustomer    = !isAdmin && !isOwner;

  if (loading) return <Loader />;
  if (error)   return <div style={{ padding: "40px" }}><Message variant="danger">{error}</Message></div>;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={s.page}>

        {/* ── Header ── */}
        <div style={s.header}>
          <div style={s.glow1} />
          <div style={s.headerInner}>
            <button style={s.backBtn} onClick={() => navigate(-1)}>← Back</button>
            <div style={s.headerTop}>
              <div>
                <h1 style={s.headerTitle}>📋 Booking Details</h1>
                <p style={s.headerSub}>
                  #{order._id?.toString().slice(-8).toUpperCase()} ·{' '}
                  {order.createdAt && new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              {/* Overall status badge */}
              <div style={{
                ...s.headerBadge,
                ...(order.isDelivered
                  ? { background: "rgba(46,125,82,0.2)", color: "#a8f0c6" }
                  : order.isPaid
                  ? { background: "rgba(212,168,67,0.2)", color: "#f9e79f" }
                  : { background: "rgba(192,57,43,0.2)", color: "#f5b7b1" })
              }}>
                {order.isDelivered ? '🎊 Completed' : order.isPaid ? '💰 Paid · Awaiting Service' : '⏳ Pending Payment'}
              </div>
            </div>
          </div>
        </div>

        <div style={s.body}>
          {/* ── LEFT COLUMN ── */}
          <div>

            {/* Success / redirect banners */}
            {successMessage && (
              <div style={s.successBanner}>
                <span style={s.successIcon}>🎊</span>
                <p style={s.successText}>{successMessage}</p>
              </div>
            )}
            {countdown !== null && countdown > 0 && (
              <div style={s.redirectBanner}>
                Redirecting to homepage in {countdown}s…
              </div>
            )}

            {/* ── Customer info ── */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.cardIcon}>👤</span>
                <h3 style={s.cardTitle}>Customer Details</h3>
              </div>
              <div style={s.cardBody}>
                <div style={s.infoGrid}>
                  <div style={s.infoItem}>
                    <p style={s.infoLabel}>Name</p>
                    <p style={s.infoValue}>{order.user?.name || '—'}</p>
                  </div>
                  <div style={s.infoItem}>
                    <p style={s.infoLabel}>Email</p>
                    <a href={`mailto:${order.user?.email}`} style={s.infoLink}>{order.user?.email || '—'}</a>
                  </div>
                  {order.shippingAddress && (
                    <div style={{ ...s.infoItem, gridColumn: "1 / -1" }}>
                      <p style={s.infoLabel}>Event Address</p>
                      <p style={s.infoValue}>
                        {order.shippingAddress.address}, {order.shippingAddress.city}{' '}
                        {order.shippingAddress.postalCode}, {order.shippingAddress.country}
                      </p>
                    </div>
                  )}
                </div>

                {/* Completion status */}
                {order.isDelivered ? (
                  <div style={s.statusBannerGreen}>
                    <span>✅</span>
                    <p style={{ ...s.statusText, color: "#1a7a42" }}>
                      Service completed on{' '}
                      {new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                ) : (
                  <div style={s.statusBannerYellow}>
                    <span>⏳</span>
                    <p style={{ ...s.statusText, color: "#8a6010" }}>Service not yet completed</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Booked services ── */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.cardIcon}>✨</span>
                <h3 style={s.cardTitle}>Booked Services ({order.orderItems?.length || 0})</h3>
              </div>
              <div style={s.cardBody}>
                {order.orderItems?.length > 0 ? order.orderItems.map((item, idx) => (
                  <div key={idx} style={{ ...s.bookingItem, ...(idx === order.orderItems.length - 1 ? { borderBottom: "none", paddingBottom: 0 } : {}) }}>
                    {item.image
                      ? <img src={item.image} alt={item.name} style={s.bookingImg} onError={e => e.target.style.display = 'none'} />
                      : <div style={s.bookingImgPlaceholder}>✨</div>
                    }
                    <div style={s.bookingInfo}>
                      <p style={s.bookingName}>{item.name}</p>
                      <p style={s.bookingMeta}>
                        Qty: {item.qty}
                        {item.start_date && ` · 📅 ${new Date(item.start_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        {item.start_time && ` · ⏰ ${item.start_time}`}
                      </p>
                    </div>
                    <div style={s.bookingPrice}>
                      ₹{(item.qty * item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )) : (
                  <p style={{ color: "#9a7a85", fontSize: "0.9rem", textAlign: "center", padding: "20px 0" }}>No items found</p>
                )}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN: Summary ── */}
          <div>
            <div style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.cardIcon}>💰</span>
                <h3 style={s.cardTitle}>Booking Summary</h3>
              </div>
              <div style={s.cardBody}>

                <div style={s.summaryRow}>
                  <span style={s.summaryLabel}>Services</span>
                  <span style={s.summaryValue}>₹{itemsPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={s.summaryRow}>
                  <span style={s.summaryLabel}>Conveyance</span>
                  <span style={s.summaryValue}>₹{Number(order.shippingPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={s.summaryRow}>
                  <span style={s.summaryLabel}>Tax</span>
                  <span style={s.summaryValue}>₹{Number(order.taxPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={s.summaryTotalRow}>
                  <span style={s.summaryTotalLabel}>Total</span>
                  <span style={s.summaryTotalValue}>₹{Number(order.totalPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {/* Payment status */}
                <div style={{ marginTop: "16px", padding: "12px 14px", borderRadius: "12px", background: order.isPaid ? "rgba(46,125,82,0.08)" : "rgba(192,57,43,0.06)", border: `1px solid ${order.isPaid ? "rgba(46,125,82,0.2)" : "rgba(192,57,43,0.18)"}` }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#9a7a85", textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 4px" }}>Payment</p>
                  {order.isPaid ? (
                    <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1a7a42", margin: 0 }}>
                      ✅ Paid on {new Date(order.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  ) : (
                    <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#c0392b", margin: 0 }}>✕ Not yet paid</p>
                  )}
                </div>

                {/* Mark as completed — admin or service owner, only when NOT yet delivered */}
                {(isAdmin || isOwner) && (
                  <button
                    style={{
                      ...s.deliverBtn,
                      opacity: (loadingDeliver || order.isDelivered) ? 0.45 : 1,
                      cursor: order.isDelivered ? 'not-allowed' : 'pointer',
                      background: order.isDelivered
                        ? "linear-gradient(135deg, #a0a0a0, #c0c0c0)"
                        : "linear-gradient(135deg, #2e7d52, #388e3c)",
                    }}
                    onClick={deliverHandler}
                    disabled={loadingDeliver || order.isDelivered}
                    title={order.isDelivered ? 'This booking is already marked as completed' : 'Mark this booking as completed'}
                  >
                    {loadingDeliver
                      ? <><span style={s.spinner} /> Updating…</>
                      : order.isDelivered
                      ? '✓ Already Completed'
                      : '🎊 Mark as Completed'
                    }
                  </button>
                )}

                {/* Back links */}
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <Link to="/my-appointment/" style={{ textAlign: "center", fontSize: "0.83rem", color: "#5e143f", fontWeight: 600, textDecoration: "none", padding: "8px", borderRadius: "8px", border: "1px solid #e8d5de" }}>
                    ← My Appointments
                  </Link>
                  <Link to="/" style={{ textAlign: "center", fontSize: "0.83rem", color: "#9a7a85", textDecoration: "none" }}>
                    🏠 Back to Home
                  </Link>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default OrderScreen;