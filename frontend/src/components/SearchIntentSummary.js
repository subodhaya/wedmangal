import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import './PerformanceSummary.css';
import './SearchIntentSummary.css';

const RANGES = [
  ['month', 'This month'],
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['90d', 'Last 90 days'],
];

const fmt = (n) => (n ?? 0).toLocaleString('en-IN');

function RankedList({ title, rows, labelKey = 'label', empty = 'No data yet' }) {
  const visible = (rows || []).filter(r => r.count > 0);
  return (
    <div className="si-block">
      <h3 className="si-block-title">{title}</h3>
      {visible.length === 0 ? (
        <p className="si-empty">{empty}</p>
      ) : (
        <ol className="si-list">
          {visible.map(row => (
            <li key={row[labelKey]} className="si-row">
              <span className="si-row-label">{row[labelKey]}</span>
              <span className="si-row-count">{fmt(row.count)} {row.count === 1 ? 'search' : 'searches'}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// Admin-only, aggregated view of what customers search for. No individual searches.
export default function SearchIntentSummary() {
  const [range, setRange] = useState('month');
  const [state, setState] = useState({ loading: true, error: '', data: null, hidden: false });

  useEffect(() => {
    let active = true;
    setState(s => ({ ...s, loading: true, error: '' }));
    api.get('/api/analytics/search-summary/', { params: { range } })
      .then(({ data }) => active && setState({ loading: false, error: '', data, hidden: false }))
      .catch(err => {
        if (!active) return;
        if ([401, 403].includes(err.response?.status)) setState({ loading: false, error: '', data: null, hidden: true });
        else setState({ loading: false, error: 'Couldn’t load search intent right now.', data: null, hidden: false });
      });
    return () => { active = false; };
  }, [range]);

  if (state.hidden) return null;
  const d = state.data;

  return (
    <section className="perf-card" aria-labelledby="si-title">
      <div className="perf-header">
        <div>
          <h2 id="si-title" className="perf-title">Search Intent</h2>
          <p className="perf-subtitle">
            What customers search for — anonymous totals only.
            {d && ` ${fmt(d.total_searches)} searches, ${fmt(d.searches_with_intent)} with a clear need.`}
          </p>
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

      {state.error && <p className="perf-error" role="alert">{state.error}</p>}
      {state.loading && !d && <p className="si-empty">Loading…</p>}
      {d && !state.error && (
        <div className="si-grid" aria-busy={state.loading}>
          <RankedList title="Top areas" rows={d.top_areas} labelKey="area" />
          <RankedList title="Top categories" rows={d.top_categories} />
          <RankedList title="Guest capacity" rows={d.capacity_ranges} />
          <RankedList title="Budget ranges" rows={d.budget_ranges} />
          <RankedList title="Food preference" rows={d.food_preferences} />
          <div className="si-block">
            <h3 className="si-block-title">Parking demand</h3>
            <p className="si-stat"><strong>{fmt(d.parking.required)}</strong> asked for parking</p>
            <p className="si-stat"><strong>{fmt(d.parking.not_required)}</strong> said parking isn’t needed</p>
          </div>
        </div>
      )}
    </section>
  );
}
