import { useState } from 'react';
import { useNovaVersao } from '../lib/atualizacao';

/**
 * Aviso discreto de versão nova, acima da barra de navegação. Não bloqueia a tela:
 * quem está no meio de uma oferta toca em "Depois" e atualiza quando puder.
 */
export function AvisoAtualizacao({ acimaDaNav }: { acimaDaNav: boolean }) {
  const nova = useNovaVersao();
  const [depois, setDepois] = useState(false);
  if (!nova || depois) return null;
  return (
    <div
      role="status"
      className={`gutter fixed inset-x-0 z-40 mx-auto max-w-md sm:bottom-6 ${
        acimaDaNav ? 'bottom-[calc(72px+env(safe-area-inset-bottom,0px))]' : 'bottom-[calc(16px+env(safe-area-inset-bottom,0px))]'
      }`}
    >
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-2xl">
        <span aria-hidden className="text-2xl">
          🚀
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <strong className="block">Nova versão do app</strong>
          <span className="text-muted">Atualize para ter as melhorias. Seus dados continuam salvos.</span>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button onClick={() => location.reload()} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink">
            Atualizar
          </button>
          <button onClick={() => setDepois(true)} className="text-xs font-semibold text-muted hover:text-ink">
            Depois
          </button>
        </div>
      </div>
    </div>
  );
}
