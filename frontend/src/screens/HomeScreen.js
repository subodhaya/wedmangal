// src/screens/HomeScreen.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import Product from '../components/Product';
import Loader from '../components/Loader';
import Message from '../components/Message';
import Paginate from '../components/Paginate';
import ProductCarousel from '../components/ProductCarousel';
import DateCalculation from '../components/DateCalculation';
import HomeInvitePage from '../components/HomeInvitePage';
import AddProductPage from '../components/AddProductPage';
import ManagePage from '../components/ManagePage';
import ServiceAppointmentsScreen from '../components/ServiceAppointmentsScreen';
import './HomeScreen.css';
import api from '../utils/api';
//import InstallPrompt from '../components/InstallPrompt';




function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(() => {
    return (typeof window !== "undefined" && window.deferredPWAEvent) || null;
  });
  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const supportsBeforeInstall =
    typeof window !== "undefined" && "onbeforeinstallprompt" in window;

  useEffect(() => {
    if (localStorage.getItem("a2hs_dismissed")) {
      setDontShowAgain(true);
      return;
    }

    function beforeInstallHandler(e) {
      console.log("[PWA] beforeinstallprompt event fired (component)", e);
      e.preventDefault();
      setDeferredPrompt(e);
      if (typeof window !== "undefined") window.deferredPWAEvent = e;
      setShowBanner(true);
    }

    function onAppInstalled() {
      console.log("[PWA] appinstalled event");
      setShowBanner(false);
      localStorage.setItem("a2hs_installed", "1");
      setStatusMessage("App installed");
      setTimeout(() => setStatusMessage(""), 2500);
    }

    window.addEventListener("beforeinstallprompt", beforeInstallHandler);
    window.addEventListener("appinstalled", onAppInstalled);

    // Use any global captured event (index.js)
    if (!deferredPrompt && typeof window !== "undefined" && window.deferredPWAEvent) {
      console.log("[PWA] using global deferred event in InstallBanner");
      setDeferredPrompt(window.deferredPWAEvent);
      setShowBanner(true);
    }

    // For iOS fallback
    if (!supportsBeforeInstall && isIos && !localStorage.getItem("a2hs_dismissed")) {
      const t = setTimeout(() => setShowBanner(true), 1200);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", beforeInstallHandler);
        window.removeEventListener("appinstalled", onAppInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallHandler);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [isIos, supportsBeforeInstall, deferredPrompt]);
  
   


  const handleInstallClick = async () => {
    setStatusMessage("");
    console.log("[PWA] Install clicked. local deferred:", !!deferredPrompt, "global:", !!(typeof window !== "undefined" && window.deferredPWAEvent));

    // Prefer the local saved event, fallback to global
    const promptEvent =
      deferredPrompt || (typeof window !== "undefined" && window.deferredPWAEvent);

    if (promptEvent) {
      try {
        // some browsers keep the original event; call prompt on it
        console.log("[PWA] calling prompt() on event", promptEvent);
        // In case the event object was stored as plain object, try call via window.deferredPWAEvent
        if (typeof promptEvent.prompt === "function") {
          promptEvent.prompt();
          // userChoice may be a promise
          const choice = await (promptEvent.userChoice || Promise.resolve({ outcome: "dismissed" }));
          console.log("[PWA] userChoice:", choice);
          if (choice && choice.outcome === "accepted") {
            localStorage.setItem("a2hs_installed", "1");
            setStatusMessage("Thanks — app installed!");
          } else {
            setStatusMessage("Install dismissed");
          }
        } else if (typeof window !== "undefined" && window.deferredPWAEvent && typeof window.deferredPWAEvent.prompt === "function") {
          // defensive: call on the global stored event
          window.deferredPWAEvent.prompt();
          const choice = await (window.deferredPWAEvent.userChoice || Promise.resolve({ outcome: "dismissed" }));
          console.log("[PWA] userChoice (global):", choice);
          if (choice && choice.outcome === "accepted") {
            localStorage.setItem("a2hs_installed", "1");
            setStatusMessage("Thanks — app installed!");
          } else {
            setStatusMessage("Install dismissed");
          }
        } else {
          console.warn("[PWA] prompt() function not available on event");
          setStatusMessage("Install prompt not available");
        }
      } catch (err) {
        console.warn("Install prompt error", err);
        setStatusMessage("Install failed — please try again");
      } finally {
        setDeferredPrompt(null);
        if (typeof window !== "undefined") window.deferredPWAEvent = null;
        setShowBanner(false);
        setTimeout(() => setStatusMessage(""), 2500);
      }
      return;
    }

    // iOS fallback
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    // Fallback message for unsupported browsers
    setStatusMessage(
      "Install is available on Chrome/Edge on Android. On iOS open Safari → Share → Add to Home Screen."
    );
    setTimeout(() => setStatusMessage(""), 4000);
  };

  const handleDismiss = (permanent = false) => {
    setShowBanner(false);
    if (permanent) {
      localStorage.setItem("a2hs_dismissed", Date.now());
      setDontShowAgain(true);
    }
  };

  if (dontShowAgain && !localStorage.getItem("a2hs_installed")) return null;

  return (
    <>
      {showBanner && (
        <div className="install-banner-top" role="region" aria-label="Install BookYourCelebration">
          <div className="install-left">
            <span className="install-emoji">📲</span>
            <div className="install-copy">
              <div className="install-title">Get the app — faster access & offline</div>
              {statusMessage && <div className="install-status">{statusMessage}</div>}
            </div>
          </div>

          <div className="install-actions">
            <button className="install-btn-primary" onClick={handleInstallClick}>Install</button>
            <button className="install-btn-secondary" onClick={() => handleDismiss(false)}>Later</button>
            <button className="install-btn-close" onClick={() => handleDismiss(true)} title="Don't show again">✕</button>
          </div>
        </div>
      )}

      {showIosModal && (
        <div className="a2hs-overlay" role="dialog" aria-modal="true">
          <div className="a2hs-card">
            <button className="a2hs-close" onClick={() => setShowIosModal(false)}>✕</button>
            <div className="a2hs-icon-wrap">📲</div>
            <h3 className="a2hs-title">Add to Home Screen</h3>
            <div className="a2hs-steps">
              <p><strong>iPhone / iPad (Safari)</strong></p>
              <ol>
                <li>Tap the <strong>Share</strong> icon (a square with an arrow) at the bottom of Safari.</li>
                <li>Select <strong>Add to Home Screen</strong>.</li>
                <li>Tap <strong>Add</strong>. The BookYourCelebration icon will appear on your home screen.</li>
              </ol>
              <p className="a2hs-note">If you use another browser on iOS, open this page in Safari to be able to add to the home screen.</p>
            </div>

            <div className="a2hs-actions">
              <button className="pwa-btn pwa-btn-primary" onClick={() => setShowIosModal(false)}>Got it</button>
              <button className="pwa-btn pwa-btn-secondary" onClick={() => { localStorage.setItem('a2hs_dismissed', Date.now()); setShowIosModal(false); }}>Don't show again</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}




/* -------------------- Main HomeScreen -------------------- */
function HomeScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(''); // fetch error
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasProduct, setHasProduct] = useState(false);
  const [checkingProduct, setCheckingProduct] = useState(false);

  const [showIosModal, setShowIosModal] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const keyword = queryParams.get('keyword') || '';
  const pageNumber = Number(queryParams.get('page') || 1);

  // safe parse userInfo
  const userInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo')) || {};
    } catch (e) {
      console.warn('Invalid userInfo in localStorage');
      return {};
    }
  }, []);
  const role = userInfo?.role || 'customer';

  const categories = useMemo(
    () => [
      { name: 'Makeup_Artist', image: '/images/categories/makeup.jpg' },
      { name: 'Photographers', image: '/images/categories/photographer.jpg' },
      { name: 'Caterers', image: '/images/categories/catering.jpeg' },
      { name: 'Event Planners', image: '/images/categories/planners.jpg' },
      { name: 'Halls', image: '/images/categories/halls.jpg' },
      { name: 'Decorators', image: '/images/categories/decors.webp' },
      { name: 'Mehandi Artist', image: '/images/categories/mehandi.jpg' },
      { name: 'Invitation', image: '/images/categories/invitation.jpg' },
      { name: 'Jewellery', image: '/images/categories/jewellers.jpg' },
      { name: 'DJ Artist', image: '/images/categories/dj.jpg' },
      { name: 'Music', image: '/images/categories/nadaswaram.jpg' },
      { name: 'Travel and Transport', image: '/images/categories/travel.jpg' },
      { name: 'Entertainment', image: '/images/categories/entertainment.jpg' },
      { name: 'Pandit', image: '/images/categories/pandit.jpg' },
    ],
    []
  );
  const handleHeaderDownloadClick = async () => {
    console.log("[PWA] Download button clicked");

   const promptEvent = window.deferredPWAEvent;

   if (promptEvent) {
    console.log("[PWA] Found deferred prompt. Calling prompt()...");
    promptEvent.prompt();

    const choice = await promptEvent.userChoice;
    console.log("[PWA] User choice:", choice);

    // Clear it so user cannot install twice
    window.deferredPWAEvent = null;
    return;
     }

  // iOS fallback
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIos) {
    setShowIosModal(true);
    return;
  }

  alert("Install prompt not available yet. Refresh page and try again.");
};
  const handleCategoryClick = (category) => {
    navigate(`/?keyword=${encodeURIComponent(category)}&page=1`);

    setTimeout(() => {
      const grid = document.querySelector('.product-grid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: window.innerHeight / 2, behavior: 'smooth' });
    }, 350);
  };

  // fetch products
  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await api.get('/api/products/all', {
          params: { keyword, page: pageNumber },
        });

        if (!isMounted) return;
        setProducts(Array.isArray(data.products) ? data.products : data.products || []);
        setPage(data.page ? Number(data.page) : 1);
        setPages(data.pages ? Number(data.pages) : 1);
      } catch (err) {
        console.error('Fetch products error', err);
        if (!isMounted) return;
        setError('Failed to fetch services. Please try again.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    fetchProducts();
    return () => { isMounted = false; };
  }, [keyword, pageNumber]);

  // check if service-owner has a product
  useEffect(() => {
    let isMounted = true;
    const checkProduct = async () => {
      if (role !== 'service-owner') return;
      setCheckingProduct(true);
      setErrorMessage('');
      try {
        const config = { headers: { Authorization: `Bearer ${userInfo?.token}` } };
        const { data } = await api.get('/api/products/mine/', config);
        if (!isMounted) return;
        if (Array.isArray(data)) setHasProduct(data.length > 0);
        else if (data && typeof data === 'object') {
          if ('product' in data) setHasProduct(!!data.product);
          else setHasProduct(true);
        } else setHasProduct(false);
      } catch (err) {
        console.error('Error checking product:', err);
        if (!isMounted) return;
        setErrorMessage('Could not verify product registration.');
      } finally {
        if (!isMounted) return;
        setCheckingProduct(false);
      }
    };

    checkProduct();
    return () => { isMounted = false; };
  }, [role, userInfo]);

  const handlePageChange = (newPage) => {
    const safePage = Math.max(1, Number(newPage) || 1);
    navigate(`/?keyword=${encodeURIComponent(keyword)}&page=${safePage}`);
    setTimeout(() => {
      const grid = document.querySelector('.product-grid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
  };

  const handleScroll = () => {
    const grid = document.querySelector('.product-grid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: window.innerHeight / 2, behavior: 'smooth' });
  };

  // Header Download button -> show iOS modal for iOS, otherwise try to open toast/prompt
  
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);
return (
  <div>
    {/* PWA Install Prompt (handles Android toast + iOS modal) */}
    <InstallBanner />


    {/* Success / Error messages */}
    {successMessage && (
      <div className="alert alert-success" role="alert">
        {successMessage}
      </div>
    )}
    {errorMessage && (
      <div className="alert alert-danger" role="alert">
        {errorMessage}
      </div>
    )}


     {role === 'customer' && (
  <div className="background-section">
    <div className="carousel-custom">
      <ProductCarousel />
      <HomeInvitePage />
    </div>

    <div className="title-bar">
      <h1 className="home-screen-title">Discover Our Exclusive Wedding Services</h1>
      <p className="welcome-message">
        At <span className="brand-name">BookYourCelebrations</span>, we help you find
        top-notch wedding services that make your day unforgettable.
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
        <Button variant="outline-light" size="lg" className="explore-button" onClick={handleScroll}>
          Explore Services
        </Button>
        <Button variant="success" size="lg" className="download-button" onClick={handleHeaderDownloadClick}>
          📲 Download App
        </Button>
      </div>
    </div>

    {/* ✅ Show countdown only if logged in */}
    {userInfo?._id ? (
      <DateCalculation />
    ) : (
      <div className="container-fluid" style={{ marginTop: '30px' }}>
        <div
          className="plain-card"
          style={{
            textAlign: 'center',
            padding: '20px',
            borderRadius: '10px',
            background: '#fff3cd',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}
        >
          <h4><b>Save Your Wedding Date</b></h4>
          <p>Login to track your wedding countdown and receive reminders!</p>
          <Button variant="warning" href="/login">Login</Button>
        </div>
      </div>
    )}

  </div>
)}

      {/* Category section */}
      {role !== 'service-owner' && (
        <div className="category-section">
          <h2 className="category-title">Top Wedding Vendor Categories</h2>
          <div className="category-grid">
            {categories.map((category) => (
              <div
                key={category.name}
                className="category-card"
                onClick={() => handleCategoryClick(category.name)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCategoryClick(category.name)}
              >
                <img src={category.image} alt={category.name} className="category-image" />
                <h3 className="category-name">{category.name}</h3>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service-owner view */}
      {role === 'service-owner' && (
        <>
          {checkingProduct ? <Loader /> : hasProduct ? <ManagePage /> : <AddProductPage />}
        </>
      )}

      {/* Products listing */}
      {role !== 'service-owner' && (
        <>
          {loading ? (
            <Loader />
          ) : error ? (
            <Message variant="danger">{error}</Message>
          ) : products.length === 0 ? (
            <Message>No products found</Message>
          ) : (
            <>
              <div className="product-grid">
                {products.map((product) => (
                  <div key={product._id} className="product-card">
                    <Product product={product} />
                  </div>
                ))}
              </div>

              <div className="paginate-container">
                <Paginate page={page} pages={pages} keyword={keyword} handlePageChange={handlePageChange} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default HomeScreen;
