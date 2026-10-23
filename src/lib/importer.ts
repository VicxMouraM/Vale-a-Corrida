/**
 * Importação de corridas a partir de planilhas (CSV) e do .zip de dados das plataformas.
 * Os formatos mudam de app para app e com o tempo, então em vez de um leitor fixo por plataforma
 * o importador reconhece as colunas pelo nome (português e inglês) e deixa a pessoa corrigir.
 */
import { buildEntry, type HistoryInput } from './calc';
import { parseNum } from './format';
import type { Fuel, HistoryEntry, Settings } from '../types';

export type Campo = 'data' | 'valor' | 'km' | 'duracao' | 'fim' | 'status';
export type UnidadeTempo = 'min' | 'seg' | 'h' | 'auto';
export type UnidadeDist = 'km' | 'mi' | 'm';

export interface Mapeamento {
  data: number | null;
  valor: number | null;
  km: number | null;
  duracao: number | null;
  /** hora de término: quando não há coluna de duração, a duração sai de fim − início (ex.: Uber "Driver Lifetime Trips") */
  fim: number | null;
  status: number | null;
  tempo: UnidadeTempo;
  dist: UnidadeDist;
}

export interface Planilha {
  cabecalho: string[];
  linhas: string[][];
}

/* ---------- CSV ---------- */

/** Lê CSV com ; , ou tab, aspas e quebras de linha dentro de aspas. */
export function parseCsv(texto: string): Planilha {
  const t = texto.replace(/^﻿/, '');
  const primeira = t.split(/\r?\n/, 1)[0] ?? '';
  const sep = [';', ',', '\t'].map((c) => [c, contaFora(primeira, c)] as const).sort((a, b) => b[1] - a[1])[0][0];
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      linha.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo);
      campo = '';
      if (linha.some((x) => x.trim() !== '')) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim() !== '')) linhas.push(linha);
  const [cabecalho = [], ...resto] = linhas;
  return { cabecalho: cabecalho.map((h) => h.trim()), linhas: resto };
}

function contaFora(linha: string, c: string): number {
  let n = 0;
  let aspas = false;
  for (const ch of linha) {
    if (ch === '"') aspas = !aspas;
    else if (ch === c && !aspas) n++;
  }
  return n;
}

/* ---------- Reconhecimento de colunas ---------- */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[_\-.()/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Palavras-chave por campo, da mais específica para a mais genérica
const CHAVES: Record<Campo, string[]> = {
  data: ['data da viagem', 'data da corrida', 'data da entrega', 'request time', 'begin trip time', 'trip start', 'start time', 'data hora', 'data', 'date', 'inicio', 'horario', 'criado em', 'created'],
  valor: ['ganho liquido', 'valor liquido', 'seus ganhos', 'ganhos', 'ganho', 'repasse', 'earnings', 'net', 'payout', 'valor recebido', 'valor da viagem', 'valor da corrida', 'valor', 'fare amount', 'fare', 'total', 'amount', 'preco'],
  km: ['distancia km', 'distancia', 'distance km', 'distance miles', 'trip distance', 'distance', 'quilometragem', 'km'],
  duracao: ['duracao', 'duration', 'tempo de viagem', 'tempo da corrida', 'trip duration', 'tempo', 'minutos', 'minutes'],
  fim: ['dropoff time', 'drop off time', 'end time', 'trip end', 'hora de termino', 'hora de chegada', 'termino', 'finalizad', 'fim', 'chegada'],
  status: ['status da viagem', 'trip status', 'status', 'situacao', 'estado'],
};

// Palavras que tiram uma coluna da disputa por um campo (ex.: "Distância total" não é valor; "Valor por km" não é distância)
const EXCLUI: Record<Campo, RegExp> = {
  data: /atualiza|nascimento|pagamento previsto|vencimento/,
  valor: /dist|\bkm\b|quilomet|tempo|durac|minut|\bdata\b|\bdate\b|\btime\b|status|taxa|tarifa da plataforma|gorjeta|tip/,
  km: /valor|r\$|preco|ganho|por km|tarifa|fare|price/,
  duracao: /valor|ganho|\bdata\b|\bdate\b|espera ate/,
  fim: /valor|ganho|distan|km/,
  status: /pagamento/,
};

export function detectar(cabecalho: string[], amostra: string[][]): Mapeamento {
  const usados = new Set<number>();
  const achar = (campo: Campo): number | null => {
    for (const chave of CHAVES[campo]) {
      const i = cabecalho.findIndex((h, idx) => !usados.has(idx) && norm(h).includes(chave) && !EXCLUI[campo].test(norm(h)));
      if (i >= 0) {
        usados.add(i);
        return i;
      }
    }
    return null;
  };
  // Ordem importa: "data" antes de "valor" evita pegar "data" em "data do valor"
  const m: Mapeamento = { data: achar('data'), valor: achar('valor'), km: achar('km'), duracao: achar('duracao'), fim: null, status: achar('status'), tempo: 'auto', dist: 'km' };
  if (m.duracao === null) m.fim = achar('fim');
  if (m.km !== null) {
    const h = norm(cabecalho[m.km]);
    m.dist = /\bmi(les)?\b|milhas/.test(h) ? 'mi' : /\bmetros?\b|\(m\)| m$/.test(h) ? 'm' : 'km';
  }
  if (m.duracao !== null) {
    const h = norm(cabecalho[m.duracao]);
    m.tempo = /seg|sec/.test(h) ? 'seg' : /\bhoras?\b|\bhours?\b/.test(h) ? 'h' : /min/.test(h) ? 'min' : 'auto';
    if (m.tempo === 'auto') {
      // Sem unidade no nome: valores grandes (> 300) quase sempre são segundos
      const nums = amostra.map((l) => parseNum(l[m.duracao!] ?? '')).filter((n) => Number.isFinite(n));
      if (nums.length && nums.every((n) => n > 300)) m.tempo = 'seg';
    }
  }
  return m;
}

/* ---------- Leitura de valores ---------- */

export function lerDinheiro(s: string): number {
  const t = s.replace(/R\$|BRL|\s/gi, '');
  return parseNum(t);
}

export function lerDistancia(s: string, u: UnidadeDist): number {
  const n = parseNum(s.replace(/km|mi|\s/gi, ''));
  if (!Number.isFinite(n)) return NaN;
  return u === 'mi' ? n * 1.60934 : u === 'm' ? n / 1000 : n;
}

/** "00:25:13", "25:13", "1h 05min", "25 min", "1513" (com unidade). Devolve minutos. */
export function lerDuracao(s: string, u: UnidadeTempo): number {
  const t = s.trim().toLowerCase();
  const hms = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hms) {
    const [, a, b, c] = hms;
    return c !== undefined ? Number(a) * 60 + Number(b) + Number(c) / 60 : Number(a) + Number(b) / 60; // mm:ss quando só 2 partes
  }
  const hm = t.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?\s*(?:(\d+)\s*s(?:eg|ec)?)?$/);
  if (hm && (hm[1] || hm[2] || hm[3]) && /[hms]/.test(t)) return Number(hm[1] ?? 0) * 60 + Number(hm[2] ?? 0) + Number(hm[3] ?? 0) / 60;
  const n = parseNum(t);
  if (!Number.isFinite(n)) return NaN;
  return u === 'seg' ? n / 60 : u === 'h' ? n * 60 : n;
}

/** Datas comuns em exportações: ISO, "2026-10-20 14:33:00 +0000 UTC", "20/10/2026 14:33". Dia/mês no padrão brasileiro. */
export function lerData(s: string): Date | null {
  const t = s.trim().replace(/\s*UTC$/i, '');
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (br) {
    const [, d, m, a, hh = '12', mm = '0', ss = '0'] = br;
    const ano = a.length === 2 ? 2000 + Number(a) : Number(a);
    const dt = new Date(ano, Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    return Number.isNaN(dt.getTime()) || dt.getMonth() !== Number(m) - 1 ? null : dt;
  }
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/);
  if (iso) {
    const [, a, m, d, hh = '12', mm = '00', ss = '00', fuso] = iso;
    const base = `${a}-${m}-${d}T${hh}:${mm}:${ss}`;
    const dt = new Date(fuso ? `${base}${fuso === 'Z' ? 'Z' : fuso.replace(/^([+-]\d{2})(\d{2})$/, '$1:$2')}` : base);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

const CANCELADA = /cancel|rejeit|recusad|failed|falh|nao concluid|unfulfilled|expired|expirad/;

/* ---------- Montagem das corridas ---------- */

export interface Resultado {
  validas: HistoryEntry[];
  repetidas: number;
  canceladas: number;
  invalidas: { linha: number; motivo: string }[];
}

/** id estável: importar o mesmo arquivo de novo não duplica. */
function idImportado(plataforma: string, data: Date, valor: number, km: number): string {
  const chave = `${plataforma}|${data.toISOString().slice(0, 16)}|${valor.toFixed(2)}|${km.toFixed(1)}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < chave.length; i++) {
    h ^= chave.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `imp-${(h >>> 0).toString(36)}-${data.getTime().toString(36)}`;
}

export function montar(p: Planilha, m: Mapeamento, s: Settings, opts: { plataforma: string; existentes: Set<string> }): Resultado {
  const r: Resultado = { validas: [], repetidas: 0, canceladas: 0, invalidas: [] };
  const combustivel: Fuel = s.veiculo.combustivelPadrao === 'etanol' ? 'etanol' : 'gasolina';
  const vistos = new Set<string>();
  p.linhas.forEach((l, i) => {
    const n = i + 2; // linha na planilha (1 = cabeçalho)
    const cel = (c: number | null) => (c === null ? '' : (l[c] ?? '').trim());
    if (m.status !== null && CANCELADA.test(norm(cel(m.status)))) {
      r.canceladas++;
      return;
    }
    const data = lerData(cel(m.data));
    const valor = lerDinheiro(cel(m.valor));
    const km = lerDistancia(cel(m.km), m.dist);
    const fim = m.duracao === null && m.fim !== null ? lerData(cel(m.fim)) : null;
    const minutos = m.duracao !== null ? lerDuracao(cel(m.duracao), m.tempo) : data && fim ? (fim.getTime() - data.getTime()) / 60000 : NaN;
    if (!data) return r.invalidas.push({ linha: n, motivo: 'data não reconhecida' });
    if (!Number.isFinite(valor) || valor <= 0) return r.invalidas.push({ linha: n, motivo: 'sem valor' });
    if (!Number.isFinite(km) || km <= 0) return r.invalidas.push({ linha: n, motivo: 'sem distância' });
    if (!Number.isFinite(minutos) || minutos <= 0) return r.invalidas.push({ linha: n, motivo: 'sem duração' });
    if (valor > 9999 || km > 2000 || minutos > 1440) return r.invalidas.push({ linha: n, motivo: 'valor fora do normal' });
    const e = corridaImportada({ data, valor, km, minutos }, s, opts.plataforma, combustivel);
    if (opts.existentes.has(e.id) || vistos.has(e.id)) {
      r.repetidas++;
      return;
    }
    vistos.add(e.id);
    r.validas.push(e);
  });
  return r;
}

/** Corrida pronta para o histórico, com id estável (a mesma corrida importada de novo tem o mesmo id). */
export function corridaImportada(
  l: { data: Date; valor: number; km: number; minutos: number },
  s: Settings,
  plataforma: string,
  combustivel: Fuel = s.veiculo.combustivelPadrao === 'etanol' ? 'etanol' : 'gasolina',
  obs = 'Importada',
): HistoryEntry {
  const input: HistoryInput = {
    data: l.data.toISOString(),
    valor: Math.round(l.valor * 100) / 100,
    bonus: 0,
    km: Math.round(l.km * 10) / 10,
    minutos: Math.max(1, Math.round(l.minutos)),
    despesas: 0,
    taxas: 0,
    combustivel,
    plataforma,
    veiculo: s.veiculoAtivo ?? undefined,
    obs,
  };
  return buildEntry(input, s, idImportado(plataforma, l.data, l.valor, l.km));
}

/* ---------- Corridas lidas de prints (pela IA) ---------- */

export interface LinhaPrint {
  data: string | null; // AAAA-MM-DD
  hora: string | null; // HH:MM
  valor: number | null;
  km: number | null;
  minutos: number | null;
  status: 'concluida' | 'cancelada' | 'desconhecido';
}

/** Linha editável na conferência dos prints. */
export interface Rascunho {
  chave: string;
  incluir: boolean;
  data: string; // AAAA-MM-DD
  hora: string; // HH:MM
  valor: string;
  km: string;
  minutos: string;
  cancelada: boolean;
}

const txt = (n: number | null) => (n === null || !Number.isFinite(n) ? '' : String(n).replace('.', ','));

export function rascunhosDePrints(linhas: LinhaPrint[]): Rascunho[] {
  return linhas.map((l, i) => ({
    chave: `p${i}`,
    incluir: l.status !== 'cancelada',
    data: l.data && /^\d{4}-\d{2}-\d{2}$/.test(l.data) ? l.data : '',
    hora: l.hora && /^\d{1,2}:\d{2}$/.test(l.hora) ? l.hora.padStart(5, '0') : '',
    valor: txt(l.valor),
    km: txt(l.km),
    minutos: l.minutos === null ? '' : String(Math.round(l.minutos)),
    cancelada: l.status === 'cancelada',
  }));
}

/** O que falta numa linha para ela poder entrar no histórico (vazio = pronta). */
export function faltaNoRascunho(r: Rascunho): string[] {
  const f: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.data)) f.push('data');
  const v = parseNum(r.valor);
  if (!Number.isFinite(v) || v <= 0 || v > 9999) f.push('valor');
  const k = parseNum(r.km);
  if (!Number.isFinite(k) || k <= 0 || k > 2000) f.push('km');
  const m = parseNum(r.minutos);
  if (!Number.isFinite(m) || m <= 0 || m > 1440) f.push('minutos');
  return f;
}

export function corridasDeRascunhos(rs: Rascunho[], s: Settings, plataforma: string, existentes: Set<string>): { validas: HistoryEntry[]; repetidas: number } {
  const validas: HistoryEntry[] = [];
  let repetidas = 0;
  const vistos = new Set<string>();
  for (const r of rs) {
    if (!r.incluir || faltaNoRascunho(r).length) continue;
    const [a, me, d] = r.data.split('-').map(Number);
    const [hh, mm] = (r.hora || '12:00').split(':').map(Number);
    const data = new Date(a, me - 1, d, hh, mm);
    const e = corridaImportada({ data, valor: parseNum(r.valor), km: parseNum(r.km), minutos: parseNum(r.minutos) }, s, plataforma, undefined, 'Importada de print');
    if (existentes.has(e.id) || vistos.has(e.id)) {
      repetidas++;
      continue;
    }
    vistos.add(e.id);
    validas.push(e);
  }
  return { validas, repetidas };
}
