import { useEffect, useState } from 'react';

/** Commit desta versão (definido na publicação pelo GitHub Actions). */
const ATUAL = import.meta.env.VITE_VERSAO as string | undefined;
const INTERVALO = 15 * 60_000;

/**
 * Avisa quando uma versão nova do app foi publicada enquanto ele estava aberto
 * (comum no app instalado, que fica dias em segundo plano sem recarregar).
 * Confere ao voltar para o app e a cada 15 minutos.
 */
export function useNovaVersao(): boolean {
  const [nova, setNova] = useState(false);
  useEffect(() => {
    if (!import.meta.env.PROD || !ATUAL || typeof window === 'undefined') return;
    let vivo = true;
    const conferir = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      try {
        const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) return;
        const { versao } = (await r.json()) as { versao?: string };
        if (vivo && versao && versao !== ATUAL) setNova(true);
      } catch {
        /* sem internet: confere na próxima */
      }
    };
    void conferir();
    const t = setInterval(conferir, INTERVALO);
    document.addEventListener('visibilitychange', conferir);
    window.addEventListener('online', conferir);
    return () => {
      vivo = false;
      clearInterval(t);
      document.removeEventListener('visibilitychange', conferir);
      window.removeEventListener('online', conferir);
    };
  }, []);
  return nova;
}
