import type { SupabaseClient } from '@supabase/supabase-js';
import type { HistoryEntry, Offer, Settings } from '../types';

/* ---------- Conversão entre o app e a tabela `rides` ---------- */

export interface RideRow {
  id: string;
  data: string;
  valor: number;
  bonus: number;
  km: number;
  minutos: number;
  despesas: number;
  taxas: number;
  combustivel: 'gasolina' | 'etanol';
  preco_litro: number;
  kml: number;
  custo_combustivel: number;
  custo_desgaste: number;
  custo_fixo: number;
  lucro: number;
  obs: string | null;
}

export function toRow(e: HistoryEntry): RideRow {
  return {
    id: e.id,
    data: e.data,
    valor: e.valor,
    bonus: e.bonus,
    km: e.km,
    minutos: e.minutos,
    despesas: e.despesas,
    taxas: e.taxas,
    combustivel: e.combustivel,
    preco_litro: e.precoLitro,
    kml: e.kml,
    custo_combustivel: e.custoCombustivel,
    custo_desgaste: e.custoDesgaste,
    custo_fixo: e.custoFixo,
    lucro: e.lucro,
    obs: e.obs ?? null,
  };
}

export function fromRow(r: RideRow): HistoryEntry {
  return {
    id: r.id,
    data: new Date(r.data).toISOString(),
    valor: r.valor,
    bonus: r.bonus,
    km: r.km,
    minutos: r.minutos,
    despesas: r.despesas,
    taxas: r.taxas,
    combustivel: r.combustivel,
    precoLitro: r.preco_litro,
    kml: r.kml,
    custoCombustivel: r.custo_combustivel,
    custoDesgaste: r.custo_desgaste,
    custoFixo: r.custo_fixo,
    lucro: r.lucro,
    obs: r.obs ?? undefined,
  };
}

/* ---------- Diferenças e mesclagem (funções puras) ---------- */

export interface RideOps {
  upserts: HistoryEntry[];
  deletes: string[];
}

function sameEntry(a: HistoryEntry, b: HistoryEntry): boolean {
  const ra = toRow(a);
  const rb = toRow(b);
  return (Object.keys(ra) as (keyof RideRow)[]).every((k) =>
    k === 'data' ? new Date(ra.data).getTime() === new Date(rb.data).getTime() : ra[k] === rb[k],
  );
}

/** O que precisa ser enviado para o servidor sair de `base` e chegar em `next`. */
export function diffHistory(base: HistoryEntry[], next: HistoryEntry[]): RideOps {
  const old = new Map(base.map((e) => [e.id, e]));
  const ids = new Set(next.map((e) => e.id));
  return {
    upserts: next.filter((e) => {
      const o = old.get(e.id);
      return !o || !sameEntry(o, e);
    }),
    deletes: base.filter((e) => !ids.has(e.id)).map((e) => e.id),
  };
}

/** Aplica alterações locais pendentes sobre o que veio do servidor. */
export function applyOps(server: HistoryEntry[], ops: RideOps): HistoryEntry[] {
  const del = new Set(ops.deletes);
  const map = new Map(server.filter((e) => !del.has(e.id)).map((e) => [e.id, e]));
  for (const e of ops.upserts) map.set(e.id, e);
  return [...map.values()];
}

/** Junta o histórico do aparelho (modo convidado) com o da conta, sem duplicar. */
export function mergeHistories(account: HistoryEntry[], device: HistoryEntry[]): HistoryEntry[] {
  const ids = new Set(account.map((e) => e.id));
  return [...account, ...device.filter((e) => !ids.has(e.id))];
}

/* ---------- Cópia local da conta (abre rápido e funciona sem internet) ---------- */

export interface AccountCache {
  settings: Settings;
  offer: Offer;
  history: HistoryEntry[];
  /** alterações ainda não confirmadas pelo servidor */
  pendingUpserts: string[];
  pendingDeletes: string[];
  settingsDirty: boolean;
}

const cacheKey = (uid: string) => `vale-a-corrida:conta:${uid}`;

export function readCache(uid: string): AccountCache | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const c = JSON.parse(raw) as AccountCache;
    return c && c.settings && Array.isArray(c.history) ? c : null;
  } catch {
    return null;
  }
}

export function writeCache(uid: string, c: AccountCache): boolean {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(c));
    return true;
  } catch {
    return false;
  }
}

/** Ao sair da conta, não deixa dados pessoais no aparelho. */
export function clearCache(uid: string) {
  try {
    localStorage.removeItem(cacheKey(uid));
  } catch {
    /* sem armazenamento */
  }
}

/* ---------- Servidor ---------- */

export interface CloudData {
  settings: Settings | null; // null = conta nova, ainda sem ajustes
  offer: Offer | null;
  history: HistoryEntry[];
}

const PAGE = 1000;
const BATCH = 500;

export async function fetchCloud(sb: SupabaseClient, uid: string): Promise<CloudData> {
  const s = await sb.from('user_settings').select('settings, offer').eq('user_id', uid).maybeSingle();
  if (s.error) throw s.error;
  const history: HistoryEntry[] = [];
  for (let from = 0; ; from += PAGE) {
    const r = await sb
      .from('rides')
      .select('id, data, valor, bonus, km, minutos, despesas, taxas, combustivel, preco_litro, kml, custo_combustivel, custo_desgaste, custo_fixo, lucro, obs')
      .eq('user_id', uid)
      .order('data', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (r.error) throw r.error;
    history.push(...(r.data as RideRow[]).map(fromRow));
    if (r.data.length < PAGE) break;
  }
  return { settings: (s.data?.settings as Settings) ?? null, offer: (s.data?.offer as Offer) ?? null, history };
}

export async function pushSettings(sb: SupabaseClient, uid: string, settings: Settings, offer: Offer) {
  const { error } = await sb.from('user_settings').upsert({ user_id: uid, settings, offer });
  if (error) throw error;
}

export async function pushRides(sb: SupabaseClient, uid: string, ops: RideOps) {
  for (let i = 0; i < ops.upserts.length; i += BATCH) {
    const rows = ops.upserts.slice(i, i + BATCH).map((e) => ({ ...toRow(e), user_id: uid }));
    const { error } = await sb.from('rides').upsert(rows);
    if (error) throw error;
  }
  for (let i = 0; i < ops.deletes.length; i += BATCH) {
    const { error } = await sb.from('rides').delete().eq('user_id', uid).in('id', ops.deletes.slice(i, i + BATCH));
    if (error) throw error;
  }
}
