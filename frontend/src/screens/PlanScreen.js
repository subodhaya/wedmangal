import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const s = {
  page: { fontFamily: "'DM Sans', sans-serif", background: "#fdf8f0", minHeight: "100vh", padding: "0 0 60px" },

  // ── Header ──
  header: { background: "linear-gradient(135deg, #3d0d29, #5e143f, #7d1d54)", padding: "40px 32px 36px", position: "relative", overflow: "hidden", textAlign: "center" },
  glow1: { position: "absolute", top: "-60px", right: "-60px", width: "220px", height: "220px", background: "rgba(249,231,159,0.07)", borderRadius: "50%", pointerEvents: "none" },
  glow2: { position: "absolute", bottom: "-80px", left: "-40px", width: "200px", height: "200px", background: "rgba(249,231,159,0.05)", borderRadius: "50%", pointerEvents: "none" },
  headerInner: { position: "relative", zIndex: 1 },
  headerIcon: { fontSize: "2.5rem", marginBottom: "12px", display: "block" },
  headerTitle: { fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 700, color: "#f9e79f", margin: "0 0 8px" },
  headerSub: { fontSize: "0.92rem", color: "rgba(249,231,159,0.7)", margin: 0 },

  // ── Body ──
  body: { padding: "32px 16px", maxWidth: "680px", margin: "0 auto" },

  // ── Card ──
  card: { background: "#ffffff", borderRadius: "24px", border: "1px solid #e8d5de", boxShadow: "0 8px 32px rgba(94,20,63,0.10)", overflow: "hidden" },
  cardHeader: { background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)", borderBottom: "1px solid #e8d5de", padding: "20px 28px" },
  cardTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600, color: "#5e143f", margin: 0 },
  cardBody: { padding: "28px" },

  // ── Form ──
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "18px" },
  formGroup: { marginBottom: "18px" },
  label: { display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#9a7a85", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e8d5de", fontFamily: "'DM Sans', sans-serif", fontSize: "0.92rem", color: "#2a1a1f", background: "#fdf8f0", outline: "none", boxSizing: "border-box", transition: "border-color 0.18s" },
  select: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid #e8d5de", fontFamily: "'DM Sans', sans-serif", fontSize: "0.92rem", color: "#2a1a1f", background: "#fdf8f0", outline: "none", boxSizing: "border-box", cursor: "pointer", appearance: "none" },

  // ── Function selector ──
  fnRow: { display: "flex", gap: "10px", flexWrap: "wrap" },
  fnBtn: { flex: 1, minWidth: "80px", padding: "10px 8px", borderRadius: "12px", border: "1.5px solid #e8d5de", background: "#fdf8f0", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.85rem", color: "#9a7a85", cursor: "pointer", textAlign: "center", transition: "all 0.18s" },
  fnBtnActive: { flex: 1, minWidth: "80px", padding: "10px 8px", borderRadius: "12px", border: "1.5px solid #5e143f", background: "linear-gradient(135deg, #3d0d29, #5e143f)", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#f9e79f", cursor: "pointer", textAlign: "center" },

  // ── Budget slider ──
  sliderWrap: { position: "relative", marginTop: "4px" },
  slider: { width: "100%", accentColor: "#5e143f", cursor: "pointer", height: "6px" },
  sliderLabels: { display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#9a7a85", marginTop: "4px" },
  budgetDisplay: { textAlign: "center", fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 700, color: "#5e143f", margin: "8px 0 0" },

  // ── Submit ──
  submitBtn: { width: "100%", padding: "14px", borderRadius: "50px", border: "none", background: "linear-gradient(135deg, #3d0d29, #5e143f)", color: "#f9e79f", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "1rem", cursor: "pointer", boxShadow: "0 4px 18px rgba(94,20,63,0.28)", marginTop: "8px", transition: "opacity 0.18s" },

  // ── Plan result ──
  planMeta: { display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "24px" },
  planMetaBadge: { display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(94,20,63,0.07)", border: "1px solid #e8d5de", borderRadius: "50px", padding: "6px 14px", fontSize: "0.83rem", fontWeight: 600, color: "#5e143f" },

  // ── Progress tracker ──
  progressWrap: { marginBottom: "28px" },
  progressLabel: { display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#9a7a85", marginBottom: "8px" },
  progressBar: { height: "8px", borderRadius: "8px", background: "#f0e0e8", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: "8px", background: "linear-gradient(90deg, #5e143f, #d4a843)", transition: "width 0.4s ease" },

  // ── Step cards ──
  stepGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  stepCard: { background: "#ffffff", borderRadius: "16px", border: "1px solid #e8d5de", padding: "18px", boxShadow: "0 2px 12px rgba(94,20,63,0.07)", transition: "box-shadow 0.2s" },
  stepCardDone: { background: "rgba(46,125,82,0.04)", borderRadius: "16px", border: "1.5px solid rgba(46,125,82,0.25)", padding: "18px", boxShadow: "0 2px 12px rgba(46,125,82,0.08)" },
  stepNum: { width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #3d0d29, #5e143f)", color: "#f9e79f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, marginBottom: "10px" },
  stepNumDone: { width: "28px", height: "28px", borderRadius: "50%", background: "rgba(46,125,82,0.15)", color: "#1a7a42", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", marginBottom: "10px" },
  stepIcon: { fontSize: "1.3rem", marginBottom: "6px", display: "block" },
  stepTitle: { fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 600, color: "#3d0d29", margin: "0 0 4px" },
  stepDesc: { fontSize: "0.78rem", color: "#9a7a85", margin: "0 0 12px", lineHeight: 1.5 },
  stepBookBtn: { display: "inline-flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #3d0d29, #5e143f)", color: "#f9e79f", border: "none", borderRadius: "20px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", width: "100%", justifyContent: "center", boxShadow: "0 2px 8px rgba(94,20,63,0.2)" },
  stepDoneBtn: { display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(46,125,82,0.10)", color: "#1a7a42", border: "1px solid rgba(46,125,82,0.25)", borderRadius: "20px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", width: "100%", justifyContent: "center" },

  // ── Reset ──
  resetBtn: { display: "block", margin: "24px auto 0", background: "none", border: "1.5px solid #e8d5de", borderRadius: "50px", padding: "10px 28px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.85rem", color: "#9a7a85", cursor: "pointer" },

  divider: { display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" },
  dividerLine: { flex: 1, height: "2px", background: "linear-gradient(to right, #d4a843, transparent)", borderRadius: "2px" },
  dividerLabel: { fontFamily: "'Playfair Display', serif", fontSize: "0.85rem", color: "#9a7a85", whiteSpace: "nowrap" },
};

const FUNCTIONS = [
  { val: "1", label: "1 Function", desc: "Just the wedding" },
  { val: "2", label: "2 Functions", desc: "Engagement + Wedding" },
  { val: "3", label: "3+ Functions", desc: "Full celebrations" },
];

const ALL_STEPS = [
  { icon: "🏛️", title: "Book Venue",       desc: "Find the perfect hall for your celebration",   link: "/category/Halls",          category: "Halls" },
  { icon: "📸", title: "Photographer",     desc: "Capture every precious moment beautifully",     link: "/category/Photographers",  category: "Photographers" },
  { icon: "💄", title: "Makeup Artist",    desc: "Look stunning on your special day",             link: "/category/Makeup_Artist",  category: "Makeup_Artist" },
  { icon: "🎨", title: "Decorator",        desc: "Transform your venue into a dream setting",     link: "/category/Decorators",     category: "Decorators" },
  { icon: "🍽️", title: "Catering",        desc: "Delight your guests with delicious food",       link: "/category/Caterers",       category: "Caterers" },
  { icon: "💍", title: "Jewellery",        desc: "Find exquisite jewellery for the bride",        link: "/category/Jewellery",      category: "Jewellery" },
  { icon: "🎵", title: "DJ / Music",       desc: "Keep the celebrations going all night",         link: "/category/DJ_Artist",      category: "DJ_Artist" },
  { icon: "🌸", title: "Mehandi Artist",   desc: "Beautiful mehandi designs for the bride",       link: "/category/Mehandi_Artist", category: "Mehandi_Artist" },
  { icon: "🚗", title: "Transport",        desc: "Arrange comfortable travel for guests",         link: "/category/Travel_Transport", category: "Travel_Transport" },
  { icon: "💌", title: "Invitations",      desc: "Send beautiful wedding invitations",            link: "/category/Invitation",     category: "Invitation" },
];

// Steps shown based on number of functions
const getSteps = (fnCount) => {
  if (fnCount === "1") return ALL_STEPS.slice(0, 5);
  if (fnCount === "2") return ALL_STEPS.slice(0, 7);
  return ALL_STEPS;
};

const BUDGET_MARKS = [100000, 300000, 500000, 750000, 1000000, 1500000, 2000000];

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_KEY = 'byc_wedding_plan';
const loadPlan = () => { try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const savePlan = (data) => { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {} };

function PlanScreen() {
  const saved = loadPlan();

  const [month, setMonth]         = useState(saved?.month     || "");
  const [city, setCity]           = useState(saved?.city      || "");
  const [functions, setFunctions] = useState(saved?.functions || "1");
  const [budgetIdx, setBudgetIdx] = useState(saved?.budgetIdx ?? 2);
  const [showPlan, setShowPlan]   = useState(saved?.showPlan  || false);
  const [doneSteps, setDoneSteps] = useState(new Set(saved?.doneSteps || []));
  const [focusedField, setFocusedField] = useState('');
  const navigate = useNavigate();

  const persist = (patch = {}) => savePlan({ month, city, functions, budgetIdx, showPlan, doneSteps: [...doneSteps], ...patch });

  const setMonthP     = v => { setMonth(v);     savePlan({ month: v, city, functions, budgetIdx, showPlan, doneSteps: [...doneSteps] }); };
  const setCityP      = v => { setCity(v);      savePlan({ month, city: v, functions, budgetIdx, showPlan, doneSteps: [...doneSteps] }); };
  const setFunctionsP = v => { setFunctions(v); savePlan({ month, city, functions: v, budgetIdx, showPlan, doneSteps: [...doneSteps] }); };
  const setBudgetIdxP = v => { setBudgetIdx(v); savePlan({ month, city, functions, budgetIdx: v, showPlan, doneSteps: [...doneSteps] }); };

  const steps     = getSteps(functions);
  const budget    = BUDGET_MARKS[budgetIdx];
  const doneCount = doneSteps.size;
  const progress  = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  const submitHandler = (e) => {
    e.preventDefault();
    setShowPlan(true);
    savePlan({ month, city, functions, budgetIdx, showPlan: true, doneSteps: [...doneSteps] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleDone = (i) => {
    setDoneSteps(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      savePlan({ month, city, functions, budgetIdx, showPlan, doneSteps: [...next] });
      return next;
    });
  };

  const formatBudget = (n) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} L` : `₹${n.toLocaleString('en-IN')}`;

  const monthLabel = month
    ? new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '';

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div style={s.page}>

        {/* ── Header ── */}
        <div style={s.header}>
          <div style={s.glow1} /><div style={s.glow2} />
          <div style={s.headerInner}>
            <span style={s.headerIcon}>💍</span>
            <h1 style={s.headerTitle}>Plan Your Wedding</h1>
            <p style={s.headerSub}>Get a personalised checklist in under 2 minutes</p>
          </div>
        </div>

        <div style={s.body}>

          {/* ── FORM ── */}
          {!showPlan && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h3 style={s.cardTitle}>✨ Tell us about your wedding</h3>
              </div>
              <div style={s.cardBody}>
                <form onSubmit={submitHandler}>

                  {/* Month + City */}
                  <div style={s.formGrid}>
                    <div>
                      <label style={s.label}>💒 Wedding Month</label>
                      <input
                        type="month" required
                        style={{ ...s.input, ...(focusedField === 'month' ? { borderColor: "#5e143f" } : {}) }}
                        value={month}
                        onChange={e => setMonthP(e.target.value)}
                        onFocus={() => setFocusedField('month')}
                        onBlur={() => setFocusedField('')}
                      />
                    </div>
                    <div>
                      <label style={s.label}>📍 City</label>
                      <input
                        type="text" required
                        placeholder="e.g. Chennai"
                        style={{ ...s.input, ...(focusedField === 'city' ? { borderColor: "#5e143f" } : {}) }}
                        value={city}
                        onChange={e => setCityP(e.target.value)}
                        onFocus={() => setFocusedField('city')}
                        onBlur={() => setFocusedField('')}
                      />
                    </div>
                  </div>

                  {/* Functions */}
                  <div style={s.formGroup}>
                    <label style={s.label}>🎊 Number of Functions</label>
                    <div style={s.fnRow}>
                      {FUNCTIONS.map(f => (
                        <button
                          key={f.val} type="button"
                          style={functions === f.val ? s.fnBtnActive : s.fnBtn}
                          onClick={() => setFunctionsP(f.val)}
                        >
                          <div>{f.label}</div>
                          <div style={{ fontSize: "0.7rem", opacity: 0.75, marginTop: "2px" }}>{f.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Budget */}
                  <div style={s.formGroup}>
                    <label style={s.label}>💰 Approximate Budget</label>
                    <div style={s.sliderWrap}>
                      <input
                        type="range" min="0" max={BUDGET_MARKS.length - 1}
                        value={budgetIdx}
                        onChange={e => setBudgetIdxP(Number(e.target.value))}
                        style={s.slider}
                      />
                      <div style={s.sliderLabels}>
                        <span>₹1L</span><span>₹5L</span><span>₹10L</span><span>₹20L+</span>
                      </div>
                    </div>
                    <div style={s.budgetDisplay}>{formatBudget(budget)}</div>
                  </div>

                  <button type="submit" style={s.submitBtn}>
                    ✨ Generate My Wedding Plan →
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── PLAN ── */}
          {showPlan && (
            <>
              {/* Meta badges */}
              <div style={s.planMeta}>
                <span style={s.planMetaBadge}>💒 {monthLabel}</span>
                <span style={s.planMetaBadge}>📍 {city}</span>
                <span style={s.planMetaBadge}>🎊 {FUNCTIONS.find(f => f.val === functions)?.label}</span>
                <span style={s.planMetaBadge}>💰 {formatBudget(budget)}</span>
              </div>

              <div style={s.card}>
                <div style={s.cardHeader}>
                  <h3 style={s.cardTitle}>📋 Your Wedding Checklist</h3>
                </div>
                <div style={s.cardBody}>

                  {/* Progress */}
                  <div style={s.progressWrap}>
                    <div style={s.progressLabel}>
                      <span>{doneCount} of {steps.length} booked</span>
                      <span style={{ fontWeight: 700, color: "#5e143f" }}>{progress}% complete</span>
                    </div>
                    <div style={s.progressBar}>
                      <div style={{ ...s.progressFill, width: `${progress}%` }} />
                    </div>
                  </div>

                  {progress === 100 && (
                    <div style={{ background: "rgba(46,125,82,0.08)", border: "1px solid rgba(46,125,82,0.22)", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", textAlign: "center", fontFamily: "'Playfair Display', serif", color: "#1a7a42", fontSize: "0.95rem", fontWeight: 600 }}>
                      🎊 All done! Your wedding is fully planned. Congratulations!
                    </div>
                  )}

                  {/* Step grid */}
                  <div style={s.stepGrid}>
                    {steps.map((step, i) => {
                      const done = doneSteps.has(i);
                      return (
                        <div key={i} style={done ? s.stepCardDone : s.stepCard}>
                          <div style={done ? s.stepNumDone : s.stepNum}>
                            {done ? '✓' : i + 1}
                          </div>
                          <span style={s.stepIcon}>{step.icon}</span>
                          <p style={s.stepTitle}>{step.title}</p>
                          <p style={s.stepDesc}>{step.desc}</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <button
                              style={s.stepBookBtn}
                              onClick={() => navigate(step.link)}
                            >
                              Browse {step.title} →
                            </button>
                            <button
                              style={done ? s.stepDoneBtn : { ...s.stepDoneBtn, background: "transparent", color: "#9a7a85", border: "1px solid #e8d5de" }}
                              onClick={() => toggleDone(i)}
                            >
                              {done ? '✓ Booked' : '○ Mark as Booked'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>

              <button style={s.resetBtn} onClick={() => { setShowPlan(false); setDoneSteps(new Set()); savePlan({ month, city, functions, budgetIdx, showPlan: false, doneSteps: [] }); }}>
                ← Edit Plan Details
              </button>
            </>
          )}

        </div>
      </div>
    </>
  );
}

export default PlanScreen;