/**
 * Gera páginas estáticas /termos/ e /privacidade/ a partir de src/legal.ts (o mesmo texto do app).
 * O Google (tela de consentimento OAuth), o Asaas e buscadores precisam de um endereço público
 * com HTML pronto para ler, sem depender de JavaScript.
 */
import type { Plugin } from 'vite';
import { LEGAL, PRIVACIDADE, TERMOS, type LegalSection } from '../src/legal';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(titulo: string, secoes: LegalSection[], outro: { href: string; nome: string }): string {
  const corpo = secoes
    .map((s) => `<section><h2>${esc(s.titulo)}</h2>${s.paragrafos.map((p) => `<p>${esc(p)}</p>`).join('')}</section>`)
    .join('\n');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'" />
<title>${esc(titulo)} · ${esc(LEGAL.produto)}</title>
<meta name="description" content="${esc(titulo)} do ${esc(LEGAL.produto)}." />
<link rel="icon" type="image/png" href="../favicon.png" />
<style>
  :root { color-scheme: light dark; --bg:#eff1f4; --card:#fff; --ink:#131921; --muted:#586270; --accent:#145c8a; --line:#d3d8e0; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0d1116; --card:#151b23; --ink:#e6ebf1; --muted:#96a0ae; --accent:#62acde; --line:#2e3744; } }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.6 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  main { max-width:720px; margin:0 auto; padding:24px 16px 48px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:20px; }
  h1 { margin:0 0 4px; font-size:28px; } h2 { font-size:18px; margin:24px 0 6px; }
  p { margin:0 0 10px; } .muted { color:var(--muted); font-size:14px; }
  a { color:var(--accent); font-weight:600; } nav { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:16px; }
</style>
</head>
<body>
<main>
<nav><a href="../">← Abrir o ${esc(LEGAL.produto)}</a><a href="${outro.href}">${esc(outro.nome)}</a></nav>
<div class="card">
<h1>${esc(titulo)}</h1>
<p class="muted">${esc(LEGAL.produto)} · Atualizado em ${esc(LEGAL.atualizadoEm)} · Contato: ${esc(LEGAL.email)}</p>
${corpo}
</div>
</main>
</body>
</html>
`;
}

export function legalPages(): Plugin {
  return {
    name: 'paginas-legais',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'termos/index.html', source: page('Termos de uso', TERMOS, { href: '../privacidade/', nome: 'Política de privacidade' }) });
      this.emitFile({ type: 'asset', fileName: 'privacidade/index.html', source: page('Política de privacidade', PRIVACIDADE, { href: '../termos/', nome: 'Termos de uso' }) });
    },
  };
}
