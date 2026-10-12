// The visitor's city — one city at a time across the whole site (backend/base/areas.py CITY_AREAS).
// Remembered on this device; every vendor-listing request sends it (see the interceptor in utils/api.js).
import { useEffect, useState } from 'react';

export const CITIES = ['Chennai', 'Bangalore', 'Hyderabad'];
export const DEFAULT_CITY = 'Chennai';
const KEY = 'wm_city';
const EVENT = 'wm-city-change';

let memory = null;   // used when localStorage is unavailable (private mode, blocked storage)

export function storedCity() {
  try {
    const value = window.localStorage.getItem(KEY);
    return CITIES.includes(value) ? value : null;
  } catch {
    return memory;
  }
}

export const getCity = () => storedCity() || DEFAULT_CITY;
export const hasChosenCity = () => storedCity() !== null;

export function setCity(city) {
  if (!CITIES.includes(city)) return;
  try { window.localStorage.setItem(KEY, city); } catch { memory = city; }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: city }));
}

// Use the city in a component; re-renders when it changes anywhere on the page.
export function useCity() {
  const [city, setLocal] = useState(getCity);
  useEffect(() => {
    const on = (e) => setLocal(e.detail || getCity());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return [city, setCity];
}

// Vendor-listing endpoints that must stay inside the visitor's city.
const LISTING = /^\/api\/(products\/all(\/top)?\/?|products\/available-today\/?|search\/?|reels\/?)$/;
export const isListingRequest = (url = '') => LISTING.test(url.split('?')[0].replace(/^https?:\/\/[^/]+/, ''));
