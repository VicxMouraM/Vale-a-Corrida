import { goalRows, type HistorySummary } from '../lib/calc';
import { brl, num } from '../lib/format';
import type { Settings } from '../types';
import { Card, NumField, SectionTitle, Toggle } from './ui';

export function Goals({ s, setSettings, hist }: { s: Settings; setSettings: (s: Settings) => void; hist: HistorySummary }) {
  const g = s.metas;
  const c = s.criterios;
  const setG = <K extends keyof Settings['metas']>(k: K) => (v: Settings['metas'][K]) => setSettings({ ...s, metas: { ...g, [k]: v } });
  const setC = <K extends keyof Settings['criterios']>(k: K) => (v: Settings['criterios'][K]) => setSettings({ ...s, criterios: { ...c, [k]: v } });
  const temHist = hist.qtd >= 3 && hist.horas > 0;
  const usarHist = g.usarMediaHistorico && temHist;
  const kmH = usarHist ? hist.kmPorHora : g.kmPorHora;
  const corridasH = temHist ? hist.qtd / hist.horas : 1;
  const rows = goalRows(s, kmH, corridasH);
  const avisos = inconsistencies(s);

  return (
    <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-4">
        <Card>
          <SectionTitle>Quando uma corrida vale a pena</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <NumField id="g-h" label="Lucro mínimo por hora" prefix="R$" value={c.metaHora} onChange={setC('metaHora')} />
            <NumField id="g-mm" label="Margem mínima" suffix="%" max={99} value={c.margemMinima} onChange={setC('margemMinima')} />
          </div>
          <div className="mt-3">
            <Toggle
              checked={c.incluirFixosNaDecisao}
              onChange={setC('incluirFixosNaDecisao')}
              label="Descontar seguro, IPVA e outros fixos"
              hint="Mais conservador: cada corrida paga sua parte dos custos fixos."
            />
          </div>
          <ul className="mt-4 flex flex-col gap-1 border-t border-line pt-3 text-sm">
            <li>🟢 Bate as duas metas acima</li>
            <li>🟡 Dá lucro, mas não bate alguma das metas</li>
            <li>🔴 Lucro zero ou negativo</li>
          </ul>
        </Card>

        <Card>
          <SectionTitle>Quanto quero ganhar</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <NumField id="g-d" label="Por dia" prefix="R$" value={g.dia} onChange={setG('dia')} />
            <NumField id="g-s" label="Por semana" prefix="R$" value={g.semana} onChange={setG('semana')} />
            <NumField id="g-m" label="Por mês" prefix="R$" value={g.mes} onChange={setG('mes')} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
            <NumField id="g-hd" label="Horas por dia" value={g.horasPorDia} onChange={setG('horasPorDia')} max={24} />
            <NumField id="g-ds" label="Dias/semana" value={g.diasPorSemana} onChange={setG('diasPorSemana')} max={7} decimals={false} />
            <NumField id="g-dm" label="Dias/mês" value={g.diasPorMes} onChange={setG('diasPorMes')} max={31} decimals={false} />
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {usarHist ? (
              <p className="text-sm">
                Km por hora: <strong className="tnum">{num(hist.kmPorHora, 1)} km/h</strong> <span className="text-muted">(média real de {hist.qtd} corridas)</span>
              </p>
            ) : (
              <NumField id="g-kmh" label="Km rodados por hora (com trechos vazios)" suffix="km/h" value={g.kmPorHora} onChange={setG('kmPorHora')} />
            )}
            <Toggle
              checked={g.usarMediaHistorico}
              onChange={setG('usarMediaHistorico')}
              label="Usar a média real do histórico"
              hint={temHist ? undefined : 'Funciona a partir de 3 corridas registradas.'}
            />
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle>Quanto preciso faturar</SectionTitle>
        <div className="overflow-x-auto">
          <table className="tnum w-full text-sm">
            <thead>
              <tr className="label-caps border-b border-line text-left text-muted">
                <th className="py-2 pr-2 font-semibold">Período</th>
                <th className="py-2 pr-2 text-right font-semibold">Lucro</th>
                <th className="hidden py-2 pr-2 text-right font-semibold sm:table-cell">+ Custos</th>
                <th className="py-2 text-right font-semibold">= Faturar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const custos = r.custoCombustivel + r.custoDesgaste + r.custoFixo + r.taxas;
                return (
                  <tr key={r.periodo} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 pr-2">
                      <div className="font-medium">{r.periodo}</div>
                      <div className="text-xs text-muted">
                        {num(r.horas, 1)} h · {num(r.km, 0)} km
                      </div>
                    </td>
                    <td className="py-2.5 pr-2 text-right">{brl(r.lucroMeta)}</td>
                    <td className="hidden py-2.5 pr-2 text-right text-muted sm:table-cell">{brl(custos)}</td>
                    <td className="py-2.5 text-right">
                      <div className="font-display text-lg font-semibold text-accent">{brl(r.faturamento)}</div>
                      <div className="text-xs text-muted">{brl(r.faturamentoHora)}/h</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Faturar = (lucro + combustível + manutenção + depreciação + fixos + taxas fixas) ÷ (1 − taxa %). Km = horas × {num(kmH, 1)} km/h.
        </p>
        {avisos.length > 0 && (
          <div className="mt-4 rounded-lg bg-warn-soft p-3 text-sm">
            <div className="mb-1 font-semibold text-warn">Metas que não batem entre si</div>
            <ul className="flex flex-col gap-1">
              {avisos.map((a) => (
                <li key={a}>· {a}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}

function inconsistencies(s: Settings): string[] {
  const g = s.metas;
  const out: string[] = [];
  const porHora = g.horasPorDia > 0 ? g.dia / g.horasPorDia : 0;
  if (Math.abs(porHora - s.criterios.metaHora) > 0.5)
    out.push(`A meta do dia em ${num(g.horasPorDia, 1)} h dá ${brl(porHora)}/h, mas o mínimo por hora é ${brl(s.criterios.metaHora)}.`);
  const semana = g.dia * g.diasPorSemana;
  if (Math.abs(semana - g.semana) > 1) out.push(`${g.diasPorSemana} dias × ${brl(g.dia)} = ${brl(semana)} por semana, diferente da meta de ${brl(g.semana)}.`);
  const mes = g.dia * g.diasPorMes;
  if (Math.abs(mes - g.mes) > 1) out.push(`${g.diasPorMes} dias × ${brl(g.dia)} = ${brl(mes)} por mês, diferente da meta de ${brl(g.mes)}.`);
  return out;
}
