/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Política de segurança de conteúdo na versão publicada: o app só carrega scripts dele mesmo
 * e só conversa com o próprio Supabase. (GitHub Pages não deixa mandar cabeçalhos, por isso vai como <meta>.)
 */
function csp(supabaseUrl: string | undefined): Plugin {
  const api = supabaseUrl ? new URL(supabaseUrl) : null;
  const connect = ["'self'", api ? `${api.origin} wss://${api.host}` : ''].filter(Boolean).join(' ');
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
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
    plugins: mode === 'single' ? [react(), viteSingleFile()] : [react(), csp(env.VITE_SUPABASE_URL)],
    base: './',
    // Testes nunca falam com o Supabase de verdade, mesmo com .env.local preenchido
    test: { env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' } },
  };
});
