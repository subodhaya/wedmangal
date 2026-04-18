import React, { useEffect, useState } from "react";
import "./vendorAgreement.css"; // move your CSS here

const sectionsData = [
  {
    id: "s1",
    num: "01",
    icon: "🧩",
    title: "Nature of Relationship",
    body: `The Vendor is an independent service provider...`,
  },
  {
    id: "s2",
    num: "02",
    icon: "📋",
    title: "Vendor Responsibilities",
    body: `Vendor must provide accurate info and deliver services professionally...`,
  },
  {
    id: "s9",
    num: "09",
    icon: "🛡️",
    title: "Indemnification",
    badge: "IMPORTANT",
    body: `Vendor agrees to indemnify platform from claims...`,
  },
];

const VendorAgreement = () => {
  const [openSection, setOpenSection] = useState("s9");
  const [accepted, setAccepted] = useState(false);

  // progress bar
  useEffect(() => {
    const handleScroll = () => {
      const progress =
        (window.scrollY /
          (document.documentElement.scrollHeight - window.innerHeight)) *
        100;
      const bar = document.getElementById("progress-bar");
      if (bar) bar.style.width = progress + "%";
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // load acceptance from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("vendorAccepted");
    if (stored === "true") setAccepted(true);
  }, []);

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  const acceptAgreement = () => {
    setAccepted(true);

    localStorage.setItem("vendorAccepted", "true");

    // send to backend
    fetch("/api/accept-vendor/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accepted: true,
        timestamp: new Date().toISOString(),
        version: "v1",
      }),
    });
  };

  return (
    <div>
      <div id="progress-bar"></div>

      <header className="header">
        <div className="brand">Book<span>Your</span>Celebrations</div>
        <div className="header-meta">Vendor Agreement · India</div>
      </header>

      <div className="hero">
        <h1>
          Vendor <em>Agreement</em>
        </h1>
        <p>Please read carefully before registering</p>
      </div>

      <div className="container">
        {/* TOC */}
        <div className="toc">
          {sectionsData.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.num} {s.title}
            </a>
          ))}
        </div>

        {/* Sections */}
        {sectionsData.map((s) => (
          <div
            key={s.id}
            id={s.id}
            className={`section ${
              openSection === s.id ? "open" : ""
            }`}
          >
            <div
              className="section-header"
              onClick={() => toggleSection(s.id)}
            >
              <span>{s.icon}</span>
              <span>{s.num}</span>
              <span>
                {s.title}
                {s.badge && <span className="badge">{s.badge}</span>}
              </span>
            </div>

            {openSection === s.id && (
              <div className="section-body">
                <p>{s.body}</p>
              </div>
            )}
          </div>
        ))}

        {/* ACCEPT */}
        <div className="acceptance">
          <h2>Ready to Join?</h2>
          <p>Accept to continue as vendor</p>

          <button
            className="btn"
            disabled={accepted}
            onClick={acceptAgreement}
          >
            {accepted ? "✓ Accepted" : "I Agree"}
          </button>

          {accepted && (
            <div style={{ color: "green", marginTop: "10px" }}>
              Agreement accepted
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorAgreement;