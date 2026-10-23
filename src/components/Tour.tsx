import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface TourStep {
  /** valor de data-tour ou seletor CSS (#id) do elemento a destacar; sem alvo = cartão no centro */
  target?: string;
  titulo: string;
  texto: string;
}

/** Passos do tutorial do primeiro acesso, na tela da corrida. */
export const TUTORIAL: TourStep[] = [
  { titulo: 'Tudo pronto! 👋', texto: 'Em 1 minuto você aprende a usar o app. Dá para pular e rever depois em Ajustes.' },
  { target: 'workbar', titulo: 'Veículo e plataforma', texto: 'Os cálculos usam os custos deste veículo e a taxa desta plataforma. Toque para trocar ou ajustar.' },
  { target: 'rapida', titulo: '⚡ Oferta rápida', texto: 'Chegou uma oferta? Toque aqui: teclado grande, só valor, km e tempo, e o semáforo aparece enquanto você digita.' },
  { target: '#of-valor', titulo: '1. Valor da oferta', texto: 'Quando chegar uma oferta, digite aqui quanto ela paga.' },
  { target: 'distancias', titulo: '2. Distâncias', texto: 'Km até buscar, até o destino e a volta. O retorno vazio também gasta combustível.' },
  { target: '#of-min', titulo: '3. Tempo', texto: 'Do aceite até ficar livre de novo, com a espera. É o que define o seu ganho por hora.' },
  {
    target: 'resultado',
    titulo: 'O semáforo',
    texto: '🟢 vale a pena · 🟡 dá lucro, mas abaixo da sua meta · 🔴 prejuízo. Abaixo aparece o valor mínimo que você deveria aceitar.',
  },
  { target: 'registrar', titulo: 'Aceitou? Registre', texto: 'Assim o app soma o seu lucro real do dia, da semana e do mês.' },
  {
    target: 'nav-historico',
    titulo: 'Histórico',
    texto: 'Seu lucro real, horas trabalhadas e quanto separar para manutenção. Em “Importar” você traz corridas antigas da Uber, 99 e outras, por planilha ou print.',
  },
  { target: 'nav-metas', titulo: 'Metas', texto: 'Quanto quer ganhar por dia e o mínimo por hora. O semáforo usa esses números.' },
  { target: 'nav-ajustes', titulo: 'Ajustes', texto: 'Preço do combustível, consumo e manutenção. Quanto mais real, mais certeira a conta.' },
  {
    target: 'plano',
    titulo: 'Seu plano',
    texto: 'Toda conta nova ganha 7 dias de Pro grátis: vários veículos e plataformas, histórico completo, relatórios, importar por print e sem anúncios. Toque aqui para ver os planos.',
  },
  { target: 'conta', titulo: 'Sua conta', texto: 'Com conta, suas corridas ficam salvas na nuvem e aparecem em qualquer celular. Sem conta, ficam só neste aparelho.' },
  {
    titulo: 'Últimas dicas 📲',
    texto: 'Coloque o app na tela inicial: no Android, menu ⋮ → “Adicionar à tela inicial”; no iPhone, Compartilhar → “Adicionar à Tela de Início”. Dúvida ou problema? “Ajuda e feedback” fica no fim da página. Para rever este tutorial, vá em Ajustes.',
  },
];

function find(target?: string): HTMLElement | null {
  if (!target) return null;
  const sel = target.startsWith('#') ? target : `[data-tour="${target}"]`;
  // Há elementos repetidos (menu do computador e do celular): usa o que está visível
  for (const el of document.querySelectorAll<HTMLElement>(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** Passo a passo com destaque no elemento. Teclado: → avança, ← volta, Esc fecha. */
export function Tour({ steps: todos, onClose }: { steps: TourStep[]; onClose: () => void }) {
  // Só os passos cujo alvo existe nesta tela (ex.: sem login no app não há botão de conta), para a contagem "3/11" bater
  const [steps, setSteps] = useState<TourStep[]>([]);
  useLayoutEffect(() => setSteps(todos.filter((s) => !s.target || find(s.target))), [todos]);
  const [i, setI] = useState(0);
  const dir = useRef<1 | -1>(1); // sentido em que a pessoa está andando, para pular um alvo sumido sem travar o "Voltar"
  const [rect, setRect] = useState<DOMRect | null>(null);
  // Trava a rolagem da página de trás enquanto esta tela está aberta (no celular o fundo rolava junto)
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = antes;
    };
  }, []);
  const step = steps[i];

  const measure = useCallback(() => {
    const el = find(step?.target);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useLayoutEffect(() => {
    const el = find(step?.target);
    if (step?.target && !el) {
      // alvo sumiu depois de aberto (ex.: o resultado): pula no sentido em que a pessoa estava indo
      setI((n) => Math.min(steps.length - 1, Math.max(0, n + dir.current)));
      return;
    }
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(measure, 350);
    measure();
    return () => clearTimeout(t);
  }, [step, steps.length, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  const next = useCallback(() => {
    dir.current = 1;
    if (i + 1 < steps.length) setI(i + 1);
    else onClose();
  }, [i, steps.length, onClose]);
  const prev = useCallback(() => {
    dir.current = -1;
    setI((n) => Math.max(0, n - 1));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  if (!step) return null;
  const pad = 6;
  // Cartão do lado oposto ao destaque, para não cobrir o que está sendo explicado
  const cardBottom = rect ? rect.top + rect.height / 2 < window.innerHeight / 2 : false;
  const ultimo = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="tour-titulo">
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-xl ring-2 ring-accent transition-all duration-200"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.6)',
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-black/60" />
      )}
      {/* clique fora não fecha: evita perder o tutorial sem querer */}
      <div className="fixed inset-0" />
      <div
        className={`gutter fixed inset-x-0 mx-auto max-w-md ${
          rect ? (cardBottom ? 'bottom-[calc(80px+env(safe-area-inset-bottom,0px))]' : 'top-[calc(16px+env(safe-area-inset-top,0px))]') : 'top-1/2 -translate-y-1/2'
        }`}
      >
        <div className="rounded-xl border border-line bg-surface p-4 shadow-2xl">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 id="tour-titulo" className="font-display text-xl font-semibold tracking-wide">
              {step.titulo}
            </h2>
            <span className="tnum text-xs text-muted">
              {i + 1}/{steps.length}
            </span>
          </div>
          <p className="text-sm">{step.texto}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button className="text-sm font-semibold text-muted hover:text-ink" onClick={onClose}>
              Pular tutorial
            </button>
            <div className="flex gap-2">
              {i > 0 && (
                <button className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:bg-sunk" onClick={prev}>
                  Voltar
                </button>
              )}
              <button autoFocus className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-accent-ink" onClick={next}>
                {ultimo ? 'Começar' : 'Próximo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
