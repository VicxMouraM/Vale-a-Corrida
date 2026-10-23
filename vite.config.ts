/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { legalPages } from './scripts/legal-pages';

/** Domínios do Google AdSense (só entram na CSP com VITE_ADS=adsense). */
const ADSENSE = [
  'https://pagead2.googlesyndication.com',
  'https://*.googlesyndication.com',
  'https://*.doubleclick.net',
  'https://*.google.com',
  'https://*.gstatic.com',
  'https://*.adtrafficquality.google',
];

/**
 * Política de segurança de conteúdo na versão publicada: o app só carrega scripts dele mesmo
 * e só conversa com o próprio Supabase. (GitHub Pages não deixa mandar cabeçalhos, por isso vai como <meta>.)
 */
function csp(supabaseUrl: string | undefined, turnstile: boolean, adsense: boolean): Plugin {
  const api = supabaseUrl ? new URL(supabaseUrl) : null;
  // FIPE (parallelum.com.br): cadastro de veículo por marca, modelo e ano
  const connect = ["'self'", api ? `${api.origin} wss://${api.host}` : '', 'https://parallelum.com.br', adsense ? ADSENSE.join(' ') : ''].filter(Boolean).join(' ');
  const policy = [
    "default-src 'self'",
    `script-src 'self'${turnstile ? ' https://challenges.cloudflare.com' : ''}${adsense ? ` ${ADSENSE.join(' ')}` : ''}`,
    ...(turnstile || adsense
      ? [`frame-src${turnstile ? ' https://challenges.cloudflare.com' : ''}${adsense ? ' https://*.doubleclick.net https://*.googlesyndication.com https://www.google.com' : ''}`]
      : []),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // https: para as imagens dos anúncios próprios (só imagem; scripts continuam restritos)
    "img-src 'self' data: blob: https:",
    `connect-src ${connect}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
  return {
    name: 'csp',
    apply: 'build',
    transformIndexHtml: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`),
  };
}

// `npm run build` gera a pasta dist/ normal.
// `npx vite build --mode single` gera um único index.html autocontido (útil para abrir no celular offline, só modo convidado).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: mode === 'single' ? [react(), viteSingleFile()] : [react(), csp(env.VITE_SUPABASE_URL, !!env.VITE_TURNSTILE_SITE_KEY, env.VITE_ADS === 'adsense'), legalPages()],
    base: './',
    // Testes nunca falam com o Supabase de verdade, mesmo com .env.local preenchido
    test: { env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_TURNSTILE_SITE_KEY: '' } },
  };
});
