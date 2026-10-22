export type PeriodKind = 'dia' | 'semana' | 'mes' | 'tudo';

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Semana começa na segunda-feira. */
export function periodRange(kind: PeriodKind, ref: Date): [Date, Date] | null {
  if (kind === 'tudo') return null;
  const s = startOfDay(ref);
  if (kind === 'dia') {
    const e = new Date(s);
    e.setDate(e.getDate() + 1);
    return [s, e];
  }
  if (kind === 'semana') {
    const dow = (s.getDay() + 6) % 7;
    s.setDate(s.getDate() - dow);
    const e = new Date(s);
    e.setDate(e.getDate() + 7);
    return [s, e];
  }
  s.setDate(1);
  const e = new Date(s);
  e.setMonth(e.getMonth() + 1);
  return [s, e];
}

export function shiftRef(kind: PeriodKind, ref: Date, dir: -1 | 1): Date {
  const d = new Date(ref);
  if (kind === 'dia') d.setDate(d.getDate() + dir);
  else if (kind === 'semana') d.setDate(d.getDate() + 7 * dir);
  else if (kind === 'mes') d.setMonth(d.getMonth() + dir);
  return d;
}

export function periodLabel(kind: PeriodKind, ref: Date): string {
  const r = periodRange(kind, ref);
  if (!r) return 'Todo o histórico';
  const [s, e] = r;
  if (kind === 'dia') return s.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  if (kind === 'mes') return s.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const last = new Date(e);
  last.setDate(last.getDate() - 1);
  return `${s.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${last.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function toLocalInput(d: Date) {
  return `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
