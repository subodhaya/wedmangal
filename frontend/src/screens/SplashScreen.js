// src/components/SplashScreen.jsx
import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

function SplashScreen({ onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Start fade out at 1.4s, fully gone at 1.8s
    const fadeTimer   = setTimeout(() => setFading(true), 1400);
    const doneTimer   = setTimeout(() => onDone?.(), 1800);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div className={`splash-root ${fading ? 'splash-fade' : ''}`}>
      <div className="splash-content">
        {/* W badge */}
        <div className="splash-badge">
          <span className="splash-w">W</span>
        </div>
        {/* Brand name */}
        <div className="splash-wordmark">
          <span className="splash-wed">Wed</span>
          <span className="splash-mangal">Mangal</span>
        </div>
        {/* Tagline */}
        <p className="splash-tagline">Shubh moments, seamlessly booked</p>
      </div>
      {/* Bottom decoration */}
      <div className="splash-bottom">
        <div className="splash-divider" />
        <p className="splash-sub">Wedding Vendors · Tamil Nadu</p>
      </div>
    </div>
  );
}

export default SplashScreen;