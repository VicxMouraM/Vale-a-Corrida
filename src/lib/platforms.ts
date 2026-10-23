import type { PlatformKind, PlatformProfile, Settings } from '../types';
import { newId } from './vehicles';

/**
 * Plataformas conhecidas. Nenhuma taxa oficial está embutida: quase todas mostram ao motorista
 * o valor que ele recebe (líquido), então a taxa começa em 0. Onde o app mostra o preço do passageiro
 * e desconta a comissão depois (inDrive), há uma estimativa marcada para o usuário conferir.
 */
export const PLATFORM_CATALOG: { id: string; nome: string; tipo: PlatformKind; taxa: number; dica: string }[] = [
  { id: 'uber', nome: 'Uber', tipo: 'passageiros', taxa: 0, dica: 'A Uber mostra quanto você recebe. Deixe a taxa em 0.' },
  { id: 'uber_flash', nome: 'Uber Flash / Entregas', tipo: 'entregas', taxa: 0, dica: 'A oferta já mostra o seu ganho. Deixe a taxa em 0.' },
  { id: '99', nome: '99', tipo: 'passageiros', taxa: 0, dica: 'A 99 mostra quanto você recebe. Deixe a taxa em 0.' },
  { id: '99_entrega', nome: '99 Entrega', tipo: 'entregas', taxa: 0, dica: 'A oferta já mostra o seu ganho. Deixe a taxa em 0.' },
  { id: 'ifood', nome: 'iFood', tipo: 'entregas', taxa: 0, dica: 'O iFood mostra o valor da rota para você. Deixe a taxa em 0.' },
  { id: 'lalamove', nome: 'Lalamove', tipo: 'entregas', taxa: 0, dica: 'Se o valor da oferta já é o que cai na conta, deixe 0.' },
  { id: 'indrive', nome: 'inDrive', tipo: 'passageiros', taxa: 10, dica: 'O inDrive mostra o preço do passageiro e desconta a comissão depois. Confira a sua no app.' },
  { id: 'loggi', nome: 'Loggi', tipo: 'entregas', taxa: 0, dica: 'Se o valor da oferta já é o que cai na conta, deixe 0.' },
  { id: 'borzo', nome: 'Borzo', tipo: 'entregas', taxa: 0, dica: 'Se o valor da oferta já é o que cai na conta, deixe 0.' },
];

export function catalogEntry(id: string) {
  return PLATFORM_CATALOG.find((p) => p.id === id);
}

export function buildPlatform(id: string, nomeOutra?: string, tipoOutra: PlatformKind = 'entregas'): PlatformProfile {
  const c = catalogEntry(id);
  if (c) return { id: c.id, nome: c.nome, tipo: c.tipo, taxaPercentual: c.taxa, taxaFixa: 0, estimado: c.taxa > 0 };
  return { id: newId('outra-'), nome: (nomeOutra ?? '').trim().slice(0, 40) || 'Outra', tipo: tipoOutra, taxaPercentual: 0, taxaFixa: 0, estimado: false };
}

/* ---------- A plataforma ativa mora no topo de Settings (s.plataforma) ---------- */

export function platforms(s: Settings): PlatformProfile[] {
  return s.plataformas.map((p) => (p.id === s.plataformaAtiva ? { ...p, taxaPercentual: s.plataforma.taxaPercentual, taxaFixa: s.plataforma.taxaFixa } : p));
}

export function activePlatform(s: Settings): PlatformProfile | null {
  return platforms(s).find((p) => p.id === s.plataformaAtiva) ?? null;
}

export function activatePlatform(s: Settings, id: string): Settings {
  const list = platforms(s);
  const p = list.find((x) => x.id === id);
  if (!p) return s;
  return { ...s, plataformas: list, plataformaAtiva: id, plataforma: { taxaPercentual: p.taxaPercentual, taxaFixa: p.taxaFixa } };
}

export function addPlatform(s: Settings, p: PlatformProfile): Settings {
  if (s.plataformas.some((x) => x.id === p.id)) return activatePlatform(s, p.id);
  return activatePlatform({ ...s, plataformas: [...platforms(s), p] }, p.id);
}

export function removePlatform(s: Settings, id: string): Settings {
  const list = platforms(s).filter((p) => p.id !== id);
  if (list.length === 0) return s; // sempre fica pelo menos uma
  const next = { ...s, plataformas: list };
  return s.plataformaAtiva === id ? activatePlatform(next, list[0].id) : next;
}

export function updatePlatform(s: Settings, id: string, patch: Partial<Pick<PlatformProfile, 'nome' | 'taxaPercentual' | 'taxaFixa' | 'estimado' | 'tipo'>>): Settings {
  const list = platforms(s).map((p) => (p.id === id ? { ...p, ...patch } : p));
  const next = { ...s, plataformas: list };
  if (id !== s.plataformaAtiva) return next;
  const p = list.find((x) => x.id === id)!;
  return { ...next, plataforma: { taxaPercentual: p.taxaPercentual, taxaFixa: p.taxaFixa } };
}

/** Quem já usava o app antes das plataformas: vira "Lalamove" com a taxa que estava configurada. */
export function platformFromLegacy(s: Settings): PlatformProfile {
  return { ...buildPlatform('lalamove'), taxaPercentual: s.plataforma.taxaPercentual, taxaFixa: s.plataforma.taxaFixa };
}

/** Rótulos da calculadora conforme o tipo de trabalho. */
export function offerLabels(p: PlatformProfile | null) {
  const valor = p ? `Valor da oferta · ${p.nome}` : 'Valor da oferta';
  if (p?.tipo === 'passageiros') return { valor, km1: 'Até o passageiro', km2: 'Até o destino', km3: 'Retorno', corrida: 'corrida' };
  return { valor, km1: 'Até a coleta', km2: 'Até a entrega', km3: 'Retorno', corrida: 'entrega' };
}

export function platformName(s: Settings, id: string | undefined): string {
  if (!id) return 'Sem plataforma';
  return s.plataformas.find((p) => p.id === id)?.nome ?? catalogEntry(id)?.nome ?? 'Outra';
}
