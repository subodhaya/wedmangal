// Everything that differs inside the Android app (Capacitor). On the website every helper here is a no-op.
// The app's pages are served from https://localhost, so relative server URLs must become full ones.
import axios from 'axios';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export const isNativeApp = Capacitor.isNativePlatform();

export const API_ORIGIN = 'https://wedmangal.com';
// Photos and pages live on www (the bare domain redirects there).
export const SITE_ORIGIN = 'https://www.wedmangal.com';

const FULL_URL = /^([a-z][a-z0-9+.-]*:|\/\/)/i;   // https:, blob:, data:, //host
const withOrigin = (origin, path) => `${origin}${path.startsWith('/') ? '' : '/'}${path}`;

// "/api/…" for fetch(): unchanged on the website, full URL in the app.
export const apiUrl = (path, native = isNativeApp) => (native ? withOrigin(API_ORIGIN, path) : path);

// A photo/video the server stores ("/static/images/…"). Not for files bundled in public/.
export const assetUrl = (path, native = isNativeApp) =>
  (!native || !path || typeof path !== 'string' || FULL_URL.test(path) ? path : withOrigin(SITE_ORIGIN, path));

// Origin to use when building a link other people will open.
export const publicOrigin = () => (isNativeApp ? SITE_ORIGIN : window.location.origin);

// Pages Django renders, which the React router does not have (base/landing.py).
const SERVER_PAGE = /^\/(chennai|bangalore|hyderabad|list-your-business|admin)(\/|$)/;
export const isServerPage = (path = '') => SERVER_PAGE.test(path);

// Call once at startup.
export async function initNativeApp() {
  if (!isNativeApp) return;
  axios.defaults.baseURL = API_ORIGIN;   // the few components that use axios directly with "/api/…"

  // WhatsApp, tel:, mailto:, maps and other sites need nothing: Capacitor hands them to Android.
  document.addEventListener('click', async (e) => {
    const link = e.target.closest?.('a[href]');
    if (!link || link.origin !== window.location.origin || !isServerPage(link.pathname)) return;
    e.preventDefault();
    const { Browser } = await import('@capacitor/browser');
    Browser.open({ url: `${SITE_ORIGIN}${link.pathname}${link.search}`, toolbarColor: '#5e143f' });
  }, true);

  const { App } = await import('@capacitor/app');
  App.addListener('backButton', ({ canGoBack }) => {
    if (window.location.pathname === '/') App.exitApp();
    else if (canGoBack) window.history.back();
    else window.location.replace('/');   // opened straight on an inner page
  });
}

// Google's web button is blocked in WebViews; this uses Android's own account chooser.
// Returns the ID token the backend already verifies, or null if the person cancelled.
export async function nativeGoogleIdToken(webClientId) {
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  // Only the ID token is needed, so skip the extra access-token step.
  await SocialLogin.initialize({ google: { webClientId, mode: 'online', skipAuthOnlyAuthorizationAfterSignIn: true } });
  try {
    const { result } = await SocialLogin.login({ provider: 'google', options: { style: 'standard' } });
    if (!result?.idToken) throw new Error('Google returned no ID token');
    return result.idToken;
  } catch (error) {
    if (error?.code === 'USER_CANCELLED') return null;
    throw error;
  }
}

// Read a server image without the browser's cross-origin limits, so html2canvas can draw it.
export async function imageAsDataUrl(url) {
  const response = await CapacitorHttp.get({ url, responseType: 'blob' });
  if (response.status !== 200) throw new Error(`Image request failed: ${response.status}`);
  const type = Object.entries(response.headers || {}).find(([k]) => k.toLowerCase() === 'content-type')?.[1];
  return `data:${type || 'image/jpeg'};base64,${String(response.data).replace(/\s/g, '')}`;
}

// Android's share sheet (WhatsApp, save to Photos/Files…) for an image data URL.
export async function shareImage(dataUrl, fileName, text) {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'), import('@capacitor/share'),
  ]);
  const { uri } = await Filesystem.writeFile({ path: fileName, data: dataUrl.split(',')[1], directory: Directory.Cache });
  try {
    await Share.share({ text, files: [uri] });
  } catch (error) {
    if (!/cancel/i.test(error?.message || '')) throw error;   // closing the share sheet is not an error
  }
}
