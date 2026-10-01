import {
  EVENTS, activeSearchFilters, createSearchTracker, getSessionId, normalizeIndianMobile, postJSON,
  trackEvent, trackSearch, trackSessionStart,
} from './analytics';

const okResponse = (status = 201, body = { recorded: true }) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  global.fetch = jest.fn(() => okResponse());
});

afterEach(() => {
  jest.restoreAllMocks();
});

const sentBody = (call = 0) => JSON.parse(global.fetch.mock.calls[call][1].body);
const sentHeaders = (call = 0) => global.fetch.mock.calls[call][1].headers;

describe('getSessionId', () => {
  it('creates one anonymous id and reuses it', () => {
    const id = getSessionId();
    expect(id).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(getSessionId()).toBe(id);
    expect(localStorage.getItem('wm_session_id')).toBe(id);
  });

  it('still works when storage is blocked', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const id = getSessionId();
    expect(id).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(getSessionId()).toBe(id);
  });
});

describe('trackEvent', () => {
  it('posts the event with session, vendor and page info', async () => {
    await trackEvent(EVENTS.WHATSAPP_CLICK, { vendorId: 7, source: 'vendor_page' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/analytics\/events\/$/);
    expect(options.method).toBe('POST');
    expect(options.keepalive).toBe(true);
    expect(sentBody()).toMatchObject({
      event_type: 'whatsapp_click', vendor_id: 7, source: 'vendor_page', session_id: getSessionId(),
    });
  });

  it('sends the login token for signed-in users', async () => {
    localStorage.setItem('userInfo', JSON.stringify({ token: 'abc' }));
    await trackEvent(EVENTS.PHONE_CLICK, { vendorId: 1 });
    expect(sentHeaders().Authorization).toBe('Bearer abc');
  });

  it('retries anonymously when the token is rejected, without logging the user out', async () => {
    localStorage.setItem('userInfo', JSON.stringify({ token: 'expired' }));
    global.fetch = jest.fn()
      .mockImplementationOnce(() => okResponse(401, { detail: 'Token expired' }))
      .mockImplementationOnce(() => okResponse(201));
    const result = await trackEvent(EVENTS.PHONE_CLICK, { vendorId: 1 });
    expect(result.ok).toBe(true);
    expect(sentHeaders(1).Authorization).toBeUndefined();
    expect(localStorage.getItem('userInfo')).not.toBeNull();
  });

  it('never rejects when the network fails', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(trackEvent(EVENTS.WHATSAPP_CLICK, { vendorId: 1 })).resolves.toMatchObject({ ok: false });
  });

  it('never throws even if fetch throws synchronously', () => {
    global.fetch = jest.fn(() => { throw new Error('boom'); });
    expect(() => trackEvent(EVENTS.PHONE_CLICK, { vendorId: 1 })).not.toThrow();
  });

  it('does not expose get_quote_submitted to the client', () => {
    expect(Object.values(EVENTS)).not.toContain('get_quote_submitted');
  });
});

describe('postJSON', () => {
  it('returns server validation errors', async () => {
    global.fetch = jest.fn(() => okResponse(400, { errors: { phone: 'Phone number is required.' } }));
    const result = await postJSON('/api/analytics/quotes/', {});
    expect(result).toEqual({ ok: false, status: 400, data: { errors: { phone: 'Phone number is required.' } } });
  });
});

describe('trackSessionStart', () => {
  it('fires once per browser session', () => {
    trackSessionStart();
    trackSessionStart();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sentBody().event_type).toBe('session_start');
  });
});

describe('normalizeIndianMobile', () => {
  it.each([
    ['9876543210', '9876543210'],
    ['+91 98765 43210', '9876543210'],
    ['919876543210', '9876543210'],
    ['09876543210', '9876543210'],
    ['98765-43210', '9876543210'],
  ])('accepts %s', (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });

  it.each(['', '12345', '5876543210', '98765 4321', 'abcdefghij', '+1 415 555 0100', null])('rejects %s', (input) => {
    expect(normalizeIndianMobile(input)).toBe('');
  });
});

describe('search intent tracking', () => {
  afterEach(() => jest.useRealTimers());

  it('keeps only filters that express a need', () => {
    expect(activeSearchFilters({ sort: 'newest', city: '', area_name: 'Tambaram', hall_parking: true, food_type: null }))
      .toEqual({ area_name: 'Tambaram', hall_parking: true });
  });

  it('sends the raw search for the server to parse', async () => {
    await trackSearch({ source: 'keyword', query: 'hall in Tambaram', filters: {}, resultCount: 4 });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/analytics\/searches\/$/);
    expect(options.keepalive).toBe(true);
    expect(sentBody()).toMatchObject({
      source: 'keyword', query: 'hall in Tambaram', result_count: 4, session_id: getSessionId(),
    });
  });

  it('never rejects when the network fails', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(trackSearch({ source: 'keyword', query: 'hall' })).resolves.toMatchObject({ ok: false });
  });

  it('debounces rapid filter changes and sends only the final search once', () => {
    jest.useFakeTimers();
    const track = createSearchTracker(1000);
    track({ source: 'filters', filters: { max_price: '1' } });
    track({ source: 'filters', filters: { max_price: '15' } });
    track({ source: 'filters', filters: { max_price: '150000' } });
    jest.advanceTimersByTime(1000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sentBody().filters).toEqual({ max_price: '150000' });
    track({ source: 'filters', filters: { max_price: '150000' } });  // same search again (e.g. re-render)
    jest.advanceTimersByTime(1000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('a tracker never throws even if tracking blows up', () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(() => { throw new Error('boom'); });
    const track = createSearchTracker(10);
    expect(() => { track({ source: 'keyword', query: 'hall' }); jest.advanceTimersByTime(10); }).not.toThrow();
  });
});
