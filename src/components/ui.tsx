import { useEffect, useId, useState, type ReactNode } from 'react';
import { parseNum, toInput } from '../lib/format';

/* Campo numérico que aceita vírgula, valida e só repassa números válidos. */
export function NumField(props: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  allowZero?: boolean;
  hint?: ReactNode;
  estimated?: boolean;
  onConfirm?: () => void;
  big?: boolean;
  id?: string;
  decimals?: boolean;
}) {
  const auto = useId();
  const id = props.id ?? auto;
  const [text, setText] = useState(toInput(props.value));
  const [err, setErr] = useState<string | null>(null);

  // Sincroniza quando o valor muda por fora (ex.: limpar, exemplo, outra aba)
  useEffect(() => {
    const parsed = parseNum(text);
    if (!(Number.isFinite(parsed) && Math.abs(parsed - props.value) < 1e-9)) {
      setText(props.value === 0 && text === '' ? '' : toInput(props.value));
      setErr(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);

  const min = props.min ?? 0;
  const allowZero = props.allowZero ?? true;

  function handle(raw: string) {
    setText(raw);
    if (raw.trim() === '') {
      setErr(null);
      props.onChange(0);
      return;
    }
    const n = parseNum(raw);
    if (!Number.isFinite(n)) return setErr('Digite só números (use vírgula para decimais).');
    if (n < min) return setErr(`Mínimo: ${toInput(min)}`);
    if (props.max !== undefined && n > props.max) return setErr(`Máximo: ${toInput(props.max)}`);
    if (!allowZero && n === 0) return setErr('Precisa ser maior que zero.');
    setErr(null);
    props.onChange(n);
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <label htmlFor={id} className="min-w-0 text-[13px] font-medium text-muted">
          {props.label}
        </label>
        {props.estimated && <EstBadge onConfirm={props.onConfirm} />}
      </div>
      <div
        className={`flex items-center rounded-md border bg-surface transition-colors focus-within:border-accent ${
          err ? 'border-bad' : 'border-line'
        }`}
      >
        {props.prefix && <span className="pl-3 text-sm text-muted">{props.prefix}</span>}
        <input
          id={id}
          inputMode={props.decimals === false ? 'numeric' : 'decimal'}
          autoComplete="off"
          className={`tnum w-full min-w-0 bg-transparent px-3 outline-none ${
            props.big ? 'py-2.5 font-display text-2xl font-semibold' : 'py-2 text-base'
          }`}
          value={text}
          placeholder="0"
          onChange={(e) => handle(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-invalid={!!err}
        />
        {props.suffix && <span className="whitespace-nowrap pr-3 text-sm text-muted">{props.suffix}</span>}
      </div>
      {err ? <p className="text-xs text-bad">{err}</p> : props.hint ? <p className="text-xs text-muted">{props.hint}</p> : null}
    </div>
  );
}

export function TextField(props: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  id?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
}) {
  const auto = useId();
  const id = props.id ?? auto;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium text-muted">
        {props.label}
      </label>
      <input
        id={id}
        type={props.type ?? 'text'}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        inputMode={props.inputMode}
        className="w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

/** Etiqueta de valor de exemplo. Com onConfirm, vira botão "está certo" que remove a etiqueta. */
export function EstBadge({ onConfirm }: { onConfirm?: () => void }) {
  const cls = 'whitespace-nowrap rounded border border-warn/50 bg-warn-soft px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-warn';
  if (!onConfirm)
    return (
      <span title="Valor de exemplo. Edite ou confirme em Ajustes." className={cls}>
        estimativa
      </span>
    );
  return (
    <button type="button" title="Toque se o valor já está certo" onClick={onConfirm} className={`${cls} hover:bg-warn/20`}>
      estimativa · confirmar
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-display text-xl font-semibold tracking-wide">{children}</h2>
      {aside}
    </div>
  );
}

export function Segmented<T extends string>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={props.label} className="inline-flex rounded-lg border border-line bg-sunk p-0.5">
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={props.value === o.value}
          onClick={() => props.onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            props.value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle(props: { checked: boolean; onChange: (b: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={props.checked}
        onClick={() => props.onChange(!props.checked)}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors ${props.checked ? 'bg-accent' : 'bg-line'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${props.checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </button>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium">{props.label}</span>
        {props.hint && <span className="block text-xs text-muted">{props.hint}</span>}
      </label>
    </div>
  );
}

export function Btn(props: {
  children: ReactNode;
  onClick?: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  type?: 'button' | 'submit';
  className?: string;
  disabled?: boolean;
}) {
  const k = props.kind ?? 'ghost';
  const cls =
    k === 'primary'
      ? 'bg-accent text-accent-ink hover:opacity-90'
      : k === 'danger'
        ? 'border border-bad/40 text-bad hover:bg-bad-soft'
        : 'border border-line bg-surface text-ink hover:bg-sunk';
  return (
    <button
      type={props.type ?? 'button'}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${cls} ${props.className ?? ''}`}
    >
      {props.children}
    </button>
  );
}

/** Linha de tabela "descrição ......... valor" */
export function Row(props: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: 'good' | 'bad' | 'muted'; sub?: ReactNode }) {
  const tone = props.tone === 'good' ? 'text-good' : props.tone === 'bad' ? 'text-bad' : props.tone === 'muted' ? 'text-muted' : '';
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${props.strong ? 'font-semibold' : ''}`}>
      <div className="min-w-0">
        <div className="text-sm">{props.label}</div>
        {props.sub && <div className="text-xs text-muted">{props.sub}</div>}
      </div>
      <div className={`tnum shrink-0 text-right text-sm ${tone}`}>{props.value}</div>
    </div>
  );
}

export function Details({ summary, children, defaultOpen }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-lg border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold">
        <span>{summary}</span>
        <span className="text-muted transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="border-t border-line px-4 py-3">{children}</div>
    </details>
  );
}

/** Fórmula mostrada com os números substituídos */
export function Formula({ name, expr, result }: { name: string; expr: string; result: string }) {
  return (
    <div className="border-b border-line/70 py-2 last:border-0">
      <div className="text-xs font-semibold text-muted">{name}</div>
      <div className="tnum mt-0.5 break-words font-mono text-[12.5px] leading-relaxed">
        {expr} = <span className="font-semibold text-accent">{result}</span>
      </div>
    </div>
  );
}
