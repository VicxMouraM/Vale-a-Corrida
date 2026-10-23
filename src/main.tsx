import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import './index.css';

// Clickjacking: o GitHub Pages não deixa mandar o cabeçalho frame-ancestors, então o app
// se recusa a abrir dentro de um iframe de outro site (golpe de botão escondido por cima).
if (import.meta.env.PROD && window.top !== window.self) {
  const p = document.createElement('p');
  p.style.cssText = 'font-family:sans-serif;padding:24px';
  p.textContent = 'Por segurança, o Vale a Corrida só abre no endereço oficial. ';
  const link = document.createElement('a');
  link.href = location.origin + location.pathname; // sem query/hash vindos de fora
  link.target = '_top';
  link.rel = 'noopener';
  link.textContent = 'Abrir o app';
  p.appendChild(link);
  document.body.replaceChildren(p);
  throw new Error('aberto dentro de iframe');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
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
