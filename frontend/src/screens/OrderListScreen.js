import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import Loader from '../components/Loader';
import Message from '../components/Message';

const s = {
  page: {
    fontFamily: "'DM Sans', sans-serif",
    background: "#fdf8f0",
    minHeight: "100vh",
    padding: "0 0 60px",
  },

  // ── Header banner ──
  header: {
    background: "linear-gradient(135deg, #3d0d29, #5e143f, #7d1d54)",
    padding: "36px 32px 30px",
    position: "relative", overflow: "hidden",
  },
  glow1: {
    position: "absolute", top: "-60px", right: "-60px",
    width: "200px", height: "200px",
    background: "rgba(249,231,159,0.07)", borderRadius: "50%",
    pointerEvents: "none",
  },
  headerTop: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between", flexWrap: "wrap", gap: "12px",
    position: "relative", zIndex: 1,
  },
  headerLeft: {},
  headerTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.8rem", fontWeight: 700,
    color: "#f9e79f", margin: "0 0 4px",
  },
  headerSub: {
    fontSize: "0.85rem",
    color: "rgba(249,231,159,0.65)", margin: 0,
  },
  headerBadge: {
    background: "rgba(249,231,159,0.15)",
    border: "1px solid rgba(249,231,159,0.25)",
    borderRadius: "50px",
    padding: "8px 20px",
    fontSize: "0.88rem", fontWeight: 600,
    color: "#f9e79f",
  },

  // ── Body ──
  body: { padding: "28px 20px", maxWidth: "1100px", margin: "0 auto" },

  // ── Stats row ──
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "14px", marginBottom: "28px",
  },
  statCard: {
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e8d5de",
    padding: "18px 20px",
    display: "flex", alignItems: "center", gap: "12px",
    boxShadow: "0 2px 12px rgba(94,20,63,0.07)",
  },
  statIcon: {
    width: "40px", height: "40px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.1rem", flexShrink: 0,
  },
  statNum: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.4rem", fontWeight: 700,
    color: "#5e143f", lineHeight: 1, margin: "0 0 2px",
  },
  statLabel: {
    fontSize: "0.74rem", color: "#9a7a85",
    fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.4px", margin: 0,
  },

  // ── Section header ──
  sectionDivider: {
    display: "flex", alignItems: "center",
    gap: "12px", marginBottom: "18px",
  },
  sectionLabel: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.05rem", fontWeight: 600,
    color: "#5e143f", whiteSpace: "nowrap",
  },
  sectionLine: {
    flex: 1, height: "2px",
    background: "linear-gradient(to right, #d4a843, transparent)",
    borderRadius: "2px",
  },

  // ── Table card ──
  tableCard: {
    background: "#ffffff",
    borderRadius: "20px",
    border: "1px solid #e8d5de",
    boxShadow: "0 4px 24px rgba(94,20,63,0.08)",
    overflow: "hidden",
  },

  // ── Table ──
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.88rem",
  },
  thead: {
    background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)",
    borderBottom: "2px solid #e8d5de",
  },
  th: {
    padding: "14px 16px",
    textAlign: "left",
    fontWeight: 700,
    fontSize: "0.76rem",
    color: "#9a7a85",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",
  },
  thCenter: {
    padding: "14px 16px",
    textAlign: "center",
    fontWeight: 700,
    fontSize: "0.76rem",
    color: "#9a7a85",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 16px",
    borderBottom: "1px solid rgba(232,213,222,0.5)",
    color: "#2a1a1f",
    verticalAlign: "middle",
  },
  tdCenter: {
    padding: "14px 16px",
    borderBottom: "1px solid rgba(232,213,222,0.5)",
    color: "#2a1a1f",
    verticalAlign: "middle",
    textAlign: "center",
  },

  // ── Row hover handled via className ──
  trEven: { background: "#ffffff" },
  trOdd:  { background: "#fffcf8" },

  // ── ID chip ──
  idChip: {
    fontFamily: "monospace",
    fontSize: "0.75rem",
    background: "rgba(94,20,63,0.07)",
    color: "#5e143f",
    borderRadius: "6px",
    padding: "3px 8px",
    display: "inline-block",
  },

  // ── User name ──
  userName: {
    fontWeight: 600, color: "#2a1a1f",
    display: "flex", alignItems: "center", gap: "7px",
  },
  userAvatar: {
    width: "28px", height: "28px", borderRadius: "50%",
    background: "linear-gradient(135deg, #5e143f, #7d1d54)",
    color: "#f9e79f",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.72rem", fontWeight: 700, flexShrink: 0,
  },

  // ── Service tags ──
  serviceName: {
    display: "inline-block",
    background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)",
    border: "1px solid #e8d5de",
    borderRadius: "20px",
    padding: "3px 10px",
    fontSize: "0.8rem",
    color: "#5a3a45",
    margin: "2px",
  },

  // ── Price ──
  price: {
    fontFamily: "'Playfair Display', serif",
    fontWeight: 700, fontSize: "0.95rem",
    color: "#5e143f",
  },

  // ── Status badges ──
  badgeGreen: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    background: "rgba(46,125,82,0.10)",
    color: "#1a7a42",
    border: "1px solid rgba(46,125,82,0.2)",
    borderRadius: "20px", padding: "4px 10px",
    fontSize: "0.76rem", fontWeight: 600,
  },
  badgeRed: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    background: "rgba(192,57,43,0.08)",
    color: "#c0392b",
    border: "1px solid rgba(192,57,43,0.18)",
    borderRadius: "20px", padding: "4px 10px",
    fontSize: "0.76rem", fontWeight: 600,
  },

  // ── Details button ──
  detailsBtn: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "linear-gradient(135deg, #3d0d29, #5e143f)",
    color: "#f9e79f",
    border: "none", borderRadius: "20px",
    padding: "7px 16px",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600, fontSize: "0.8rem",
    cursor: "pointer", textDecoration: "none",
    boxShadow: "0 2px 8px rgba(94,20,63,0.22)",
    whiteSpace: "nowrap",
  },

  // ── Empty state ──
  emptyState: {
    textAlign: "center", padding: "60px 20px",
    color: "#9a7a85",
  },
  emptyIcon: { fontSize: "3rem", marginBottom: "12px" },
  emptyTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.2rem", color: "#5e143f", margin: "0 0 8px",
  },
  emptyText: { fontSize: "0.9rem", margin: 0 },

  // ── Responsive note ──
  scrollNote: {
    fontSize: "0.75rem", color: "#b8a0aa",
    textAlign: "right", marginBottom: "8px",
    fontStyle: "italic",
  },
};

function OrderListScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const navigate = useNavigate();

  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userInfo) { navigate('/login'); return; }
      try {
        const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
        const { data } = await api.get('/api/orders/', config);
        setOrders(data.orders);
      } catch (err) {
        setError(
          err.response?.data?.detail || err.message
        );
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [navigate]);

  // ── Derived stats ──
  const totalRevenue  = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
  const paidCount     = orders.filter(o => o.isPaid).length;
  const completedCount = orders.filter(o => o.isDelivered).length;

  const getInitials = (name) =>
    name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      <div style={s.page}>

        {/* ── Header ─────────────────────────────── */}
        <div style={s.header}>
          <div style={s.glow1} />
          <div style={s.headerTop}>
            <div style={s.headerLeft}>
              <h1 style={s.headerTitle}>📋 Bookings</h1>
              <p style={s.headerSub}>All customer bookings across your services</p>
            </div>
            {!loading && !error && (
              <div style={s.headerBadge}>
                {orders.length} {orders.length === 1 ? 'Booking' : 'Bookings'}
              </div>
            )}
          </div>
        </div>

        <div style={s.body}>

          {loading ? <Loader /> : error ? <Message variant="danger">{error}</Message> : (
            <>
              {/* ── Stats row ──────────────────────── */}
              <div style={s.statsRow}>
                <div style={s.statCard}>
                  <div style={{ ...s.statIcon, background: "rgba(94,20,63,0.08)" }}>📦</div>
                  <div>
                    <p style={s.statNum}>{orders.length}</p>
                    <p style={s.statLabel}>Total Bookings</p>
                  </div>
                </div>
                <div style={s.statCard}>
                  <div style={{ ...s.statIcon, background: "rgba(46,125,82,0.08)" }}>💰</div>
                  <div>
                    <p style={s.statNum}>₹{totalRevenue.toLocaleString('en-IN')}</p>
                    <p style={s.statLabel}>Total Revenue</p>
                  </div>
                </div>
                <div style={s.statCard}>
                  <div style={{ ...s.statIcon, background: "rgba(212,168,67,0.12)" }}>✅</div>
                  <div>
                    <p style={s.statNum}>{paidCount}</p>
                    <p style={s.statLabel}>Paid</p>
                  </div>
                </div>
                <div style={s.statCard}>
                  <div style={{ ...s.statIcon, background: "rgba(94,20,63,0.08)" }}>🎊</div>
                  <div>
                    <p style={s.statNum}>{completedCount}</p>
                    <p style={s.statLabel}>Completed</p>
                  </div>
                </div>
              </div>

              {/* ── Section divider ────────────────── */}
              <div style={s.sectionDivider}>
                <span style={s.sectionLabel}>📋 All Bookings</span>
                <div style={s.sectionLine} />
              </div>

              {orders.length === 0 ? (
                <div style={s.tableCard}>
                  <div style={s.emptyState}>
                    <div style={s.emptyIcon}>🎊</div>
                    <h3 style={s.emptyTitle}>No bookings yet</h3>
                    <p style={s.emptyText}>Bookings will appear here once customers start placing orders.</p>
                  </div>
                </div>
              ) : (
                <>
                  <p style={s.scrollNote}>← Scroll horizontally on small screens</p>
                  <div style={s.tableCard}>
                    <div style={{ overflowX: "auto" }}>
                      <table style={s.table}>
                        <thead style={s.thead}>
                          <tr>
                            <th style={s.th}>Booking ID</th>
                            <th style={s.th}>Customer</th>
                            <th style={s.th}>Booked On</th>
                            <th style={s.th}>Service(s)</th>
                            <th style={s.th}>Total</th>
                            <th style={s.thCenter}>Paid</th>
                            <th style={s.thCenter}>Completed</th>
                            <th style={s.thCenter}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order, idx) => (
                            <tr key={order._id} style={idx % 2 === 0 ? s.trEven : s.trOdd}>

                              {/* ID */}
                              <td style={s.td}>
                                <span style={s.idChip}>
                                  #{order._id.toString().slice(-6).toUpperCase()}
                                </span>
                              </td>

                              {/* Customer */}
                              <td style={s.td}>
                                <div style={s.userName}>
                                  <div style={s.userAvatar}>
                                    {getInitials(order.user?.name)}
                                  </div>
                                  {order.user?.name || '—'}
                                </div>
                              </td>

                              {/* Date */}
                              <td style={s.td}>
                                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric', month: 'short', year: 'numeric'
                                })}
                              </td>

                              {/* Services */}
                              <td style={s.td}>
                                {order.orderItems.map((item) => (
                                  <span key={item._id} style={s.serviceName}>
                                    {item.service?.name || 'Service'}
                                  </span>
                                ))}
                              </td>

                              {/* Price */}
                              <td style={s.td}>
                                <span style={s.price}>
                                  ₹{Number(order.totalPrice).toLocaleString('en-IN')}
                                </span>
                              </td>

                              {/* Paid */}
                              <td style={s.tdCenter}>
                                {order.isPaid ? (
                                  <span style={s.badgeGreen}>
                                    ✓ {new Date(order.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </span>
                                ) : (
                                  <span style={s.badgeRed}>✕ Unpaid</span>
                                )}
                              </td>

                              {/* Completed */}
                              <td style={s.tdCenter}>
                                {order.isDelivered ? (
                                  <span style={s.badgeGreen}>
                                    ✓ Done
                                  </span>
                                ) : (
                                  <span style={s.badgeRed}>✕ Pending</span>
                                )}
                              </td>

                              {/* Details */}
                              <td style={s.tdCenter}>
                                <Link to={`/order/${order._id}`} style={s.detailsBtn}>
                                  View →
                                </Link>
                              </td>

                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default OrderListScreen;