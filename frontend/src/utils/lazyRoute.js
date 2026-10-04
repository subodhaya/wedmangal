// Route-level code splitting. Each screen is downloaded the first time it is visited,
// so a visitor landing on a vendor page doesn't download admin, booking or budget code.
import { lazy } from 'react';

const RELOADED = 'wm_chunk_reload';

// After a deploy, an open tab may ask for a screen file from the previous build. If that
// download fails, reload once to pick up the current build instead of showing a blank page.
export default function lazyRoute(factory) {
  return lazy(() => factory().then(
    (module) => { try { sessionStorage.removeItem(RELOADED); } catch { /* storage unavailable */ } return module; },
    (error) => {
      let reloaded = false;
      try { reloaded = sessionStorage.getItem(RELOADED) === '1'; sessionStorage.setItem(RELOADED, '1'); } catch { /* ignore */ }
      if (!reloaded && error && /chunk|dynamically imported module|Loading CSS/i.test(String(error.message || error.name))) {
        window.location.reload();
        return new Promise(() => {});   // keep the fallback on screen while reloading
      }
      throw error;
    },
  ));
}
