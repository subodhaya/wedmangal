import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import Loader from '../components/Loader';
import Message from '../components/Message';

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  page: { fontFamily: "'DM Sans', sans-serif", background: "#fdf8f0", minHeight: "100vh", padding: "0 0 60px" },
  header: { background: "linear-gradient(135deg, #3d0d29, #5e143f, #7d1d54)", padding: "36px 32px 30px", position: "relative", overflow: "hidden" },
  glow1: { position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", background: "rgba(249,231,159,0.07)", borderRadius: "50%", pointerEvents: "none" },
  headerTop: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", position: "relative", zIndex: 1 },
  headerTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", fontWeight: 700, color: "#f9e79f", margin: "0 0 4px" },
  headerSub: { fontSize: "0.85rem", color: "rgba(249,231,159,0.65)", margin: 0 },
  headerBadge: { background: "rgba(249,231,159,0.15)", border: "1px solid rgba(249,231,159,0.25)", borderRadius: "50px", padding: "8px 20px", fontSize: "0.88rem", fontWeight: 600, color: "#f9e79f" },
  body: { padding: "28px 16px", maxWidth: "960px", margin: "0 auto" },

  // tabs
  tabRow: { display: "flex", gap: "0", marginBottom: "28px", background: "#fff", borderRadius: "16px", border: "1px solid #e8d5de", overflow: "hidden", boxShadow: "0 2px 12px rgba(94,20,63,0.07)" },
  tab: { flex: 1, padding: "14px 10px", border: "none", background: "transparent", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.88rem", color: "#9a7a85", cursor: "pointer", transition: "all 0.18s" },
  tabActive: { flex: 1, padding: "14px 10px", border: "none", background: "linear-gradient(135deg, #3d0d29, #5e143f)", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "#f9e79f", cursor: "pointer" },

  // stats
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", marginBottom: "28px" },
  statCard: { background: "#ffffff", borderRadius: "16px", border: "1px solid #e8d5de", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 2px 12px rgba(94,20,63,0.07)" },
  statIcon: { width: "38px", height: "38px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 },
  statNum: { fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "#5e143f", lineHeight: 1, margin: "0 0 2px" },
  statLabel: { fontSize: "0.72rem", color: "#9a7a85", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", margin: 0 },

  // filter
  filterRow: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" },
  filterTab: { padding: "8px 18px", borderRadius: "50px", border: "1.5px solid #e8d5de", background: "#ffffff", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.83rem", color: "#9a7a85", cursor: "pointer" },
  filterTabActive: { padding: "8px 18px", borderRadius: "50px", border: "1.5px solid #5e143f", background: "linear-gradient(135deg, #3d0d29, #5e143f)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.83rem", color: "#f9e79f", cursor: "pointer" },

  // section divider
  sectionDivider: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" },
  sectionLabel: { fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 600, color: "#5e143f", whiteSpace: "nowrap" },
  sectionLine: { flex: 1, height: "2px", background: "linear-gradient(to right, #d4a843, transparent)", borderRadius: "2px" },

  // booking cards
  apptCard: { background: "#ffffff", borderRadius: "20px", border: "1px solid #e8d5de", boxShadow: "0 3px 16px rgba(94,20,63,0.07)", marginBottom: "16px", overflow: "hidden" },
  cardBand: { height: "4px", background: "linear-gradient(90deg, #5e143f, #d4a843)" },
  cardBandCompleted: { height: "4px", background: "linear-gradient(90deg, #2e7d52, #4caf50)" },
  cardBandPending: { height: "4px", background: "linear-gradient(90deg, #c0392b, #e74c3c)" },
  cardBody: { padding: "20px 22px" },
  cardHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "14px" },
  bookingId: { fontFamily: "monospace", fontSize: "0.75rem", background: "rgba(94,20,63,0.07)", color: "#5e143f", borderRadius: "6px", padding: "3px 8px", display: "inline-block", marginBottom: "4px" },
  bookingDate: { fontSize: "0.8rem", color: "#9a7a85", margin: 0 },

  // badges
  badgeGreen: { display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(46,125,82,0.10)", color: "#1a7a42", border: "1px solid rgba(46,125,82,0.22)", borderRadius: "20px", padding: "5px 12px", fontSize: "0.78rem", fontWeight: 700 },
  badgeRed: { display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(192,57,43,0.08)", color: "#c0392b", border: "1px solid rgba(192,57,43,0.2)", borderRadius: "20px", padding: "5px 12px", fontSize: "0.78rem", fontWeight: 700 },
  badgeGold: { display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(212,168,67,0.12)", color: "#8a6010", border: "1px solid rgba(212,168,67,0.3)", borderRadius: "20px", padding: "5px 12px", fontSize: "0.78rem", fontWeight: 700 },

  // service chips
  servicesRow: { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" },
  serviceChip: { display: "inline-flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)", border: "1px solid #e8d5de", borderRadius: "20px", padding: "6px 14px", fontSize: "0.83rem", fontWeight: 500, color: "#5a3a45" },

  // info row
  infoRow: { display: "flex", flexWrap: "wrap", gap: "20px", padding: "14px 0", borderTop: "1px solid rgba(232,213,222,0.5)", borderBottom: "1px solid rgba(232,213,222,0.5)", marginBottom: "16px" },
  infoLabel: { fontSize: "0.72rem", color: "#9a7a85", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 3px" },
  infoValue: { fontSize: "0.9rem", color: "#2a1a1f", fontWeight: 600, margin: 0 },
  infoValuePrice: { fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#5e143f", fontWeight: 700, margin: 0 },

  // action buttons
  actionsRow: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" },
  toggleBtnBase: { display: "inline-flex", alignItems: "center", gap: "7px", borderRadius: "50px", padding: "9px 20px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.83rem", cursor: "pointer", whiteSpace: "nowrap", border: "none" },
  paidActive: { background: "rgba(46,125,82,0.12)", color: "#1a7a42", border: "1.5px solid rgba(46,125,82,0.28)" },
  paidInactive: { background: "linear-gradient(135deg, #2e7d52, #388e3c)", color: "#ffffff", border: "1.5px solid transparent", boxShadow: "0 3px 10px rgba(46,125,82,0.25)" },
  completedActive: { background: "rgba(94,20,63,0.08)", color: "#5e143f", border: "1.5px solid rgba(94,20,63,0.2)" },
  completedInactive: { background: "linear-gradient(135deg, #3d0d29, #5e143f)", color: "#f9e79f", border: "1.5px solid transparent", boxShadow: "0 3px 10px rgba(94,20,63,0.25)" },
  viewBtn: { display: "inline-flex", alignItems: "center", gap: "6px", background: "#ffffff", color: "#5e143f", border: "1.5px solid #e8d5de", borderRadius: "50px", padding: "8px 18px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.82rem", textDecoration: "none", marginLeft: "auto" },
  spinner: { width: "11px", height: "11px", borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.7s linear infinite" },

  // empty
  emptyCard: { background: "#ffffff", borderRadius: "20px", border: "1px solid #e8d5de", padding: "60px 20px", textAlign: "center", boxShadow: "0 3px 16px rgba(94,20,63,0.07)" },
  emptyIcon: { fontSize: "3.5rem", marginBottom: "14px" },
  emptyTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", color: "#5e143f", margin: "0 0 8px" },
  emptyText: { fontSize: "0.9rem", color: "#9a7a85", margin: "0 0 24px" },
  exploreBtn: { display: "inline-flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #3d0d29, #5e143f)", color: "#f9e79f", textDecoration: "none", borderRadius: "50px", padding: "12px 28px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.9rem", boxShadow: "0 4px 14px rgba(94,20,63,0.25)" },

  // ── CALENDAR ──
  calendarCard: { background: "#ffffff", borderRadius: "20px", border: "1px solid #e8d5de", boxShadow: "0 4px 24px rgba(94,20,63,0.08)", overflow: "hidden", marginBottom: "24px" },
  calendarHeader: { background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)", borderBottom: "1px solid #e8d5de", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  calendarTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600, color: "#5e143f", margin: 0 },
  calendarNav: { display: "flex", alignItems: "center", gap: "12px" },
  navBtn: { width: "34px", height: "34px", borderRadius: "50%", border: "1.5px solid #e8d5de", background: "#fff", color: "#5e143f", fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 },
  monthLabel: { fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 600, color: "#3d0d29", minWidth: "140px", textAlign: "center" },
  calendarGrid: { padding: "16px 20px 20px" },
  weekRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "6px" },
  weekDay: { textAlign: "center", fontSize: "0.72rem", fontWeight: 700, color: "#9a7a85", textTransform: "uppercase", padding: "4px 0" },
  daysGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" },

  // day cell base
  dayCell: { aspectRatio: "1", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", position: "relative", transition: "all 0.15s", border: "1.5px solid transparent" },
  dayCellEmpty: { aspectRatio: "1" },
  dayCellToday: { border: "2px solid #5e143f", fontWeight: 700 },
  dayCellBooked: { background: "rgba(46,125,82,0.18)", color: "#1a6b3c", border: "1.5px solid rgba(46,125,82,0.35)", cursor: "default", fontWeight: 700 },
  dayCellUnavailable: { background: "rgba(192,57,43,0.15)", color: "#a93226", border: "1.5px solid rgba(192,57,43,0.35)", fontWeight: 700 },
  dayCellAvailable: { background: "#fdf8f0", color: "#2a1a1f", border: "1.5px solid transparent" },
  dayCellPast: { background: "transparent", color: "#d0c0c8", cursor: "default", border: "1.5px solid transparent" },
  dayCellSelected: { background: "linear-gradient(135deg, #3d0d29, #5e143f)", color: "#f9e79f", border: "1.5px solid transparent", fontWeight: 700 },

  // dot indicator
  dot: { position: "absolute", bottom: "3px", left: "50%", transform: "translateX(-50%)", width: "4px", height: "4px", borderRadius: "50%", background: "#d4a843" },

  // legend
  legendRow: { display: "flex", flexWrap: "wrap", gap: "16px", padding: "0 20px 18px" },
  legendItem: { display: "flex", alignItems: "center", gap: "7px", fontSize: "0.78rem", color: "#5a3a45", fontWeight: 500 },
  legendDot: { width: "12px", height: "12px", borderRadius: "3px", flexShrink: 0 },

  // block date panel
  blockPanel: { borderTop: "1px solid #e8d5de", padding: "18px 20px" },
  blockTitle: { fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 600, color: "#5e143f", margin: "0 0 14px" },
  blockForm: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "16px" },
  blockInput: { flex: 1, minWidth: "160px", padding: "9px 14px", borderRadius: "10px", border: "1.5px solid #e8d5de", fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", color: "#2a1a1f", background: "#fdf8f0", outline: "none" },
  blockBtn: { display: "inline-flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #3d0d29, #5e143f)", color: "#f9e79f", border: "none", borderRadius: "10px", padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap" },
  blockBtnRemove: { display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(192,57,43,0.08)", color: "#c0392b", border: "1px solid rgba(192,57,43,0.2)", borderRadius: "8px", padding: "5px 12px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" },

  // blocked list
  blockedList: { display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto" },
  blockedItem: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(192,57,43,0.05)", border: "1px solid rgba(192,57,43,0.15)", borderRadius: "10px", padding: "9px 14px" },
  blockedDate: { fontWeight: 600, fontSize: "0.88rem", color: "#c0392b" },
  blockedReason: { fontSize: "0.78rem", color: "#ce5d40", marginLeft: "10px" },

  // selected date info box
  selectedBox: { background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)", border: "1px solid #e8d5de", borderRadius: "12px", padding: "14px 18px", marginBottom: "16px" },
  selectedTitle: { fontFamily: "'Playfair Display', serif", fontSize: "0.9rem", fontWeight: 600, color: "#5e143f", margin: "0 0 6px" },
  selectedDetail: { fontSize: "0.83rem", color: "#5a3a45", margin: "0 0 4px" },
};

const FILTERS = [
  { key: 'all',       label: '📋 All' },
  { key: 'pending',   label: '⏳ Pending' },
  { key: 'paid',      label: '💰 Paid' },
  { key: 'completed', label: '🎊 Completed' },
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─────────────────────────────────────────────────────────────────────────────
//  CALENDAR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function VendorCalendar({ userInfo }) {
  const today = new Date();
  const [viewDate, setViewDate]           = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [bookedDates, setBookedDates]     = useState([]);       // ["2025-04-10", ...]
  const [unavailDates, setUnavailDates]   = useState([]);       // [{date, reason, _id}, ...]
  const [selectedDate, setSelectedDate]   = useState(null);     // "2025-04-15"
  const [blockReason, setBlockReason]     = useState('');
  const [saving, setSaving]               = useState(false);
  const [calLoading, setCalLoading]       = useState(true);
  const [calError, setCalError]           = useState('');

  const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

  // ── Fetch calendar data ──
  const fetchCalendar = useCallback(async () => {
    setCalLoading(true);
    setCalError('');
    try {
      const { data } = await api.get('/api/orders/calendar/', config);
      setBookedDates(data.booked_dates || []);
      setUnavailDates(data.unavailable_dates || []);
    } catch (err) {
      setCalError(err.response?.data?.detail || 'Could not load calendar');
    } finally {
      setCalLoading(false);
    }
  }, []);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  // ── Block a date ──
  const handleBlock = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      await api.post('/api/orders/calendar/block/', {
        date: selectedDate,
        reason: blockReason || 'Unavailable',
      }, config);
      setBlockReason('');
      await fetchCalendar();
    } catch (err) {
      setCalError(err.response?.data?.detail || 'Could not block date');
    } finally {
      setSaving(false);
    }
  };

  // ── Unblock a date ──
  const handleUnblock = async (id) => {
    try {
      await api.delete(`/api/orders/calendar/block/${id}/`, config);
      await fetchCalendar();
    } catch (err) {
      setCalError('Could not unblock date');
    }
  };

  // ── Calendar navigation ──
  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // ── Build days grid ──
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const toStr = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayStr = toStr(today.getFullYear(), today.getMonth(), today.getDate());

  const isBooked    = d => bookedDates.includes(d);
  const unavailObj  = d => unavailDates.find(u => u.date === d);
  const isUnavail   = d => !!unavailObj(d);
  const isPast      = d => d < todayStr;

  // Info for selected date
  const selectedBookings = selectedDate
    ? bookedDates.filter(d => d === selectedDate).length
    : 0;
  const selectedUnavail = selectedDate ? unavailObj(selectedDate) : null;

  // Day cell style
  const getDayStyle = (dateStr) => {
    if (dateStr === selectedDate)    return { ...s.dayCell, ...s.dayCellSelected };
    if (isBooked(dateStr))           return { ...s.dayCell, ...s.dayCellBooked };
    if (isUnavail(dateStr))          return { ...s.dayCell, ...s.dayCellUnavailable };
    if (isPast(dateStr))             return { ...s.dayCell, ...s.dayCellPast };
    return { ...s.dayCell, ...s.dayCellAvailable };
  };

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={s.calendarCard}>
      {/* Header */}
      <div style={s.calendarHeader}>
        <h3 style={s.calendarTitle}>📅 Availability Calendar</h3>
        <div style={s.calendarNav}>
          <button style={s.navBtn} onClick={prevMonth}>‹</button>
          <span style={s.monthLabel}>{MONTHS[month]} {year}</span>
          <button style={s.navBtn} onClick={nextMonth}>›</button>
        </div>
      </div>

      {calLoading ? (
        <div style={{ padding: "30px", textAlign: "center", color: "#9a7a85" }}>Loading calendar…</div>
      ) : calError ? (
        <div style={{ padding: "20px" }}><Message variant="danger">{calError}</Message></div>
      ) : (
        <>
          {/* Grid */}
          <div style={s.calendarGrid}>
            {/* Weekday headers */}
            <div style={s.weekRow}>
              {WEEKDAYS.map(w => <div key={w} style={s.weekDay}>{w}</div>)}
            </div>

            {/* Day cells */}
            <div style={s.daysGrid}>
              {cells.map((day, idx) => {
                if (!day) return <div key={`e${idx}`} style={s.dayCellEmpty} />;
                const dateStr = toStr(year, month, day);
                const isToday = dateStr === todayStr;
                const cellStyle = {
                  ...getDayStyle(dateStr),
                  ...(isToday && dateStr !== selectedDate ? { boxShadow: "0 0 0 2px #5e143f" } : {}),
                };
                return (
                  <div
                    key={dateStr}
                    style={cellStyle}
                    onClick={() => !isPast(dateStr) || isBooked(dateStr) ? setSelectedDate(dateStr === selectedDate ? null : dateStr) : null}
                    title={
                      isBooked(dateStr) ? 'Booked by customer'
                      : isUnavail(dateStr) ? `Blocked: ${unavailObj(dateStr).reason}`
                      : 'Available'
                    }
                  >
                    {day}
                    {isBooked(dateStr) && <span style={s.dot} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={s.legendRow}>
            {[
              { color: "rgba(94,20,63,0.12)", border: "1px solid rgba(94,20,63,0.25)", label: "Customer Booked" },
              { color: "rgba(199, 44, 27, 0.1)", border: "1px solid rgba(209, 53, 36, 0.25)", label: "Blocked by You" },
              { color: "#fdf8f0", border: "1px solid #e8d5de", label: "Available" },
              { color: "linear-gradient(135deg, #3d0d29, #5e143f)", border: "none", label: "Selected" },
            ].map(l => (
              <div key={l.label} style={s.legendItem}>
                <div style={{ ...s.legendDot, background: l.color, border: l.border }} />
                {l.label}
              </div>
            ))}
          </div>

          {/* Selected date info */}
          {selectedDate && (
            <div style={{ padding: "0 20px 4px" }}>
              <div style={s.selectedBox}>
                <p style={s.selectedTitle}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {isBooked(selectedDate) && (
                  <p style={s.selectedDetail}>🔴 This date has <strong>{selectedBookings}</strong> customer booking(s) — cannot be unbooked</p>
                )}
                {selectedUnavail && (
                  <p style={s.selectedDetail}>🚫 Blocked by you — Reason: <strong>{selectedUnavail.reason}</strong></p>
                )}
                {!isBooked(selectedDate) && !selectedUnavail && (
                  <p style={s.selectedDetail}>✅ This date is available for bookings</p>
                )}
              </div>
            </div>
          )}

          {/* Block / unblock panel */}
          <div style={s.blockPanel}>
            <p style={s.blockTitle}>🚫 Block a Date</p>

            <div style={s.blockForm}>
              <input
                type="date"
                style={s.blockInput}
                value={selectedDate || ''}
                min={todayStr}
                onChange={e => setSelectedDate(e.target.value)}
                placeholder="Select date"
              />
              <input
                type="text"
                style={{ ...s.blockInput, flex: 2 }}
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="Reason (optional) e.g. Holiday, Personal leave"
              />
              <button
                style={{ ...s.blockBtn, opacity: (!selectedDate || saving) ? 0.6 : 1 }}
                onClick={handleBlock}
                disabled={!selectedDate || saving || isBooked(selectedDate || '')}
                title={isBooked(selectedDate || '') ? 'Cannot block a customer-booked date' : ''}
              >
                {saving ? '…' : '🚫 Block Date'}
              </button>
            </div>

            {/* List of blocked dates */}
            {unavailDates.length > 0 && (
              <>
                <p style={{ ...s.blockTitle, marginBottom: "10px", fontSize: "0.85rem" }}>
                  Currently Blocked ({unavailDates.length})
                </p>
                <div style={s.blockedList}>
                  {unavailDates.map(u => (
                    <div key={u._id} style={s.blockedItem}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span style={s.blockedDate}>
                          {new Date(u.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span style={s.blockedReason}>{u.reason}</span>
                      </div>
                      <button style={s.blockBtnRemove} onClick={() => handleUnblock(u._id)}>
                        ✕ Unblock
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function MyAppointmentsScreen() {
  const [orders, setOrders]                       = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState('');
  const [filter, setFilter]                       = useState('all');
  const [activeTab, setActiveTab]                 = useState('bookings'); // 'bookings' | 'calendar'
  const [togglingPaid, setTogglingPaid]           = useState(null);
  const [togglingCompleted, setTogglingCompleted] = useState(null);

  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const isVendor = userInfo?.role === 'service-owner';

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userInfo) { navigate('/login'); return; }
      try {
        const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
        const { data } = await api.get('/api/orders/myorders/', config);
        setOrders(data);
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [navigate]);

  const togglePaid = async (orderId, current) => {
    setTogglingPaid(orderId);
    try {
      await api.put(`/api/orders/${orderId}/pay/`, { isPaid: !current },
        { headers: { Authorization: `Bearer ${userInfo.token}` } });
      setOrders(prev => prev.map(o =>
        o._id === orderId ? { ...o, isPaid: !current, paidAt: !current ? new Date().toISOString() : null } : o
      ));
    } catch { setError('Could not update payment status.'); }
    finally { setTogglingPaid(null); }
  };

  const toggleCompleted = async (orderId, current) => {
    setTogglingCompleted(orderId);
    try {
      await api.put(`/api/orders/${orderId}/deliver/`, { isDelivered: !current },
        { headers: { Authorization: `Bearer ${userInfo.token}` } });
      setOrders(prev => prev.map(o =>
        o._id === orderId ? { ...o, isDelivered: !current, deliveredAt: !current ? new Date().toISOString() : null } : o
      ));
    } catch { setError('Could not update completion status.'); }
    finally { setTogglingCompleted(null); }
  };

  const filtered = orders.filter(o => {
    if (filter === 'paid')      return o.isPaid;
    if (filter === 'completed') return o.isDelivered;
    if (filter === 'pending')   return !o.isPaid || !o.isDelivered;
    return true;
  });

  const totalSpent     = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
  const paidCount      = orders.filter(o => o.isPaid).length;
  const completedCount = orders.filter(o => o.isDelivered).length;
  const pendingCount   = orders.filter(o => !o.isPaid || !o.isDelivered).length;

  const getBand = (order) => {
    if (order.isDelivered) return s.cardBandCompleted;
    if (!order.isPaid)     return s.cardBandPending;
    return s.cardBand;
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={s.page}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.glow1} />
          <div style={s.headerTop}>
            <div>
              <h1 style={s.headerTitle}>📅 My Appointments</h1>
              <p style={s.headerSub}>Welcome, {userInfo?.name?.split(' ')[0] || 'there'} — manage your bookings below</p>
            </div>
            {!loading && !error && (
              <div style={s.headerBadge}>{orders.length} {orders.length === 1 ? 'Booking' : 'Bookings'}</div>
            )}
          </div>
        </div>

        <div style={s.body}>
          {loading ? <Loader /> : error ? <Message variant="danger">{error}</Message> : (
            <>
              {/* ── Tab switcher (calendar tab only for vendors) ── */}
              {isVendor && (
                <div style={s.tabRow}>
                  <button style={activeTab === 'bookings' ? s.tabActive : s.tab} onClick={() => setActiveTab('bookings')}>
                    📋 My Bookings
                  </button>
                  <button style={activeTab === 'calendar' ? s.tabActive : s.tab} onClick={() => setActiveTab('calendar')}>
                    🗓️ Availability Calendar
                  </button>
                </div>
              )}

              {/* ── CALENDAR TAB ── */}
              {activeTab === 'calendar' && isVendor && (
                <VendorCalendar userInfo={userInfo} />
              )}

              {/* ── BOOKINGS TAB ── */}
              {activeTab === 'bookings' && (
                <>
                  {/* Stats */}
                  <div style={s.statsRow}>
                    {[
                      { icon: "📦", bg: "rgba(94,20,63,0.08)",   num: orders.length,  label: "Total" },
                      { icon: "⏳", bg: "rgba(192,57,43,0.08)",  num: pendingCount,   label: "Pending" },
                      { icon: "💰", bg: "rgba(212,168,67,0.12)", num: paidCount,      label: "Paid" },
                      { icon: "🎊", bg: "rgba(46,125,82,0.08)",  num: completedCount, label: "Completed" },
                      { icon: "💸", bg: "rgba(94,20,63,0.08)",   num: `₹${totalSpent.toLocaleString('en-IN')}`, label: "Total Spent" },
                    ].map(stat => (
                      <div key={stat.label} style={s.statCard}>
                        <div style={{ ...s.statIcon, background: stat.bg }}>{stat.icon}</div>
                        <div>
                          <p style={s.statNum}>{stat.num}</p>
                          <p style={s.statLabel}>{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Filter */}
                  <div style={s.filterRow}>
                    {FILTERS.map(f => (
                      <button key={f.key} style={filter === f.key ? s.filterTabActive : s.filterTab} onClick={() => setFilter(f.key)}>
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div style={s.sectionDivider}>
                    <span style={s.sectionLabel}>{FILTERS.find(f => f.key === filter)?.label} Appointments</span>
                    <div style={s.sectionLine} />
                  </div>

                  {/* Cards */}
                  {filtered.length === 0 ? (
                    <div style={s.emptyCard}>
                      <div style={s.emptyIcon}>{filter === 'all' ? '🎊' : '🔍'}</div>
                      <h3 style={s.emptyTitle}>{filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}</h3>
                      <p style={s.emptyText}>{filter === 'all' ? "You haven't made any bookings yet. Explore vendors and book your dream wedding!" : `No bookings match the "${filter}" filter.`}</p>
                      {filter === 'all' && <Link to="/" style={s.exploreBtn}>✨ Explore Vendors</Link>}
                    </div>
                  ) : (
                    filtered.map((order) => (
                      <div key={order._id} style={s.apptCard}>
                        <div style={getBand(order)} />
                        <div style={s.cardBody}>
                          <div style={s.cardHeader}>
                            <div>
                              <span style={s.bookingId}>#{order._id.toString().slice(-8).toUpperCase()}</span>
                              <p style={s.bookingDate}>📅 Booked on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div>
                              {order.isDelivered
                                ? <span style={s.badgeGreen}>🎊 Completed</span>
                                : order.isPaid
                                ? <span style={s.badgeGold}>💰 Paid · Awaiting Service</span>
                                : <span style={s.badgeRed}>⏳ Pending Payment</span>
                              }
                            </div>
                          </div>

                          <div style={s.servicesRow}>
                            {order.orderItems?.map((item) => (
                              <span key={item._id} style={s.serviceChip}>✨ {item.service?.name || 'Service'}</span>
                            ))}
                          </div>

                          <div style={s.infoRow}>
                            <div><p style={s.infoLabel}>Total Amount</p><p style={s.infoValuePrice}>₹{Number(order.totalPrice).toLocaleString('en-IN')}</p></div>
                            {order.isPaid && order.paidAt && (
                              <div><p style={s.infoLabel}>Paid On</p><p style={s.infoValue}>{new Date(order.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                            )}
                            {order.isDelivered && order.deliveredAt && (
                              <div><p style={s.infoLabel}>Completed On</p><p style={s.infoValue}>{new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                            )}
                            {order.orderItems?.[0]?.start_date && (
                              <div><p style={s.infoLabel}>Event Date</p><p style={s.infoValue}>📆 {new Date(order.orderItems[0].start_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                            )}
                          </div>

                          <div style={s.actionsRow}>
                            <button
                              style={{ ...s.toggleBtnBase, ...(order.isPaid ? s.paidActive : s.paidInactive), opacity: togglingPaid === order._id ? 0.65 : 1 }}
                              onClick={() => togglePaid(order._id, order.isPaid)}
                              disabled={togglingPaid === order._id || togglingCompleted === order._id}
                            >
                              {togglingPaid === order._id ? <><span style={s.spinner} /> Updating…</> : order.isPaid ? <>✓ Paid</> : <>○ Mark as Paid</>}
                            </button>

                            <button
                              style={{ ...s.toggleBtnBase, ...(order.isDelivered ? s.completedActive : s.completedInactive), opacity: togglingCompleted === order._id ? 0.65 : 1 }}
                              onClick={() => toggleCompleted(order._id, order.isDelivered)}
                              disabled={togglingPaid === order._id || togglingCompleted === order._id}
                            >
                              {togglingCompleted === order._id ? <><span style={s.spinner} /> Updating…</> : order.isDelivered ? <>🎊 Completed</> : <>○ Mark as Completed</>}
                            </button>

                            <Link to={`/order/${order._id}`} style={s.viewBtn}>View Details →</Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default MyAppointmentsScreen;