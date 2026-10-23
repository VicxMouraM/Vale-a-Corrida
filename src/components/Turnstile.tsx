import { useEffect, useRef } from 'react';

/**
 * CAPTCHA do Cloudflare Turnstile no cadastro, login e recuperação de senha.
 * Fica desligado enquanto VITE_TURNSTILE_SITE_KEY não estiver configurada
 * (e o CAPTCHA também precisa estar ligado no Supabase: Authentication → Attack Protection).
 */
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || '';

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null;
        reject(new Error('turnstile'));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Mostra o desafio e devolve o token. `resetKey` muda a cada tentativa: o token só vale uma vez. */
export function Turnstile({ onToken, resetKey }: { onToken: (t: string | null) => void; resetKey: number }) {
  const box = useRef<HTMLDivElement | null>(null);
  const widget = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let alive = true;
    loadScript()
      .then(() => {
        if (!alive || !box.current || !window.turnstile) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: 'pt-br',
          callback: (t: string) => cb.current(t),
          'expired-callback': () => cb.current(null),
          'error-callback': () => cb.current(null),
        });
      })
      .catch(() => cb.current(null));
    return () => {
      alive = false;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey && widget.current && window.turnstile) {
      window.turnstile.reset(widget.current);
      cb.current(null);
    }
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={box} className="min-h-[65px]" />;
}
