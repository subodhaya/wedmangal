import React from "react";

const styles = {
  page: {
    fontFamily: "'DM Sans', sans-serif",
    background: "#fdf8f0",
    minHeight: "100vh",
    padding: "0 0 60px",
  },
  // ── Header banner ──
  header: {
    background: "linear-gradient(135deg, #3d0d29, #5e143f, #7d1d54)",
    padding: "48px 32px 40px",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
  },
  headerGlow1: {
    position: "absolute", top: "-60px", right: "-60px",
    width: "220px", height: "220px",
    background: "rgba(249,231,159,0.07)", borderRadius: "50%",
    pointerEvents: "none",
  },
  headerGlow2: {
    position: "absolute", bottom: "-80px", left: "-40px",
    width: "200px", height: "200px",
    background: "rgba(249,231,159,0.05)", borderRadius: "50%",
    pointerEvents: "none",
  },
  headerIcon: {
    fontSize: "2.5rem", marginBottom: "12px", display: "block",
  },
  headerTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "2rem", fontWeight: 700,
    color: "#f9e79f", margin: "0 0 8px",
  },
  headerDate: {
    fontSize: "0.83rem",
    color: "rgba(249,231,159,0.65)",
    margin: 0,
  },

  // ── Content card ──
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

  // ── Intro strip ──
  introStrip: {
    background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)",
    padding: "24px 36px",
    borderBottom: "1px solid #e8d5de",
  },
  introText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1rem", fontStyle: "italic",
    color: "#5a3a45", margin: 0, lineHeight: 1.7,
  },

  // ── Section ──
  section: { padding: "28px 36px 8px" },

  sectionDivider: {
    display: "flex", alignItems: "center",
    gap: "12px", marginBottom: "20px",
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

  // ── Policy items ──
  policyList: { listStyle: "none", padding: 0, margin: 0 },

  policyItem: {
    display: "flex", alignItems: "flex-start",
    gap: "14px", padding: "14px 0",
    borderBottom: "1px solid rgba(232,213,222,0.5)",
  },
  policyItemLast: {
    display: "flex", alignItems: "flex-start",
    gap: "14px", padding: "14px 0",
  },

  policyIcon: {
    width: "36px", height: "36px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1rem", flexShrink: 0, marginTop: "2px",
  },

  policyText: {
    flex: 1, fontSize: "0.92rem",
    color: "#2a1a1f", lineHeight: 1.7, margin: 0,
  },
  policyTextBold: {
    fontWeight: 600, color: "#5e143f",
    display: "block", marginBottom: "2px",
    fontSize: "0.88rem",
  },

  // ── Contact strip ──
  contactStrip: {
    margin: "24px 36px 20px",
    background: "linear-gradient(135deg, #fdf0f6, #fdf8f0)",
    border: "1px solid #e8d5de",
    borderRadius: "16px",
    padding: "20px 24px",
    display: "flex", alignItems: "center", gap: "16px",
    flexWrap: "wrap",
  },
  contactIcon: { fontSize: "2rem", flexShrink: 0 },
  contactText: { flex: 1, minWidth: "180px" },
  contactTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1rem", fontWeight: 600,
    color: "#5e143f", margin: "0 0 4px",
  },
  contactSub: {
    fontSize: "0.85rem", color: "#9a7a85", margin: 0,
  },
  contactBtn: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    background: "linear-gradient(135deg, #3d0d29, #5e143f, #7d1d54)",
    color: "#f9e79f",
    border: "none", borderRadius: "50px",
    padding: "10px 24px",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700, fontSize: "0.88rem",
    cursor: "pointer", textDecoration: "none",
    boxShadow: "0 4px 14px rgba(94,20,63,0.25)",
  },
};

// Policy items data
const policies = [
  {
    icon: "⏱️",
    iconBg: "rgba(94,20,63,0.08)",
    title: "Immediate Cancellation Only",
    detail: "Cancellations will be considered only if requested immediately after placing the order.",
  },
  {
    icon: "🔒",
    iconBg: "rgba(212,168,67,0.12)",
    title: "Processed Orders",
    detail: "Cancellation requests may not be accepted if the order has already been communicated to the vendor and processing has begun.",
  },
  {
    icon: "🌸",
    iconBg: "rgba(94,20,63,0.08)",
    title: "Perishable & Event Services",
    detail: "No cancellations are accepted for perishable items such as flowers, food, or live event services that have been confirmed.",
  },
  {
    icon: "⚠️",
    iconBg: "rgba(212,168,67,0.12)",
    title: "Damaged or Defective Service",
    detail: "If a product or service delivered is damaged or does not meet quality standards, customers must report it within 7 days of delivery.",
  },
  {
    icon: "💸",
    iconBg: "rgba(46,125,82,0.08)",
    title: "Refund Processing Time",
    detail: "Refunds, once approved by our team, will be processed and credited within 6–8 business days.",
  },
];

const RefundAndCancellation = () => {
  return (
    <>
      {/* Load fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      <div style={styles.page}>

        {/* ── Header ─────────────────────────────────────── */}
        <div style={styles.header}>
          <div style={styles.headerGlow1} />
          <div style={styles.headerGlow2} />
          <span style={styles.headerIcon}>📋</span>
          <h1 style={styles.headerTitle}>Cancellation & Refund Policy</h1>
          <p style={styles.headerDate}>Last updated: 30 January 2025</p>
        </div>

        {/* ── Card ───────────────────────────────────────── */}
        <div style={styles.card}>

          {/* Intro */}
          <div style={styles.introStrip}>
            <p style={styles.introText}>
              "At WedMangal, we believe in helping our customers as much as possible
              and have designed a fair, transparent cancellation policy for all bookings."
            </p>
          </div>

          {/* Policy list */}
          <div style={styles.section}>
            <div style={styles.sectionDivider}>
              <span style={styles.sectionLabel}>📌 Our Policy</span>
              <div style={styles.sectionLine} />
            </div>

            <ul style={styles.policyList}>
              {policies.map((item, idx) => (
                <li
                  key={idx}
                  style={idx === policies.length - 1 ? styles.policyItemLast : styles.policyItem}
                >
                  <div style={{ ...styles.policyIcon, background: item.iconBg }}>
                    {item.icon}
                  </div>
                  <p style={styles.policyText}>
                    <span style={styles.policyTextBold}>{item.title}</span>
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact strip */}
          <div style={styles.contactStrip}>
            <span style={styles.contactIcon}>💬</span>
            <div style={styles.contactText}>
              <p style={styles.contactTitle}>Have a refund query?</p>
              <p style={styles.contactSub}>Our support team is here to help you.</p>
            </div>
            <a href="/ContactUs" style={styles.contactBtn}>
              Contact Support →
            </a>
          </div>

        </div>
      </div>
    </>
  );
};

export default RefundAndCancellation;