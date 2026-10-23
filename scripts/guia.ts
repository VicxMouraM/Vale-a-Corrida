/**
 * Conteúdo público e indexável: guia /como-calcular/, robots.txt e sitemap.xml.
 * Ajuda o app a aparecer no Google e é exigência prática do AdSense (site com conteúdo próprio, não só um app).
 */
import type { Plugin } from 'vite';
import { LEGAL } from '../src/legal';

const SITE = 'https://valeacorrida.app.br';

const ARTIGO = `
<h1>Como saber se uma corrida ou entrega vale a pena</h1>
<p class="muted">Guia para motoristas e entregadores de Uber, 99, iFood, Lalamove, inDrive e outros apps.</p>

<p>O valor que aparece na oferta não é o que você ganha. Do que a plataforma paga ainda saem combustível, desgaste do carro ou da moto, a parte do seguro e do IPVA, pedágio e o trecho que você roda vazio. Quem não faz essa conta acaba aceitando corridas que dão prejuízo sem perceber.</p>

<h2>1. Some todos os quilômetros, não só os da viagem</h2>
<p>Conte a ida até o passageiro ou até a coleta, a viagem em si e a volta até uma região com chamadas. O retorno vazio gasta o mesmo combustível e o mesmo pneu, mas ninguém paga por ele.</p>

<h2>2. Combustível: km ÷ consumo × preço</h2>
<p>Se o carro faz 11 km/L e a gasolina custa R$ 6,30, cada quilômetro custa R$ 6,30 ÷ 11 = <strong>R$ 0,57</strong>. Use o consumo real, medido no seu carro: encha o tanque, zere o hodômetro parcial e, no próximo tanque cheio, divida os km rodados pelos litros colocados.</p>

<h2>3. Manutenção e depreciação: separe por quilômetro</h2>
<p>Óleo, pneus, freios e suspensão não aparecem no dia, mas chegam. Divida o preço de cada serviço pelos km até a próxima troca. Exemplo: um jogo de pneus de R$ 1.800 que dura 40.000 km custa R$ 0,045 por km. Somando todos os itens, um carro popular costuma ficar entre R$ 0,12 e R$ 0,25 por km. O mesmo vale para a perda de valor do carro: a diferença entre o valor de hoje e o valor depois de um ano de uso, dividida pelos km do ano.</p>
<p>Esse dinheiro é uma <strong>reserva</strong>: não sai do bolso hoje, mas precisa ser guardado para quando o serviço vencer.</p>

<h2>4. Custos fixos: divida pelas horas trabalhadas</h2>
<p>Seguro, IPVA, licenciamento e plano de celular são pagos trabalhando ou não. Some o valor mensal, considere só a parte usada no trabalho e divida pelas horas trabalhadas no mês. Com R$ 600 por mês e 150 horas de trabalho, cada hora carrega R$ 4 de custo fixo.</p>

<h2>5. Exemplo completo</h2>
<p>Oferta de <strong>R$ 25,00</strong>, 3 km até o passageiro, 9 km de viagem, 30 minutos no total, carro popular a gasolina:</p>
<ul>
<li>Combustível: 12 km × R$ 0,57 = R$ 6,87</li>
<li>Manutenção: 12 km × R$ 0,18 = R$ 2,16</li>
<li>Depreciação: 12 km × R$ 0,15 = R$ 1,80</li>
<li>Custos fixos: 0,5 h × R$ 4,00 = R$ 2,00</li>
<li><strong>Sobra: R$ 25,00 − R$ 12,83 = R$ 12,17</strong>, ou <strong>R$ 24,34 por hora</strong></li>
</ul>
<p>Metade da corrida foi custo. Se a sua meta é R$ 30 por hora, essa oferta fica abaixo dela, mesmo parecendo boa.</p>

<h2>6. Gasolina ou etanol?</h2>
<p>O etanol compensa quando o preço dele é menor que <em>preço da gasolina × (km/L no etanol ÷ km/L na gasolina)</em>. A regra dos 70% é só uma média: o seu carro pode render 65% ou 75%, e é esse número que importa.</p>

<h2>7. Defina um mínimo antes de aceitar</h2>
<p>Com os custos por km e por hora, dá para saber o valor mínimo de cada oferta: o que cobre tudo e ainda paga o seu lucro por hora desejado. Abaixo disso, recusar também é ganhar.</p>

<h2>Faça essa conta em segundos</h2>
<p>O <a href="../">${LEGAL.produto}</a> faz tudo isso automaticamente: você cadastra o veículo pela tabela FIPE, escolhe a plataforma e, a cada oferta, vê na hora se ela vale a pena (🟢), dá lucro abaixo da meta (🟡) ou dá prejuízo (🔴). O histórico mostra o lucro real do dia, da semana e do mês. É grátis para começar.</p>
<p><a class="cta" href="../">Abrir o ${LEGAL.produto}</a></p>
<p class="muted">Valores do exemplo são ilustrativos. Preços de combustível, peças e seguros variam por cidade e por veículo.</p>
`;

function html(): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'" />
<title>Como saber se uma corrida vale a pena: cálculo de lucro para motoristas · ${LEGAL.produto}</title>
<meta name="description" content="Aprenda a calcular o lucro real de corridas e entregas de Uber, 99, iFood e Lalamove: combustível, manutenção, depreciação, custos fixos e o valor mínimo para aceitar." />
<link rel="canonical" href="${SITE}/como-calcular/" />
<link rel="icon" type="image/png" href="../favicon.png" />
<meta property="og:title" content="Como saber se uma corrida vale a pena" />
<meta property="og:description" content="O cálculo completo do lucro real de cada corrida, com exemplo." />
<meta property="og:type" content="article" />
<meta property="og:url" content="${SITE}/como-calcular/" />
<style>
  :root { color-scheme: light dark; --bg:#eff1f4; --card:#fff; --ink:#131921; --muted:#586270; --accent:#145c8a; --line:#d3d8e0; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0d1116; --card:#151b23; --ink:#e6ebf1; --muted:#96a0ae; --accent:#62acde; --line:#2e3744; } }
  body { margin:0; background:var(--bg); color:var(--ink); font:17px/1.65 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  main { max-width:720px; margin:0 auto; padding:24px 16px 48px; }
  article { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:20px; }
  h1 { margin:0 0 4px; font-size:30px; line-height:1.2; } h2 { font-size:20px; margin:28px 0 6px; }
  p, ul { margin:0 0 12px; } li { margin-bottom:4px; } .muted { color:var(--muted); font-size:14px; }
  a { color:var(--accent); font-weight:600; } nav { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:16px; font-size:15px; }
  .cta { display:inline-block; background:var(--accent); color:#fff; padding:10px 18px; border-radius:8px; text-decoration:none; }
</style>
</head>
<body>
<main>
<nav><a href="../">← Abrir o ${LEGAL.produto}</a><a href="../termos/">Termos</a><a href="../privacidade/">Privacidade</a></nav>
<article>${ARTIGO}</article>
</main>
</body>
</html>
`;
}

const PAGINAS = ['', 'como-calcular/', 'termos/', 'privacidade/'];

export function guia(): Plugin {
  return {
    name: 'guia-e-seo',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'como-calcular/index.html', source: html() });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n` });
      const hoje = new Date().toISOString().slice(0, 10);
      const urls = PAGINAS.map((p) => `  <url><loc>${SITE}/${p}</loc><lastmod>${hoje}</lastmod></url>`).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
  };
}
