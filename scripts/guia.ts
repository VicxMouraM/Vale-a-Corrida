/**
 * Conteúdo público e indexável: guias em /guias/, robots.txt e sitemap.xml.
 * O app é uma página só (o Google ignora o que vem depois do #), então estas páginas com texto
 * é que aparecem nas pesquisas. Também é exigência prática do AdSense (site com conteúdo próprio).
 *
 * Para criar um guia novo: acrescente um item em ARTIGOS. A página, o índice e o sitemap saem sozinhos.
 * Estilo de escrita: frases curtas, um assunto por parágrafo, todo termo explicado na primeira vez,
 * conta feita linha a linha nos exemplos, e um resumo no topo para quem tem pressa.
 */
import type { Plugin } from 'vite';
import { LEGAL } from '../src/legal';

export const SITE = 'https://valeacorrida.app.br';

interface Artigo {
  slug: string;
  titulo: string; // <h1>
  tituloSeo: string; // <title>
  descricao: string; // meta description e cartão no índice
  minutos: number; // tempo de leitura
  corpo: string; // HTML do artigo (sem o <h1>)
}

const CTA = `
<div class="cta-box">
  <h2>Faça essa conta em segundos, no celular</h2>
  <p>O <strong>${LEGAL.produto}</strong> faz todas essas contas sozinho. Você cadastra o seu carro ou moto uma vez (pela tabela FIPE) e, quando chegar uma oferta, digita valor, km e tempo. Na hora aparece:</p>
  <ul>
    <li>🟢 <strong>vale a pena</strong>, 🟡 <strong>dá lucro, mas abaixo da sua meta</strong> ou 🔴 <strong>dá prejuízo</strong>;</li>
    <li>quanto sobra de verdade, por corrida e por hora;</li>
    <li>o valor mínimo que você deveria aceitar.</li>
  </ul>
  <p><a class="cta" href="../">Abrir o ${LEGAL.produto} — é grátis</a></p>
</div>`;

const AVISO = `<p class="muted">Os números dos exemplos são ilustrativos, para mostrar como a conta funciona. Preço de combustível, peças e seguro muda de cidade para cidade e de carro para carro: use sempre os seus.</p>`;

export const ARTIGOS: Artigo[] = [
  {
    slug: 'como-calcular',
    titulo: 'Como saber se uma corrida ou entrega vale a pena',
    tituloSeo: 'Como saber se uma corrida vale a pena: o cálculo do lucro real, passo a passo',
    descricao:
      'Aprenda, passo a passo e com exemplo, a calcular quanto sobra de verdade em cada corrida de Uber, 99, iFood ou Lalamove: combustível, manutenção, desgaste e custos fixos.',
    minutos: 6,
    corpo: `
<div class="resumo">
  <strong>Resumo em 30 segundos</strong>
  <ul>
    <li>O valor da oferta <strong>não é o seu lucro</strong>. Dele ainda saem combustível, manutenção, desgaste do carro e uma parte do seguro e do IPVA.</li>
    <li>Some <strong>todos os quilômetros</strong>: até o passageiro, a viagem e a volta.</li>
    <li>Compare o <strong>lucro por hora</strong> com a sua meta. Não olhe só o valor da corrida.</li>
  </ul>
</div>

<nav class="sumario"><strong>Neste guia</strong>
  <ol>
    <li><a href="#engana">Por que o valor da oferta engana</a></li>
    <li><a href="#passos">A conta em 6 passos</a></li>
    <li><a href="#minimo">Qual o valor mínimo para aceitar</a></li>
    <li><a href="#erros">Erros mais comuns</a></li>
  </ol>
</nav>

<h2 id="engana">Por que o valor da oferta engana</h2>
<p>Imagine uma oferta de R$ 25. Parece um bom dinheiro. Mas, para fazer essa corrida, você gastou gasolina, gastou um pouco de pneu e de freio, e o seu carro ficou um pouco mais velho.</p>
<p>Esses gastos não aparecem na tela do aplicativo. Só que eles existem, e uma hora a conta chega: no posto, na oficina ou quando você for vender o carro.</p>
<p><strong>Lucro de verdade</strong> é o que sobra depois de pagar tudo isso.</p>

<h2 id="passos">A conta em 6 passos</h2>
<p>Vamos usar o mesmo exemplo do começo ao fim:</p>
<div class="exemplo">
  <strong>Exemplo</strong>
  <p>Oferta de <strong>R$ 25,00</strong>. São 3 km até o passageiro e 9 km de viagem, num total de <strong>30 minutos</strong>. O carro é um popular a gasolina, que faz 11 km por litro, e a gasolina custa R$ 6,30.</p>
</div>

<h3>Passo 1 — Some todos os quilômetros</h3>
<p>Conte três trechos:</p>
<ol>
  <li><strong>A ida até o passageiro</strong> (ou até a coleta, nas entregas);</li>
  <li><strong>a viagem</strong> em si;</li>
  <li><strong>a volta</strong> até um lugar com mais chamadas, se você precisar voltar.</li>
</ol>
<p>Muita gente esquece o primeiro e o terceiro. Mas eles gastam o mesmo combustível e o mesmo pneu, e ninguém paga por eles.</p>
<div class="exemplo"><strong>No exemplo:</strong> 3 km + 9 km = <strong>12 km</strong>.</div>

<h3>Passo 2 — Calcule o combustível</h3>
<p>Primeiro, descubra quantos litros a corrida gasta: divida os km pelo consumo do carro. Depois, multiplique pelo preço do litro.</p>
<div class="exemplo">
  <strong>No exemplo:</strong>
  <p>12 km ÷ 11 km/L = 1,09 litro<br />1,09 litro × R$ 6,30 = <strong>R$ 6,87</strong></p>
</div>
<div class="dica"><strong>Dica:</strong> use o consumo <em>real</em> do seu carro, não o do manual. Para medir: encha o tanque, zere o hodômetro parcial e rode normalmente. No próximo tanque cheio, divida os km rodados pelos litros que couberam.</div>

<h3>Passo 3 — Separe o dinheiro da manutenção</h3>
<p>Óleo, pneus, freios e suspensão vão precisar ser trocados. Esse gasto não aparece hoje, mas cada quilômetro rodado deixa a troca mais perto.</p>
<p>Por isso, o certo é <strong>separar um pouquinho por quilômetro</strong>. Chamamos isso de <strong>reserva</strong>: não é dinheiro que sai do bolso hoje, mas é dinheiro que você não deve gastar, porque ele vai pagar a oficina lá na frente.</p>
<p>Num carro popular, a reserva costuma ficar entre R$ 0,12 e R$ 0,30 por km. O guia <a href="../custo-por-km/">custo por km</a> mostra como calcular o valor exato do seu carro.</p>
<div class="exemplo"><strong>No exemplo</strong> (R$ 0,18 por km): 12 km × R$ 0,18 = <strong>R$ 2,16</strong></div>

<h3>Passo 4 — Conte o desgaste do carro (depreciação)</h3>
<p><strong>Depreciação</strong> é o valor que o carro perde com o uso. Um carro que vale R$ 45 mil hoje vale menos depois de um ano rodando muito. Essa perda também é custo do trabalho.</p>
<div class="exemplo"><strong>No exemplo</strong> (R$ 0,15 por km): 12 km × R$ 0,15 = <strong>R$ 1,80</strong></div>

<h3>Passo 5 — Reparta os custos fixos</h3>
<p><strong>Custos fixos</strong> são os que você paga trabalhando ou não: seguro, IPVA, licenciamento, plano do celular.</p>
<p>Some quanto eles custam por mês e divida pelas horas que você trabalha no mês. Assim você sabe quanto cada hora de trabalho precisa cobrir.</p>
<div class="exemplo">
  <strong>No exemplo:</strong>
  <p>R$ 600 por mês ÷ 150 horas de trabalho = R$ 4 por hora<br />A corrida levou meia hora: 0,5 × R$ 4 = <strong>R$ 2,00</strong></p>
</div>

<h3>Passo 6 — Some tudo e compare com a sua meta</h3>
<div class="exemplo">
  <table>
    <tr><td>Valor da oferta</td><td class="num">R$ 25,00</td></tr>
    <tr><td>(−) Combustível</td><td class="num">R$ 6,87</td></tr>
    <tr><td>(−) Manutenção (reserva)</td><td class="num">R$ 2,16</td></tr>
    <tr><td>(−) Depreciação</td><td class="num">R$ 1,80</td></tr>
    <tr><td>(−) Custos fixos</td><td class="num">R$ 2,00</td></tr>
    <tr class="total"><td>= Sobra de verdade</td><td class="num">R$ 12,17</td></tr>
  </table>
  <p>Em meia hora, sobraram R$ 12,17. Por hora, isso dá <strong>R$ 24,34</strong> (R$ 12,17 × 2).</p>
</div>
<p>Agora compare com a sua meta. Se você quer ganhar <strong>R$ 30 por hora</strong>, essa corrida fica abaixo: dá lucro, mas pouco. É o que o app chama de 🟡 <strong>amarelo</strong>.</p>
<p>Repare: <strong>metade da oferta foi embora em custos</strong>. Por isso o valor da tela engana tanto.</p>

<h2 id="minimo">Qual o valor mínimo para aceitar</h2>
<p>Com a mesma conta, dá para saber o mínimo de cada oferta antes de aceitar:</p>
<ul>
  <li><strong>Para não ter prejuízo</strong>, a oferta precisa cobrir os custos: R$ 12,83 no exemplo.</li>
  <li><strong>Para bater a sua meta</strong>, ela precisa cobrir os custos <em>mais</em> o lucro que você quer naquele tempo: R$ 12,83 + (R$ 30 × 0,5 h) = <strong>R$ 27,83</strong>.</li>
</ul>
<p>Ou seja: nessa corrida, a partir de uns R$ 28 vale a pena; abaixo de R$ 13 você paga para trabalhar.</p>

<h2>E a dúvida gasolina ou etanol?</h2>
<p>O etanol compensa quando o preço dele é menor que o da gasolina multiplicado pela proporção entre os consumos do <em>seu</em> carro. A famosa "regra dos 70%" é só uma média: se o seu carro faz 10 km/L na gasolina e 7,2 km/L no etanol, a proporção é 72%, e é ela que vale.</p>

<h2 id="erros">Erros mais comuns</h2>
<ul class="erros">
  <li><strong>Esquecer a ida até o passageiro e a volta.</strong> Às vezes é metade dos km.</li>
  <li><strong>Contar só a gasolina.</strong> Manutenção e desgaste juntos podem custar quase tanto quanto ela.</li>
  <li><strong>Usar o consumo do manual.</strong> No trânsito da cidade, o carro gasta mais.</li>
  <li><strong>Olhar o valor da corrida, e não o valor por hora.</strong> Uma corrida de R$ 40 que leva 1 hora e meia pode render menos que duas de R$ 20 em 40 minutos.</li>
</ul>

<h2>Na prática</h2>
<ol class="checklist">
  <li>Descubra o consumo real do seu carro.</li>
  <li>Calcule o seu custo por km (veja o <a href="../custo-por-km/">guia de custo por km</a>).</li>
  <li>Defina quanto quer ganhar por hora.</li>
  <li>A cada oferta, confira se ela passa do mínimo.</li>
</ol>
${CTA}
${AVISO}`,
  },
  {
    slug: 'custo-por-km',
    titulo: 'Quanto custa cada km rodado? Calcule o custo por km do seu carro ou moto',
    tituloSeo: 'Quanto custa o km rodado? Como calcular o custo por km do carro de aplicativo',
    descricao:
      'Entenda, com exemplos de carro popular e moto, como calcular quanto custa cada quilômetro: combustível, manutenção, pneus, depreciação, seguro e IPVA.',
    minutos: 7,
    corpo: `
<div class="resumo">
  <strong>Resumo em 30 segundos</strong>
  <ul>
    <li>O custo por km tem <strong>4 partes</strong>: combustível, manutenção, depreciação e custos fixos.</li>
    <li>Num carro popular, ele fica em torno de <strong>R$ 1,20 por km</strong>. Numa moto, perto de <strong>R$ 0,50</strong>.</li>
    <li>Com esse número, você olha uma oferta e sabe na hora se ela cobre os gastos.</li>
  </ul>
</div>

<nav class="sumario"><strong>Neste guia</strong>
  <ol>
    <li><a href="#combustivel">Combustível</a></li>
    <li><a href="#manutencao">Manutenção</a></li>
    <li><a href="#depreciacao">Depreciação</a></li>
    <li><a href="#fixos">Custos fixos</a></li>
    <li><a href="#resultado">O resultado e como usar</a></li>
  </ol>
</nav>

<p>Saber quanto custa cada quilômetro é a conta mais importante para quem roda por aplicativo. Ela é feita <strong>uma vez</strong> e depois serve para avaliar qualquer oferta em segundos. Vamos montar o número parte por parte.</p>

<h2 id="combustivel">Parte 1 — Combustível</h2>
<p>É a parte mais fácil. Divida o <strong>preço do litro</strong> pelos <strong>km que o veículo faz com um litro</strong>.</p>
<div class="exemplo">
  <strong>Exemplos</strong> (gasolina a R$ 6,30):
  <p>Carro que faz 11,5 km/L: R$ 6,30 ÷ 11,5 = <strong>R$ 0,55 por km</strong><br />Moto que faz 38 km/L: R$ 6,30 ÷ 38 = <strong>R$ 0,17 por km</strong></p>
</div>
<div class="dica"><strong>Dica:</strong> meça o consumo no trânsito em que você roda de verdade. No anda-e-para da cidade, o carro gasta bem mais do que o número do manual.</div>

<h2 id="manutencao">Parte 2 — Manutenção</h2>
<p>Para cada item que precisa de troca, faça a mesma conta: <strong>preço do serviço ÷ km até a próxima troca</strong>. Depois some tudo.</p>
<p>Veja um exemplo de carro popular:</p>
<div class="exemplo">
<table>
<tr><th>Item</th><th class="num">Preço</th><th class="num">Troca a cada</th><th class="num">Custo por km</th></tr>
<tr><td>Óleo e filtros</td><td class="num">R$ 250</td><td class="num">5.000 km</td><td class="num">R$ 0,050</td></tr>
<tr><td>Jogo de pneus</td><td class="num">R$ 1.800</td><td class="num">40.000 km</td><td class="num">R$ 0,045</td></tr>
<tr><td>Freios</td><td class="num">R$ 700</td><td class="num">25.000 km</td><td class="num">R$ 0,028</td></tr>
<tr><td>Suspensão</td><td class="num">R$ 1.800</td><td class="num">50.000 km</td><td class="num">R$ 0,036</td></tr>
<tr><td>Imprevistos e revisão</td><td class="num">R$ 1.200</td><td class="num">10.000 km</td><td class="num">R$ 0,120</td></tr>
<tr class="total"><td colspan="3">Total da manutenção</td><td class="num">R$ 0,28</td></tr>
</table>
</div>
<p>Leia a primeira linha assim: a troca de óleo custa R$ 250 e é feita a cada 5.000 km. Então cada km rodado "consome" R$ 0,05 da próxima troca.</p>
<div class="dica"><strong>Atenção:</strong> carro automático precisa somar a troca do fluido do câmbio. Carro blindado gasta pneu, freio e suspensão mais rápido, então os intervalos ficam menores.</div>

<h2 id="depreciacao">Parte 3 — Depreciação (o carro perdendo valor)</h2>
<p>Todo carro perde valor com o tempo e com os quilômetros. Quem roda por aplicativo roda muito, então perde valor mais rápido. Essa perda é um custo do trabalho, mesmo que você só "sinta" quando for vender.</p>
<p>A conta: <strong>(quanto vale hoje − quanto vai valer daqui a um ano) ÷ km que você roda no ano</strong>.</p>
<div class="exemplo">
  <strong>Exemplo:</strong>
  <p>O carro vale R$ 45.000 hoje (veja na tabela FIPE).<br />Depois de um ano e 30.000 km, deve valer uns R$ 39.600.<br />Perda: R$ 5.400 ÷ 30.000 km = <strong>R$ 0,18 por km</strong></p>
</div>

<h2 id="fixos">Parte 4 — Custos fixos (seguro, IPVA, licenciamento)</h2>
<p>Esses você paga rodando ou não. Para transformar em custo por km, divida o total do mês pelos km que você roda no mês.</p>
<div class="exemplo">
  <strong>Exemplo:</strong>
  <p>Seguro + IPVA + licenciamento = R$ 600 por mês<br />Você roda 3.000 km por mês<br />R$ 600 ÷ 3.000 km = <strong>R$ 0,20 por km</strong></p>
</div>

<h2 id="resultado">O resultado</h2>
<div class="exemplo">
<table>
<tr><th></th><th class="num">Carro popular</th><th class="num">Moto</th></tr>
<tr><td>Combustível</td><td class="num">R$ 0,55</td><td class="num">R$ 0,17</td></tr>
<tr><td>Manutenção</td><td class="num">R$ 0,28</td><td class="num">R$ 0,17</td></tr>
<tr><td>Depreciação</td><td class="num">R$ 0,18</td><td class="num">R$ 0,10</td></tr>
<tr><td>Custos fixos</td><td class="num">R$ 0,20</td><td class="num">R$ 0,06</td></tr>
<tr class="total"><td>Custo por km</td><td class="num">R$ 1,21</td><td class="num">R$ 0,50</td></tr>
</table>
</div>

<h2>Como usar esse número</h2>
<p>Pegue o valor da oferta e divida pelo total de km (contando a ida até o passageiro). Compare com o seu custo por km.</p>
<div class="exemplo">
  <strong>Exemplo com o carro popular:</strong>
  <p>Oferta de R$ 14 para 10 km no total → R$ 14 ÷ 10 = <strong>R$ 1,40 por km</strong><br />Custo do carro: R$ 1,21 por km<br />Sobra: R$ 0,19 por km, ou seja, <strong>uns R$ 1,90 na corrida inteira</strong> — e não R$ 14.</p>
</div>
<p>Se o valor por km da oferta for <strong>menor</strong> que o seu custo por km, a corrida dá prejuízo. Para saber se ela bate a sua meta, entra também o tempo gasto: veja o guia <a href="../como-calcular/">como saber se uma corrida vale a pena</a>.</p>

<h2>Na prática</h2>
<ol class="checklist">
  <li>Meça o consumo real do seu carro ou moto.</li>
  <li>Liste os itens de manutenção com preço e intervalo de troca.</li>
  <li>Veja o valor do veículo na tabela FIPE.</li>
  <li>Some seguro, IPVA e licenciamento do mês.</li>
  <li>Refaça a conta quando o combustível mudar de preço.</li>
</ol>
${CTA}
${AVISO}`,
  },
  {
    slug: 'uber-ou-99',
    titulo: 'Uber ou 99: qual paga melhor?',
    tituloSeo: 'Uber ou 99: qual paga melhor? Como descobrir com os seus próprios números',
    descricao:
      'Não existe resposta única: depende da sua cidade, do horário e do seu carro. Aprenda um método simples para comparar Uber, 99 e outros apps pelo lucro por hora.',
    minutos: 5,
    corpo: `
<div class="resumo">
  <strong>Resumo em 30 segundos</strong>
  <ul>
    <li>Não dá para responder de forma geral: depende da <strong>sua cidade, do horário e do seu carro</strong>.</li>
    <li>Compare o <strong>lucro por hora</strong>, não o valor por corrida.</li>
    <li>Anote suas corridas por <strong>duas semanas</strong> e a resposta aparece nos seus números.</li>
  </ul>
</div>

<p>É a pergunta que todo motorista faz. A resposta honesta é: <strong>depende</strong>. O valor das corridas muda com a cidade, o horário, a demanda, as promoções da semana e até com o tipo de passageiro de cada região. O que vale para um colega pode não valer para você.</p>
<p>A boa notícia: dá para descobrir com os seus próprios números, de um jeito simples. Siga os passos abaixo.</p>

<h2>Passo 1 — Escolha o número certo para comparar: lucro por hora</h2>
<p>O erro mais comum é comparar o valor de cada corrida. Uma plataforma pode pagar mais por corrida e mesmo assim render menos, se você passar mais tempo parado esperando chamada ou rodando vazio até o passageiro.</p>
<p>O número que importa é <strong>quanto sobra por hora trabalhada</strong>, depois de pagar combustível, manutenção e custos fixos.</p>
<div class="exemplo">
  <strong>Exemplo:</strong>
  <p>Na plataforma A, você faz 2 corridas de R$ 30 por hora. Na B, faz 3 corridas de R$ 22 por hora.<br />A paga R$ 60 por hora; B paga R$ 66 por hora. Mesmo pagando menos por corrida, <strong>B rende mais</strong> — se o gasto com km for parecido.</p>
</div>

<h2>Passo 2 — Olhe também o lucro por km</h2>
<p>Duas plataformas podem dar o mesmo lucro por hora, mas uma gastar bem mais o carro. O <strong>lucro por km</strong> mostra quanto de desgaste cada real de lucro custou.</p>
<p>Entre duas opções parecidas por hora, fique com a que roda menos: o carro dura mais.</p>

<h2>Passo 3 — Anote suas corridas por duas semanas</h2>
<p>Para cada corrida, anote:</p>
<ul>
  <li>o <strong>valor</strong> que você recebeu;</li>
  <li>os <strong>km totais</strong>, contando a ida até o passageiro;</li>
  <li>o <strong>tempo</strong>, do aceite até ficar livre de novo;</li>
  <li>a <strong>plataforma</strong>.</li>
</ul>
<p>Uma semana boa ou ruim sozinha engana. Duas semanas, nos seus horários de costume, já mostram uma tendência.</p>

<h2>Passo 4 — Compare nos mesmos horários e regiões</h2>
<p>É comum uma plataforma ser melhor de manhã e outra à noite, ou uma ir melhor no centro e outra nos bairros. Se você roda nas duas, compare <strong>o mesmo horário com o mesmo horário</strong>. Senão, a comparação fica injusta.</p>

<h2>Passo 5 — Não esqueça taxas, bônus e tempo perdido</h2>
<ul>
  <li><strong>Taxas:</strong> a maioria dos apps já mostra o valor que você recebe. Alguns mostram o preço pago pelo passageiro e descontam uma comissão depois. Confira no extrato.</li>
  <li><strong>Bônus e promoções:</strong> entram no lucro, mas não são garantidos. Compare com e sem eles.</li>
  <li><strong>Cancelamentos e esperas:</strong> tempo parado também conta no lucro por hora.</li>
</ul>

<h2>E rodar nas duas ao mesmo tempo?</h2>
<p>Muitos motoristas deixam os dois apps ligados e aceitam a melhor oferta do momento. Funciona bem — desde que você saiba avaliar cada oferta na hora pelo <strong>lucro real</strong>, e não pelo valor que aparece na tela.</p>

<h2>Na prática</h2>
<ol class="checklist">
  <li>Calcule o seu custo por km (veja o <a href="../custo-por-km/">guia de custo por km</a>).</li>
  <li>Registre cada corrida com a plataforma, por duas semanas.</li>
  <li>Compare o lucro por hora de cada plataforma, nos mesmos horários.</li>
  <li>Repita a cada alguns meses: tarifas e promoções mudam.</li>
</ol>

<div class="dica"><strong>Como o ${LEGAL.produto} ajuda:</strong> cada corrida registrada guarda a plataforma. No plano Pro, o histórico mostra uma tabela com o <strong>lucro por hora, por km e por corrida de cada plataforma</strong>, lado a lado. Em poucas semanas você sabe, com os seus números, qual app paga melhor para você.</div>
${CTA}
${AVISO}`,
  },
];

const ESTILO = `
  :root { color-scheme: light dark; --bg:#eff1f4; --card:#fff; --ink:#131921; --muted:#586270; --accent:#145c8a; --line:#d3d8e0; --sunk:#e6e9ee;
    --ex:#eef5fb; --ex-line:#b9d4e8; --dica:#fdf6e3; --dica-line:#e8d39a; --resumo:#eaf6ee; --resumo-line:#a9d8b8; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0d1116; --card:#151b23; --ink:#e6ebf1; --muted:#96a0ae; --accent:#62acde; --line:#2e3744; --sunk:#1d242e;
    --ex:#14222f; --ex-line:#24425a; --dica:#2a2412; --dica-line:#5a4a1c; --resumo:#132a1c; --resumo-line:#26502f; } }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:18px/1.75 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; -webkit-text-size-adjust:100%; }
  main { max-width:700px; margin:0 auto; padding:20px 16px 56px; }
  article, .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:22px 20px; }
  h1 { margin:0 0 6px; font-size:30px; line-height:1.25; }
  h2 { font-size:23px; line-height:1.3; margin:36px 0 10px; }
  h3 { font-size:19px; margin:28px 0 8px; color:var(--accent); }
  p { margin:0 0 14px; } ul, ol { margin:0 0 14px; padding-left:24px; } li { margin-bottom:6px; }
  .muted { color:var(--muted); font-size:15px; }
  .meta { color:var(--muted); font-size:15px; margin-bottom:18px; }
  a { color:var(--accent); font-weight:600; }
  nav.topo { display:flex; gap:16px; flex-wrap:wrap; align-items:center; margin-bottom:16px; font-size:15px; }
  nav.topo .marca { display:inline-flex; align-items:center; gap:8px; color:var(--ink); text-decoration:none; font-size:17px; }
  .resumo, .exemplo, .dica, .sumario, .cta-box { border-radius:12px; padding:14px 16px; margin:0 0 18px; }
  .resumo { background:var(--resumo); border:1px solid var(--resumo-line); }
  .exemplo { background:var(--ex); border:1px solid var(--ex-line); }
  .dica { background:var(--dica); border:1px solid var(--dica-line); }
  .sumario { background:var(--sunk); font-size:16px; } .sumario ol { margin:6px 0 0; }
  .resumo ul { margin:8px 0 0; } .exemplo p, .resumo p { margin:6px 0 0; } .exemplo > strong:first-child { display:block; }
  .cta-box { background:var(--sunk); border:2px solid var(--accent); margin-top:36px; } .cta-box h2 { margin-top:0; }
  .cta { display:inline-block; background:var(--accent); color:#fff; padding:12px 20px; border-radius:10px; text-decoration:none; }
  table { width:100%; border-collapse:collapse; margin:4px 0; font-size:16px; }
  th, td { text-align:left; padding:7px 8px; border-bottom:1px solid var(--ex-line); } th { font-size:14px; color:var(--muted); }
  .num { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
  tr.total td { font-weight:700; border-top:2px solid var(--ink); border-bottom:0; }
  ul.erros li::marker { content:"✗  "; color:#be2626; } ol.checklist li::marker { color:var(--accent); font-weight:700; }
  .lista a { display:block; text-decoration:none; padding:16px 0; border-bottom:1px solid var(--line); }
  .lista a:last-child { border-bottom:0; } .lista span { display:block; color:var(--muted); font-weight:400; font-size:16px; margin-top:2px; }
  .mais { margin-top:24px; }
  @media (max-width:480px) { body { font-size:17px; } h1 { font-size:26px; } h2 { font-size:21px; } article { padding:18px 16px; } table { font-size:14px; } }`;

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
<link rel="icon" type="image/svg+xml" href="../favicon.svg" />
<link rel="icon" type="image/png" sizes="64x64" href="../favicon.png" />
<meta property="og:site_name" content="${LEGAL.produto}" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:title" content="${opts.titulo}" />
<meta property="og:description" content="${opts.descricao}" />
<meta property="og:type" content="${opts.tipo}" />
<meta property="og:url" content="${SITE}/${opts.caminho}" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<style>${ESTILO}</style>
</head>
<body>
<main>
<nav class="topo"><a href="../" class="marca"><img src="../favicon.svg" alt="" width="28" height="32" />${LEGAL.produto}</a><a href="../guias/">Todos os guias</a></nav>
${opts.conteudo}
<p class="muted" style="margin-top:24px"><a href="../termos/">Termos de uso</a> · <a href="../privacidade/">Privacidade</a></p>
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
    conteudo: `<article><h1>${a.titulo}</h1><p class="meta">Leitura de ${a.minutos} minutos</p>${a.corpo}</article>
<div class="card mais lista"><h2 style="margin-top:0">Continue aprendendo</h2>${outros}</div>`,
  });
}

function indiceHtml(): string {
  const itens = ARTIGOS.map((x) => `<a href="../${x.slug}/">${x.titulo}<span>${x.descricao} · ${x.minutos} min</span></a>`).join('');
  return pagina({
    caminho: 'guias/',
    titulo: 'Guias para motoristas e entregadores de aplicativo',
    descricao: 'Guias práticos e fáceis de entender para quem roda por aplicativo: custo por km, lucro real de cada corrida e como comparar Uber, 99 e outros apps.',
    tipo: 'website',
    conteudo: `<div class="card lista">
<h1>Guias para motoristas e entregadores</h1>
<p class="meta">Contas simples, explicadas passo a passo, para você saber quanto ganha de verdade.</p>
<div class="dica"><strong>Por onde começar?</strong> Leia primeiro <a href="../custo-por-km/">quanto custa cada km rodado</a>. Com esse número em mãos, os outros guias ficam bem mais fáceis.</div>
${itens}
</div>`,
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
