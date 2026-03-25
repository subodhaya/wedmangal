import React from 'react';
import { Link } from 'react-router-dom';

const s = {
  page: {
    fontFamily: "'DM Sans', sans-serif",
    background: "#fdf8f0",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    position: "relative",
    overflow: "hidden",
  },

  // ── Decorative background circles ──
  bgCircle1: {
    position: "fixed", top: "-120px", right: "-120px",
    width: "400px", height: "400px",
    background: "radial-gradient(circle, rgba(94,20,63,0.07) 0%, transparent 70%)",
    borderRadius: "50%", pointerEvents: "none",
  },
  bgCircle2: {
    position: "fixed", bottom: "-100px", left: "-100px",
    width: "350px", height: "350px",
    background: "radial-gradient(circle, rgba(212,168,67,0.08) 0%, transparent 70%)",
    borderRadius: "50%", pointerEvents: "none",
  },
  bgCircle3: {
    position: "fixed", top: "40%", left: "5%",
    width: "180px", height: "180px",
    background: "radial-gradient(circle, rgba(94,20,63,0.04) 0%, transparent 70%)",
    borderRadius: "50%", pointerEvents: "none",
  },

  // ── Card ──
  card: {
    background: "#ffffff",
    borderRadius: "32px",
    boxShadow: "0 20px 60px rgba(94,20,63,0.14)",
    border: "1px solid #e8d5de",
    padding: "56px 48px 48px",
    textAlign: "center",
    maxWidth: "520px",
    width: "100%",
    position: "relative",
    zIndex: 1,
  },

  // ── 404 number ──
  bigNumber: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "clamp(5rem, 15vw, 8rem)",
    fontWeight: 700,
    background: "linear-gradient(135deg, #3d0d29, #5e143f, #7d1d54)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    lineHeight: 1,
    margin: "0 0 4px",
    letterSpacing: "-2px",
  },

  // ── Decorative ring around emoji ──
  emojiWrap: {
    width: "90px", height: "90px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)",
    border: "2px solid #e8d5de",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "2.6rem",
    margin: "0 auto 24px",
    boxShadow: "0 4px 20px rgba(94,20,63,0.10)",
  },

  // ── Divider ──
  divider: {
    display: "flex", alignItems: "center",
    gap: "12px", margin: "20px 0 24px",
  },
  dividerLine: {
    flex: 1, height: "2px",
    background: "linear-gradient(to right, transparent, #d4a843, transparent)",
    borderRadius: "2px",
  },
  dividerDot: { fontSize: "1rem" },

  // ── Text ──
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.6rem", fontWeight: 700,
    color: "#3d0d29",
    margin: "0 0 12px",
    lineHeight: 1.3,
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "#9a7a85",
    lineHeight: 1.7,
    margin: "0 0 32px",
  },

  // ── Buttons ──
  btnRow: {
    display: "flex", gap: "12px",
    justifyContent: "center", flexWrap: "wrap",
  },

  btnPrimary: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    background: "linear-gradient(135deg, #3d0d29, #5e143f, #7d1d54)",
    color: "#f9e79f",
    border: "none", borderRadius: "50px",
    padding: "13px 30px",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700, fontSize: "0.95rem",
    cursor: "pointer", textDecoration: "none",
    boxShadow: "0 4px 18px rgba(94,20,63,0.28)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },

  btnSecondary: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    background: "#ffffff",
    color: "#5e143f",
    border: "2px solid #5e143f",
    borderRadius: "50px",
    padding: "11px 26px",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600, fontSize: "0.9rem",
    cursor: "pointer", textDecoration: "none",
    transition: "background 0.2s, color 0.2s",
  },

  // ── Quick links ──
  linksTitle: {
    fontSize: "0.78rem", fontWeight: 600,
    color: "#b8a0aa",
    textTransform: "uppercase", letterSpacing: "0.6px",
    margin: "36px 0 14px",
  },

  linksRow: {
    display: "flex", flexWrap: "wrap",
    justifyContent: "center", gap: "8px",
  },

  linkPill: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)",
    border: "1px solid #e8d5de",
    borderRadius: "50px",
    padding: "7px 16px",
    fontSize: "0.83rem", fontWeight: 500,
    color: "#5a3a45",
    textDecoration: "none",
    transition: "border-color 0.2s, background 0.2s",
  },
};

const quickLinks = [
  { label: "🏠 Home",         to: "/" },
  { label: "💄 Makeup",       to: "/products/Makeup_Artist" },
  { label: "📸 Photography",  to: "/products/Photographers" },
  { label: "🍽️ Catering",    to: "/products/Caterers" },
  { label: "🎊 Decorators",   to: "/products/Decorators" },
  { label: "💌 Contact",      to: "/contact" },
];

function NotFoundScreen() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      <div style={s.page}>
        {/* Background decoration */}
        <div style={s.bgCircle1} />
        <div style={s.bgCircle2} />
        <div style={s.bgCircle3} />

        <div style={s.card}>

          {/* Emoji */}
          <div style={s.emojiWrap}>💍</div>

          {/* 404 */}
          <h1 style={s.bigNumber}>404</h1>

          {/* Ornamental divider */}
          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerDot}>✦</span>
            <div style={s.dividerLine} />
          </div>

          {/* Text */}
          <h2 style={s.title}>This page took the wrong aisle</h2>
          <p style={s.subtitle}>
            The page you're looking for doesn't exist or may have been moved.
            Let's get you back to planning your perfect celebration.
          </p>

          {/* Buttons */}
          <div style={s.btnRow}>
            <Link to="/" style={s.btnPrimary}>
              🏠 Back to Home
            </Link>
            <Link to="/contact" style={s.btnSecondary}>
              💬 Contact Us
            </Link>
          </div>

          
        </div>
      </div>
    </>
  );
}

export default NotFoundScreen;