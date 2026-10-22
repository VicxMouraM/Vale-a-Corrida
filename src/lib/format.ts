export const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const brl4 = (n: number) =>
  'R$ ' + (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export const num = (n: number, d = 2) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: 0 });

export const pct = (n: number, d = 1) => `${num(n, d)}%`;

export const hm = (minutos: number) => {
  const m = Math.round(minutos);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h${String(m % 60).padStart(2, '0')}` : `${m} min`;
};

/** Aceita "12,5", "12.5", "1.234,56" */
export function parseNum(raw: string): number {
  const t = raw.trim().replace(/\s/g, '').replace(/^R\$/, '');
  if (t === '') return NaN;
  const norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  if (!/^-?\d*\.?\d*$/.test(norm) || norm === '.' || norm === '-') return NaN;
  return Number(norm);
}

export const toInput = (n: number) => (Number.isFinite(n) ? String(n).replace('.', ',') : '');
