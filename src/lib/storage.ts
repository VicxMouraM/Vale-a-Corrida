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

export function load(): Persisted {
  const fallback: Persisted = { settings: DEFAULT_SETTINGS, offer: EXAMPLE_OFFER, history: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw);
    return {
      settings: refreshExamples(merge(DEFAULT_SETTINGS, p.settings), p.settings?.exemplosVersao ?? 1),
      offer: merge(EXAMPLE_OFFER, p.offer),
      history: Array.isArray(p.history) ? p.history : [],
    };
  } catch {
    return fallback;
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
