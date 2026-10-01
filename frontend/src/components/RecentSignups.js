import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './PerformanceSummary.css';
import './SearchIntentSummary.css';

export const formatJoined = (iso) => {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
    });
  } catch {
    return iso || '';
  }
};

const fmt = (n) => (n ?? 0).toLocaleString('en-IN');

// Admin-only: newest accounts first. Phone numbers are never shown.
export default function RecentSignups({ limit = 10 }) {
  const [state, setState] = useState({ loading: true, error: '', data: null, hidden: false });

  useEffect(() => {
    let active = true;
    api.get('/api/analytics/recent-signups/', { params: { limit } })
      .then(({ data }) => active && setState({ loading: false, error: '', data, hidden: false }))
      .catch(err => {
        if (!active) return;
        if ([401, 403].includes(err.response?.status)) setState({ loading: false, error: '', data: null, hidden: true });
        else setState({ loading: false, error: 'Couldn’t load recent sign-ups right now.', data: null, hidden: false });
      });
    return () => { active = false; };
  }, [limit]);

  if (state.hidden) return null;
  const d = state.data;

  return (
    <section className="perf-card" aria-labelledby="signups-title">
      <div className="perf-header">
        <div>
          <h2 id="signups-title" className="perf-title">Recently joined</h2>
          <p className="perf-subtitle">
            {d
              ? `${fmt(d.counts.last_7_days)} in the last 7 days · ${fmt(d.counts.this_month)} this month · ${fmt(d.counts.total)} total`
              : 'Newest accounts first.'}
          </p>
        </div>
        <Link to="/userlist/" className="perf-range">All users →</Link>
      </div>

      {state.error && <p className="perf-error" role="alert">{state.error}</p>}
      {state.loading && <p className="si-empty">Loading…</p>}
      {d && (d.users.length === 0 ? (
        <p className="si-empty">No users yet.</p>
      ) : (
        <ol className="si-list">
          {d.users.map(u => (
            <li key={u.id} className="si-row">
              <span className="si-row-label">
                <strong>{u.name || u.username}</strong>
                {u.email && <> · {u.email}</>}
                {' · '}{u.is_staff ? 'staff' : u.role}
                {u.phone_linked && ' · 📱 phone linked'}
              </span>
              <span className="si-row-count">{formatJoined(u.date_joined)}</span>
            </li>
          ))}
        </ol>
      ))}
    </section>
  );
}
