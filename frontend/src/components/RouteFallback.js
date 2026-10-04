// Shown for the moment a screen's code is downloading (first visit only).
import React from 'react';

export default function RouteFallback() {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #ead6df', borderTopColor: '#5e143f',
        animation: 'wm-spin 0.8s linear infinite' }} />
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Loading…</span>
      <style>{'@keyframes wm-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
