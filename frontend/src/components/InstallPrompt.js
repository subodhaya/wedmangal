import React, { useState, useEffect } from 'react';
import './InstallPrompt.css';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowToast(true);
    };
    const handleAppInstalled = () => {
      setShowToast(false);
      setDeferredPrompt(null);
      localStorage.setItem('a2hs_installed', '1');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    if (isIos && !localStorage.getItem('a2hs_dismissed_v1') && !localStorage.getItem('a2hs_installed')) {
      setShowIosModal(true);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isIos]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') localStorage.setItem('a2hs_installed', '1');
      setShowToast(false);
      setDeferredPrompt(null);
      return;
    }
    if (isIos) setShowIosModal(true);
  };

  const closeIosModal = (dontShowAgain = false) => {
    setShowIosModal(false);
    if (dontShowAgain) localStorage.setItem('a2hs_dismissed_v1', '1');
  };

  return (
    <>
      {!isIos && showToast && (
        <div className="wm-pwa-toast" role="dialog" aria-live="polite">
          <div className="wm-pwa-toast__icon">💍</div>
          <div className="wm-pwa-toast__body">
            <div className="wm-pwa-toast__title">Install WedMangal</div>
            <div className="wm-pwa-toast__sub">Faster access &amp; works offline</div>
          </div>
          <div className="wm-pwa-toast__actions">
            <button className="wm-btn wm-btn--ghost" onClick={() => setShowToast(false)}>Later</button>
            <button className="wm-btn wm-btn--primary" onClick={handleInstall}>Install</button>
          </div>
        </div>
      )}

      {isIos && showIosModal && (
        <div className="wm-a2hs-overlay" role="dialog" aria-modal="true">
          <div className="wm-a2hs-card">
            <button className="wm-a2hs-close" onClick={() => closeIosModal(false)} aria-label="Close">✕</button>
            <div className="wm-a2hs-icon">💍</div>
            <h3 className="wm-a2hs-title">Add to Home Screen</h3>
            <p className="wm-a2hs-desc">Install WedMangal for the best experience</p>
            <div className="wm-a2hs-steps">
              <div className="wm-a2hs-step">
                <span className="wm-a2hs-step__num">1</span>
                <span>Tap the <strong>Share</strong> icon at the bottom of Safari</span>
              </div>
              <div className="wm-a2hs-step">
                <span className="wm-a2hs-step__num">2</span>
                <span>Select <strong>Add to Home Screen</strong></span>
              </div>
              <div className="wm-a2hs-step">
                <span className="wm-a2hs-step__num">3</span>
                <span>Tap <strong>Add</strong> — done!</span>
              </div>
            </div>
            <p className="wm-a2hs-note">Only available in Safari on iOS</p>
            <div className="wm-a2hs-actions">
              <button className="wm-btn wm-btn--primary wm-btn--full" onClick={() => closeIosModal(false)}>Got it</button>
              <button className="wm-btn wm-btn--ghost wm-btn--full" onClick={() => closeIosModal(true)}>Don't show again</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default InstallPrompt;