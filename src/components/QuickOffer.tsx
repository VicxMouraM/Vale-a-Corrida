import { useEffect, useMemo, useState } from 'react';
import { EMPTY_OFFER } from '../defaults';
import { analyze, validateOffer, type Analysis } from '../lib/calc';
import { brl, parseNum } from '../lib/format';
import { activePlatform } from '../lib/platforms';
import type { Offer, Settings } from '../types';
import { VERDICT } from './Verdict';

type Campo = 'valor' | 'km' | 'min';

const CAMPOS: { id: Campo; rotulo: string; sufixo: string; prefixo?: string; max: number }[] = [
  { id: 'valor', rotulo: 'Valor', prefixo: 'R$', sufixo: '', max: 9999 },
  { id: 'km', rotulo: 'Km total', sufixo: 'km', max: 2000 },
  { id: 'min', rotulo: 'Tempo', sufixo: 'min', max: 1440 },
];

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'];

/**
 * Oferta rápida: para os ~15 segundos em que a oferta fica na tela.
 * Três campos, teclado próprio (o do celular não cobre nada) e o semáforo atualizando a cada toque.
 * O km é o total da corrida (até a coleta + viagem + retorno), como aparece na maioria das ofertas.
 */
export function QuickOffer({
  settings: s,
  combustivel,
  onClose,
  onRegister,
  onUseFull,
}: {
  settings: Settings;
  combustivel: Offer['combustivel'];
  onClose: () => void;
  onRegister: (a: Analysis, o: Offer) => void;
  onUseFull: (o: Offer) => void;
}) {
  const [txt, setTxt] = useState<Record<Campo, string>>({ valor: '', km: '', min: '' });
  const [ativo, setAtivo] = useState<Campo>('valor');
  const plataforma = activePlatform(s);

  const num = (c: Campo) => {
    const n = parseNum(txt[c]);
    return Number.isFinite(n) ? n : 0;
  };
  const offer: Offer = { ...EMPTY_OFFER, combustivel, valor: num('valor'), kmEntrega: num('km'), minutos: num('min') };
  const pronto = offer.valor > 0 && offer.kmEntrega > 0 && offer.minutos > 0;
  const a = useMemo(() => (pronto && validateOffer(offer, s).length === 0 ? analyze(offer, s) : null), [pronto, offer.valor, offer.kmEntrega, offer.minutos, s]); // eslint-disable-line react-hooks/exhaustive-deps

  function tecla(t: string) {
    const c = CAMPOS.find((x) => x.id === ativo)!;
    setTxt((cur) => {
      let v = cur[ativo];
      if (t === '⌫') v = v.slice(0, -1);
      else if (t === ',') v = v.includes(',') || ativo === 'min' ? v : (v || '0') + ',';
      else {
        const novo = v === '0' ? t : v + t;
        const decimais = novo.split(',')[1];
        if (decimais && decimais.length > (ativo === 'valor' ? 2 : 1)) return cur;
        if (parseNum(novo) > c.max) return cur;
        v = novo;
      }
      return { ...cur, [ativo]: v };
    });
  }

  // Teclado físico também funciona (computador, teclado Bluetooth)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) tecla(e.key);
      else if (e.key === ',' || e.key === '.') tecla(',');
      else if (e.key === 'Backspace') tecla('⌫');
      else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        setAtivo((c) => CAMPOS[(CAMPOS.findIndex((x) => x.id === c) + 1) % CAMPOS.length].id);
      } else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const v = a ? VERDICT[a.veredito] : null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)]" role="dialog" aria-modal="true" aria-label="Oferta rápida">
      <div className="gutter mx-auto flex w-full max-w-md flex-1 flex-col gap-3 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-display text-xl font-bold tracking-wide">⚡ Oferta rápida</div>
            <div className="truncate text-xs text-muted">
              {plataforma?.nome ?? 'Plataforma'} · {s.veiculo.nome}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:bg-sunk">
            Fechar
          </button>
        </div>

        {/* Resultado: aparece assim que os 3 campos têm valor */}
        <div className={`flex min-h-[112px] flex-col justify-center rounded-xl border-2 p-3 ${v ? v.box : 'border-line bg-surface'}`} aria-live="polite">
          {a && v ? (
            <>
              <div className={`font-display text-3xl font-bold uppercase leading-none ${v.text}`}>
                {v.icon} {v.title}
              </div>
              <div className="tnum mt-1.5 flex flex-wrap gap-x-4 text-sm">
                <span>
                  Sobra <strong>{brl(a.lucroDecisao)}</strong>
                </span>
                <span>
                  <strong>{brl(a.lucroHora)}</strong>/h
                </span>
                <span>
                  <strong>{brl(a.lucroKm)}</strong>/km
                </span>
              </div>
              {a.minimoVale !== null && a.veredito !== 'vale' && (
                <div className="tnum mt-1 text-xs">
                  Para ficar verde: a partir de <strong>{brl(a.minimoVale)}</strong>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-sm text-muted">Digite o valor, os km e o tempo da oferta.</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {CAMPOS.map((c) => (
            <button
              key={c.id}
              onClick={() => setAtivo(c.id)}
              aria-pressed={ativo === c.id}
              className={`rounded-xl border-2 px-2 py-2 text-left ${ativo === c.id ? 'border-accent bg-surface' : 'border-line bg-surface/60'}`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{c.rotulo}</div>
              <div className="tnum truncate font-display text-2xl font-semibold">
                {c.prefixo && <span className="mr-0.5 text-sm text-muted">{c.prefixo}</span>}
                {txt[c.id] || <span className="text-muted/60">0</span>}
                {c.sufixo && <span className="ml-0.5 text-sm text-muted">{c.sufixo}</span>}
              </div>
            </button>
          ))}
        </div>
        <p className="-mt-1 text-xs text-muted">Km total = até a coleta/passageiro + viagem + volta. Toque num campo para trocar.</p>

        <div className="grid flex-1 grid-cols-3 gap-2">
          {TECLAS.map((t) => (
            <button
              key={t}
              onClick={() => tecla(t)}
              aria-label={t === '⌫' ? 'Apagar' : t === ',' ? 'Vírgula' : t}
              className="min-h-[56px] rounded-xl border border-line bg-surface font-display text-3xl font-semibold active:bg-sunk"
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setTxt({ valor: '', km: '', min: '' })} className="rounded-xl border border-line py-3 text-sm font-semibold hover:bg-sunk">
            Limpar
          </button>
          <button onClick={() => onUseFull(offer)} className="rounded-xl border border-line py-3 text-sm font-semibold hover:bg-sunk">
            Detalhar
          </button>
          <button
            disabled={!a}
            onClick={() => a && onRegister(a, offer)}
            className="rounded-xl bg-accent py-3 text-sm font-semibold text-accent-ink disabled:opacity-40"
          >
            Aceitei ✓
          </button>
        </div>
      </div>
    </div>
  );
}
