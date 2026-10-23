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

/** Formata enquanto digita: até 11 dígitos é CPF (000.000.000-00); acima, CNPJ (00.000.000/0000-00). */
export function maskCpfCnpj(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}
