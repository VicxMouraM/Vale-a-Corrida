import { brl } from '../lib/format';

export interface Segment {
  label: string;
  value: number;
  color: string; // classe tailwind de fundo, ex.: 'bg-fuel'
}

/** Barra empilhada horizontal: para onde vai cada real recebido. */
export function StackBar({ segments, total }: { segments: Segment[]; total: number }) {
  const t = total > 0 ? total : segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  const visible = segments.filter((s) => s.value > 0.0049);
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-sunk" role="img" aria-label="Composição do valor">
        {visible.map((s) => (
          <div key={s.label} className={`${s.color} h-full`} style={{ width: `${Math.min(100, (s.value / t) * 100)}%` }} />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs min-[460px]:grid-cols-2">
        {segments.map((s) => (
          <li key={s.label} className="flex min-w-0 items-center gap-1.5">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${s.color}`} />
            <span className="truncate text-muted">{s.label}</span>
            <span className="tnum ml-auto">{brl(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barras verticais com suporte a valores negativos (prejuízo). */
export function BarChart({ data, height = 180 }: { data: { label: string; value: number; title?: string }[]; height?: number }) {
  if (data.length === 0) return null;
  const W = Math.max(320, data.length * 28);
  const padL = 44;
  const padB = 22;
  const padT = 10;
  const max = Math.max(0, ...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const span = max - min || 1;
  const nice = niceStep(span / 4);
  const top = Math.ceil(max / nice) * nice || nice;
  const bottom = Math.floor(min / nice) * nice;
  const range = top - bottom;
  const H = height;
  const y = (v: number) => padT + ((top - v) / range) * (H - padT - padB);
  const bw = (W - padL - 8) / data.length;
  const ticks: number[] = [];
  for (let v = bottom; v <= top + 1e-9; v += nice) ticks.push(v);
  const every = Math.ceil(data.length / 12);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[320px]" style={{ height }} role="img" aria-label="Lucro por período">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 4} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={t === 0 ? 1.2 : 0.6} strokeDasharray={t === 0 ? '' : '3 3'} />
            <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" className="fill-muted" fontSize="10">
              {Math.abs(t) >= 1000 ? `${(t / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : Math.round(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * bw + bw * 0.15;
          const y0 = y(0);
          const y1 = y(d.value);
          return (
            <g key={i}>
              <rect
                x={x}
                width={Math.max(2, bw * 0.7)}
                y={Math.min(y0, y1)}
                height={Math.max(1, Math.abs(y1 - y0))}
                rx={2}
                className={d.value >= 0 ? 'fill-good' : 'fill-bad'}
              >
                <title>{`${d.title ?? d.label}: ${brl(d.value)}`}</title>
              </rect>
              {i % every === 0 && (
                <text x={x + bw * 0.35} y={H - 6} textAnchor="middle" className="fill-muted" fontSize="10">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function niceStep(raw: number) {
  if (raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}
