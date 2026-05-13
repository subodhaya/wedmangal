// src/components/SmartSearch.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './SmartSearch.css';

const SUGGESTIONS = [
  { name: 'Photographers',    label: 'Photographers' },
  { name: 'Makeup_Artist',    label: 'Makeup Artist' },
  { name: 'Mehandi_Artist',   label: 'Mehandi Artist' },
  { name: 'DJ_Artist',        label: 'DJ Artist' },
  { name: 'Halls',            label: 'Wedding Halls' },
  { name: 'Caterers',         label: 'Caterers' },
  { name: 'Decorators',       label: 'Decorators' },
  { name: 'Planners',         label: 'Event Planners' },
  { name: 'Jewellery',        label: 'Jewellery' },
  { name: 'Invitation',       label: 'Invitation' },
  { name: 'Pandit',           label: 'Pandit' },
  { name: 'Travel_Transport', label: 'Travel & Transport' },
  { name: 'Entertainment',    label: 'Music' },
];

function SmartSearch({ variant = 'compact' }) {
  const [keyword, setKeyword]         = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focused, setFocused]         = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const wrapRef  = useRef(null);

  // Sync keyword from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('keyword')) setKeyword(params.get('keyword'));
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredSuggestions = keyword.length > 0
    ? SUGGESTIONS.filter(s => s.label.toLowerCase().includes(keyword.toLowerCase()))
    : SUGGESTIONS;

  const doSearch = (kw = keyword) => {
  const trimmed = kw.trim();
  navigate(trimmed ? `/?keyword=${encodeURIComponent(trimmed)}&page=1` : '/');
  setShowSuggestions(false);
  setFocused(false);
  inputRef.current?.blur();

  // ── Scroll to results ──
  setTimeout(() => {
    const target = document.querySelector('.product-grid') 
                || document.querySelector('.product-card')
                || document.querySelector('.category-section');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 600); // 600ms gives the fetch time to complete and DOM to update
};
  return (
    <div className={`smart-search smart-search--${variant}`} ref={wrapRef}>
      <form
        className={`smart-search__form ${focused ? 'smart-search__form--focused' : ''}`}
        onSubmit={(e) => { e.preventDefault(); doSearch(); }}
      >
        <input
          ref={inputRef}
          type="text"
          className="smart-search__input"
          placeholder="Search photographers, makeup, halls…"
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setShowSuggestions(true); }}
          onFocus={() => { setFocused(true); setShowSuggestions(true); }}
          autoComplete="off"
        />

        {keyword && (
          <button
            type="button"
            className="smart-search__clear"
            onClick={() => { setKeyword(''); navigate('/'); inputRef.current?.focus(); }}
            aria-label="Clear"
          >✕</button>
        )}

        <button type="submit" className="smart-search__submit" aria-label="Search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && focused && (
        <div className="smart-search__dropdown">
          {keyword.length === 0 && (
            <div className="smart-search__dropdown-label">Popular searches</div>
          )}
          {filteredSuggestions.length === 0 ? (
            <div className="smart-search__no-results">No matching categories</div>
          ) : (
            filteredSuggestions.map(s => (
              <button
                key={s.name}
                type="button"
                className="smart-search__suggestion"
                onMouseDown={() => { setKeyword(s.label); doSearch(s.name); }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                {s.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default SmartSearch;