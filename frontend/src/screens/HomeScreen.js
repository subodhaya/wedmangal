// src/screens/HomeScreen.js
import React, { useState, useEffect, useMemo ,useRef} from 'react';
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
import EmergencySection from '../components/EmergencySection';
import FilterBar from '../components/FilterBar';
import { Helmet } from 'react-helmet-async';
import './HomeScreen.css';
import api from '../utils/api';
import { useParams } from 'react-router-dom';

const SITE_URL = process.env.REACT_APP_SITE_URL || 'https://wedmangal.com';
const SITE_NAME = 'WedMangal';
const DEFAULT_DESCRIPTION = 'Find and book trusted wedding vendors for your dream wedding. Discover photographers, makeup artists, caterers, decorators and more on WedMangal.';
// Shared module-level ref — persists across renders, accessible to both components
// Top of HomeScreen.js — outside both components
const pwaPromptRef = { current: null };
const showBannerRef = { current: null }; // ← add this
// ── Place this OUTSIDE both components, at the top of HomeScreen.js ──
// const pwaPromptRef = { current: null };

/* ── PWA Install Banner ───────────────────────── */
function InstallBanner() {
  const [showBanner, setShowBanner]     = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const bannerRef = useRef(null);
  const isIos             = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const supportsBeforeInstall = 'onbeforeinstallprompt' in window;

  const isDismissed = !!localStorage.getItem('a2hs_dismissed') && !localStorage.getItem('a2hs_installed');
  useEffect(() => {
  if (showBanner && bannerRef.current) {
    bannerRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}, [showBanner]);
  useEffect(() => {
    showBannerRef.current = setShowBanner;
    const onBeforeInstall = (e) => {
      e.preventDefault();
      pwaPromptRef.current = e;          // shared module-level ref
      setShowBanner(true);
    };

    const onAppInstalled = () => {
      pwaPromptRef.current = null;
      setShowBanner(false);
      localStorage.setItem('a2hs_installed', '1');
      setStatusMessage('App installed!');
      setTimeout(() => setStatusMessage(''), 2500);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    // If the event already fired before this component mounted
    if (pwaPromptRef.current) {
      setShowBanner(true);
    }
    
    // iOS — show manually after short delay
    if (!supportsBeforeInstall && isIos && !localStorage.getItem('a2hs_dismissed')) {
      const t = setTimeout(() => setShowBanner(true), 1200);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
        window.removeEventListener('appinstalled', onAppInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []); // runs once on mount

 const handleInstall = async () => {
  const prompt = pwaPromptRef.current;

  if (prompt?.prompt) {
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('a2hs_installed', '1');
        setStatusMessage('Thanks — app installed!');
      } else {
        setStatusMessage('Maybe later!');
      }
    } catch {
      setStatusMessage('Install failed — please try again.');
    } finally {
      pwaPromptRef.current = null;
      setShowBanner(false);
      setTimeout(() => setStatusMessage(''), 2500);
    }
    return;
  }

  if (isIos) {
    setShowIosModal(true);
    return;
  }

  // Better Android detection
  const isAndroid = /android/i.test(navigator.userAgent);
  const isChrome = /chrome|chromium|crios/i.test(navigator.userAgent);
  
  if (isAndroid && !isChrome) {
    // Android non-Chrome browsers (Firefox, Samsung Internet, etc.)
    setStatusMessage('Use "Add to Home Screen" in browser menu');
    setTimeout(() => setStatusMessage(''), 4000);
  } else if (isAndroid && isChrome) {
    // Android Chrome - should have triggered beforeinstallprompt
    setStatusMessage('Use ⋮ menu → "Install app" or "Add to Home Screen"');
    setTimeout(() => setStatusMessage(''), 4000);
  } else {
    // Desktop or other browsers
    setStatusMessage('Open in Chrome on Android to install.');
    setTimeout(() => setStatusMessage(''), 4000);
  }
};

  
  const handleDismiss = (permanent = false) => {
    setShowBanner(false);
    if (permanent) {
      localStorage.setItem('a2hs_dismissed', Date.now());
    }
  };

  if (isDismissed) return null;

  return (
    <>
      {showBanner && (
        <div ref={bannerRef} className="install-banner-top" role="region" aria-label="Install WedMangal App">
          <div className="install-left">
            <span className="install-emoji" aria-hidden="true">📲</span>
            <div className="install-copy">
              <div className="install-title">Get the app — faster access &amp; offline</div>
              {statusMessage && (
                <div className="install-status" role="status">{statusMessage}</div>
              )}
            </div>
          </div>
          <div className="install-actions">
            <button className="install-btn-primary"   onClick={handleInstall}              aria-label="Install app">Install</button>
            <button className="install-btn-secondary" onClick={() => handleDismiss(false)} aria-label="Remind me later">Later</button>
            <button className="install-btn-close"     onClick={() => handleDismiss(true)}  aria-label="Dismiss permanently">✕</button>
          </div>
        </div>
      )}

      {showIosModal && (
        <div className="a2hs-overlay" role="dialog" aria-modal="true" aria-labelledby="a2hs-title">
          <div className="a2hs-card">
            <button className="a2hs-close" onClick={() => setShowIosModal(false)} aria-label="Close modal">✕</button>
            <div className="a2hs-icon-wrap" aria-hidden="true">📲</div>
            <h3 id="a2hs-title" className="a2hs-title">Add to Home Screen</h3>
            <div className="a2hs-steps">
              <p><strong>iPhone / iPad (Safari)</strong></p>
              <ol>
                <li>Tap the <strong>Share</strong> icon at the bottom of Safari.</li>
                <li>Select <strong>Add to Home Screen</strong>.</li>
                <li>Tap <strong>Add</strong>.</li>
              </ol>
              <p className="a2hs-note">Open this page in Safari to add to your home screen.</p>
            </div>
            <div className="a2hs-actions">
              <button className="pwa-btn pwa-btn-primary"   onClick={() => setShowIosModal(false)}>Got it</button>
              <button className="pwa-btn pwa-btn-secondary" onClick={() => { localStorage.setItem('a2hs_dismissed', Date.now()); setShowIosModal(false); }}>Don't show again</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
/* ── Main HomeScreen ───────────────────────── */
function HomeScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasProduct, setHasProduct] = useState(false);
  const [checkingProduct, setCheckingProduct] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const { category: categoryParamFromURL } = useParams();

  // ── Filters ─────────────────────────
  const [filters, setFilters] = useState({ sort: 'newest' });

  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const keyword = categoryParamFromURL || queryParams.get('keyword') || '';
  const pageNumber = Number(queryParams.get('page') || 1);
  const categoryParam = queryParams.get('category') || '';

  const userInfo = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('userInfo')) || {}; }
    catch { return {}; }
  }, []);
  const role = userInfo?.role || 'customer';

  const categories = useMemo(() => [
    { name: 'Makeup_Artist', label: 'Makeup Artist', image: '/images/categories/makeup.jpg' },
    { name: 'Photographers', label: 'Photographers', image: '/images/categories/photographer.jpg' },
    { name: 'Caterers', label: 'Caterers', image: '/images/categories/catering.jpeg' },
    { name: 'Planners', label: 'Event Planners', image: '/images/categories/planners.jpg' },
    { name: 'Halls', label: 'Halls', image: '/images/categories/halls.jpg' },
    { name: 'Decorators', label: 'Decorators', image: '/images/categories/decors.webp' },
    { name: 'Mehandi_Artist', label: 'Mehandi Artist', image: '/images/categories/mehandi.jpg' },
    { name: 'Invitation', label: 'Invitation', image: '/images/categories/invitation.jpg' },
    { name: 'Jewellery', label: 'Jewellery', image: '/images/categories/jewellers.jpg' },
    { name: 'DJ_Artist', label: 'DJ Artist', image: '/images/categories/dj.jpg' },
    { name: 'Entertainment', label: 'Music', image: '/images/categories/nadaswaram.jpg' },
    { name: 'Travel_Transport', label: 'Travel & Transport', image: '/images/categories/travel.jpg' },
    { name: 'Pandit', label: 'Pandit', image: '/images/categories/pandit.jpg' },
  ], []);

  const handleHeaderDownloadClick = async () => {
  const ua = navigator.userAgent;

  // iOS — always show instructions
  if (/iphone|ipad|ipod/i.test(ua)) {
    setShowIosModal(true);
    return;
  }

  // Firefox — not supported
  if (/firefox/i.test(ua)) {
    alert('Please open wedmangal.com in Chrome to install the app.');
    return;
  }

  // Chrome/Edge — use deferred prompt if available
  const prompt = pwaPromptRef.current;
  if (prompt?.prompt) {
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } finally {
      pwaPromptRef.current = null;
    }
    return;
  }

  // Chrome/Edge but already installed or prompt not ready
  if (/android/i.test(ua)) {
    // Check if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      alert('App is already installed!');
    } else {
      alert('Tap the ⋮ menu in Chrome → "Add to Home screen" to install.');
    }
    return;
  }

  // Desktop Chrome — prompt not available yet
  showBannerRef.current?.(true);
};
  const handleCategoryClick = (category) => {
    navigate(`/category/${category}?page=1`);
  };

  // ── SEO: Generate dynamic meta tags ─────────────────────────
  const getPageTitle = () => {
    if (keyword) {
      return `${keyword.replace('_', ' ')} Wedding Vendors | Find & Book ${keyword.replace('_', ' ')} for Your Dream Wedding | ${SITE_NAME}`;
    }
    return `Find & Book Wedding Vendors for Your Dream Wedding | ${SITE_NAME}`;
  };

  const getPageDescription = () => {
    const cleanKeyword = keyword.replace('_', ' ');
    if (keyword) {
      return `Find and book the best ${cleanKeyword} for your dream wedding. Compare top-rated wedding vendors, view portfolios, read reviews, and contact them instantly on ${SITE_NAME}.`;
    }
    return DEFAULT_DESCRIPTION;
  };

  const getCanonicalUrl = () => {
    const baseUrl = `${SITE_URL}/`;
    const params = new URLSearchParams();
    if (keyword) params.append('keyword', keyword);
    if (pageNumber > 1) params.append('page', pageNumber);
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  };

  // ── SEO: JSON-LD Structured Data ─────────────────────────
  const getStructuredData = () => {
    const cleanKeyword = keyword ? keyword.replace(/_/g, ' ') : '';

    const organization = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
      sameAs: [`https://www.wedmangal.com`],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        areaServed: 'IN',
        availableLanguage: ['English', 'Tamil'],
      },
    };

    if (keyword) {
      return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${cleanKeyword} for Weddings in Tamil Nadu`,
        description: getPageDescription(),
        url: getCanonicalUrl(),
        itemListElement: products.slice(0, 10).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: p.name,
          url: `${SITE_URL}/product/${p._id}`,
        })),
      };
    }

    return [
      organization,
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        description: 'Find and book trusted wedding vendors in Tamil Nadu — photographers, makeup artists, caterers, decorators and more.',
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?keyword={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How do I book a wedding vendor on WedMangal?', acceptedAnswer: { '@type': 'Answer', text: 'Browse vendors by category, view their profile, select a service and date, then confirm your booking directly on WedMangal.' } },
          { '@type': 'Question', name: 'Is WedMangal free to use for customers?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, browsing and booking wedding vendors on WedMangal is completely free for customers.' } },
          { '@type': 'Question', name: 'What wedding vendors are available on WedMangal?', acceptedAnswer: { '@type': 'Answer', text: 'WedMangal lists photographers, makeup artists, caterers, decorators, mehandi artists, DJ artists, wedding halls, event planners, jewellery, pandits, and more across Tamil Nadu.' } },
          { '@type': 'Question', name: 'How do I register as a vendor on WedMangal?', acceptedAnswer: { '@type': 'Answer', text: 'Click "Register as Vendor" on the login page or visit wedmangal.com/owner-register to create your vendor profile.' } },
        ],
      },
    ];
  };

  // ── Fetch products with filters ─────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        setLoading(true); 
        setError('');
       const params = {
    ...(!keyword && { home: 'true' }),
    keyword,
    page: pageNumber,
    ...(filters.sort && { sort: filters.sort }),
    ...(filters.city && { city: filters.city }),
    ...(filters.area_name && { area_name: filters.area_name }),
   
    ...(filters.min_price && { min_price: filters.min_price }),
    ...(filters.max_price && { max_price: filters.max_price }),
    ...(filters.min_rating && { min_rating: filters.min_rating }),
    ...(filters.food_type && { food_type: filters.food_type }),
    ...(filters.shoot_type && { shoot_type: filters.shoot_type }),
    ...(filters.makeup_type && { makeup_type: filters.makeup_type }),
    ...(filters.trial && { trial: filters.trial }),
    ...(filters.hall_ac && { hall_ac: filters.hall_ac }),
    ...(filters.hall_parking && { hall_parking: filters.hall_parking }),
    ...(filters.hall_capacity && { hall_capacity: filters.hall_capacity }),
    ...(filters.dj_venue && { dj_venue: filters.dj_venue }),
    ...(filters.dj_equipment && { dj_equipment: filters.dj_equipment }),
    ...(filters.mehandi_type && { mehandi_type: filters.mehandi_type }),
    ...(filters.home_visit && { home_visit: filters.home_visit }),
};
const { data } = await api.get('/api/products/all', { params });
if (!isMounted) return;
setProducts(Array.isArray(data.products) ? data.products : []);
setPage(Number(data.page) || 1);
setPages(Number(data.pages) || 1);
      } catch (err) {
if (!isMounted) return;
setError('Failed to fetch services. Please try again.');
console.error('Fetch error:', err);
      } finally {
if (isMounted) setLoading(false);
      }
    };
fetchProducts();
return () => { isMounted = false; };
 }, [location.search, filters, keyword]);

  // ── Check if service-owner has product ─────────────────────────
  useEffect(() => {
    let isMounted = true;
    const checkProduct = async () => {
      if (role !== 'service-owner') return;
      setCheckingProduct(true);
      try {
        const { data } = await api.get('/api/products/mine/');
        if (!isMounted) return;
        if (Array.isArray(data)) setHasProduct(data.length > 0);
        else if (data && typeof data === 'object') setHasProduct('product' in data ? !!data.product : true);
        else setHasProduct(false);
      } catch (err) {
        if (!isMounted) return;
        setErrorMessage('Could not verify product registration.');
        console.error('Product check error:', err);
      } finally {
        if (isMounted) setCheckingProduct(false);
      }
    };
    checkProduct();
    return () => { isMounted = false; };
  }, [role]);

  const handlePageChange = (newPage) => {
    const cleanPage = Math.max(1, Number(newPage) || 1);
    const params = new URLSearchParams();
    if (keyword) params.append('keyword', keyword);
    params.append('page', cleanPage);
    navigate(`/?${params.toString()}`);
    
    setTimeout(() => {
      const grid = document.querySelector('.product-grid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
  };

  useEffect(() => {
    if (successMessage || errorMessage) {
      const t = setTimeout(() => { setSuccessMessage(''); setErrorMessage(''); }, 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage, errorMessage]);

  // Update document title for SEO (fallback if Helmet fails)
  useEffect(() => {
    document.title = getPageTitle();
  }, [keyword]);

  return (
    <div>
      {/* ── SEO: Dynamic Meta Tags & Structured Data ── */}
      <Helmet>
        <title>{getPageTitle()}</title>
        <meta name="description" content={getPageDescription()} />
        <meta name="keywords" content="wedding vendors, book wedding vendors, wedding marketplace, wedding photographers, wedding makeup artists, wedding decorators, wedding planning services, Indian wedding" />
        <link rel="canonical" href={getCanonicalUrl()} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getCanonicalUrl()} />
        <meta property="og:title" content={getPageTitle()} />
        <meta property="og:description" content={getPageDescription()} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:site_name" content={SITE_NAME} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={getCanonicalUrl()} />
        <meta name="twitter:title" content={getPageTitle()} />
        <meta name="twitter:description" content={getPageDescription()} />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        
        {/* Structured Data JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(getStructuredData())}
        </script>
      </Helmet>

      <InstallBanner />

      {successMessage && <div className="alert alert-success" role="alert" aria-live="polite">{successMessage}</div>}
      {errorMessage && <div className="alert alert-danger" role="alert" aria-live="assertive">{errorMessage}</div>}

      {/* ── Customer view ── */}
      {role === 'customer' && (
        <main className="background-section" role="main">
          <section className="carousel-custom" aria-label="Featured wedding services">
            <ProductCarousel />
            <HomeInvitePage />
          </section>

          <section className="title-bar" aria-label="Welcome section">
            <h1 className="home-screen-title">Discover Our Exclusive Wedding Services</h1>
            <p className="welcome-message">
              At <span className="brand-name">WedMangal</span>, we help you find
              top-notch wedding services that make your day unforgettable.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <Button variant="outline-light" className="plan-button" size="lg" onClick={() => navigate('/plan')} aria-label="Plan my wedding">🗓 Plan my wedding</Button>
              <Button variant="outline-light" size="lg" className="explore-button" onClick={() => { const g = document.querySelector('.product-grid'); if (g) g.scrollIntoView({ behavior: 'smooth' }); else window.scrollTo({ top: window.innerHeight / 2, behavior: 'smooth' }); }} aria-label="Explore all services">Explore Services</Button>
              <Button variant="success" size="lg" className="download-button" onClick={handleHeaderDownloadClick} aria-label="Download mobile app">📲 Download App</Button>
            </div>
          </section>

          {userInfo?._id ? <DateCalculation /> : (
            <div className="container-fluid" style={{ marginTop: 30 }}>
              <div className="plain-card" style={{ textAlign: 'center', padding: 20, borderRadius: 10, background: '#fff3cd', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                <h2><b>Save Your Wedding Date</b></h2>
                <p>Login to track your wedding countdown and receive personalized reminders!</p>
                <Button variant="warning" href="/login">Login</Button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ── Category grid ── */}
      {role !== 'service-owner' && (
        <section className="category-section" aria-label="Wedding vendor categories">
          <h2 className="category-title">Top Wedding Vendor Categories</h2>
          <div className="category-grid">
            {categories.map(cat => (
              <article 
                key={cat.name} 
                className="category-card" 
                onClick={() => handleCategoryClick(cat.name)}
                role="button" 
                tabIndex={0} 
                onKeyDown={e => e.key === 'Enter' && handleCategoryClick(cat.name)}
                aria-label={`Browse ${cat.label} vendors`}
              >
                <img 
                  src={cat.image} 
                  alt={`${cat.label} wedding services`} 
                  className="category-image" 
                  loading="lazy"
                />
                <h3 className="category-name">{cat.label}</h3>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Emergency / Available Today section ── */}
      {role !== 'service-owner' && (
        <section style={{ padding: '0 16px' }} aria-label="Available today services">
          <EmergencySection />
        </section>
      )}

      {/* ── Service owner view ── */}
      {role === 'service-owner' && (
        checkingProduct ? <Loader /> : hasProduct ? <ManagePage /> : <AddProductPage />
      )}

      {/* ── Product listing with FilterBar ── */}
      {role !== 'service-owner' && (
        <section style={{ padding: '0 16px' }} aria-label="Search results">
          <FilterBar
  category={keyword}
  filters={filters}
  onChange={(updater) => {
    setFilters(prev =>
      typeof updater === "function" ? updater(prev) : updater
    );
   
  }}
/>
          

          {loading ? (
            <Loader />
          ) : error ? (
            <Message variant="danger">{error}</Message>
          ) : products.length === 0 ? (
            <Message>
              No {keyword ? keyword.replace('_', ' ') + ' ' : ''}vendors found. 
              Try adjusting your filters or <a href="/contact">contact us</a> for assistance.
            </Message>
          ) : (
            <>
              {keyword && (
                <h1 className="search-title" aria-label={`Search results for ${keyword.replace('_', ' ')}`}>
                  Find & Book {keyword.replace('_', ' ')} for Your Dream Wedding
                </h1>
              )}
              <div className="product-grid" role="list">
                {products.map(product => (
                  <article key={product._id} className="product-card" role="listitem">
                    <Product product={product} />
                  </article>
                ))}
              </div>
              <nav className="paginate-container" aria-label="Pagination">
                <Paginate page={page} pages={pages} keyword={keyword} handlePageChange={handlePageChange} />
              </nav>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default HomeScreen;