import { useMemo, useState } from 'react';
import { buildEntry, summarize, type HistoryInput } from '../lib/calc';
import { downloadText, historyToCsv } from '../lib/csv';
import { brl, hm, num } from '../lib/format';
import { dayKey, periodLabel, periodRange, shiftRef, toLocalInput, type PeriodKind } from '../lib/period';
import type { Fuel, HistoryEntry, Settings } from '../types';
import { DIAS_HISTORICO_GRATIS, usePlan } from '../lib/plan';
import { platformName, platforms } from '../lib/platforms';
import { activateVehicle, garage } from '../lib/vehicles';
import { BarChart, StackBar } from './charts';
import { ProGate, ProTag } from './Pro';
import { Btn, Card, NumField, SectionTitle, Segmented, TextField } from './ui';

export interface Draft {
  input: HistoryInput;
  editingId?: string;
}

interface Props {
  s: Settings;
  history: HistoryEntry[];
  setHistory: (h: HistoryEntry[]) => void;
  draft: Draft | null;
  setDraft: (d: Draft | null) => void;
  /** corridas guardadas que o plano grátis não mostra */
  hiddenCount?: number;
}

export function newDraft(s: Settings): Draft {
  return {
    input: {
      data: new Date().toISOString(),
      valor: 0,
      bonus: 0,
      km: 0,
      minutos: 0,
      despesas: 0,
      taxas: 0,
      combustivel: s.veiculo.combustivelPadrao === 'etanol' ? 'etanol' : 'gasolina',
      veiculo: s.veiculoAtivo ?? undefined,
      plataforma: s.plataformaAtiva ?? undefined,
    },
  };
}

export function History({ s, history, setHistory, draft, setDraft, hiddenCount = 0 }: Props) {
  const { plan, upgrade } = usePlan();
  const [kind, setKind] = useState<PeriodKind>('semana');
  const [ref, setRef] = useState(() => new Date());
  const [csvText, setCsvText] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const range = periodRange(kind, ref);
  const list = useMemo(
    () =>
      history
        .filter((e) => {
          if (!range) return true;
          const t = new Date(e.data).getTime();
          return t >= range[0].getTime() && t < range[1].getTime();
        })
        .sort((a, b) => b.data.localeCompare(a.data)),
    [history, range?.[0].getTime(), kind],
  );
  const sum = summarize(list);
  const chart = useMemo(() => buildChart(kind, ref, list), [kind, ref, list]);

  function saveDraft() {
    if (!draft) return;
    const i = draft.input;
    if (i.valor <= 0 || i.km <= 0 || i.minutos <= 0) {
      setMsg('Preencha valor recebido, km e tempo (maiores que zero).');
      return;
    }
    // Recalcula com os custos do veículo em que a corrida foi feita (pode não ser o que está em uso agora)
    const sv = i.veiculo && i.veiculo !== s.veiculoAtivo && s.veiculos.some((v) => v.id === i.veiculo) ? activateVehicle(s, i.veiculo) : s;
    const entry = buildEntry(i, sv, draft.editingId);
    setHistory(draft.editingId ? history.map((e) => (e.id === draft.editingId ? entry : e)) : [...history, entry]);
    setDraft(null);
    setMsg(draft.editingId ? 'Corrida atualizada.' : 'Corrida registrada.');
  }

  function exportCsv() {
    if (!plan.pro) return upgrade();
    const vs = garage(s);
    const text = historyToCsv(history, { plataforma: (id) => platformName(s, id), veiculo: (id) => vs.find((v) => v.id === id)?.nome ?? '' });
    const ok = downloadText(`historico-corridas-${dayKey(new Date())}.csv`, text);
    setCsvText(text);
    setMsg(ok ? 'CSV gerado. Se o download não começar, copie o texto abaixo.' : 'O navegador bloqueou o download. Copie o texto abaixo.');
  }

  async function copyCsv() {
    if (!csvText) return;
    try {
      await navigator.clipboard.writeText(csvText);
      setMsg('CSV copiado. Cole em um arquivo .csv ou direto no Google Sheets.');
    } catch {
      const el = document.getElementById('csv-out') as HTMLTextAreaElement | null;
      el?.select();
      setMsg('Texto selecionado: use Copiar do seu teclado/celular.');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {draft && <EntryForm s={s} draft={draft} setDraft={setDraft} onSave={saveDraft} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<PeriodKind>
            label="Período"
            value={kind}
            onChange={(k) => setKind(k)}
            options={[
              { value: 'dia', label: 'Dia' },
              { value: 'semana', label: 'Semana' },
              { value: 'mes', label: 'Mês' },
              { value: 'tudo', label: plan.pro ? 'Tudo' : `${DIAS_HISTORICO_GRATIS} dias` },
            ]}
          />
          {kind !== 'tudo' && (
            <div className="flex items-center gap-1">
              <button aria-label="Período anterior" className="rounded-md border border-line bg-surface px-2.5 py-1" onClick={() => setRef(shiftRef(kind, ref, -1))}>
                ‹
              </button>
              <button className="rounded-md px-2 py-1 text-xs font-semibold text-accent" onClick={() => setRef(new Date())}>
                Hoje
              </button>
              <button aria-label="Próximo período" className="rounded-md border border-line bg-surface px-2.5 py-1" onClick={() => setRef(shiftRef(kind, ref, 1))}>
                ›
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!draft && (
            <Btn kind="primary" onClick={() => setDraft(newDraft(s))}>
              + Registrar corrida
            </Btn>
          )}
          <Btn onClick={exportCsv} disabled={plan.pro && history.length === 0}>
            <span className="inline-flex items-center gap-1.5">
              Exportar CSV {!plan.pro && <ProTag />}
            </span>
          </Btn>
        </div>
      </div>
      <h2 className="-mt-2 font-display text-2xl font-semibold first-letter:uppercase">{periodLabel(kind, ref)}</h2>

      {!plan.pro && (
        <p className="rounded-md bg-sunk px-3 py-2 text-sm">
          No plano grátis aparecem as corridas dos últimos {DIAS_HISTORICO_GRATIS} dias.
          {hiddenCount > 0 ? ` Outras ${hiddenCount} estão guardadas e voltam a aparecer no Pro.` : ' As mais antigas ficam guardadas e voltam a aparecer no Pro.'}{' '}
          <button className="font-semibold text-accent" onClick={upgrade}>
            Ver o Pro
          </button>
        </p>
      )}
      {msg && <p className="rounded-md bg-sunk px-3 py-2 text-sm" role="status">{msg}</p>}
      {csvText && (
        <Card>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">CSV do histórico completo ({history.length} corridas)</span>
            <div className="flex gap-2">
              <Btn onClick={copyCsv}>Copiar</Btn>
              <Btn onClick={() => setCsvText(null)}>Fechar</Btn>
            </div>
          </div>
          <textarea id="csv-out" readOnly value={csvText} className="h-32 w-full rounded-md border border-line bg-sunk p-2 font-mono text-xs" />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Entregas" value={String(sum.qtd)} />
        <Stat label="Faturamento bruto" value={brl(sum.bruto)} />
        <Stat label="Combustível" value={brl(sum.combustivel)} />
        <Stat label="Manutenção (reserva)" value={brl(sum.desgaste)} />
        <Stat label="Lucro estimado" value={brl(sum.lucro)} tone={sum.lucro >= 0 ? 'good' : 'bad'} />
        <Stat label="Km rodados" value={`${num(sum.km, 1)} km`} />
        <Stat label="Horas trabalhadas" value={hm(sum.horas * 60)} />
        <Stat label="Lucro médio/corrida" value={brl(sum.lucroMedio)} />
        <Stat label="Lucro médio/hora" value={brl(sum.lucroHora)} tone={sum.lucroHora >= s.criterios.metaHora ? 'good' : undefined} />
      </div>

      {sum.qtd > 0 ? (
        <ProGate title="Gráficos do período" hint="Lucro por dia e para onde foi cada real do faturamento.">
        <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card>
            <SectionTitle aside={<span className="text-xs text-muted">{chart.caption}</span>}>Lucro estimado</SectionTitle>
            <BarChart data={chart.data} />
          </Card>
          <Card>
            <SectionTitle>Para onde foi o faturamento</SectionTitle>
            <StackBar
              total={Math.max(sum.bruto, sum.bruto - sum.lucro)}
              segments={[
                { label: 'Combustível', value: sum.combustivel, color: 'bg-fuel' },
                { label: 'Manutenção + depreciação', value: sum.desgaste, color: 'bg-wear' },
                { label: 'Despesas + taxas', value: sum.despesas + sum.taxas, color: 'bg-warn' },
                { label: 'Fixos rateados', value: sum.fixos, color: 'bg-fixed' },
                { label: sum.lucro >= 0 ? 'Lucro' : 'Prejuízo', value: Math.abs(sum.lucro), color: sum.lucro >= 0 ? 'bg-good' : 'bg-bad' },
              ]}
            />
            <p className="mt-3 text-xs text-muted">Manutenção e depreciação são reservas: separe esse valor para quando os serviços chegarem.</p>
          </Card>
        </div>
        </ProGate>
      ) : (
        <Card className="border-dashed text-center">
          <p className="font-display text-xl font-semibold">Nenhuma corrida neste período</p>
          <p className="mt-1 text-sm text-muted">
            Depois de fazer uma corrida, toque em “Aceitei: registrar no histórico” na calculadora ou em “+ Registrar corrida” acima.
          </p>
        </Card>
      )}

      <ByPlatform s={s} list={list} />

      {list.length > 0 && (
        <Card>
          <SectionTitle>Corridas</SectionTitle>
          <ul className="divide-y divide-line">
            {list.map((e) => {
              const lh = e.minutos > 0 ? e.lucro / (e.minutos / 60) : 0;
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                  <div className="min-w-[120px] flex-1">
                    <div className="text-sm font-medium">
                      {new Date(e.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{' '}
                      <span className="text-muted">{new Date(e.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="tnum text-xs text-muted">
                      {e.plataforma ? `${platformName(s, e.plataforma)} · ` : ''}
                      {num(e.km, 1)} km · {hm(e.minutos)} · {e.combustivel}
                      {e.obs ? ` · ${e.obs}` : ''}
                    </div>
                  </div>
                  <div className="tnum text-right text-sm">
                    <div>{brl(e.valor + e.bonus)}</div>
                    <div className="text-xs text-muted">recebido</div>
                  </div>
                  <div className="tnum min-w-[90px] text-right text-sm">
                    <div className={`font-semibold ${e.lucro >= 0 ? 'text-good' : 'text-bad'}`}>{brl(e.lucro)}</div>
                    <div className="text-xs text-muted">{brl(lh)}/h</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="rounded px-2 py-1 text-xs font-semibold text-accent hover:bg-sunk"
                      onClick={() => {
                        setDraft({
                          editingId: e.id,
                          input: { data: e.data, valor: e.valor, bonus: e.bonus, km: e.km, minutos: e.minutos, despesas: e.despesas, taxas: e.taxas, combustivel: e.combustivel, obs: e.obs, veiculo: e.veiculo, plataforma: e.plataforma },
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Editar
                    </button>
                    {confirmDel === e.id ? (
                      <>
                        <button className="rounded bg-bad px-2 py-1 text-xs font-semibold text-surface" onClick={() => { setHistory(history.filter((x) => x.id !== e.id)); setConfirmDel(null); }}>
                          Apagar
                        </button>
                        <button className="rounded px-2 py-1 text-xs text-muted" onClick={() => setConfirmDel(null)}>
                          Não
                        </button>
                      </>
                    ) : (
                      <button className="rounded px-2 py-1 text-xs text-muted hover:text-bad" onClick={() => setConfirmDel(e.id)}>
                        Excluir
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Cada corrida guarda o preço, o consumo e as reservas vigentes quando foi registrada. Mudar os Ajustes depois não altera o passado; use Editar → Salvar para
            recalcular uma corrida com os parâmetros atuais.
          </p>
        </Card>
      )}
    </div>
  );
}

function EntryForm({ s, draft, setDraft, onSave }: { s: Settings; draft: Draft; setDraft: (d: Draft | null) => void; onSave: () => void }) {
  const vs = garage(s);
  const ps = platforms(s);
  const i = draft.input;
  const set = <K extends keyof HistoryInput>(k: K) => (v: HistoryInput[K]) => setDraft({ ...draft, input: { ...i, [k]: v } });
  const local = toLocalInput(new Date(i.data));
  return (
    <Card className="border-accent/60">
      <SectionTitle>{draft.editingId ? 'Editar corrida' : 'Registrar corrida realizada'}</SectionTitle>
      <p className="-mt-2 mb-3 text-xs text-muted">Use os valores reais: o que caiu na conta, os km do hodômetro/app e o tempo que você realmente gastou.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
        className="flex flex-col gap-3"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <TextField
            id="h-data"
            label="Data e hora"
            type="datetime-local"
            value={local}
            onChange={(v) => {
              const d = new Date(v);
              if (!Number.isNaN(d.getTime())) set('data')(d.toISOString());
            }}
          />
          <NumField id="h-valor" label="Valor recebido" prefix="R$" value={i.valor} onChange={set('valor')} />
          <NumField id="h-km" label="Km reais (total)" suffix="km" value={i.km} onChange={set('km')} />
          <NumField id="h-min" label="Tempo real" suffix="min" value={i.minutos} onChange={set('minutos')} decimals={false} />
          <NumField id="h-desp" label="Pedágio/estac./outras" prefix="R$" value={i.despesas} onChange={set('despesas')} />
          <NumField id="h-tax" label="Taxas da plataforma" prefix="R$" value={i.taxas} onChange={set('taxas')} />
          <NumField id="h-bonus" label="Bônus / gorjeta" prefix="R$" value={i.bonus} onChange={set('bonus')} />
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-muted">Combustível</span>
            <Segmented<Fuel>
              label="Combustível usado"
              value={i.combustivel}
              onChange={set('combustivel')}
              options={[
                { value: 'gasolina', label: 'Gasolina' },
                { value: 'etanol', label: 'Etanol' },
              ]}
            />
          </div>
        </div>
        {(vs.length > 1 || ps.length > 1) && (
          <div className="grid grid-cols-2 gap-3">
            {vs.length > 1 && (
              <PickField label="Veículo" value={i.veiculo ?? ''} onChange={(v) => set('veiculo')(v || undefined)} options={vs.map((v) => [v.id, v.nome])} />
            )}
            {ps.length > 1 && (
              <PickField label="Plataforma" value={i.plataforma ?? ''} onChange={(v) => set('plataforma')(v || undefined)} options={ps.map((p) => [p.id, p.nome])} />
            )}
          </div>
        )}
        <TextField id="h-obs" label="Observação (opcional)" value={i.obs ?? ''} onChange={(v) => set('obs')(v)} />
        <div className="flex flex-wrap gap-2">
          <Btn kind="primary" type="submit">
            Salvar
          </Btn>
          <Btn onClick={() => setDraft(null)}>Cancelar</Btn>
        </div>
      </form>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="label-caps truncate text-muted">{label}</div>
      <div className={`tnum mt-0.5 truncate font-display text-2xl font-semibold ${tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : ''}`}>{value}</div>
    </div>
  );
}

function buildChart(kind: PeriodKind, ref: Date, list: HistoryEntry[]) {
  if (kind === 'dia') {
    const data = list
      .slice()
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((e) => ({ label: new Date(e.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), value: e.lucro }));
    return { data, caption: 'por corrida' };
  }
  const byKey = new Map<string, number>();
  if (kind === 'tudo') {
    for (const e of list) {
      const d = new Date(e.data);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byKey.set(k, (byKey.get(k) ?? 0) + e.lucro);
    }
    const keys = [...byKey.keys()].sort().slice(-12);
    return {
      data: keys.map((k) => {
        const [y, m] = k.split('-').map(Number);
        return { label: new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), value: byKey.get(k)!, title: k };
      }),
      caption: 'por mês',
    };
  }
  for (const e of list) {
    const k = dayKey(new Date(e.data));
    byKey.set(k, (byKey.get(k) ?? 0) + e.lucro);
  }
  const r = periodRange(kind, ref)!;
  const data: { label: string; value: number; title: string }[] = [];
  for (const d = new Date(r[0]); d < r[1]; d.setDate(d.getDate() + 1)) {
    const k = dayKey(d);
    data.push({
      label: kind === 'semana' ? d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') : String(d.getDate()),
      value: byKey.get(k) ?? 0,
      title: d.toLocaleDateString('pt-BR'),
    });
  }
  return { data, caption: 'por dia' };
}

function PickField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent">
        <option value="">Não informado</option>
        {options.map(([v, n]) => (
          <option key={v} value={v}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Comparação entre plataformas no período (Pro). Só aparece quando há corridas de mais de uma. */
function ByPlatform({ s, list }: { s: Settings; list: HistoryEntry[] }) {
  const grupos = useMemo(() => {
    const m = new Map<string, HistoryEntry[]>();
    for (const e of list) {
      const k = e.plataforma ?? '';
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()]
      .map(([id, es]) => ({ id, nome: platformName(s, id || undefined), sum: summarize(es) }))
      .sort((a, b) => b.sum.lucroHora - a.sum.lucroHora);
  }, [list, s]);
  if (grupos.length < 2) return null;
  const melhor = grupos[0];
  return (
    <ProGate title="Qual plataforma dá mais lucro" hint="Compare lucro por hora, por km e por corrida entre as plataformas.">
      <Card>
        <SectionTitle aside={<span className="text-xs text-muted">ordenado por lucro/hora</span>}>Lucro por plataforma</SectionTitle>
        <div className="overflow-x-auto">
          <table className="tnum w-full text-sm">
            <thead>
              <tr className="label-caps border-b border-line text-left text-muted">
                <th className="py-2 pr-2 font-semibold">Plataforma</th>
                <th className="py-2 pr-2 text-right font-semibold">Corridas</th>
                <th className="py-2 pr-2 text-right font-semibold">Lucro</th>
                <th className="py-2 pr-2 text-right font-semibold">Por hora</th>
                <th className="hidden py-2 text-right font-semibold sm:table-cell">Por km</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => (
                <tr key={g.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-2 font-medium">
                    {g.nome} {g === melhor && <span className="ml-1 text-xs text-good">melhor</span>}
                  </td>
                  <td className="py-2 pr-2 text-right">{g.sum.qtd}</td>
                  <td className={`py-2 pr-2 text-right ${g.sum.lucro >= 0 ? '' : 'text-bad'}`}>{brl(g.sum.lucro)}</td>
                  <td className="py-2 pr-2 text-right font-semibold">{brl(g.sum.lucroHora)}</td>
                  <td className="hidden py-2 text-right sm:table-cell">{brl(g.sum.km > 0 ? g.sum.lucro / g.sum.km : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </ProGate>
  );
}
