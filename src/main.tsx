import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Modo app (PWA): registra o service worker só na versão publicada normalmente (não no arquivo único).
if (import.meta.env.PROD && import.meta.env.MODE !== 'single' && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* sem modo offline; o app continua funcionando */
    });
  });
}
