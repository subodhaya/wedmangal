import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Loader from '../components/Loader';
import Message from '../components/Message';
import api from '../utils/api';

const s = {
  page: { fontFamily: "'DM Sans', sans-serif", background: "#fdf8f0", minHeight: "100vh", padding: "0 0 60px" },

  // ── Header ──
  header: { background: "#fdf0f6", padding: "14px 32px", position: "relative", overflow: "hidden" },
  glow1: { position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", background: "rgba(249,231,159,0.07)", borderRadius: "50%", pointerEvents: "none" },
  glow2: { position: "absolute", bottom: "-80px", left: "-40px", width: "180px", height: "180px", background: "rgba(249,231,159,0.05)", borderRadius: "50%", pointerEvents: "none" },
  headerInner: { position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "20px" },
  headerText: {},
  avatarLarge: { width: "44px", height: "44px", borderRadius: "50%", background: "rgba(94,20,63,0.12)", border: "2px solid rgba(94,20,63,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#5e143f", flexShrink: 0 },
  headerTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 700, color: "#5e143f", margin: "0 0 2px" },
  headerSub: { fontSize: "0.78rem", color: "#9a7a85", margin: 0 },
  

  // ── Body layout ──
  body: { padding: "28px 16px", maxWidth: "1050px", margin: "0 auto", display: "grid", gridTemplateColumns: "340px 1fr", gap: "24px", alignItems: "start" },
  bodyMobile: { padding: "20px 14px", maxWidth: "1050px", margin: "0 auto" },

  // ── Card ──
  card: { background: "#ffffff", borderRadius: "20px", border: "1px solid #e8d5de", boxShadow: "0 4px 24px rgba(94,20,63,0.08)", overflow: "hidden" },
  cardHeader: { background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)", borderBottom: "1px solid #e8d5de", padding: "18px 24px" },
  cardTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 600, color: "#5e143f", margin: 0 },
  cardBody: { padding: "24px" },

  // ── Form ──
  formGroup: { marginBottom: "18px" },
  label: { display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#9a7a85", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" },
  input: { width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e8d5de", fontFamily: "'DM Sans', sans-serif", fontSize: "0.92rem", color: "#2a1a1f", background: "#fdf8f0", outline: "none", boxSizing: "border-box", transition: "border-color 0.18s" },
  inputFocus: { borderColor: "#5e143f" },

  divider: { display: "flex", alignItems: "center", gap: "10px", margin: "20px 0 18px" },
  dividerLine: { flex: 1, height: "1px", background: "#e8d5de" },
  dividerLabel: { fontSize: "0.75rem", fontWeight: 600, color: "#b8a0aa", textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" },

  submitBtn: { width: "100%", padding: "12px", borderRadius: "50px", border: "none", background: "linear-gradient(135deg, #3d0d29, #5e143f)", color: "#f9e79f", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(94,20,63,0.25)", marginTop: "4px" },

  // ── Stats row ──
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" },
  statCard: { background: "#ffffff", borderRadius: "14px", border: "1px solid #e8d5de", padding: "14px 16px", textAlign: "center", boxShadow: "0 2px 10px rgba(94,20,63,0.06)" },
  statNum: { fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: 700, color: "#5e143f", lineHeight: 1, margin: "0 0 4px" },
  statLabel: { fontSize: "0.7rem", color: "#9a7a85", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", margin: 0 },

  // ── Section divider ──
  sectionDivider: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" },
  sectionLabel: { fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 600, color: "#5e143f", whiteSpace: "nowrap" },
  sectionLine: { flex: 1, height: "2px", background: "linear-gradient(to right, #d4a843, transparent)", borderRadius: "2px" },

  // ── Order cards ──
  orderCard: { background: "#ffffff", borderRadius: "16px", border: "1px solid #e8d5de", padding: "16px 20px", marginBottom: "12px", boxShadow: "0 2px 10px rgba(94,20,63,0.06)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px" },
  orderCardBand: { width: "4px", height: "48px", borderRadius: "4px", flexShrink: 0 },
  orderInfo: { flex: 1, minWidth: "160px" },
  orderId: { fontFamily: "monospace", fontSize: "0.75rem", background: "rgba(94,20,63,0.07)", color: "#5e143f", borderRadius: "6px", padding: "2px 7px", display: "inline-block", marginBottom: "4px" },
  orderDate: { fontSize: "0.8rem", color: "#9a7a85", margin: 0 },
  orderPrice: { fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 700, color: "#5e143f" },
  badgeGreen: { display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(46,125,82,0.10)", color: "#1a7a42", border: "1px solid rgba(46,125,82,0.22)", borderRadius: "20px", padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700 },
  badgeRed: { display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(192,57,43,0.08)", color: "#c0392b", border: "1px solid rgba(192,57,43,0.2)", borderRadius: "20px", padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700 },
  detailsBtn: { display: "inline-flex", alignItems: "center", gap: "5px", background: "linear-gradient(135deg, #3d0d29, #5e143f)", color: "#f9e79f", textDecoration: "none", borderRadius: "20px", padding: "7px 16px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.8rem", boxShadow: "0 2px 8px rgba(94,20,63,0.22)", whiteSpace: "nowrap" },

  // ── Empty ──
  emptyBox: { textAlign: "center", padding: "40px 20px", color: "#9a7a85" },
  emptyIcon: { fontSize: "2.8rem", marginBottom: "10px" },
  emptyText: { fontSize: "0.9rem", margin: 0 },

  spinner: { width: "11px", height: "11px", borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.7s linear infinite" },
};

function ProfileScreen() {
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage]             = useState('');
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [user, setUser]                   = useState(null);
  const [orders, setOrders]               = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [errorOrders, setErrorOrders]     = useState('');
  const [focusedField, setFocusedField]   = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo || !userInfo.token) { navigate('/login'); return; }

    const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

    // Fetch profile
    setLoading(true);
    api.get('/api/users/profile/', config)
      .then(({ data }) => { setUser(data); setName(data.name); setEmail(data.email); })
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false));

    // Fetch orders
    setLoadingOrders(true);
    api.get('/api/orders/myorders/', config)
      .then(({ data }) => setOrders(data))
      .catch(err => setErrorOrders(err.response?.data?.detail || err.message))
      .finally(() => setLoadingOrders(false));
  }, [navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password && password !== confirmPassword) { setMessage('Passwords do not match'); return; }
    setSaving(true);
    setMessage(''); setError('');
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userInfo.token}` } };
      const { data } = await api.put('/api/users/profile/update/', {
        id: user._id, name, email, username: email,
        ...(password && { password }),
      }, config);
      localStorage.setItem('userInfo', JSON.stringify({ ...userInfo, name: data.name, email: data.email }));
      setUser(data);
      setPassword(''); setConfirmPassword('');
      setMessage('Profile updated successfully ✓');
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Derived stats ──
  const totalSpent     = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
  const paidCount      = orders.filter(o => o.isPaid).length;
  const completedCount = orders.filter(o => o.isDelivered).length;

  const getInitials = (n) => n ? n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

  const inputStyle = (field) => ({
    ...s.input,
    ...(focusedField === field ? s.inputFocus : {}),
  });

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={s.page}>

        {/* ── Header ── */}
        <div style={s.header}>
          
          <div style={s.headerInner}>
            <div style={s.avatarLarge}>{getInitials(name)}</div>
            <div style={s.headerText}>
              <h1 style={s.headerTitle}>{name || 'My Profile'}</h1>
              <p style={s.headerSub}>{email} · {orders.length} booking{orders.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={s.body}>

          {/* ── LEFT: Profile form ── */}
          <div>
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h3 style={s.cardTitle}>👤 Edit Profile</h3>
              </div>
              <div style={s.cardBody}>
                {loading ? <Loader /> : (
                  <>
                    {message && (
                      <Message variant={message.includes('✓') ? 'success' : 'danger'}>{message}</Message>
                    )}
                    {error && <Message variant="danger">{error}</Message>}

                    <form onSubmit={submitHandler}>
                      <div style={s.formGroup}>
                        <label style={s.label}>Full Name</label>
                        <input
                          style={inputStyle('name')}
                          type="text" required
                          placeholder="Enter your name"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          onFocus={() => setFocusedField('name')}
                          onBlur={() => setFocusedField('')}
                        />
                      </div>

                      <div style={s.formGroup}>
                        <label style={s.label}>Email Address</label>
                        <input
                          style={inputStyle('email')}
                          type="email" required
                          placeholder="Enter email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField('')}
                        />
                      </div>

                      <div style={s.divider}>
                        <div style={s.dividerLine} />
                        <span style={s.dividerLabel}>Change Password</span>
                        <div style={s.dividerLine} />
                      </div>

                      <div style={s.formGroup}>
                        <label style={s.label}>New Password</label>
                        <input
                          style={inputStyle('password')}
                          type="password"
                          placeholder="Leave blank to keep current"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField('')}
                        />
                      </div>

                      <div style={s.formGroup}>
                        <label style={s.label}>Confirm Password</label>
                        <input
                          style={{
                            ...inputStyle('confirm'),
                            ...(confirmPassword && password !== confirmPassword ? { borderColor: '#c0392b' } : {}),
                            ...(confirmPassword && password === confirmPassword ? { borderColor: '#2e7d52' } : {}),
                          }}
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          onFocus={() => setFocusedField('confirm')}
                          onBlur={() => setFocusedField('')}
                        />
                      </div>

                      <button
                        type="submit"
                        style={{ ...s.submitBtn, opacity: saving ? 0.7 : 1 }}
                        disabled={saving}
                      >
                        {saving ? <><span style={s.spinner} /> Saving…</> : '✓ Save Changes'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Orders ── */}
          <div>
            {/* Stats */}
            <div style={s.statsRow}>
              <div style={s.statCard}>
                <p style={s.statNum}>{orders.length}</p>
                <p style={s.statLabel}>Total Bookings</p>
              </div>
              <div style={s.statCard}>
                <p style={s.statNum}>{paidCount}</p>
                <p style={s.statLabel}>Paid</p>
              </div>
              <div style={s.statCard}>
                <p style={s.statNum}>₹{totalSpent.toLocaleString('en-IN')}</p>
                <p style={s.statLabel}>Total Spent</p>
              </div>
            </div>

            {/* Orders card */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 style={s.cardTitle}>📋 My Bookings</h3>
                  <Link to="/my-appointment/" style={{ fontSize: "0.8rem", color: "#5e143f", fontWeight: 600, textDecoration: "none" }}>
                    View All →
                  </Link>
                </div>
              </div>
              <div style={{ padding: "16px" }}>
                {loadingOrders ? <Loader /> : errorOrders ? <Message variant="danger">{errorOrders}</Message> : orders.length === 0 ? (
                  <div style={s.emptyBox}>
                    <div style={s.emptyIcon}>🎊</div>
                    <p style={s.emptyText}>No bookings yet — start planning your perfect celebration!</p>
                  </div>
                ) : (
                  orders.slice(0, 5).map(order => (
                    <div key={order._id} style={s.orderCard}>
                      {/* Color band */}
                      <div style={{
                        ...s.orderCardBand,
                        background: order.isDelivered
                          ? "linear-gradient(180deg, #2e7d52, #4caf50)"
                          : order.isPaid
                          ? "linear-gradient(180deg, #d4a843, #f9e79f)"
                          : "linear-gradient(180deg, #c0392b, #e74c3c)"
                      }} />

                      {/* Info */}
                      <div style={s.orderInfo}>
                        <span style={s.orderId}>#{order._id.toString().slice(-8).toUpperCase()}</span>
                        <p style={s.orderDate}>
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      {/* Services */}
                      <div style={{ flex: 2, minWidth: "120px" }}>
                        {order.orderItems?.slice(0, 2).map(item => (
                          <span key={item._id} style={{ fontSize: "0.78rem", color: "#5a3a45", display: "block" }}>
                            ✨ {item.service?.name || 'Service'}
                          </span>
                        ))}
                        {order.orderItems?.length > 2 && (
                          <span style={{ fontSize: "0.72rem", color: "#9a7a85" }}>+{order.orderItems.length - 2} more</span>
                        )}
                      </div>

                      {/* Price */}
                      <div style={{ textAlign: "center" }}>
                        <div style={s.orderPrice}>₹{Number(order.totalPrice).toLocaleString('en-IN')}</div>
                      </div>

                      {/* Status */}
                      <div>
                        {order.isDelivered
                          ? <span style={s.badgeGreen}>🎊 Done</span>
                          : order.isPaid
                          ? <span style={{ ...s.badgeGreen, background: "rgba(212,168,67,0.12)", color: "#8a6010", border: "1px solid rgba(212,168,67,0.3)" }}>💰 Paid</span>
                          : <span style={s.badgeRed}>⏳ Pending</span>
                        }
                      </div>

                      {/* Details */}
                      <Link to={`/order/${order._id}`} style={s.detailsBtn}>
                        View →
                      </Link>
                    </div>
                  ))
                )}

                {orders.length > 5 && (
                  <div style={{ textAlign: "center", paddingTop: "8px" }}>
                    <Link to="/my-appointment/" style={{ fontSize: "0.85rem", color: "#5e143f", fontWeight: 600, textDecoration: "none" }}>
                      View all {orders.length} bookings →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default ProfileScreen;