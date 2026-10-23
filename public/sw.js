// Service worker: deixa o app abrir sem internet.
// Página: tenta a rede primeiro (pega atualizações) e cai no cache se estiver offline.
// Arquivos estáticos (js, css, ícones, fontes): cache primeiro.
// Nunca guarda respostas da API (Supabase): elas têm dados pessoais e precisam estar sempre atualizadas.
const CACHE = 'vale-a-corrida-v3';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;
  // Volta do login (Google/Apple/e-mail) traz um código na URL: sempre da rede
  if (req.mode === 'navigate' && url.searchParams.has('code')) return;
  // Só a página do app vai para o cache como index.html; /termos/, /privacidade/ etc. seguem direto da rede
  const raiz = new URL('./', self.location).pathname;
  if (req.mode === 'navigate' && url.pathname !== raiz && url.pathname !== raiz + 'index.html') return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
