import React, { useState, useEffect } from 'react';

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
        <div className="pwa-toast" role="dialog" aria-live="polite">
          <div className="pwa-toast-left">📲</div>
          <div className="pwa-toast-body">
            <div className="pwa-toast-title">Install BookYourCelebration</div>
            <div className="pwa-toast-sub">Faster access & offline support.</div>
          </div>
          <div className="pwa-toast-actions">
            <button className="pwa-btn pwa-btn-secondary" onClick={() => setShowToast(false)}>Dismiss</button>
            <button className="pwa-btn pwa-btn-primary" onClick={handleInstall}>Install</button>
          </div>
        </div>
      )}

      {isIos && showIosModal && (
        <div className="a2hs-overlay" role="dialog" aria-modal="true">
          <div className="a2hs-card">
            <button className="a2hs-close" onClick={() => closeIosModal(false)} aria-label="Close">✕</button>
            <div className="a2hs-icon-wrap">📲</div>
            <h3 className="a2hs-title">Add to Home Screen</h3>
            <div className="a2hs-steps">
              <p><strong>iPhone / iPad (Safari)</strong></p>
              <ol>
                <li>Tap the <strong>Share</strong> icon at the bottom of Safari.</li>
                <li>Select <strong>Add to Home Screen</strong>.</li>
                <li>Tap <strong>Add</strong>. The icon will appear on your home screen.</li>
              </ol>
              <p className="a2hs-note">For other browsers on iOS, open this page in Safari to add to your home screen.</p>
            </div>
            <div className="a2hs-actions">
              <button className="pwa-btn pwa-btn-primary" onClick={() => closeIosModal(false)}>Got it</button>
              <button className="pwa-btn pwa-btn-secondary" onClick={() => closeIosModal(true)}>Don't show again</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default InstallPrompt;
