import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import Loader from '../components/Loader';
import Paginate from '../components/Paginate';
import AreaDropdown from '../components/AreaDropdown';
import VendorResultCard from '../components/VendorResultCard';
import { createSearchTracker, trackEvent, EVENTS } from '../utils/analytics';
import { paramsToRequirement, requirementChips, requirementToAnswers, requirementToFilters } from '../discovery/requirements';
import DiscoveryContact from '../discovery/DiscoveryContact';
import DiscoveryNextSteps from '../discovery/DiscoveryNextSteps';
import '../discovery/Discovery.css';
import './SearchResultScreen.css';

// Only needed when the visitor taps "Edit requirements"
const DiscoveryFlow = lazy(() => import('../discovery/DiscoveryFlow'));

const SORT_LABELS = { relevance: 'Relevance', rating: 'Google rating', newest: 'Newest' };
const inr = (n) => (n >= 100000 ? `₹${(n / 100000).toLocaleString('en-IN')} lakh` : `₹${n.toLocaleString('en-IN')}`);

// Search → filters → results. Filters live in the URL, so back/forward and shared links work.
function SearchResultScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const q = params.get('q') || '';
  const category = params.get('category') || params.get('vendor') || '';  // ?vendor= is the old URL format
  const area = params.get('area') || '';
  const minRating = params.get('min_rating') || '';
  const sort = params.get('sort') || 'relevance';
  const page = Number(params.get('page') || 1);
  // Arrived from the discovery questions? The requirement travels in the URL.
  const fromDiscovery = params.get('from') === 'discovery';
  const requirement = useMemo(() => (fromDiscovery ? paramsToRequirement(params) : null), [fromDiscovery, params]);
  const sourceVendorId = params.get('src') || null;
  const [editing, setEditing] = useState(false);

  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [text, setText] = useState(q);
  const [showFilters, setShowFilters] = useState(false);
  const trackerRef = useRef(null);
  if (!trackerRef.current) trackerRef.current = createSearchTracker(800);

  useEffect(() => { setText(q); }, [q]);

  // Leaving the page (reload / tab close) must not lose a search still waiting on the debounce
  useEffect(() => {
    const flush = () => trackerRef.current.flush();
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  useEffect(() => {
    let active = true;
    setState(s => ({ ...s, loading: true, error: '' }));
    const requirementParams = fromDiscovery ? {
      guests_min: params.get('guests_min') || undefined, guests_max: params.get('guests_max') || undefined,
      budget_min: params.get('budget_min') || undefined, budget_max: params.get('budget_max') || undefined,
      must: params.get('must') || undefined, avoid: params.get('avoid') || undefined, from: 'discovery',
    } : {};
    api.get('/api/search/', { params: { q, category, area: area || (fromDiscovery ? params.get('near') || '' : ''), min_rating: minRating, sort, page, ...requirementParams } })
      .then(({ data }) => {
        if (!active) return;
        setState({ loading: false, error: '', data });
        if (page === 1 && fromDiscovery) {
          trackerRef.current({
            source: 'discovery', query: q,
            filters: { ...requirementToFilters(requirement), ...(minRating && { min_rating: minRating }), ...(sort !== 'relevance' && { sort }) },
            resultCount: data.count,
          });
          trackEvent(EVENTS.DISCOVERY_MATCHING_RESULTS, { vendorId: sourceVendorId, source: 'discovery',
            metadata: { category: requirement.category || '', label: `${data.count} results` } });
        } else if (page === 1 && (q || category || area || minRating)) {
          trackerRef.current({
            source: 'search_page',
            query: q,
            filters: {
              ...(category && { category }), ...(area && { area_name: area }),
              ...(minRating && { min_rating: minRating }), ...(sort !== 'relevance' && { sort }),
            },
            resultCount: data.count,
          });
        }
      })
      .catch(() => active && setState({ loading: false, error: 'Search is unavailable right now. Please try again.', data: null }));
    return () => { active = false; };
  }, [q, category, area, minRating, sort, page, fromDiscovery, params, requirement, sourceVendorId]);

  // Change filters in the URL. Any filter change goes back to page 1.
  const update = (changes) => {
    const next = new URLSearchParams(location.search);
    next.delete('vendor');
    next.delete('city');
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    navigate(`/search/?${next.toString()}`);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (text.trim()) next.set('q', text.trim());
    navigate(`/search/?${next.toString()}`);
  };

  const d = state.data;
  const applied = d?.applied || {};
  const interpreted = d?.interpreted || {};
  const categories = d?.options?.categories || [];
  const categoryLabel = categories.find(c => c.key === applied.category)?.label;
  const heading = fromDiscovery
    ? `${categoryLabel || 'Wedding vendors'} matching your requirements`
    : categoryLabel
    ? `${categoryLabel} in ${applied.area || 'Chennai'}`
    : applied.area ? `Wedding vendors in ${applied.area}` : q ? `Results for “${q}”` : 'Wedding vendors in Chennai';
  const activeFilters = [category, area, minRating].filter(Boolean).length + (sort !== 'relevance' ? 1 : 0);

  const understood = [
    interpreted.budget_max && !interpreted.budget_min && `Budget under ${inr(interpreted.budget_max)}`,
    interpreted.budget_min && !interpreted.budget_max && `Budget above ${inr(interpreted.budget_min)}`,
    interpreted.budget_min && interpreted.budget_max && `Budget ${inr(interpreted.budget_min)}–${inr(interpreted.budget_max)}`,
    interpreted.capacity && `${interpreted.capacity} guests`,
    interpreted.food_preference && ({ veg: 'Vegetarian', nonveg: 'Non-vegetarian', both: 'Veg & non-veg' })[interpreted.food_preference],
    interpreted.parking_required && 'Parking',
  ].filter(Boolean);

  return (
    <div className="sr-page">
      <Helmet>
        <title>{heading} | WedMangal</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <form className="sr-searchbar" onSubmit={submitSearch} role="search">
        <input
          type="search" value={text} onChange={e => setText(e.target.value)}
          placeholder="Try “photographer in Chennai” or “hall near Tambaram for 600 people”"
          aria-label="Search wedding vendors"
        />
        <button type="submit">Search</button>
      </form>

      {/* A plain div: a <header> element would pick up the site-wide header bar styles */}
      <div className="sr-header">
        <h1>{heading}</h1>
        {q && (categoryLabel || applied.area) && <p className="sr-query">“{q}”</p>}
        {d && (
          <p className="sr-count">
            <strong>{d.count.toLocaleString('en-IN')}</strong> {d.count === 1 ? 'vendor' : 'vendors'} found
          </p>
        )}
        {fromDiscovery && (
          <div className="sr-requirements">
            <div className="sr-chips" aria-label="Your requirements">
              {requirementChips(requirement).map(chip => <span key={chip} className="sr-chip">{chip}</span>)}
            </div>
            <DiscoveryNextSteps requirement={requirement} sourceVendorId={sourceVendorId} />
            <button type="button" className="sr-edit-req" onClick={() => setEditing(v => !v)} aria-expanded={editing}>
              {editing ? 'Close' : 'Edit requirements'}
            </button>
            {editing && (
              <Suspense fallback={<p className="sr-note">Loading questions…</p>}>
                <DiscoveryFlow category={requirement.category} sourceVendorId={sourceVendorId}
                  initialAnswers={requirementToAnswers(requirement)} onClose={() => setEditing(false)}
                  onDone={next => { setEditing(false); navigate(`/search/?${next.toString()}`); }} />
              </Suspense>
            )}
          </div>
        )}
        {!fromDiscovery && understood.length > 0 && (
          <div className="sr-chips" aria-label="Also understood">
            {understood.map(chip => <span key={chip} className="sr-chip">{chip}</span>)}
          </div>
        )}
        {d?.notes?.map(note => <p key={note} className="sr-note">{note}</p>)}
      </div>

      <button type="button" className="sr-filter-toggle" aria-expanded={showFilters}
        aria-controls="sr-filters" onClick={() => setShowFilters(v => !v)}>
        Filters{activeFilters ? ` (${activeFilters})` : ''}
      </button>

      <div className="sr-layout">
        <aside id="sr-filters" className={`sr-filters${showFilters ? ' sr-filters--open' : ''}`} aria-label="Filters">
          <div className="sr-filter-group">
            <label htmlFor="sr-category">Category</label>
            <select id="sr-category" value={applied.category || ''} onChange={e => update({ category: e.target.value })}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>

          <div className="sr-filter-group">
            <span className="sr-filter-label">Area</span>
            <AreaDropdown value={applied.area || area} onChange={value => update({ area: value })} />
          </div>

          <fieldset className="sr-filter-group">
            <legend>Google rating</legend>
            {[['', 'Any'], ['4', '4+ ★'], ['4.5', '4.5+ ★']].map(([value, label]) => (
              <label key={label} className="sr-radio">
                <input type="radio" name="sr-rating" checked={String(applied.min_rating || '') === String(value ? Number(value) : '')}
                  onChange={() => update({ min_rating: value })} />
                {label}
              </label>
            ))}
          </fieldset>

          <div className="sr-filter-group">
            <label htmlFor="sr-sort">Sort by</label>
            <select id="sr-sort" value={sort} onChange={e => update({ sort: e.target.value === 'relevance' ? '' : e.target.value })}>
              {Object.entries(SORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          {activeFilters > 0 && (
            <button type="button" className="sr-clear" onClick={() => update({ category: '', area: '', min_rating: '', sort: '' })}>
              Clear filters
            </button>
          )}
          <p className="sr-filter-hint">Budget and capacity filters will come once vendors list prices and capacities.</p>
        </aside>

        <main className="sr-results" aria-busy={state.loading}>
          {state.loading && !d ? (
            <Loader />
          ) : state.error ? (
            <p className="sr-error" role="alert">{state.error}</p>
          ) : d && d.count === 0 ? (
            <div className="sr-empty">
              <h2>No exact matches found</h2>
              {d.suggestions.length > 0 ? (
                <>
                  <p>Try one of these:</p>
                  <ul>
                    {d.suggestions.map(s => (
                      <li key={s.remove}>
                        <button type="button"
                          onClick={() => update(s.q !== undefined ? { q: s.q } : { [s.remove]: '' })}>
                          {s.label} ({s.count.toLocaleString('en-IN')})
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>Try different words, or browse a category:</p>
              )}
              <div className="sr-empty-cats">
                {categories.slice(0, 8).map(c => (
                  <Link key={c.key} to={`/search/?category=${c.key}`}>{c.label}</Link>
                ))}
              </div>
              {fromDiscovery && <DiscoveryContact requirement={requirement} sourceVendorId={sourceVendorId} />}
            </div>
          ) : d && (
            <>
              <div className="sr-grid">
                {d.results.map((vendor, i) => (
                  <VendorResultCard key={vendor._id} vendor={vendor} query={q} position={(d.page - 1) * 12 + i + 1}
                    onOpen={() => trackerRef.current.flush()} fromDiscovery={fromDiscovery} />
                ))}
              </div>
              {fromDiscovery && <DiscoveryContact requirement={requirement} sourceVendorId={sourceVendorId} />}
              <Paginate page={d.page} pages={d.pages} handlePageChange={p => { update({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default SearchResultScreen;
