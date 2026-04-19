import React, { useState, useEffect, useRef } from 'react';

const SECTIONS = [
  {
    id: "s1", num: "01", icon: "✅", title: "Acceptance of Terms",
    body: (
      <>
        <p>By registering, accessing, or using the platform, you confirm that:</p>
        <ul>
          <li>You have read and understood these Terms</li>
          <li>You agree to be legally bound by them</li>
        </ul>
        <div className="wm-callout"><span>👉</span><span>If you do not agree, you must not use the platform.</span></div>
      </>
    )
  },
  {
    id: "s2", num: "02", icon: "🧩", title: "Nature of Platform", badge: "IMPORTANT",
    body: (
      <>
        <p>WedMangal is a <strong>marketplace platform</strong> that connects customers with independent wedding vendors.</p>
        <ul>
          <li>We do <strong>NOT</strong> provide wedding services directly</li>
          <li>We do <strong>NOT</strong> employ vendors</li>
          <li>We do <strong>NOT</strong> guarantee service quality</li>
        </ul>
        <div className="wm-callout"><span>👉</span><span>All services are provided independently by vendors.</span></div>
      </>
    )
  },
  {
    id: "s3", num: "03", icon: "👤", title: "User Responsibilities",
    body: (
      <>
        <p><strong>Customers must:</strong></p>
        <ul>
          <li>Provide accurate information at all times</li>
          <li>Make payments responsibly</li>
          <li>Communicate clearly with vendors</li>
        </ul>
        <p style={{ marginTop: '0.8rem' }}><strong>Vendors must:</strong></p>
        <ul>
          <li>Provide truthful and complete listings</li>
          <li>Deliver services as promised</li>
          <li>Comply with all applicable laws</li>
        </ul>
      </>
    )
  },
  {
    id: "s4", num: "04", icon: "⚠️", title: "Vendor Disclaimer",
    body: (
      <>
        <p>We do not:</p>
        <ul>
          <li>Guarantee vendor availability</li>
          <li>Guarantee service quality</li>
          <li>Verify all vendor claims</li>
        </ul>
        <div className="wm-callout"><span>👉</span><span>Users engage vendors entirely at their own risk.</span></div>
      </>
    )
  },
  {
    id: "s5", num: "05", icon: "💸", title: "Payments & Refunds",
    body: (
      <>
        <ul>
          <li>Payments may be processed via third-party gateways</li>
          <li>Refunds are governed by vendor-specific policies and platform cancellation policies (if applicable)</li>
        </ul>
        <div className="wm-callout"><span>👉</span><span>We are not responsible for vendor cancellations, service dissatisfaction, or payment delays and disputes.</span></div>
      </>
    )
  },
  {
    id: "s6", num: "06", icon: "🔁", title: "Cancellation Policy",
    body: (
      <ul>
        <li>Cancellation terms may vary by vendor</li>
        <li>Users must review vendor-specific policies carefully before confirming any booking</li>
      </ul>
    )
  },
  {
    id: "s7", num: "07", icon: "🚫", title: "Prohibited Activities",
    body: (
      <>
        <p>You agree NOT to:</p>
        <ul>
          <li>Use the platform for any illegal purposes</li>
          <li>Misrepresent your identity or services</li>
          <li>Post false or misleading content</li>
          <li>Harass or harm other users or vendors</li>
        </ul>
      </>
    )
  },
  {
    id: "s8", num: "08", icon: "🔒", title: "Account Suspension",
    body: (
      <>
        <p>We reserve the right to:</p>
        <ul>
          <li>Suspend or terminate accounts at any time</li>
          <li>Remove listings without explanation</li>
          <li>Block platform access</li>
        </ul>
        <div className="wm-callout"><span>👉</span><span>This may occur without prior notice if Terms are violated.</span></div>
      </>
    )
  },
  {
    id: "s9", num: "09", icon: "⚖️", title: "Limitation of Liability", badge: "IMPORTANT",
    body: (
      <>
        <p>To the maximum extent permitted by law, WedMangal shall <strong>NOT</strong> be liable for:</p>
        <ul>
          <li>Any indirect, incidental, or consequential damages</li>
          <li>Loss of data, revenue, or opportunity</li>
          <li>Vendor service failures of any kind</li>
        </ul>
        <div className="wm-callout"><span>👉</span><span>Your use of the platform is entirely at your own risk.</span></div>
      </>
    )
  },
  {
    id: "s10", num: "10", icon: "🛡️", title: "Indemnity",
    body: (
      <>
        <p>You agree to indemnify and hold harmless WedMangal from any claims, damages, or legal disputes arising from:</p>
        <ul>
          <li>Your use of the platform</li>
          <li>Your interactions with vendors or other users</li>
          <li>Your violation of these Terms</li>
        </ul>
      </>
    )
  },
  {
    id: "s11", num: "11", icon: "🧾", title: "Intellectual Property",
    body: (
      <>
        <p>All content on the platform — including logos, text, and design — is owned by WedMangal.</p>
        <p style={{ marginTop: '0.5rem' }}>You may not:</p>
        <ul>
          <li>Copy or reproduce any content</li>
          <li>Redistribute or repurpose content without written permission</li>
        </ul>
      </>
    )
  },
  {
    id: "s12", num: "12", icon: "🔄", title: "Changes to Terms",
    body: (
      <ul>
        <li>We may update these Terms at any time without prior notice</li>
        <li>Continued use of the platform after changes constitutes acceptance of the updated Terms</li>
      </ul>
    )
  },
  {
    id: "s13", num: "13", icon: "🌐", title: "Third-Party Services",
    body: (
      <>
        <p>We may integrate third-party services including:</p>
        <ul>
          <li>Payment gateways for transaction processing</li>
          <li>External tools and analytics platforms</li>
        </ul>
        <p style={{ marginTop: '0.5rem' }}>We are not responsible for the actions, failures, or policies of any third-party service.</p>
      </>
    )
  },
  {
    id: "s14", num: "14", icon: "🔐", title: "Privacy",
    body: (
      <>
        <p>Your data is collected and handled in accordance with our Privacy Policy.</p>
        <ul>
          <li>We collect only what is necessary for platform operations</li>
          <li>Please refer to the Privacy Policy for full details on data use</li>
        </ul>
      </>
    )
  },
  {
    id: "s15", num: "15", icon: "⚖️", title: "Dispute Resolution",
    body: (
      <ul>
        <li>Users and vendors are expected to resolve disputes directly between themselves</li>
        <li>WedMangal is not obligated to mediate or adjudicate any dispute</li>
      </ul>
    )
  },
  {
    id: "s16", num: "16", icon: "🏛️", title: "Governing Law",
    body: (
      <ul>
        <li>These Terms are governed by the laws of <strong>India</strong></li>
        <li>All disputes shall fall under the jurisdiction of the <strong>Courts of Chennai, Tamil Nadu</strong></li>
      </ul>
    )
  },
  {
    id: "s17", num: "17", icon: "📩", title: "Contact",
    body: (
      <>
        <p>For any questions or concerns regarding these Terms, please reach out to us:</p>
        <ul>
          <li>Platform: <strong>WedMangal</strong></li>
          <li>Operated by: <strong>Subodhaya Sethuraman</strong></li>
          <li>Jurisdiction: <strong>Chennai, Tamil Nadu, India</strong></li>
        </ul>
      </>
    )
  },
];

// ── Section accordion item ──────────────────────────────
function SectionItem({ section, isOpen, onToggle, observed }) {
  return (
    <div
      id={section.id}
      className={`wm-section${isOpen ? ' open' : ''}${observed ? ' visible' : ''}`}
    >
      <div className="wm-section-header" onClick={() => onToggle(section.id)}>
        <span className="wm-section-icon">{section.icon}</span>
        <span className="wm-section-num">{section.num}</span>
        <span className="wm-section-title">
          {section.title}
          {section.badge && <span className="wm-badge">{section.badge}</span>}
        </span>
        <svg
          className={`wm-chevron${isOpen ? ' rotated' : ''}`}
          viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <div className="wm-section-body" style={{ maxHeight: isOpen ? '1000px' : '0' }}>
        <div className="wm-section-content">{section.body}</div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────
export default function TermsAndConditions() {
  const [openId, setOpenId]       = useState('s2');
  const [agreed, setAgreed]       = useState(false);
  const [accepted, setAccepted]   = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [visible, setVisible]     = useState(new Set());
  const sectionRefs               = useRef({});

  // Progress bar
  useEffect(() => {
    const onScroll = () => {
      const pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      setScrollPct(pct);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Intersection observer for fade-in
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            setVisible(prev => new Set([...prev, e.target.id]));
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleToggle = (id) => {
    setOpenId(prev => (prev === id ? null : id));
  };

  const handleTocClick = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setOpenId(id);
    }
  };

  const handleAccept = () => {
    setAccepted(true);
  };

  return (
    <>
      <style>{`
        :root {
          --gold: #C9A84C;
          --gold-light: #E8C97A;
          --gold-pale: #FDF6E3;
          --ink: #1A1209;
          --ink-soft: #3D2E10;
          --cream: #FEFAF2;
          --border: rgba(201,168,76,0.3);
          --shadow: rgba(26,18,9,0.12);
          --green: #4a8c5a;
        }

        .wm-wrap {
          font-family: 'DM Sans', sans-serif;
          background: var(--cream);
          color: var(--ink);
          min-height: 100vh;
          overflow-x: hidden;
        }

        .wm-progress {
          position: fixed;
          top: 0; left: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--gold), var(--gold-light));
          z-index: 1000;
          transition: width 0.1s linear;
        }

        .wm-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(254,250,242,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .wm-brand {
          font-family: 'Playfair Display', serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--ink);
          letter-spacing: 0.02em;
        }

        .wm-brand span { color: var(--gold); }

        .wm-header-meta {
          font-size: 0.72rem;
          color: var(--ink-soft);
          font-weight: 300;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .wm-hero {
          position: relative;
          padding: 5rem 2rem 4rem;
          text-align: center;
          overflow: hidden;
        }

        .wm-hero-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.13) 0%, transparent 70%);
          pointer-events: none;
        }

        .wm-hero-ornament {
          font-size: 1.8rem;
          color: var(--gold);
          letter-spacing: 0.4em;
          margin-bottom: 1.5rem;
          opacity: 0.65;
          animation: wmFadeDown 0.8s ease both;
        }

        .wm-hero h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.2rem, 6vw, 3.8rem);
          font-weight: 900;
          line-height: 1.1;
          color: var(--ink);
          animation: wmFadeDown 0.9s ease 0.1s both;
        }

        .wm-hero h1 em {
          font-style: normal;
          color: var(--gold);
        }

        .wm-hero-sub {
          margin-top: 1rem;
          font-size: 0.9rem;
          color: var(--ink-soft);
          font-weight: 300;
          letter-spacing: 0.04em;
          animation: wmFadeDown 1s ease 0.2s both;
        }

        .wm-hero-date {
          display: inline-block;
          margin-top: 1.5rem;
          padding: 0.35rem 1.2rem;
          border: 1px solid var(--border);
          border-radius: 100px;
          font-size: 0.75rem;
          color: var(--gold);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          animation: wmFadeDown 1s ease 0.3s both;
        }

        .wm-container {
          max-width: 820px;
          margin: 0 auto;
          padding: 0 1.5rem 6rem;
          position: relative;
          z-index: 1;
        }

        .wm-toc {
          background: var(--gold-pale);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.8rem 2rem;
          margin-bottom: 3rem;
          animation: wmFadeUp 0.8s ease 0.4s both;
        }

        .wm-toc-title {
          font-family: 'Playfair Display', serif;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 1rem;
        }

        .wm-toc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.35rem 1.5rem;
        }

        .wm-toc-link {
          font-size: 0.82rem;
          color: var(--ink-soft);
          text-decoration: none;
          font-weight: 400;
          padding: 0.2rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: color 0.2s;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .wm-toc-link:hover { color: var(--gold); }

        .wm-toc-num {
          font-family: 'Playfair Display', serif;
          font-size: 0.7rem;
          color: var(--gold);
          opacity: 0.7;
          flex-shrink: 0;
        }

        .wm-section {
          margin-bottom: 2.5rem;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: #fff;
          overflow: hidden;
          box-shadow: 0 2px 16px var(--shadow);
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .wm-section.visible { opacity: 1; transform: translateY(0); }

        .wm-section-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem 1.6rem;
          cursor: pointer;
          background: var(--gold-pale);
          border-bottom: 1px solid transparent;
          transition: background 0.2s, border-color 0.2s;
          user-select: none;
        }

        .wm-section-header:hover { background: #f9f0d8; }
        .wm-section.open .wm-section-header { border-bottom-color: var(--border); }

        .wm-section-icon { font-size: 1.3rem; flex-shrink: 0; }

        .wm-section-num {
          font-family: 'Playfair Display', serif;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--gold);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .wm-section-title {
          font-family: 'Playfair Display', serif;
          font-size: 1rem;
          font-weight: 700;
          color: var(--ink);
          flex: 1;
        }

        .wm-badge {
          display: inline-block;
          background: var(--gold);
          color: #fff;
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.15rem 0.5rem;
          border-radius: 100px;
          margin-left: 0.5rem;
          vertical-align: middle;
          font-family: 'DM Sans', sans-serif;
        }

        .wm-chevron {
          width: 18px; height: 18px;
          color: var(--gold);
          transition: transform 0.3s ease;
          flex-shrink: 0;
        }

        .wm-chevron.rotated { transform: rotate(180deg); }

        .wm-section-body {
          overflow: hidden;
          transition: max-height 0.4s ease;
        }

        .wm-section-content {
          padding: 1.4rem 1.6rem;
          font-size: 0.88rem;
          line-height: 1.8;
          color: var(--ink-soft);
        }

        .wm-section-content p { margin-bottom: 0.4rem; }

        .wm-section-content ul { list-style: none; margin: 0.6rem 0; }

        .wm-section-content ul li {
          padding: 0.25rem 0 0.25rem 1.4rem;
          position: relative;
        }

        .wm-section-content ul li::before {
          content: '◆';
          position: absolute;
          left: 0;
          color: var(--gold);
          font-size: 0.5rem;
          top: 0.55rem;
        }

        .wm-callout {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          background: rgba(201,168,76,0.08);
          border-left: 3px solid var(--gold);
          border-radius: 0 8px 8px 0;
          padding: 0.8rem 1rem;
          margin-top: 0.8rem;
          font-size: 0.83rem;
          color: var(--ink);
          font-weight: 500;
        }

        .wm-acceptance {
          text-align: center;
          padding: 3rem 1.5rem;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: linear-gradient(135deg, var(--gold-pale) 0%, #fff 100%);
          margin-top: 3rem;
        }

        .wm-acceptance h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 900;
          color: var(--ink);
          margin-bottom: 0.6rem;
        }

        .wm-acceptance p {
          font-size: 0.85rem;
          color: var(--ink-soft);
          max-width: 460px;
          margin: 0 auto 1.8rem;
          line-height: 1.7;
        }

        .wm-checkbox-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          margin-bottom: 1.4rem;
          cursor: pointer;
        }

        .wm-checkbox-row input[type="checkbox"] {
          width: 18px; height: 18px;
          accent-color: var(--gold);
          cursor: pointer;
          flex-shrink: 0;
        }

        .wm-checkbox-row label {
          font-size: 0.84rem;
          color: var(--ink-soft);
          cursor: pointer;
          text-align: left;
          line-height: 1.5;
        }

        .wm-btn {
          display: inline-block;
          background: var(--gold);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          padding: 0.85rem 2.2rem;
          border-radius: 100px;
          border: none;
          cursor: pointer;
          text-transform: uppercase;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(201,168,76,0.35);
        }

        .wm-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .wm-btn:not(:disabled):hover {
          background: #b8902e;
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(201,168,76,0.45);
        }

        .wm-btn.accepted {
          background: #4a8c5a;
          box-shadow: 0 4px 20px rgba(74,140,90,0.35);
        }

        .wm-confirm {
          margin-top: 1rem;
          color: var(--green);
          font-weight: 500;
          font-size: 0.9rem;
          animation: wmFadeDown 0.5s ease both;
        }

        .wm-footer {
          text-align: center;
          padding: 1.5rem;
          font-size: 0.72rem;
          color: var(--ink-soft);
          opacity: 0.6;
          letter-spacing: 0.04em;
        }

        @keyframes wmFadeDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes wmFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 600px) {
          .wm-header { flex-direction: column; align-items: flex-start; gap: 0.3rem; }
          .wm-hero { padding: 3.5rem 1.2rem 2.5rem; }
          .wm-section-header { padding: 1rem 1.2rem; }
          .wm-section-content { padding: 1.2rem; }
          .wm-toc-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      <div className="wm-wrap">
        {/* Progress bar */}
        <div className="wm-progress" style={{ width: `${scrollPct}%` }} />

        {/* Header */}
        <header className="wm-header">
          <div className="wm-brand">Wed<span>Mangal</span></div>
          <div className="wm-header-meta">Terms &amp; Conditions · India</div>
        </header>

        {/* Hero */}
        <div className="wm-hero">
          <div className="wm-hero-bg" />
          <div className="wm-hero-ornament">✦ ✦ ✦</div>
          <h1>Terms &amp; <em>Conditions</em></h1>
          <p className="wm-hero-sub">Please read carefully before accessing or using the platform</p>
          <span className="wm-hero-date">Last Updated: 30 January 2025</span>
        </div>

        <div className="wm-container">

          {/* Table of Contents */}
          <nav className="wm-toc">
            <div className="wm-toc-title">Contents</div>
            <div className="wm-toc-grid">
              {SECTIONS.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="wm-toc-link"
                  onClick={(e) => handleTocClick(e, s.id)}
                >
                  <span className="wm-toc-num">{s.num}</span>
                  {s.title}
                </a>
              ))}
            </div>
          </nav>

          {/* Sections */}
          {SECTIONS.map(s => (
            <SectionItem
              key={s.id}
              section={s}
              isOpen={openId === s.id}
              onToggle={handleToggle}
              observed={visible.has(s.id)}
            />
          ))}

          {/* Acceptance block */}
          <div className="wm-acceptance">
            <h2>Your Agreement</h2>
            <p>
              By using WedMangal, you confirm that you have read, understood, and agree
              to be legally bound by these Terms &amp; Conditions.
            </p>

            <div className="wm-checkbox-row">
              <input
                type="checkbox"
                id="agree-check"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              <label htmlFor="agree-check">
                I have read and understood the Terms &amp; Conditions and agree to be legally bound by them.
              </label>
            </div>

            <button
              className={`wm-btn${accepted ? ' accepted' : ''}`}
              disabled={!agreed || accepted}
              onClick={handleAccept}
            >
              {accepted ? '✓ Accepted' : 'I Agree to These Terms'}
            </button>

            {accepted && (
              <div className="wm-confirm">✓ Thank you! Your agreement has been recorded.</div>
            )}
          </div>

        </div>

        <footer className="wm-footer">
          © 2025 WedMangal · Operated by Subodhaya Sethuraman · Jurisdiction: Chennai, Tamil Nadu, India
        </footer>
      </div>
    </>
  );
}