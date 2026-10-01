import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import './PerformanceSummary.css';

const RANGES = [
  ['month', 'This month'],
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['90d', 'Last 90 days'],
];

const METRICS = [
  ['listing_views', 'Listing views'],
  ['whatsapp_clicks', 'WhatsApp clicks'],
  ['phone_clicks', 'Phone clicks'],
  ['quote_starts', 'Quote forms opened'],
  ['quote_submissions', 'Enquiries received'],
];

// Vendor dashboard:  <PerformanceSummary endpoint="/api/analytics/vendor-summary/" />
// Admin overview:    <PerformanceSummary endpoint="/api/analytics/admin-summary/" title="…" />
export default function PerformanceSummary({
  endpoint,
  title = 'Your WedMangal Performance',
  subtitle = 'How couples interacted with your listing on WedMangal.',
}) {
  const [range, setRange] = useState('month');
  const [state, setState] = useState({ loading: true, error: '', data: null, hidden: false });

  useEffect(() => {
    let active = true;
    setState(s => ({ ...s, loading: true, error: '' }));
    api.get(endpoint, { params: { range } })
      .then(({ data }) => active && setState({ loading: false, error: '', data, hidden: false }))
      .catch(err => {
        if (!active) return;
        const code = err.response?.status;
        // No listing / not allowed: show nothing rather than an error box
        if (code === 403 || code === 404) setState({ loading: false, error: '', data: null, hidden: true });
        else setState({ loading: false, error: 'Couldn’t load your performance right now.', data: null, hidden: false });
      });
    return () => { active = false; };
  }, [endpoint, range]);

  if (state.hidden) return null;
  const metrics = state.data?.metrics || {};

  return (
    <section className="perf-card" aria-labelledby="perf-title">
      <div className="perf-header">
        <div>
          <h2 id="perf-title" className="perf-title">{title}</h2>
          <p className="perf-subtitle">{subtitle}</p>
        </div>
        <div className="perf-ranges" role="group" aria-label="Date range">
          {RANGES.map(([key, label]) => (
            <button key={key} type="button"
              className={`perf-range${range === key ? ' perf-range--active' : ''}`}
              aria-pressed={range === key} onClick={() => setRange(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {state.error ? (
        <p className="perf-error" role="alert">{state.error}</p>
      ) : (
        <div className="perf-grid" aria-busy={state.loading}>
          {METRICS.map(([key, label]) => (
            <div key={key} className="perf-metric">
              <span className="perf-num">
                {state.loading ? '…' : (metrics[key] ?? 0).toLocaleString('en-IN')}
              </span>
              <span className="perf-label">{label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
