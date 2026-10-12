// The visitor's city, decided once at the start (utils/city.js):
//   1. already chosen on this device → use it;
//   2. landing on a vendor page (e.g. from Google) → the vendor's city is used (ProductScreen), no interruption;
//   3. otherwise guess from the IP address (/api/search/city/) → use it, with a small "Change" note;
//   4. no confident guess → ask once ("Where is the wedding?").
// Lists wait for this on the first visit only, so nothing shows the wrong city first.
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { CITIES, getCity, hasChosenCity, setCity, useCity } from '../utils/city';
import './CityPicker.css';

const LANDING_PAGES = /^\/(product|AIDictionary)\//;
const GUESS_TIMEOUT_MS = 1500;

export function useCityBoot() {
  const location = useLocation();
  const [state, setState] = useState(() => (hasChosenCity() || LANDING_PAGES.test(location.pathname)
    ? { ready: true, ask: false, guessed: null } : { ready: false, ask: false, guessed: null }));

  useEffect(() => {
    if (state.ready) return undefined;
    let done = false;
    const finish = (next) => { if (!done) { done = true; setState(next); } };
    const timer = setTimeout(() => finish({ ready: true, ask: true, guessed: null }), GUESS_TIMEOUT_MS);
    api.get('/api/search/city/')
      .then(({ data }) => {
        if (data?.city && CITIES.includes(data.city)) {
          setCity(data.city);
          finish({ ready: true, ask: false, guessed: data.city });
        } else {
          finish({ ready: true, ask: true, guessed: null });
        }
      })
      .catch(() => finish({ ready: true, ask: true, guessed: null }))
      .finally(() => clearTimeout(timer));
    return () => clearTimeout(timer);
  }, [state.ready]);

  return [state, setState];
}

const choose = (city) => {
  const changed = city !== getCity();
  setCity(city);
  if (changed) window.location.reload();     // every section reloads in the new city together
};

export function CityPickerModal({ onClose }) {
  return (
    <div className="cp-backdrop" role="dialog" aria-modal="true" aria-labelledby="cp-title">
      <div className="cp-modal">
        <button type="button" className="cp-close" aria-label="Close" onClick={() => { setCity(getCity()); onClose(); }}>✕</button>
        <h2 id="cp-title">Where is the wedding?</h2>
        <p>We'll show wedding vendors in your city. You can change it any time from the top of the page.</p>
        <div className="cp-cities">
          {CITIES.map(c => (
            <button key={c} type="button" className="cp-city" onClick={() => { choose(c); onClose(); }}>📍 {c}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CityGuessNote({ city, onChange, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 8000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="cp-note" role="status">
      📍 Showing wedding vendors in <strong>{city}</strong>
      <button type="button" onClick={onChange}>Change</button>
      <span className="cp-credit">Location estimate: <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer">IP Geolocation by DB-IP</a></span>
    </div>
  );
}

// Header chip: always visible, also on phones.
export function CitySwitcher() {
  const [city] = useCity();
  return (
    <label className="cp-switch" title="Change city">
      <span aria-hidden="true">📍</span>
      <select aria-label="City" value={city} onChange={e => choose(e.target.value)}>
        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </label>
  );
}
