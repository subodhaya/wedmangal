// src/utils/swRegister.js
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered');
      } catch (err) {
        console.warn('SW register failed', err);
      }
    });
  }
}
