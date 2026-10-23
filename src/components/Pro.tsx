import type { ReactNode } from 'react';
import { brl } from '../lib/format';
import { PRECO_PRO, usePlan } from '../lib/plan';

/** Mostra o conteúdo para quem é Pro; para os outros, um cartão explicando o que o Pro libera. */
export function ProGate({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  const { plan } = usePlan();
  if (plan.pro) return <>{children}</>;
  return <ProLock title={title} hint={hint} />;
}

export function ProLock({ title, hint, compact }: { title: string; hint?: string; compact?: boolean }) {
  const { upgrade } = usePlan();
  return (
    <section className={`rounded-xl border border-dashed border-accent/50 bg-surface ${compact ? 'p-3' : 'p-4 sm:p-5'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ProTag />
            <span className="font-display text-lg font-semibold tracking-wide">{title}</span>
          </div>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
        <button onClick={upgrade} className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:opacity-90">
          Liberar por {brl(PRECO_PRO)}/mês
        </button>
      </div>
    </section>
  );
}

export function ProTag() {
  return <span className="rounded bg-accent px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-accent-ink">Pro</span>;
}
