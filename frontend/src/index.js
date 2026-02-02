import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './bootstrap.min.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { registerServiceWorker } from './utils/swRegister';

// Capture beforeinstallprompt globally
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPWAEvent = e;
  console.log("[PWA] beforeinstallprompt captured in index.js");
});

const root = createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

//registerServiceWorker();   // ✅ REGISTER SERVICE WORKER HERE

reportWebVitals();
