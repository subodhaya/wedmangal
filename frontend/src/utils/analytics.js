// Customer-intent tracking for WedMangal.
//
// Fire-and-forget: tracking never throws, never awaits before the customer's
// action happens, and never logs anyone out. It deliberately does not use the
// shared `api` instance, whose interceptor clears the session and redirects to
// /login when a token can't be refreshed.
import { BASE_URL } from './api';

// Must match VendorEvent.EventType in backend/base/models.py
export const EVENTS = Object.freeze({
  VENDOR_PAGE_VIEW:       'vendor_page_view',
  PHONE_CLICK:            'phone_click',
  WHATSAPP_CLICK:         'whatsapp_click',
  GET_QUOTE_STARTED:      'get_quote_started',
  EXTERNAL_CONTACT_CLICK: 'external_contact_click',
  EXTERNAL_BOOKING_CLICK: 'external_booking_click',
  SEARCH:                 'search',
  SEARCH_RESULT_CLICK:    'search_result_click',
  FAVORITE:               'favorite',
  SHARE:                  'share',
  SESSION_START:          'session_start',
  // get_quote_submitted is recorded by the server when a quote is saved.
});

const SESSION_KEY = 'wm_session_id';
const SESSION_STARTED_KEY = 'wm_session_started';
let memorySessionId = null;

const newSessionId = () => {
  try {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  } catch { /* fall back below */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

// Anonymous, random visitor id. Contains no personal data.
export function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = newSessionId();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    if (!memorySessionId) memorySessionId = newSessionId();
    return memorySessionId;
  }
}

const authToken = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo'))?.token || null;
  } catch {
    return null;
  }
};

// POST JSON to the API. Sends the login token when present; if the server
// rejects it (expired), retries once anonymously. Resolves to
// { ok, status, data } and never rejects.
export async function postJSON(path, body, { keepalive = false } = {}) {
  const send = (token) => fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    keepalive,
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
  try {
    const token = authToken();
    let response = await send(token);
    if (response.status === 401 && token) response = await send(null);
    let data = null;
    try { data = await response.json(); } catch { /* empty body */ }
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export function trackEvent(eventType, { vendorId, source, metadata } = {}) {
  try {
    return postJSON('/api/analytics/events/', {
      event_type: eventType,
      session_id: getSessionId(),
      path: window.location.pathname,
      referrer: document.referrer || '',
      ...(vendorId != null && { vendor_id: vendorId }),
      ...(source && { source }),
      ...(metadata && { metadata }),
    }, { keepalive: true });
  } catch {
    return Promise.resolve({ ok: false, status: 0, data: null });
  }
}

// Once per browser tab session.
export function trackSessionStart() {
  try {
    if (sessionStorage.getItem(SESSION_STARTED_KEY)) return;
    sessionStorage.setItem(SESSION_STARTED_KEY, '1');
  } catch { /* storage blocked: the server's duplicate window still applies */ }
  trackEvent(EVENTS.SESSION_START, { source: 'app' });
}

// Mirrors normalize_indian_mobile in backend/base/analytics.py.
export function normalizeIndianMobile(value) {
  if (typeof value !== 'string') return '';
  let digits = value.trim().replace(/[\s\-()]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return '';
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

// ── Search intent (Step 8) ───────────────────────────────────────────────────

// Filters that describe what the customer wants (sorting alone isn't a search).
export function activeSearchFilters(filters) {
  const active = {};
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (key !== 'sort' && value !== '' && value !== null && value !== undefined && value !== false) {
      active[key] = value;
    }
  });
  return active;
}

// Record a search. The server re-parses everything; nothing here is trusted.
export function trackSearch({ source, query = '', filters = {}, resultCount = null } = {}) {
  try {
    return postJSON('/api/analytics/searches/', {
      source,
      query,
      filters,
      result_count: Number.isInteger(resultCount) ? resultCount : null,
      session_id: getSessionId(),
      path: window.location.pathname,
    }, { keepalive: true });
  } catch {
    return Promise.resolve({ ok: false, status: 0, data: null });
  }
}

// Debounced, de-duplicated tracker for screens whose filters change rapidly
// (e.g. typing a price). Only the search the customer settles on is sent.
export function createSearchTracker(delay = 1200) {
  let timer = null;
  let lastSent = '';
  let pending = null;
  const send = () => {
    clearTimeout(timer);
    const search = pending;
    pending = null;
    if (!search) return;
    try {
      lastSent = JSON.stringify([search.source, search.query || '', search.filters || {}]);
      trackSearch(search);
    } catch { /* never break the page */ }
  };
  const track = (search) => {
    try {
      const key = JSON.stringify([search.source, search.query || '', search.filters || {}]);
      if (key === lastSent) return;
      clearTimeout(timer);
      pending = search;
      timer = setTimeout(send, delay);
    } catch { /* tracking must never break search */ }
  };
  // Send a search still waiting on the debounce right now (e.g. the customer clicked a result
  // or is leaving the page). Sends nothing if nothing is pending, so it never duplicates.
  track.flush = () => { if (pending) send(); };
  track.cancel = () => { clearTimeout(timer); pending = null; };
  return track;
}
