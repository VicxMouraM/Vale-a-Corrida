/**
 * Tabela FIPE pela API pública da Parallelum (sem chave; limite de ~500 consultas por dia por aparelho).
 * As respostas ficam guardadas durante a sessão para não gastar o limite.
 */
const BASE = 'https://parallelum.com.br/fipe/api/v1';

export type FipeKind = 'carros' | 'motos';

export interface FipeItem {
  codigo: string;
  nome: string;
}

export interface FipePrice {
  valor: number;
  marca: string;
  modelo: string;
  ano: number;
  combustivel: string;
  codigoFipe: string;
  mesReferencia: string;
}

async function get<T>(path: string): Promise<T> {
  const key = `fipe:${path}`;
  try {
    const hit = sessionStorage.getItem(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    /* sem sessionStorage */
  }
  const res = await fetch(`${BASE}${path}`);
  if (res.status === 429) throw new Error('A consulta à FIPE atingiu o limite de hoje. Preencha o veículo à mão.');
  if (!res.ok) throw new Error('Não consegui consultar a FIPE agora.');
  const data = (await res.json()) as T;
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* cheio: segue sem guardar */
  }
  return data;
}

const byName = (a: FipeItem, b: FipeItem) => a.nome.localeCompare(b.nome, 'pt-BR');
const str = (x: { codigo: string | number; nome: string }): FipeItem => ({ codigo: String(x.codigo), nome: x.nome });

export async function fipeMarcas(kind: FipeKind): Promise<FipeItem[]> {
  return (await get<FipeItem[]>(`/${kind}/marcas`)).map(str).sort(byName);
}

export async function fipeModelos(kind: FipeKind, marca: string): Promise<FipeItem[]> {
  const r = await get<{ modelos: { codigo: number; nome: string }[] }>(`/${kind}/marcas/${marca}/modelos`);
  return r.modelos.map(str).sort(byName);
}

export async function fipeAnos(kind: FipeKind, marca: string, modelo: string): Promise<FipeItem[]> {
  const r = await get<FipeItem[]>(`/${kind}/marcas/${marca}/modelos/${modelo}/anos`);
  // "32000-1" é o código FIPE para zero km
  return r.map(str).map((a) => (a.codigo.startsWith('32000') ? { ...a, nome: a.nome.replace('32000', 'Zero km') } : a));
}

export async function fipePreco(kind: FipeKind, marca: string, modelo: string, ano: string): Promise<FipePrice> {
  const r = await get<{ Valor: string; Marca: string; Modelo: string; AnoModelo: number; Combustivel: string; CodigoFipe: string; MesReferencia: string }>(
    `/${kind}/marcas/${marca}/modelos/${modelo}/anos/${ano}`,
  );
  return {
    valor: parseBRL(r.Valor),
    marca: r.Marca,
    modelo: r.Modelo,
    ano: r.AnoModelo === 32000 ? new Date().getFullYear() : r.AnoModelo,
    combustivel: r.Combustivel,
    codigoFipe: r.CodigoFipe,
    mesReferencia: r.MesReferencia,
  };
}

/** "R$ 64.993,00" → 64993 */
export function parseBRL(s: string): number {
  const n = Number(s.replace(/[^\d,]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Modelo da FIPE indica câmbio automático? */
export function looksAutomatic(modelo: string): boolean {
  return /\b(aut|automático|automatico|cvt|at|dct|dsg|tiptronic)\b\.?/i.test(modelo);
}
