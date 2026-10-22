import type { HistoryEntry } from '../types';

const n = (v: number) => (Number.isFinite(v) ? v.toFixed(2).replace('.', ',') : '');
const q = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** CSV com ponto e vírgula e vírgula decimal (abre direto no Excel/Sheets em português). */
export function historyToCsv(list: HistoryEntry[]): string {
  const head = [
    'data', 'hora', 'valor_recebido', 'bonus', 'km', 'minutos', 'despesas', 'taxas', 'combustivel',
    'preco_litro', 'km_por_litro', 'custo_combustivel', 'reserva_desgaste', 'rateio_fixos', 'lucro_estimado',
    'lucro_por_hora', 'observacao',
  ];
  const rows = list
    .slice()
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((e) => {
      const d = new Date(e.data);
      return [
        d.toLocaleDateString('pt-BR'),
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        n(e.valor), n(e.bonus), n(e.km), String(Math.round(e.minutos)), n(e.despesas), n(e.taxas), e.combustivel,
        n(e.precoLitro), n(e.kml), n(e.custoCombustivel), n(e.custoDesgaste), n(e.custoFixo), n(e.lucro),
        n(e.minutos > 0 ? e.lucro / (e.minutos / 60) : 0), q(e.obs ?? ''),
      ].join(';');
    });
  return '﻿' + [head.join(';'), ...rows].join('\r\n');
}

/** Tenta baixar o arquivo. Retorna false se o navegador bloquear. */
export function downloadText(name: string, text: string, mime = 'text/csv;charset=utf-8'): boolean {
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}
