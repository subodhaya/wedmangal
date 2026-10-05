// Useful things to do with a requirement, before (and instead of) asking for a phone number:
// save it to your account, or plan the budget in the existing Budget Planner.
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { trackEvent, EVENTS } from '../utils/analytics';
import { budgetPlannerLink } from './requirements';

export const LAST_SEARCH_KEY = 'wm_discovery_last';
const loggedIn = () => { try { return !!JSON.parse(localStorage.getItem('userInfo'))?.token; } catch { return false; } };

export default function DiscoveryNextSteps({ requirement, sourceVendorId }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [saveState, setSaveState] = useState('idle');   // idle | saving | saved | failed
  const autoSaved = useRef(false);
  const meta = { category: requirement.category || '' };

  // Remember these results so the Budget Planner can link back to them
  useEffect(() => {
    try { sessionStorage.setItem(LAST_SEARCH_KEY, location.pathname + location.search.replace(/&?save=1/, '')); } catch { /* ignore */ }
  }, [location.pathname, location.search]);

  const save = async () => {
    setSaveState('saving');
    try {
      await api.post('/api/discovery/saved/', { requirements: requirement, source_vendor_id: sourceVendorId || null });
      setSaveState('saved');
    } catch {
      setSaveState('failed');
    }
  };

  // Back from logging in to save (?save=1): finish the save once, then tidy the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('save') === '1' && loggedIn() && !autoSaved.current) {
      autoSaved.current = true;
      params.delete('save');
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      save();
    }
  }, [location.search]);   // eslint-disable-line react-hooks/exhaustive-deps

  const startSave = () => {
    trackEvent(EVENTS.DISCOVERY_SAVE_STARTED, { vendorId: sourceVendorId, source: 'discovery', metadata: meta });
    if (loggedIn()) { save(); return; }
    const params = new URLSearchParams(location.search);
    params.set('save', '1');
    navigate(`/login?redirect=${encodeURIComponent(`${location.pathname}?${params.toString()}`)}`);
  };

  return (
    <div className="dsc-next" aria-label="Next steps">
      {saveState === 'saved' ? (
        <span className="dsc-next-done" role="status">✓ Saved — find it under your profile</span>
      ) : (
        <button type="button" className="dsc-next-btn" onClick={startSave} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? 'Saving…' : 'Save my requirements'}
        </button>
      )}
      <Link className="dsc-next-btn" to={budgetPlannerLink(requirement)}
        onClick={() => trackEvent(EVENTS.DISCOVERY_BUDGET_OPENED, { vendorId: sourceVendorId, source: 'discovery', metadata: meta })}>
        Plan your wedding budget
      </Link>
      {saveState === 'failed' && <p className="dsc-error">Couldn’t save right now. Please try again.</p>}
    </div>
  );
}
