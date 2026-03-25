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
  headerDate: { fontSize: "0.83rem", color: "rgba(249,231,159,0.65)", margin: 0 },

  // ── Card ──
  card: {
    maxWidth: "800px",
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
    padding: "24px 36px",
    borderBottom: "1px solid #e8d5de",
  },
  introText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "0.98rem", fontStyle: "italic",
    color: "#5a3a45", margin: 0, lineHeight: 1.75,
  },

  // ── Sections ──
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

  // ── Term items ──
  termList: { listStyle: "none", padding: 0, margin: 0 },
  termItem: {
    display: "flex", alignItems: "flex-start",
    gap: "14px", padding: "14px 0",
    borderBottom: "1px solid rgba(232,213,222,0.5)",
  },
  termItemLast: {
    display: "flex", alignItems: "flex-start",
    gap: "14px", padding: "14px 0",
  },
  termIcon: {
    width: "38px", height: "38px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.05rem", flexShrink: 0, marginTop: "1px",
  },
  termText: {
    flex: 1, fontSize: "0.92rem",
    color: "#2a1a1f", lineHeight: 1.7, margin: 0,
  },
  termBold: {
    fontWeight: 600, color: "#5e143f",
    display: "block", marginBottom: "3px", fontSize: "0.88rem",
  },

  // ── Jurisdiction badge ──
  jurisdictionBox: {
    margin: "8px 36px 20px",
    background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)",
    border: "1px solid #e8d5de",
    borderRadius: "16px",
    padding: "18px 22px",
    display: "flex", alignItems: "center", gap: "14px",
  },
  jurisdictionIcon: { fontSize: "1.8rem", flexShrink: 0 },
  jurisdictionTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "0.95rem", fontWeight: 600,
    color: "#5e143f", margin: "0 0 3px",
  },
  jurisdictionText: { fontSize: "0.85rem", color: "#9a7a85", margin: 0 },

  // ── Contact strip ──
  contactStrip: {
    margin: "8px 36px 20px",
    background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)",
    border: "1px solid #e8d5de",
    borderRadius: "16px",
    padding: "20px 24px",
    display: "flex", alignItems: "center",
    gap: "16px", flexWrap: "wrap",
  },
  contactIcon: { fontSize: "2rem", flexShrink: 0 },
  contactTextWrap: { flex: 1, minWidth: "180px" },
  contactTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1rem", fontWeight: 600,
    color: "#5e143f", margin: "0 0 4px",
  },
  contactSub: { fontSize: "0.85rem", color: "#9a7a85", margin: 0 },
  contactBtn: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    background: "linear-gradient(135deg, #3d0d29, #5e143f, #7d1d54)",
    color: "#f9e79f", border: "none", borderRadius: "50px",
    padding: "10px 24px",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700, fontSize: "0.88rem",
    cursor: "pointer", textDecoration: "none",
    boxShadow: "0 4px 14px rgba(94,20,63,0.25)",
  },
};

const terms = [
  {
    icon: "✅",
    bg: "rgba(46,125,82,0.08)",
    title: "Acceptance of Terms",
    detail: "By accessing or using BookYourCelebrations, you confirm that you have read, understood, and agree to be bound by these Terms and Conditions.",
  },
  {
    icon: "🔄",
    bg: "rgba(94,20,63,0.08)",
    title: "Changes to Terms",
    detail: "We reserve the right to modify these Terms at any time without prior notice. Continued use of the platform after changes constitutes your acceptance of the updated Terms.",
  },
  {
    icon: "📝",
    bg: "rgba(212,168,67,0.12)",
    title: "Accurate Information",
    detail: "You agree to provide true, accurate, and complete information while registering or using our services. Vendors are responsible for the accuracy of their business listings.",
  },
  {
    icon: "⚠️",
    bg: "rgba(212,168,67,0.12)",
    title: "No Guarantee of Accuracy",
    detail: "While we strive to maintain quality listings, we do not guarantee the completeness or accuracy of vendor information displayed on our platform.",
  },
  {
    icon: "🚫",
    bg: "rgba(192,57,43,0.08)",
    title: "Prohibited Activities",
    detail: "You agree not to use BookYourCelebrations for any unlawful purpose, to harm other users, or to misrepresent your identity or services as a vendor.",
  },
  {
    icon: "💸",
    bg: "rgba(46,125,82,0.08)",
    title: "Payments & Refunds",
    detail: "All payments are processed securely. Refunds are subject to our Cancellation & Refund Policy. Disputes must be raised within the stipulated time frame.",
  },
];

const TermsAndCondition = () => {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      <div style={s.page}>

        {/* ── Header ───────────────────────────────────── */}
        <div style={s.header}>
          <div style={s.glow1} />
          <div style={s.glow2} />
          <span style={s.headerIcon}>📜</span>
          <h1 style={s.headerTitle}>Terms & Conditions</h1>
          <p style={s.headerDate}>Last updated: 30 January 2025</p>
        </div>

        {/* ── Card ─────────────────────────────────────── */}
        <div style={s.card}>

          {/* Intro */}
          <div style={s.introStrip}>
            <p style={s.introText}>
              "These Terms constitute a binding agreement between BookYourCelebrations
              (operated by Subodhaya Sethuraman) and you, governing your use of our
              wedding vendor marketplace."
            </p>
          </div>

          {/* Terms list */}
          <div style={s.section}>
            <div style={s.divider}>
              <span style={s.dividerLabel}>📌 Terms of Use</span>
              <div style={s.dividerLine} />
            </div>

            <ul style={s.termList}>
              {terms.map((item, idx) => (
                <li
                  key={idx}
                  style={idx === terms.length - 1 ? s.termItemLast : s.termItem}
                >
                  <div style={{ ...s.termIcon, background: item.bg }}>
                    {item.icon}
                  </div>
                  <p style={s.termText}>
                    <span style={s.termBold}>{item.title}</span>
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Jurisdiction */}
          <div style={s.section}>
            <div style={s.divider}>
              <span style={s.dividerLabel}>⚖️ Governing Law</span>
              <div style={s.dividerLine} />
            </div>
          </div>

          <div style={s.jurisdictionBox}>
            <span style={s.jurisdictionIcon}>🏛️</span>
            <div>
              <p style={s.jurisdictionTitle}>Chennai, Tamil Nadu — Indian Courts</p>
              <p style={s.jurisdictionText}>
                All disputes arising from the use of this platform shall be subject to the
                exclusive jurisdiction of the courts in Chennai, Tamil Nadu, India,
                and governed by Indian law.
              </p>
            </div>
          </div>

          {/* Contact strip */}
          <div style={s.contactStrip}>
            <span style={s.contactIcon}>💬</span>
            <div style={s.contactTextWrap}>
              <p style={s.contactTitle}>Have questions about these terms?</p>
              <p style={s.contactSub}>Reach out and we'll be happy to clarify.</p>
            </div>
            <a href="/ContactUs" style={s.contactBtn}>
              Contact Us →
            </a>
          </div>

        </div>
      </div>
    </>
  );
};

export default TermsAndCondition;