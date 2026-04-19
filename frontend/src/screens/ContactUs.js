import React from "react";

const s = {
  page: {
    fontFamily: "'DM Sans', sans-serif",
    background: "#fdf8f0",
    minHeight: "100vh",
    padding: "0 0 60px",
  },

  // ── Header ──
  header: {
    background: "linear-gradient(135deg, #3d0d29, #5e143f, #7d1d54)",
    padding: "48px 32px 40px",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
  },
  glow1: {
    position: "absolute", top: "-60px", right: "-60px",
    width: "220px", height: "220px",
    background: "rgba(249,231,159,0.07)", borderRadius: "50%",
    pointerEvents: "none",
  },
  glow2: {
    position: "absolute", bottom: "-80px", left: "-40px",
    width: "200px", height: "200px",
    background: "rgba(249,231,159,0.05)", borderRadius: "50%",
    pointerEvents: "none",
  },
  headerIcon: { fontSize: "2.5rem", marginBottom: "12px", display: "block" },
  headerTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "2rem", fontWeight: 700,
    color: "#f9e79f", margin: "0 0 8px",
  },
  headerSub: { fontSize: "0.88rem", color: "rgba(249,231,159,0.65)", margin: 0 },

  // ── Card ──
  card: {
    maxWidth: "760px",
    margin: "36px auto 0",
    background: "#ffffff",
    borderRadius: "24px",
    boxShadow: "0 8px 40px rgba(94,20,63,0.12)",
    border: "1px solid #e8d5de",
    overflow: "hidden",
    padding: "0 0 8px",
  },

  // ── Intro ──
  introStrip: {
    background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)",
    padding: "22px 36px",
    borderBottom: "1px solid #e8d5de",
  },
  introText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "0.98rem", fontStyle: "italic",
    color: "#5a3a45", margin: 0, lineHeight: 1.75,
  },

  // ── Section ──
  section: { padding: "28px 36px 8px" },
  divider: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" },
  dividerLabel: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.05rem", fontWeight: 600,
    color: "#5e143f", whiteSpace: "nowrap",
  },
  dividerLine: {
    flex: 1, height: "2px",
    background: "linear-gradient(to right, #d4a843, transparent)",
    borderRadius: "2px",
  },

  // ── Contact cards grid ──
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
    padding: "0 36px 8px",
  },

  contactCard: {
    background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)",
    border: "1px solid #e8d5de",
    borderRadius: "16px",
    padding: "20px 22px",
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    transition: "box-shadow 0.2s",
  },

  contactIconWrap: {
    width: "44px", height: "44px",
    borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.2rem", flexShrink: 0,
  },

  contactCardTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "0.82rem", fontWeight: 600,
    color: "#9a7a85",
    textTransform: "uppercase", letterSpacing: "0.5px",
    margin: "0 0 5px",
  },

  contactCardValue: {
    fontSize: "0.92rem", fontWeight: 500,
    color: "#2a1a1f", margin: 0,
    lineHeight: 1.55,
  },

  contactCardLink: {
    fontSize: "0.92rem", fontWeight: 600,
    color: "#5e143f", textDecoration: "none",
    display: "inline-block",
  },

  // ── Address section ──
  addressBox: {
    margin: "8px 36px 20px",
    background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)",
    border: "1px solid #e8d5de",
    borderRadius: "16px",
    padding: "20px 24px",
  },

  addressTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "0.82rem", fontWeight: 600,
    color: "#9a7a85",
    textTransform: "uppercase", letterSpacing: "0.5px",
    margin: "0 0 8px",
  },

  addressRow: {
    display: "flex", alignItems: "flex-start",
    gap: "12px",
  },

  addressIcon: { fontSize: "1.3rem", marginTop: "2px", flexShrink: 0 },

  addressText: {
    fontSize: "0.92rem", color: "#2a1a1f",
    lineHeight: 1.6, margin: 0,
  },

  mapBtn: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    marginTop: "12px",
    background: "linear-gradient(135deg, #3d0d29, #5e143f)",
    color: "#f9e79f", border: "none", borderRadius: "50px",
    padding: "8px 20px",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600, fontSize: "0.82rem",
    cursor: "pointer", textDecoration: "none",
    boxShadow: "0 3px 10px rgba(94,20,63,0.22)",
  },

  // ── Business info ──
  businessBox: {
    margin: "0 36px 20px",
    borderTop: "1px solid #e8d5de",
    paddingTop: "18px",
    display: "flex", alignItems: "center", gap: "12px",
  },
  businessIcon: { fontSize: "1.5rem", flexShrink: 0 },
  businessLabel: {
    fontSize: "0.78rem", color: "#9a7a85",
    fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.4px", margin: "0 0 3px",
  },
  businessName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1rem", fontWeight: 600,
    color: "#5e143f", margin: 0,
  },

  // ── Updated label ──
  updatedNote: {
    textAlign: "center",
    fontSize: "0.75rem", color: "#b8a0aa",
    padding: "0 36px 16px",
    fontStyle: "italic",
  },
};

const ContactUs = () => {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      <div style={s.page}>

        {/* ── Header ───────────────────────────────── */}
        <div style={s.header}>
          <div style={s.glow1} />
          <div style={s.glow2} />
          <span style={s.headerIcon}>💌</span>
          <h1 style={s.headerTitle}>Contact Us</h1>
          <p style={s.headerSub}>We're here to help you plan your perfect celebration</p>
        </div>

        {/* ── Card ─────────────────────────────────── */}
        <div style={s.card}>

          {/* Intro */}
          <div style={s.introStrip}>
            <p style={s.introText}>
              "Have a question, a concern, or just want to say hello?
              Reach out to us — we'd love to hear from you."
            </p>
          </div>

          {/* ── Quick contact cards ─────────────────── */}
          <div style={s.section}>
            <div style={s.divider}>
              <span style={s.dividerLabel}>📞 Get in Touch</span>
              <div style={s.dividerLine} />
            </div>
          </div>

          <div style={s.grid}>

            {/* Phone */}
            <div style={s.contactCard}>
              <div style={{ ...s.contactIconWrap, background: "rgba(94,20,63,0.08)" }}>
                📱
              </div>
              <div>
                <p style={s.contactCardTitle}>Phone</p>
                <a href="tel:+917200152906" style={s.contactCardLink}>
                  +91 72001 52906
                </a>
                <p style={{ ...s.contactCardValue, fontSize: "0.78rem", color: "#9a7a85", marginTop: "3px" }}>
                  Mon–Sat, 9 AM – 7 PM
                </p>
              </div>
            </div>

            {/* WhatsApp */}
            <div style={s.contactCard}>
              <div style={{ ...s.contactIconWrap, background: "rgba(37,211,102,0.10)" }}>
                💬
              </div>
              <div>
                <p style={s.contactCardTitle}>WhatsApp</p>
                <a
                  href="https://wa.me/917200152906?text=Hi%20WedMangal%2C%20I%20need%20help"
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...s.contactCardLink, color: "#1a7a42" }}
                >
                  Chat with us →
                </a>
                <p style={{ ...s.contactCardValue, fontSize: "0.78rem", color: "#9a7a85", marginTop: "3px" }}>
                  Quick replies on WhatsApp
                </p>
              </div>
            </div>

            {/* Email */}
            <div style={s.contactCard}>
              <div style={{ ...s.contactIconWrap, background: "rgba(212,168,67,0.12)" }}>
                ✉️
              </div>
              <div>
                <p style={s.contactCardTitle}>Email</p>
                <a href="mailto:subodhayas@gmail.com" style={s.contactCardLink}>
                  subodhayas@gmail.com
                </a>
                <p style={{ ...s.contactCardValue, fontSize: "0.78rem", color: "#9a7a85", marginTop: "3px" }}>
                  We reply within 24 hours
                </p>
              </div>
            </div>

          </div>

          {/* ── Address ─────────────────────────────── */}
          <div style={s.section}>
            <div style={s.divider}>
              <span style={s.dividerLabel}>📍 Our Address</span>
              <div style={s.dividerLine} />
            </div>
          </div>

          <div style={s.addressBox}>
            <p style={s.addressTitle}>Registered & Operational Address</p>
            <div style={s.addressRow}>
              <span style={s.addressIcon}>🏠</span>
              <div>
                <p style={s.addressText}>
                  11/49, Thiru-Vi-Ka Street,<br />
                  Postal Audit Colony, Saligramam,<br />
                  Chennai, Tamil Nadu — 600 093
                </p>
                <a
                  href="https://maps.google.com/?q=Saligramam,Chennai,Tamil+Nadu+600093"
                  target="_blank"
                  rel="noreferrer"
                  style={s.mapBtn}
                >
                  🗺️ View on Maps
                </a>
              </div>
            </div>
          </div>

          {/* ── Business entity ──────────────────────── */}
          <div style={s.businessBox}>
            <span style={s.businessIcon}>🏢</span>
            <div>
              <p style={s.businessLabel}>Merchant Legal Entity</p>
              <p style={s.businessName}>Subodhaya Sethuraman</p>
            </div>
          </div>

          {/* Updated note */}
          <p style={s.updatedNote}>Last updated: 30 January 2025</p>

        </div>
      </div>
    </>
  );
};

export default ContactUs;