/**
 * Conteúdo público e indexável: guias em /guias/, robots.txt e sitemap.xml.
 * O app é uma página só (o Google ignora o que vem depois do #), então estas páginas com texto
 * é que aparecem nas pesquisas. Também é exigência prática do AdSense (site com conteúdo próprio).
 *
 * Para criar um guia novo: acrescente um item em ARTIGOS. A página, o índice e o sitemap saem sozinhos.
 */
import type { Plugin } from 'vite';
import { LEGAL } from '../src/legal';

export const SITE = 'https://valeacorrida.app.br';

interface Artigo {
  slug: string;
  titulo: string; // <h1>
  tituloSeo: string; // <title>
  descricao: string; // meta description e cartão no índice
  corpo: string; // HTML do artigo (sem o <h1>)
}

const CTA = `
<h2>Faça essa conta em segundos</h2>
<p>O <a href="../">${LEGAL.produto}</a> faz tudo isso automaticamente: você cadastra o veículo pela tabela FIPE, escolhe a plataforma e, a cada oferta, vê na hora se ela vale a pena (🟢), dá lucro abaixo da sua meta (🟡) ou dá prejuízo (🔴). O histórico mostra o lucro real do dia, da semana e do mês. É grátis para começar.</p>
<p><a class="cta" href="../">Abrir o ${LEGAL.produto}</a></p>`;

const AVISO = `<p class="muted">Valores dos exemplos são ilustrativos. Preços de combustível, peças e seguros variam por cidade e por veículo; use sempre os seus.</p>`;

export const ARTIGOS: Artigo[] = [
  {
    slug: 'como-calcular',
    titulo: 'Como saber se uma corrida ou entrega vale a pena',
    tituloSeo: 'Como saber se uma corrida vale a pena: cálculo de lucro para motoristas',
    descricao:
      'Aprenda a calcular o lucro real de corridas e entregas de Uber, 99, iFood e Lalamove: combustível, manutenção, depreciação, custos fixos e o valor mínimo para aceitar.',
    corpo: `
<p>O valor que aparece na oferta não é o que você ganha. Do que a plataforma paga ainda saem combustível, desgaste do carro ou da moto, a parte do seguro e do IPVA, pedágio e o trecho que você roda vazio. Quem não faz essa conta acaba aceitando corridas que dão prejuízo sem perceber.</p>

<h2>1. Some todos os quilômetros, não só os da viagem</h2>
<p>Conte a ida até o passageiro ou até a coleta, a viagem em si e a volta até uma região com chamadas. O retorno vazio gasta o mesmo combustível e o mesmo pneu, mas ninguém paga por ele.</p>

<h2>2. Combustível: km ÷ consumo × preço</h2>
<p>Se o carro faz 11 km/L e a gasolina custa R$ 6,30, cada quilômetro custa R$ 6,30 ÷ 11 = <strong>R$ 0,57</strong>. Use o consumo real, medido no seu carro: encha o tanque, zere o hodômetro parcial e, no próximo tanque cheio, divida os km rodados pelos litros colocados.</p>

<h2>3. Manutenção e depreciação: separe por quilômetro</h2>
<p>Óleo, pneus, freios e suspensão não aparecem no dia, mas chegam. Divida o preço de cada serviço pelos km até a próxima troca. Exemplo: um jogo de pneus de R$ 1.800 que dura 40.000 km custa R$ 0,045 por km. O passo a passo completo está em <a href="../custo-por-km/">como calcular o custo por km do seu carro</a>.</p>
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
${CTA}
${AVISO}`,
  },
  {
    slug: 'custo-por-km',
    titulo: 'Como calcular o custo por km do seu carro (ou moto)',
    tituloSeo: 'Quanto custa o km rodado? Como calcular o custo por km do carro de aplicativo',
    descricao:
      'Passo a passo para descobrir quanto custa cada quilômetro rodado: combustível, manutenção, pneus, depreciação, seguro e IPVA. Com exemplos de carro popular e moto.',
    corpo: `
<p>Saber quanto custa cada quilômetro é a base de tudo para quem roda por aplicativo. Com esse número, você olha uma oferta e sabe na hora se ela cobre os gastos. O custo por km tem quatro partes.</p>

<h2>1. Combustível</h2>
<p><strong>Custo por km = preço do litro ÷ km por litro.</strong> Gasolina a R$ 6,30 num carro que faz 11,5 km/L: 6,30 ÷ 11,5 = <strong>R$ 0,55 por km</strong>. Numa moto que faz 38 km/L: <strong>R$ 0,17 por km</strong>.</p>
<p>Use o consumo real, no trânsito em que você roda, e não o do manual. Para medir: tanque cheio, zere o hodômetro parcial, rode normalmente e, no próximo tanque cheio, divida os km pelos litros que entraram.</p>

<h2>2. Manutenção</h2>
<p>Para cada item, divida o preço pelo intervalo em km até a próxima troca, e some tudo:</p>
<table>
<tr><th>Item (carro popular)</th><th>Preço</th><th>A cada</th><th>Por km</th></tr>
<tr><td>Óleo e filtros</td><td>R$ 250</td><td>5.000 km</td><td>R$ 0,050</td></tr>
<tr><td>Jogo de pneus</td><td>R$ 1.800</td><td>40.000 km</td><td>R$ 0,045</td></tr>
<tr><td>Freios</td><td>R$ 700</td><td>25.000 km</td><td>R$ 0,028</td></tr>
<tr><td>Suspensão</td><td>R$ 1.800</td><td>50.000 km</td><td>R$ 0,036</td></tr>
<tr><td>Imprevistos e revisão</td><td>R$ 1.200</td><td>10.000 km</td><td>R$ 0,120</td></tr>
<tr><td colspan="3"><strong>Total</strong></td><td><strong>R$ 0,28</strong></td></tr>
</table>
<p>Carro automático soma a troca do fluido do câmbio; carro blindado gasta pneus, freios e suspensão mais rápido.</p>

<h2>3. Depreciação</h2>
<p>O carro perde valor a cada km. <strong>Depreciação por km = (valor hoje − valor daqui a um ano) ÷ km rodados no ano.</strong> Um carro de R$ 45.000 que vale R$ 39.600 depois de 30.000 km perde R$ 5.400, ou <strong>R$ 0,18 por km</strong>. O valor de hoje você encontra na tabela FIPE.</p>

<h2>4. Custos fixos (seguro, IPVA, licenciamento)</h2>
<p>Esses custos não dependem de quanto você roda, mas dá para transformá-los em custo por km: <strong>total do mês ÷ km rodados no mês</strong>. R$ 600 por mês rodando 3.000 km dão <strong>R$ 0,20 por km</strong>.</p>

<h2>Resultado</h2>
<table>
<tr><th></th><th>Carro popular</th><th>Moto</th></tr>
<tr><td>Combustível</td><td>R$ 0,55</td><td>R$ 0,17</td></tr>
<tr><td>Manutenção</td><td>R$ 0,28</td><td>R$ 0,17</td></tr>
<tr><td>Depreciação</td><td>R$ 0,18</td><td>R$ 0,10</td></tr>
<tr><td>Custos fixos</td><td>R$ 0,20</td><td>R$ 0,06</td></tr>
<tr><td><strong>Total por km</strong></td><td><strong>R$ 1,21</strong></td><td><strong>R$ 0,50</strong></td></tr>
</table>
<p>Ou seja: uma corrida de 10 km nesse carro custa cerca de R$ 12 antes de qualquer lucro. Se a oferta paga R$ 14 por esses 10 km, o lucro real é de uns R$ 2, e não de R$ 14.</p>
<p>Lembre de contar também os km até o passageiro ou a coleta e a volta. Veja o cálculo completo de uma corrida em <a href="../como-calcular/">como saber se uma corrida vale a pena</a>.</p>
${CTA}
${AVISO}`,
  },
  {
    slug: 'uber-ou-99',
    titulo: 'Uber ou 99: qual paga melhor?',
    tituloSeo: 'Uber ou 99: qual paga melhor? Como descobrir com os seus próprios números',
    descricao:
      'Não existe resposta única: depende da sua cidade, horário e carro. Veja como comparar Uber, 99 e outros apps pelo lucro por hora e por km, com os seus próprios números.',
    corpo: `
<p>É a pergunta mais comum entre motoristas, e a resposta honesta é: <strong>depende</strong>. O valor das corridas muda com a cidade, o horário, a demanda, as promoções da semana e até o tipo de passageiro de cada região. O que vale para um colega pode não valer para você. A boa notícia é que dá para descobrir com os seus números em poucos dias.</p>

<h2>1. Compare lucro por hora, não valor por corrida</h2>
<p>Uma plataforma pode pagar mais por corrida e mesmo assim render menos, se você passar mais tempo parado esperando chamada ou rodando vazio até o passageiro. O número que importa é <strong>quanto sobra por hora trabalhada</strong>, depois de combustível, manutenção e custos fixos.</p>

<h2>2. Olhe também o lucro por km</h2>
<p>Duas plataformas podem dar o mesmo lucro por hora, mas uma gastar bem mais o carro. O lucro por km mostra quanto de desgaste cada real de lucro custou. Entre duas opções parecidas por hora, prefira a que roda menos.</p>

<h2>3. Registre por pelo menos duas semanas</h2>
<p>Anote cada corrida com o valor recebido, os km totais (incluindo a ida até o passageiro), o tempo do aceite até ficar livre e a plataforma. Uma semana boa ou ruim isolada engana; duas semanas, nos seus horários de costume, já mostram uma tendência.</p>

<h2>4. Separe por horário e região</h2>
<p>É comum uma plataforma ser melhor de manhã e outra à noite, ou uma ir melhor no centro e outra nos bairros. Se você roda nas duas, compare os mesmos horários.</p>

<h2>5. Não esqueça taxas, bônus e cancelamentos</h2>
<ul>
<li><strong>Taxas:</strong> a maioria dos apps já mostra o valor que você recebe; alguns mostram o preço do passageiro e descontam uma comissão depois. Confira no extrato.</li>
<li><strong>Bônus e promoções:</strong> entram no lucro, mas não são garantidos. Compare com e sem eles.</li>
<li><strong>Cancelamentos e esperas:</strong> tempo perdido também conta no lucro por hora.</li>
</ul>

<h2>6. Rodar nas duas ao mesmo tempo</h2>
<p>Muitos motoristas deixam os dois apps ligados e aceitam a melhor oferta do momento. Funciona bem, desde que você saiba avaliar cada oferta na hora pelo lucro real, e não pelo valor bruto.</p>

<h2>Como o Vale a Corrida ajuda</h2>
<p>Cada corrida registrada no app guarda a plataforma em que foi feita. No plano Pro, o histórico mostra uma tabela com <strong>lucro por hora, por km e por corrida de cada plataforma</strong>, lado a lado. Em poucas semanas você sabe, com os seus números, qual app paga melhor para você.</p>
${CTA}
${AVISO}`,
  },
];

const ESTILO = `
  :root { color-scheme: light dark; --bg:#eff1f4; --card:#fff; --ink:#131921; --muted:#586270; --accent:#145c8a; --line:#d3d8e0; --sunk:#e6e9ee; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0d1116; --card:#151b23; --ink:#e6ebf1; --muted:#96a0ae; --accent:#62acde; --line:#2e3744; --sunk:#1d242e; } }
  body { margin:0; background:var(--bg); color:var(--ink); font:17px/1.65 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  main { max-width:720px; margin:0 auto; padding:24px 16px 48px; }
  article, .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:20px; }
  h1 { margin:0 0 8px; font-size:30px; line-height:1.2; } h2 { font-size:20px; margin:28px 0 6px; }
  p, ul { margin:0 0 12px; } li { margin-bottom:4px; } .muted { color:var(--muted); font-size:14px; }
  a { color:var(--accent); font-weight:600; } nav { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:16px; font-size:15px; }
  .cta { display:inline-block; background:var(--accent); color:#fff; padding:10px 18px; border-radius:8px; text-decoration:none; }
  table { width:100%; border-collapse:collapse; margin:0 0 12px; font-size:15px; }
  th, td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); } th { background:var(--sunk); }
  .lista a { display:block; text-decoration:none; padding:14px 0; border-bottom:1px solid var(--line); }
  .lista a:last-child { border-bottom:0; } .lista span { display:block; color:var(--muted); font-weight:400; font-size:15px; }
  .mais { margin-top:24px; }`;

function pagina(opts: { caminho: string; titulo: string; descricao: string; tipo: 'article' | 'website'; conteudo: string }): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'" />
<title>${opts.titulo} · ${LEGAL.produto}</title>
<meta name="description" content="${opts.descricao}" />
<link rel="canonical" href="${SITE}/${opts.caminho}" />
<link rel="icon" type="image/png" href="../favicon.png" />
<meta property="og:site_name" content="${LEGAL.produto}" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:title" content="${opts.titulo}" />
<meta property="og:description" content="${opts.descricao}" />
<meta property="og:type" content="${opts.tipo}" />
<meta property="og:url" content="${SITE}/${opts.caminho}" />
<meta property="og:image" content="${SITE}/icon-512.png" />
<style>${ESTILO}</style>
</head>
<body>
<main>
<nav><a href="../">← Abrir o ${LEGAL.produto}</a><a href="../guias/">Guias</a><a href="../termos/">Termos</a><a href="../privacidade/">Privacidade</a></nav>
${opts.conteudo}
</main>
</body>
</html>
`;
}

function artigoHtml(a: Artigo): string {
  const outros = ARTIGOS.filter((x) => x.slug !== a.slug)
    .map((x) => `<a href="../${x.slug}/">${x.titulo}<span>${x.descricao}</span></a>`)
    .join('');
  return pagina({
    caminho: `${a.slug}/`,
    titulo: a.tituloSeo,
    descricao: a.descricao,
    tipo: 'article',
    conteudo: `<article><h1>${a.titulo}</h1>${a.corpo}</article>
<div class="card mais lista"><h2 style="margin-top:0">Outros guias</h2>${outros}</div>`,
  });
}

function indiceHtml(): string {
  const itens = ARTIGOS.map((x) => `<a href="../${x.slug}/">${x.titulo}<span>${x.descricao}</span></a>`).join('');
  return pagina({
    caminho: 'guias/',
    titulo: 'Guias para motoristas e entregadores de aplicativo',
    descricao: 'Guias práticos para quem roda por aplicativo: custo por km, lucro real de cada corrida e como comparar Uber, 99 e outros apps.',
    tipo: 'website',
    conteudo: `<div class="card lista"><h1>Guias para motoristas e entregadores</h1><p class="muted">Contas simples para saber quanto você ganha de verdade.</p>${itens}</div>`,
  });
}

/** Páginas que entram no sitemap (o app, os guias e os textos legais). */
export function paginasDoSite(): string[] {
  return ['', 'guias/', ...ARTIGOS.map((a) => `${a.slug}/`), 'termos/', 'privacidade/'];
}

export function guia(): Plugin {
  return {
    name: 'guias-e-seo',
    apply: 'build',
    generateBundle() {
      for (const a of ARTIGOS) this.emitFile({ type: 'asset', fileName: `${a.slug}/index.html`, source: artigoHtml(a) });
      this.emitFile({ type: 'asset', fileName: 'guias/index.html', source: indiceHtml() });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n` });
      const hoje = new Date().toISOString().slice(0, 10);
      const urls = paginasDoSite()
        .map((p) => `  <url><loc>${SITE}/${p}</loc><lastmod>${hoje}</lastmod></url>`)
        .join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
  };
}
