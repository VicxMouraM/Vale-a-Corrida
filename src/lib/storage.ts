import { DEFAULT_SETTINGS, EXAMPLE_OFFER, EXEMPLOS_VERSAO } from '../defaults';
import type { HistoryEntry, Offer, Settings } from '../types';

const KEY = 'vale-a-corrida:v1';

export interface Persisted {
  settings: Settings;
  offer: Offer;
  history: HistoryEntry[];
}

/** Mescla o que veio do armazenamento com os padrões, para não quebrar se faltar algum campo. */
function merge<T>(base: T, saved: unknown): T {
  if (Array.isArray(base)) return (Array.isArray(saved) ? saved : base) as T;
  if (base && typeof base === 'object') {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    if (saved && typeof saved === 'object') {
      for (const k of Object.keys(out)) {
        const sv = (saved as Record<string, unknown>)[k];
        if (sv !== undefined) out[k] = merge(out[k], sv);
      }
    }
    return out as T;
  }
  return (typeof saved === typeof base ? saved : base) as T;
}

/** Normaliza dados vindos de qualquer lugar (aparelho, nuvem, backup) contra os padrões. */
export function normalize(p: { settings?: unknown; offer?: unknown; history?: unknown }): Persisted {
  const raw = p.settings as Partial<Settings> | undefined;
  return {
    settings: refreshExamples(merge(DEFAULT_SETTINGS, raw), raw?.exemplosVersao ?? (raw ? 1 : EXEMPLOS_VERSAO)),
    offer: merge(EXAMPLE_OFFER, p.offer),
    history: cleanHistory(p.history),
  };
}

const NUM_FIELDS = ['valor', 'bonus', 'km', 'minutos', 'despesas', 'taxas', 'precoLitro', 'kml', 'custoCombustivel', 'custoDesgaste', 'custoFixo', 'lucro'] as const;

/** Descarta corridas malformadas (backup editado à mão, versão antiga) para não travar a sincronização. */
export function cleanHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: HistoryEntry[] = [];
  const ids = new Set<string>();
  for (const r of raw as Record<string, unknown>[]) {
    if (!r || typeof r !== 'object') continue;
    const id = typeof r.id === 'string' ? r.id.slice(0, 64) : '';
    const data = typeof r.data === 'string' ? new Date(r.data) : null;
    if (!id || ids.has(id) || !data || Number.isNaN(data.getTime())) continue;
    if (r.combustivel !== 'gasolina' && r.combustivel !== 'etanol') continue;
    const e: Record<string, unknown> = { id, data: data.toISOString(), combustivel: r.combustivel };
    let ok = true;
    for (const k of NUM_FIELDS) {
      const v = r[k] ?? 0;
      if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) >= 100000 || (k !== 'lucro' && v < 0)) ok = false;
      e[k] = v;
    }
    if (!ok) continue;
    if (typeof r.obs === 'string' && r.obs) e.obs = r.obs.slice(0, 500);
    ids.add(id);
    out.push(e as unknown as HistoryEntry);
  }
  return out;
}

export function load(): Persisted {
  const fallback: Persisted = { settings: DEFAULT_SETTINGS, offer: EXAMPLE_OFFER, history: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    return normalize(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

/** Dados do modo convidado que valem a pena levar para uma conta nova. */
export function guestDataToImport(): Persisted | null {
  try {
    if (!localStorage.getItem(KEY)) return null;
  } catch {
    return null;
  }
  const p = load();
  const editou = JSON.stringify(p.settings) !== JSON.stringify(DEFAULT_SETTINGS);
  return p.history.length > 0 || editou ? p : null;
}

export function clearGuest() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* sem armazenamento */
  }
}

export function save(p: Persisted): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

/** Quando os exemplos mudam, atualiza apenas o que o usuário ainda não editou nem confirmou. */
export function refreshExamples(s: Settings, versao: number): Settings {
  if (versao >= EXEMPLOS_VERSAO) return s;
  const d = DEFAULT_SETTINGS;
  const v = { ...s.veiculo };
  if (v.precosEstimados) {
    v.precoGasolina = d.veiculo.precoGasolina;
    v.precoEtanol = d.veiculo.precoEtanol;
  }
  if (v.consumoEstimado) {
    v.kmlGasolina = d.veiculo.kmlGasolina;
    v.kmlEtanol = d.veiculo.kmlEtanol;
  }
  if (/ix35 2011/i.test(v.nome)) v.nome = d.veiculo.nome;
  const tocados = s.manutencao.filter((i) => !i.estimado);
  const manutencao = [...tocados, ...d.manutencao.filter((n) => !tocados.some((t) => t.id === n.id))];
  const depreciacao = s.depreciacao.estimado ? { ...d.depreciacao, ativo: s.depreciacao.ativo } : s.depreciacao;
  const itens = s.fixos.itens.map((i) => (i.estimado ? d.fixos.itens.find((n) => n.id === i.id) ?? i : i));
  return { ...s, exemplosVersao: EXEMPLOS_VERSAO, veiculo: v, manutencao, depreciacao, fixos: { ...s.fixos, itens } };
}
