import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../utils/api';
import Loader from '../components/Loader';
import Message from '../components/Message';

const s = {
  page: { fontFamily: "'DM Sans', sans-serif", background: "#fdf8f0", minHeight: "100vh", padding: "0 0 60px" },
  header: { background: "linear-gradient(135deg, #3d0d29, #5e143f, #7d1d54)", padding: "32px 32px 28px", position: "relative", overflow: "hidden" },
  glow1: { position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", background: "rgba(249,231,159,0.07)", borderRadius: "50%", pointerEvents: "none" },
  headerInner: { position: "relative", zIndex: 1 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: "6px", color: "rgba(249,231,159,0.7)", textDecoration: "none", fontSize: "0.83rem", fontWeight: 600, marginBottom: "14px", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0 },
  headerTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" },
  headerTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color: "#f9e79f", margin: "0 0 4px" },
  headerSub: { fontSize: "0.83rem", color: "rgba(249,231,159,0.65)", margin: 0 },
  headerBadge: { display: "inline-flex", alignItems: "center", gap: "6px", borderRadius: "50px", padding: "7px 16px", fontSize: "0.83rem", fontWeight: 700 },
  body: { padding: "24px 16px", maxWidth: "1000px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", alignItems: "start" },
  card: { background: "#ffffff", borderRadius: "20px", border: "1px solid #e8d5de", boxShadow: "0 4px 20px rgba(94,20,63,0.08)", overflow: "hidden", marginBottom: "18px" },
  cardHeader: { background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)", borderBottom: "1px solid #e8d5de", padding: "16px 22px", display: "flex", alignItems: "center", gap: "10px" },
  cardIcon: { fontSize: "1.1rem" },
  cardTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 600, color: "#5e143f", margin: 0 },
  cardBody: { padding: "20px 22px" },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  infoItem: { },
  infoLabel: { fontSize: "0.72rem", fontWeight: 700, color: "#9a7a85", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" },
  infoValue: { fontSize: "0.9rem", color: "#2a1a1f", fontWeight: 500, margin: 0, lineHeight: 1.5 },
  infoLink: { fontSize: "0.9rem", color: "#5e143f", fontWeight: 600, textDecoration: "none" },
  statusBannerGreen: { display: "flex", alignItems: "center", gap: "10px", background: "rgba(46,125,82,0.08)", border: "1px solid rgba(46,125,82,0.2)", borderRadius: "12px", padding: "12px 16px", marginTop: "14px" },
  statusBannerYellow: { display: "flex", alignItems: "center", gap: "10px", background: "rgba(212,168,67,0.10)", border: "1px solid rgba(212,168,67,0.25)", borderRadius: "12px", padding: "12px 16px", marginTop: "14px" },
  statusText: { fontSize: "0.88rem", fontWeight: 600, margin: 0 },
  bookingItem: { display: "flex", alignItems: "center", gap: "14px", padding: "14px 0", borderBottom: "1px solid rgba(232,213,222,0.5)" },
  bookingImg: { width: "56px", height: "56px", borderRadius: "10px", objectFit: "cover", border: "1px solid #e8d5de", background: "#fdf0f6", flexShrink: 0 },
  bookingImgPlaceholder: { width: "56px", height: "56px", borderRadius: "10px", background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)", border: "1px solid #e8d5de", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 },
  bookingInfo: { flex: 1 },
  bookingName: { fontWeight: 600, fontSize: "0.92rem", color: "#2a1a1f", margin: "0 0 3px" },
  bookingMeta: { fontSize: "0.78rem", color: "#9a7a85", margin: 0 },
  bookingPrice: { fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 700, color: "#5e143f", textAlign: "right", whiteSpace: "nowrap" },
  summaryRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(232,213,222,0.4)" },
  summaryLabel: { fontSize: "0.88rem", color: "#5a3a45" },
  summaryValue: { fontSize: "0.88rem", fontWeight: 600, color: "#2a1a1f" },
  summaryTotalRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0 4px" },
  summaryTotalLabel: { fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#5e143f" },
  summaryTotalValue: { fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "#5e143f" },
  deliverBtn: { width: "100%", padding: "13px", borderRadius: "50px", border: "none", background: "linear-gradient(135deg, #2e7d52, #388e3c)", color: "#ffffff", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(46,125,82,0.25)", marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },
  successBanner: { background: "rgba(46,125,82,0.08)", border: "1px solid rgba(46,125,82,0.22)", borderRadius: "14px", padding: "16px 20px", marginBottom: "18px", display: "flex", alignItems: "flex-start", gap: "12px" },
  successIcon: { fontSize: "1.4rem", flexShrink: 0 },
  successText: { fontSize: "0.9rem", color: "#1a7a42", fontWeight: 600, margin: 0, lineHeight: 1.5 },
  redirectBanner: { background: "rgba(212,168,67,0.10)", border: "1px solid rgba(212,168,67,0.28)", borderRadius: "14px", padding: "14px 18px", marginBottom: "16px", fontSize: "0.85rem", color: "#8a6010", fontWeight: 600, textAlign: "center" },
  spinner: { width: "13px", height: "13px", borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.7s linear infinite" },
};

// ── WhatsApp SVG path (reused) ──────────────────────────────────────────────
const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

// ── helpers (outside component) ────────────────────────────────────────────

const normalizePhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned || cleaned === '0000') return '';
  if (cleaned.startsWith('0') && cleaned.length >= 10) return '91' + cleaned.slice(1);
  if (cleaned.length === 10) return '91' + cleaned;
  return cleaned;
};

const buildWhatsAppUrl = (order, userInfo) => {
  const items = order.orderItems || [];
  if (!items.length) return null;

  const rawPhone      = localStorage.getItem('bookingProviderPhone') || '';
  const providerPhone = normalizePhone(rawPhone);
  if (!providerPhone) return null;

  const firstItem    = items[0];
  const dateStr      = firstItem?.start_date
    ? new Date(firstItem.start_date + 'T00:00:00')
        .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const timeStr      = firstItem?.start_time
    ? `${firstItem.start_time}${firstItem?.end_time ? ' – ' + firstItem.end_time : ''}`
    : '—';
  const serviceList  = items.map(i => `• ${i.name} (Qty: ${i.qty})`).join('\n');
  const providerName = localStorage.getItem('bookingProviderName') || 'your business';
  const customerName = userInfo?.name || userInfo?.email || 'Customer';
  const bookingId    = order._id?.toString().slice(-8).toUpperCase();

  const msg = encodeURIComponent(
    `🎉 *New Booking on www.wedmangal.com!*\n\n` +
    `*Booking ID:* #${bookingId}\n` +
    `*Business:* ${providerName}\n` +
    `*Date:* ${dateStr}\n` +
    `*Time:* ${timeStr}\n\n` +
    `*Services booked:*\n${serviceList}\n\n` +
    `*Customer:* ${customerName}\n` +
    `*Customer email:* ${order.user?.email || '—'}\n\n` +
    `Please reply *CONFIRMED* to confirm, or contact the customer to reschedule. Thank you! 🙏`
  );

  return `https://wa.me/${providerPhone}?text=${msg}`;
};

// ── SkipButton: appears only after 30 seconds ───────────────────────────────
const SkipButton = ({ onSkip }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return (
    <p style={{ fontSize: "0.75rem", color: "#c0b0c0", margin: 0 }}>
      Skip option appears in 30 seconds…
    </p>
  );

  return (
    <button
      onClick={onSkip}
      style={{
        background: "none", border: "none", cursor: "pointer",
        fontSize: "0.78rem", color: "#9a7a85", textDecoration: "underline",
        fontFamily: "'DM Sans', sans-serif", padding: 0,
      }}
    >
      I'll notify them later — skip for now
    </button>
  );
};

// ── component ───────────────────────────────────────────────────────────────

const OrderScreen = () => {
  const { id: orderId } = useParams();
  const navigate        = useNavigate();
  const location        = useLocation();
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [order, setOrder]                   = useState({ orderItems: [] });
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading]               = useState(true);
  const [loadingDeliver, setLoadingDeliver] = useState(false);
  const [error, setError]                   = useState(null);
  const [countdown, setCountdown]           = useState(null);
  const [whatsAppUrl, setWhatsAppUrl]       = useState(null);

  const justBooked = location.state?.justBooked === true;
  const userInfo   = JSON.parse(localStorage.getItem('userInfo'));

  // ── Starts countdown ONLY after WhatsApp is sent (or skipped) ──
  const startRedirectCountdown = () => {
    setSuccessMessage('Message sent! 🎊 Redirecting to homepage…');
    let secs = 25;
    setCountdown(secs);
    const interval = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) { clearInterval(interval); navigate('/'); }
    }, 1000);
  };


const handleWhatsAppSent = () => {
  setShowWhatsAppModal(false);
  setWhatsAppUrl(null);

  setSuccessMessage("💬 Provider notified! Redirecting...");

  let secs = 20;
  setCountdown(secs);

  const timer = setInterval(() => {
    secs -= 1;
    setCountdown(secs);

    if (secs <= 0) {
      clearInterval(timer);
      navigate("/");
    }
  }, 1000);
};

  useEffect(() => {
    if (!userInfo) { navigate('/login'); return; }

    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/api/orders/${orderId}/`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        setOrder(data || { orderItems: [] });
        setLoading(false);

        // Build WhatsApp URL — modal will block until user clicks
        
if (justBooked) {
  const url = buildWhatsAppUrl(data, userInfo);

  if (url) {
    setWhatsAppUrl(url);
  }

  // Show celebration instantly
  setShowConfetti(true);
  setSuccessMessage("🎉 Booking Confirmed Successfully!");

  // Open popup after user sees summary page first
  setTimeout(() => {
    if (url) setShowWhatsAppModal(true);
  }, 5000);
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
  const isAdmin    = userInfo?.isAdmin;
  const isOwner    = userInfo?.role === 'service-owner';

  if (loading) return <Loader />;
  if (error)   return <div style={{ padding: "40px" }}><Message variant="danger">{error}</Message></div>;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Fullscreen WhatsApp blocking modal ── */}
     

{showConfetti && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      pointerEvents: "none",
      zIndex: 9998,
      background:
        "radial-gradient(circle at 20% 20%, rgba(255,215,0,.20), transparent 20%), radial-gradient(circle at 80% 30%, rgba(255,105,180,.18), transparent 20%), radial-gradient(circle at 40% 70%, rgba(0,255,127,.16), transparent 20%)",
      animation: "fadeout 4s forwards",
    }}
  />
)}

<style>{`
@keyframes fadeout {
  0% {opacity:1;}
  70% {opacity:1;}
  100% {opacity:0;}
}
`}</style>


{showWhatsAppModal && whatsAppUrl && (
  <div
    style={{
  position: "fixed",
  inset: 0,
  background: "rgba(255,255,255,.45)",
backdropFilter: "blur(1px)",
  WebkitBackdropFilter: "blur(2px)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px"
}}
  >
    <div
      style={{
        background: "#fff",
        maxWidth: "420px",
        width: "100%",
        borderRadius: "24px",
        padding: "32px",
        textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,.35)",
      }}
    >
      <div style={{ fontSize: "54px", marginBottom: "14px" }}>
        💬
      </div>

      <h2
        style={{
          margin: "0 0 10px",
          fontSize: "1.35rem",
          fontWeight: 700,
        }}
      >
        Notify Provider
      </h2>

      <p
        style={{
          color: "#666",
          lineHeight: 1.6,
          marginBottom: "24px",
        }}
      >
        Your booking is confirmed.  
        Please send WhatsApp message to provider now.
      </p>

      <a
        href={whatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleWhatsAppSent}
        style={{
          display: "block",
          width: "100%",
          padding: "15px",
          borderRadius: "50px",
          background:
            "linear-gradient(135deg,#25d366,#128c7e)",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: "1rem",
        }}
      >
        Send WhatsApp
      </a>
    </div>
  </div>
)}

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

            {/* Success banner */}
            {successMessage && (
              <div style={s.successBanner}>
                <span style={s.successIcon}>🎊</span>
                <p style={s.successText}>{successMessage}</p>
              </div>
            )}

            {/* Countdown banner */}
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
                  <div key={idx} style={{
                    ...s.bookingItem,
                    ...(idx === order.orderItems.length - 1 ? { borderBottom: "none", paddingBottom: 0 } : {})
                  }}>
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
                  <span style={s.summaryLabel}>Tax</span>
                  <span style={s.summaryValue}>₹{Number(order.taxPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={s.summaryTotalRow}>
                  <span style={s.summaryTotalLabel}>Total</span>
                  <span style={s.summaryTotalValue}>₹{Number(order.totalPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {isAdmin && (
                  <div style={{
                    marginTop: "16px", padding: "12px 14px", borderRadius: "12px",
                    background: order.isPaid ? "rgba(46,125,82,0.08)" : "rgba(192,57,43,0.06)",
                    border: `1px solid ${order.isPaid ? "rgba(46,125,82,0.2)" : "rgba(192,57,43,0.18)"}`,
                  }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#9a7a85", textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 4px" }}>Payment</p>
                    {order.isPaid ? (
                      <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1a7a42", margin: 0 }}>
                        ✅ Paid on {new Date(order.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    ) : (
                      <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#c0392b", margin: 0 }}>✕ Not yet paid</p>
                    )}
                  </div>
                )}

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
                    title={order.isDelivered ? 'Already marked as completed' : 'Mark this booking as completed'}
                  >
                    {loadingDeliver
                      ? <><span style={s.spinner} /> Updating…</>
                      : order.isDelivered ? '✓ Already Completed' : '🎊 Mark as Completed'
                    }
                  </button>
                )}

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