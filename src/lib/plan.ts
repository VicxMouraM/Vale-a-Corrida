import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { HistoryEntry } from '../types';
import { supabase } from './supabase';

export const PRECO_PRO = 49.99;
export const DIAS_HISTORICO_GRATIS = 30;

export type PlanStatus = 'free' | 'trial' | 'pending' | 'active' | 'overdue' | 'canceled' | 'refunded';

export interface Plan {
  pro: boolean;
  status: PlanStatus;
  trialEndsAt: string | null;
  periodEnd: string | null;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | null;
}

export const FREE_PLAN: Plan = { pro: false, status: 'free', trialEndsAt: null, periodEnd: null, billingType: null };

/** Só para mostrar ou esconder telas. Quem garante o acesso de verdade é o banco (RLS). */
export function usePlanLoader(uid: string | null) {
  const [plan, setPlan] = useState<Plan>(FREE_PLAN);
  const [loading, setLoading] = useState(!!uid && !!supabase);

  const refresh = useCallback(async () => {
    if (!uid || !supabase) return;
    const { data, error } = await supabase.rpc('get_my_plan');
    setLoading(false);
    if (error || !data) return;
    const d = data as { pro: boolean; status: PlanStatus; trial_ends_at: string | null; current_period_end: string | null; billing_type: Plan['billingType'] };
    setPlan({ pro: !!d.pro, status: d.status, trialEndsAt: d.trial_ends_at, periodEnd: d.current_period_end, billingType: d.billing_type });
  }, [uid]);

  useEffect(() => {
    void refresh();
    if (!uid) return;
    // Voltou do pagamento (outra aba/app) ou o app ficou aberto por horas: confere de novo
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisible);
    const t = setInterval(() => void refresh(), 30 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(t);
    };
  }, [uid, refresh]);

  return { plan, loading, refresh };
}

export interface PlanCtx {
  plan: Plan;
  /** abre a tela do plano Pro */
  upgrade: () => void;
}

export const PlanContext = createContext<PlanCtx>({ plan: FREE_PLAN, upgrade: () => undefined });
export const usePlan = () => useContext(PlanContext);

export function historyCutoff(now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - DIAS_HISTORICO_GRATIS);
  return d;
}

/** Divide o histórico entre o que o plano grátis mostra e o que fica guardado sem aparecer. */
export function splitHistory(history: HistoryEntry[], pro: boolean, now = new Date()) {
  if (pro) return { visible: history, hidden: [] as HistoryEntry[] };
  const cut = historyCutoff(now).getTime();
  const visible: HistoryEntry[] = [];
  const hidden: HistoryEntry[] = [];
  for (const e of history) (new Date(e.data).getTime() >= cut ? visible : hidden).push(e);
  return { visible, hidden };
}

export function daysLeft(iso: string | null, now = new Date()): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / 86400000));
}

/** Texto curto para o selo no topo. */
export function planBadge(p: Plan): string {
  if (!p.pro) return 'Grátis';
  if (p.status === 'trial' || (p.trialEndsAt && !p.periodEnd)) {
    const d = daysLeft(p.trialEndsAt);
    return `Teste Pro · ${d} ${d === 1 ? 'dia' : 'dias'}`;
  }
  return 'Pro';
}

export interface CheckoutResult {
  invoiceUrl?: string;
  error?: string;
}

async function callFn(name: string, body: Record<string, unknown>): Promise<CheckoutResult & { ok?: boolean }> {
  if (!supabase) return { error: 'Contas indisponíveis nesta versão do app.' };
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // Erros com mensagem vêm no corpo da resposta
    try {
      const ctx = (error as { context?: Response }).context;
      const j = ctx ? await ctx.json() : null;
      if (j?.error) return { error: j.error };
    } catch {
      /* sem corpo */
    }
    return { error: 'Não foi possível falar com o servidor. Verifique a internet.' };
  }
  return data;
}

export function startCheckout(cpfCnpj: string, billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO') {
  return callFn('assinar', { cpfCnpj, billingType });
}

export function cancelSubscription() {
  return callFn('cancelar', {});
}

/** Validação de CPF/CNPJ (a mesma do servidor), só para avisar antes de enviar. */
export function cpfCnpjValido(raw: string): boolean {
  const d = raw.replace(/\D/g, '');
  const ok = (p1: number[], p2: number[]) => {
    if (/^(\d)\1+$/.test(d)) return false;
    const dv = (pesos: number[]) => {
      const s = pesos.reduce((acc, p, i) => acc + Number(d[i]) * p, 0) % 11;
      return s < 2 ? 0 : 11 - s;
    };
    return dv(p1) === Number(d[p1.length]) && dv(p2) === Number(d[p2.length]);
  };
  if (d.length === 11) return ok([10, 9, 8, 7, 6, 5, 4, 3, 2], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d.length === 14) return ok([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return false;
}
