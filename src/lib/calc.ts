import type { Fuel, FuelChoice, HistoryEntry, MaintItem, Offer, Settings } from '../types';

/* ------------------------------------------------------------------ */
/* Custos por km                                                       */
/* ------------------------------------------------------------------ */

/** Reserva por km de um item: preço do serviço ÷ km até a próxima vez. */
export function itemPerKm(i: MaintItem): number {
  if (!i.ativo || i.preco <= 0 || i.intervaloKm <= 0) return 0;
  return i.preco / i.intervaloKm;
}

export function maintenancePerKm(s: Settings): number {
  return s.manutencao.reduce((acc, i) => acc + itemPerKm(i), 0);
}

/** Depreciação por km = (valor atual − valor futuro) ÷ km rodados no período. */
export function depreciationPerKm(s: Settings): number {
  const d = s.depreciacao;
  if (!d.ativo || d.kmPeriodo <= 0) return 0;
  return Math.max(0, d.valorAtual - d.valorFuturo) / d.kmPeriodo;
}

export function wearPerKm(s: Settings): number {
  return maintenancePerKm(s) + depreciationPerKm(s);
}

/** Custos fixos mensais atribuídos às entregas, rateados por hora de entrega. */
export function fixedMonthlyTotal(s: Settings): number {
  return s.fixos.itens.reduce((a, i) => a + Math.max(0, i.valorMensal), 0);
}
export function fixedMonthlyForDeliveries(s: Settings): number {
  return fixedMonthlyTotal(s) * (s.fixos.percentualEntregas / 100);
}
export function fixedPerHour(s: Settings): number {
  if (s.fixos.horasEntregaMes <= 0) return 0;
  return fixedMonthlyForDeliveries(s) / s.fixos.horasEntregaMes;
}

/* ------------------------------------------------------------------ */
/* Combustível                                                         */
/* ------------------------------------------------------------------ */

export interface FuelComparison {
  custoKmGasolina: number;
  custoKmEtanol: number;
  maisBarato: Fuel;
  diferencaKm: number; // R$/km entre os dois (positivo)
  economia100km: number;
  relacaoConsumo: number; // kmlEtanol / kmlGasolina
  relacaoPreco: number; // precoEtanol / precoGasolina
  precoMaxEtanol: number; // preço em que o etanol empata com a gasolina
  valido: boolean;
}

export function compareFuels(s: Settings): FuelComparison {
  const v = s.veiculo;
  const valido = v.kmlGasolina > 0 && v.kmlEtanol > 0 && v.precoGasolina > 0 && v.precoEtanol > 0;
  const g = valido ? v.precoGasolina / v.kmlGasolina : 0;
  const e = valido ? v.precoEtanol / v.kmlEtanol : 0;
  const relacaoConsumo = v.kmlGasolina > 0 ? v.kmlEtanol / v.kmlGasolina : 0;
  return {
    custoKmGasolina: g,
    custoKmEtanol: e,
    maisBarato: e < g ? 'etanol' : 'gasolina',
    diferencaKm: Math.abs(g - e),
    economia100km: Math.abs(g - e) * 100,
    relacaoConsumo,
    relacaoPreco: v.precoGasolina > 0 ? v.precoEtanol / v.precoGasolina : 0,
    precoMaxEtanol: v.precoGasolina * relacaoConsumo,
    valido,
  };
}

export function resolveFuel(choice: FuelChoice, s: Settings): Fuel {
  if (choice !== 'auto') return choice;
  return compareFuels(s).maisBarato;
}

export function fuelParams(f: Fuel, s: Settings) {
  return f === 'gasolina'
    ? { preco: s.veiculo.precoGasolina, kml: s.veiculo.kmlGasolina }
    : { preco: s.veiculo.precoEtanol, kml: s.veiculo.kmlEtanol };
}

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

export function validateOffer(o: Offer, s: Settings): string[] {
  const errs: string[] = [];
  const nums: [string, number][] = [
    ['Valor da corrida', o.valor],
    ['Km até a coleta', o.kmAteColeta],
    ['Km da entrega', o.kmEntrega],
    ['Km de retorno', o.kmRetorno],
    ['Tempo', o.minutos],
    ['Pedágio', o.pedagio],
    ['Estacionamento', o.estacionamento],
    ['Outras despesas', o.outrasDespesas],
    ['Taxa extra', o.taxaExtra],
    ['Bônus', o.bonus],
  ];
  for (const [n, v] of nums) {
    if (!Number.isFinite(v)) errs.push(`${n}: número inválido.`);
    else if (v < 0) errs.push(`${n} não pode ser negativo.`);
  }
  if (o.valor <= 0) errs.push('Informe o valor da oferta.');
  if (o.kmAteColeta + o.kmEntrega + o.kmRetorno <= 0) errs.push('Informe pelo menos uma distância.');
  if (o.minutos <= 0) errs.push('Informe o tempo estimado (minutos).');
  if (o.minutos > 24 * 60) errs.push('Tempo acima de 24 h: confira o valor.');
  const f = fuelParams(resolveFuel(o.combustivel, s), s);
  if (f.kml <= 0) errs.push('Consumo (km/L) do combustível escolhido precisa ser maior que zero.');
  if (f.preco <= 0) errs.push('Preço do combustível escolhido precisa ser maior que zero.');
  if (s.plataforma.taxaPercentual >= 100) errs.push('Taxa percentual da plataforma precisa ser menor que 100%.');
  return errs;
}

/* ------------------------------------------------------------------ */
/* Análise da corrida                                                  */
/* ------------------------------------------------------------------ */

export type Verdict = 'vale' | 'baixo' | 'nao';

export interface Analysis {
  km: number;
  horas: number;
  combustivel: Fuel;
  precoLitro: number;
  kml: number;
  litros: number;
  custoCombustivel: number;
  custoCombustivelKm: number;
  // reservas (não são despesas pagas na hora)
  manutKm: number;
  deprKm: number;
  reservas: { nome: string; categoria: string; porKm: number; total: number; estimado: boolean }[];
  custoManutencao: number;
  custoDepreciacao: number;
  custoDesgaste: number; // manutenção + depreciação
  despesas: number; // pedágio + estacionamento + outras
  taxas: number;
  receita: number; // valor + bônus
  custosVariaveis: number;
  lucroOperacional: number; // receita − variáveis
  fixoHora: number;
  custoFixo: number; // rateio
  lucroFinal: number; // operacional − fixo
  lucroDecisao: number; // conforme critério (com ou sem fixos)
  lucroKm: number;
  lucroHora: number;
  margem: number; // % sobre a receita
  gastoNaHora: number; // dinheiro que sai do bolso hoje (combustível + despesas + taxas)
  minimoSemPrejuizo: number;
  minimoMetaHora: number;
  minimoMargem: number | null;
  minimoVale: number | null; // valor que torna a corrida verde
  veredito: Verdict;
  motivos: string[];
}

export function analyze(o: Offer, s: Settings): Analysis {
  const km = o.kmAteColeta + o.kmEntrega + o.kmRetorno;
  const horas = o.minutos / 60;
  const combustivel = resolveFuel(o.combustivel, s);
  const { preco: precoLitro, kml } = fuelParams(combustivel, s);
  const litros = kml > 0 ? km / kml : 0;
  const custoCombustivel = litros * precoLitro;

  const manutKm = maintenancePerKm(s);
  const deprKm = depreciationPerKm(s);
  const reservas = s.manutencao
    .filter((i) => i.ativo && itemPerKm(i) > 0)
    .map((i) => ({ nome: i.nome, categoria: i.categoria, porKm: itemPerKm(i), total: itemPerKm(i) * km, estimado: i.estimado }));
  const custoManutencao = manutKm * km;
  const custoDepreciacao = deprKm * km;
  const custoDesgaste = custoManutencao + custoDepreciacao;

  const despesas = o.pedagio + o.estacionamento + o.outrasDespesas;
  const pct = s.plataforma.taxaPercentual / 100;
  const taxasFixas = s.plataforma.taxaFixa + o.taxaExtra;
  const taxas = o.valor * pct + taxasFixas;
  const receita = o.valor + o.bonus;

  const custosVariaveis = custoCombustivel + custoDesgaste + despesas + taxas;
  const lucroOperacional = receita - custosVariaveis;
  const fixoHora = fixedPerHour(s);
  const custoFixo = fixoHora * horas;
  const lucroFinal = lucroOperacional - custoFixo;
  const incluiFixo = s.criterios.incluirFixosNaDecisao;
  const lucroDecisao = incluiFixo ? lucroFinal : lucroOperacional;

  const lucroKm = km > 0 ? lucroDecisao / km : 0;
  const lucroHora = horas > 0 ? lucroDecisao / horas : 0;
  const margem = receita > 0 ? (lucroDecisao / receita) * 100 : 0;

  // Custos que não dependem do valor da corrida (tudo menos a taxa %)
  const C = custoCombustivel + custoDesgaste + despesas + taxasFixas + (incluiFixo ? custoFixo : 0);
  const den = 1 - pct;
  const minimoSemPrejuizo = Math.max(0, (C - o.bonus) / den);
  const minimoMetaHora = Math.max(0, (C + s.criterios.metaHora * horas - o.bonus) / den);
  const m = s.criterios.margemMinima / 100;
  // V(1−p) + B − C = m(V + B)  →  V = (C − B(1 − m)) / (1 − p − m)
  const denM = 1 - pct - m;
  const minimoMargem = denM > 0 ? Math.max(0, (C - o.bonus * (1 - m)) / denM) : null;
  const minimoVale = minimoMargem === null ? null : Math.max(minimoMetaHora, minimoMargem);

  const gastoNaHora = custoCombustivel + despesas + taxas;

  // Classificação
  const okMargem = margem >= s.criterios.margemMinima;
  const okHora = lucroHora >= s.criterios.metaHora;
  let veredito: Verdict;
  if (lucroDecisao <= 0) veredito = 'nao';
  else if (okMargem && okHora) veredito = 'vale';
  else veredito = 'baixo';

  // Motivos: explicam a decisão sem repetir os números que já aparecem no painel.
  const motivos: string[] = [];
  const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const pctf = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  if (veredito === 'nao') {
    motivos.push('Os custos de rodar com o carro passam do que a corrida paga.');
  } else {
    motivos.push(
      okHora
        ? `Lucro por hora acima da meta (${brl(s.criterios.metaHora)}/h).`
        : `Lucro por hora abaixo da meta (${brl(s.criterios.metaHora)}/h).`,
    );
    motivos.push(
      okMargem
        ? `Margem de ${pctf(margem)}, acima do mínimo de ${pctf(s.criterios.margemMinima)}.`
        : `Margem de ${pctf(margem)}, abaixo do mínimo de ${pctf(s.criterios.margemMinima)}.`,
    );
  }
  const vazio = o.kmAteColeta + o.kmRetorno;
  if (km > 0 && vazio / km >= 0.5)
    motivos.push(`${pctf((vazio / km) * 100)} dos km são sem carga (ida à coleta e volta).`);

  return {
    km,
    horas,
    combustivel,
    precoLitro,
    kml,
    litros,
    custoCombustivel,
    custoCombustivelKm: kml > 0 ? precoLitro / kml : 0,
    manutKm,
    deprKm,
    reservas,
    custoManutencao,
    custoDepreciacao,
    custoDesgaste,
    despesas,
    taxas,
    receita,
    custosVariaveis,
    lucroOperacional,
    fixoHora,
    custoFixo,
    lucroFinal,
    lucroDecisao,
    lucroKm,
    lucroHora,
    margem,
    gastoNaHora,
    minimoSemPrejuizo,
    minimoMetaHora,
    minimoMargem,
    minimoVale,
    veredito,
    motivos,
  };
}

/* ------------------------------------------------------------------ */
/* Metas                                                               */
/* ------------------------------------------------------------------ */

export interface GoalRow {
  periodo: string;
  lucroMeta: number;
  horas: number;
  km: number;
  custoCombustivel: number;
  custoDesgaste: number;
  custoFixo: number;
  taxas: number;
  faturamento: number;
  faturamentoHora: number;
}

/**
 * Faturamento necessário: F = (lucro + combustível + desgaste + fixos + taxas fixas) ÷ (1 − taxa%)
 * km estimados = horas × km/hora médios.
 */
export function goalRows(s: Settings, kmPorHora: number, corridasPorHora: number): GoalRow[] {
  const g = s.metas;
  const cmp = compareFuels(s);
  const fuelKm = resolveFuel(s.veiculo.combustivelPadrao, s) === 'etanol' ? cmp.custoKmEtanol : cmp.custoKmGasolina;
  const wKm = wearPerKm(s);
  const fH = fixedPerHour(s);
  const pct = s.plataforma.taxaPercentual / 100;
  const periods: [string, number, number][] = [
    ['Por hora', s.criterios.metaHora, 1],
    ['Por dia', g.dia, g.horasPorDia],
    ['Por semana', g.semana, g.horasPorDia * g.diasPorSemana],
    ['Por mês', g.mes, g.horasPorDia * g.diasPorMes],
  ];
  return periods.map(([periodo, lucroMeta, horas]) => {
    const km = horas * kmPorHora;
    const custoCombustivel = km * fuelKm;
    const custoDesgaste = km * wKm;
    const custoFixo = horas * fH;
    const taxasFixas = s.plataforma.taxaFixa * corridasPorHora * horas;
    const faturamento = pct < 1 ? (lucroMeta + custoCombustivel + custoDesgaste + custoFixo + taxasFixas) / (1 - pct) : 0;
    return {
      periodo,
      lucroMeta,
      horas,
      km,
      custoCombustivel,
      custoDesgaste,
      custoFixo,
      taxas: faturamento * pct + taxasFixas,
      faturamento,
      faturamentoHora: horas > 0 ? faturamento / horas : 0,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Histórico                                                           */
/* ------------------------------------------------------------------ */

export interface HistoryInput {
  data: string;
  valor: number;
  bonus: number;
  km: number;
  minutos: number;
  despesas: number;
  taxas: number;
  combustivel: Fuel;
  obs?: string;
  veiculo?: string;
  plataforma?: string;
}

/** Congela os parâmetros atuais (preço, consumo, reservas) no registro, para o histórico não mudar depois. */
export function buildEntry(input: HistoryInput, s: Settings, id?: string): HistoryEntry {
  const { preco, kml } = fuelParams(input.combustivel, s);
  const custoCombustivel = kml > 0 ? (input.km / kml) * preco : 0;
  const custoDesgaste = input.km * wearPerKm(s);
  const custoFixo = (input.minutos / 60) * fixedPerHour(s);
  const lucro = input.valor + input.bonus - custoCombustivel - custoDesgaste - custoFixo - input.despesas - input.taxas;
  return {
    id: id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    data: input.data,
    valor: input.valor,
    bonus: input.bonus,
    km: input.km,
    minutos: input.minutos,
    despesas: input.despesas,
    taxas: input.taxas,
    combustivel: input.combustivel,
    precoLitro: preco,
    kml,
    custoCombustivel,
    custoDesgaste,
    custoFixo,
    lucro,
    obs: input.obs,
    veiculo: input.veiculo,
    plataforma: input.plataforma,
  };
}

export interface HistorySummary {
  qtd: number;
  bruto: number;
  combustivel: number;
  desgaste: number;
  fixos: number;
  despesas: number;
  taxas: number;
  lucro: number;
  km: number;
  horas: number;
  lucroMedio: number;
  lucroHora: number;
  kmPorHora: number;
}

export function summarize(list: HistoryEntry[]): HistorySummary {
  const sum = (f: (e: HistoryEntry) => number) => list.reduce((a, e) => a + f(e), 0);
  const qtd = list.length;
  const horas = sum((e) => e.minutos) / 60;
  const lucro = sum((e) => e.lucro);
  const km = sum((e) => e.km);
  return {
    qtd,
    bruto: sum((e) => e.valor + e.bonus),
    combustivel: sum((e) => e.custoCombustivel),
    desgaste: sum((e) => e.custoDesgaste),
    fixos: sum((e) => e.custoFixo),
    despesas: sum((e) => e.despesas),
    taxas: sum((e) => e.taxas),
    lucro,
    km,
    horas,
    lucroMedio: qtd ? lucro / qtd : 0,
    lucroHora: horas > 0 ? lucro / horas : 0,
    kmPorHora: horas > 0 ? km / horas : 0,
  };
}

/** O que ainda é valor de exemplo (some quando o usuário edita ou confirma). */
export function pendingEstimates(s: Settings): string[] {
  const out: string[] = [];
  if (s.veiculo.precosEstimados) out.push('preços dos combustíveis');
  if (s.veiculo.consumoEstimado) out.push('consumo (km/L)');
  const m = s.manutencao.filter((i) => i.ativo && i.estimado).length;
  if (m) out.push(`${m} ${m === 1 ? 'item' : 'itens'} de manutenção`);
  if (s.depreciacao.ativo && s.depreciacao.estimado) out.push('depreciação');
  const f = s.fixos.itens.filter((i) => i.estimado).length;
  if (f) out.push(`${f} ${f === 1 ? 'custo fixo' : 'custos fixos'}`);
  return out;
}
