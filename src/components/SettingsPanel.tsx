import { useState } from 'react';
import { DEFAULT_SETTINGS } from '../defaults';
import { compareFuels, depreciationPerKm, fixedMonthlyForDeliveries, fixedMonthlyTotal, fixedPerHour, itemPerKm, maintenancePerKm, pendingEstimates } from '../lib/calc';
import { downloadText } from '../lib/csv';
import { normalize } from '../lib/storage';
import { activeVehicle, applyVehicleToFixed, buildVehicle, replaceVehicle } from '../lib/vehicles';
import { brl, brl4, num, pct } from '../lib/format';
import type { FixedItem, FuelChoice, HistoryEntry, MaintItem, Settings } from '../types';
import { GarageSection, PlatformsSection } from './Garage';
import { Btn, Card, EstBadge, NumField, Segmented } from './ui';

interface Props {
  s: Settings;
  setSettings: (s: Settings) => void;
  history: HistoryEntry[];
  setHistory: (h: HistoryEntry[]) => void;
  cloud?: boolean;
  onTutorial?: () => void;
}

const SECTIONS = [
  ['aj-veiculos', 'Veículos'],
  ['aj-plataforma', 'Plataformas'],
  ['aj-combustivel', 'Combustível'],
  ['aj-desgaste', 'Manutenção'],
  ['aj-fixos', 'Custos fixos'],
  ['aj-dados', 'Backup'],
] as const;

export function SettingsPanel({ s, setSettings, history, setHistory, cloud, onTutorial }: Props) {
  const pend = pendingEstimates(s);
  return (
    <div className="flex flex-col gap-5">
      {onTutorial && (
        <p className="-mb-2 text-sm text-muted">
          Ficou com dúvida?{' '}
          <button className="font-semibold text-accent" onClick={onTutorial}>
            Ver o tutorial de novo
          </button>
        </p>
      )}
      <nav aria-label="Seções dos ajustes" className="-mb-1 flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-sunk"
          >
            {label}
          </button>
        ))}
      </nav>

      {pend.length > 0 && (
        <div className="rounded-xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm">
          <strong className="text-warn">Ainda são valores de exemplo:</strong> {pend.join(', ')}. Ao editar um valor ele passa a valer como seu. Se o exemplo já estiver
          certo, toque em “confirmar” na etiqueta.
        </div>
      )}

      <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-2 xl:items-start">
        <GarageSection s={s} setSettings={setSettings} />
        <PlatformsSection s={s} setSettings={setSettings} />
        <FuelSection s={s} setSettings={setSettings} />
        <FixedSection s={s} setSettings={setSettings} />
        <WearSection s={s} setSettings={setSettings} />
        <Backup s={s} setSettings={setSettings} history={history} setHistory={setHistory} cloud={cloud} />
      </div>
    </div>
  );
}

type SP = { s: Settings; setSettings: (s: Settings) => void };

/* -------- Combustível: preços, consumo e comparação no mesmo lugar -------- */
function FuelSection({ s, setSettings }: SP) {
  const v = s.veiculo;
  const c = compareFuels(s);
  const setPreco = (k: 'precoGasolina' | 'precoEtanol') => (n: number) => setSettings({ ...s, veiculo: { ...v, [k]: n, precosEstimados: false } });
  const setKml = (k: 'kmlGasolina' | 'kmlEtanol') => (n: number) => setSettings({ ...s, veiculo: { ...v, [k]: n, consumoEstimado: false } });
  const okPreco = () => setSettings({ ...s, veiculo: { ...v, precosEstimados: false } });
  const okKml = () => setSettings({ ...s, veiculo: { ...v, consumoEstimado: false } });
  const max = Math.max(c.custoKmGasolina, c.custoKmEtanol) || 1;

  return (
    <Card>
      <h2 id="aj-combustivel" className="mb-3 scroll-mt-24 font-display text-xl font-semibold tracking-wide">
        Combustível
      </h2>
      {(v.precosEstimados || v.consumoEstimado) && (
        <div className="-mt-1 mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {v.precosEstimados && (
            <span className="flex items-center gap-1.5">
              Preços <EstBadge onConfirm={okPreco} />
            </span>
          )}
          {v.consumoEstimado && (
            <span className="flex items-center gap-1.5">
              Consumo <EstBadge onConfirm={okKml} />
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <NumField id="st-pg" label="Gasolina" prefix="R$" suffix="/L" value={v.precoGasolina} onChange={setPreco('precoGasolina')} />
        <NumField id="st-pe" label="Etanol" prefix="R$" suffix="/L" value={v.precoEtanol} onChange={setPreco('precoEtanol')} />
        <NumField id="st-kg" label="Consumo gasolina" suffix="km/L" value={v.kmlGasolina} onChange={setKml('kmlGasolina')} allowZero={false} />
        <NumField id="st-ke" label="Consumo etanol" suffix="km/L" value={v.kmlEtanol} onChange={setKml('kmlEtanol')} allowZero={false} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {v.precosEstimados && 'Preços de exemplo: média ANP na capital paulista, semana de 4 a 10/out/2026. '}
        {v.consumoEstimado && 'Consumo de exemplo: média urbana típica para o tipo do seu veículo, com etanol a 70% da gasolina. '}
        Para medir: tanque cheio, zere o hodômetro parcial, rode normalmente e no próximo tanque cheio divida os km pelos litros colocados.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-muted">Combustível padrão nas ofertas</span>
        <Segmented<FuelChoice>
          label="Combustível padrão"
          value={v.combustivelPadrao}
          onChange={(x) => setSettings({ ...s, veiculo: { ...v, combustivelPadrao: x } })}
          options={[
            { value: 'auto', label: 'Mais barato' },
            { value: 'gasolina', label: 'Gasolina' },
            { value: 'etanol', label: 'Etanol' },
          ]}
        />
      </div>

      {c.valido && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Gasolina × etanol</h3>
            <span className="text-sm">
              Compensa: <strong className="text-good">{c.maisBarato === 'etanol' ? 'Etanol' : 'Gasolina'}</strong>
            </span>
          </div>
          {(['gasolina', 'etanol'] as const).map((f) => {
            const val = f === 'gasolina' ? c.custoKmGasolina : c.custoKmEtanol;
            const win = c.maisBarato === f;
            return (
              <div key={f} className="mb-2">
                <div className="mb-0.5 flex justify-between text-sm">
                  <span>{f === 'gasolina' ? 'Gasolina' : 'Etanol'}</span>
                  <span className="tnum">{brl4(val)}/km</span>
                </div>
                <div className="h-2.5 rounded-full bg-sunk">
                  <div className={`h-2.5 rounded-full ${win ? 'bg-good' : 'bg-fixed'}`} style={{ width: `${(val / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
          <div className="tnum mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-sunk p-3">
              <div className="label-caps text-muted">Economia em 100 km</div>
              <div className="font-display text-2xl font-semibold">{brl(c.economia100km)}</div>
              <div className="text-xs text-muted">{brl(c.diferencaKm * 20)} numa corrida de 20 km</div>
            </div>
            <div className="rounded-lg bg-sunk p-3">
              <div className="label-caps text-muted">Etanol compensa até</div>
              <div className="font-display text-2xl font-semibold text-accent">{brl(c.precoMaxEtanol)}</div>
              <div className="text-xs text-muted">
                {brl(v.precoGasolina)} × {num(v.kmlEtanol)} ÷ {num(v.kmlGasolina)}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">
            No seu carro o etanol rende {pct(c.relacaoConsumo * 100)} da gasolina, e esse é o número usado. A regra genérica dos 70% daria {brl(v.precoGasolina * 0.7)}.
          </p>
        </div>
      )}
    </Card>
  );
}

/* -------- Manutenção + depreciação -------- */
function WearSection({ s, setSettings }: SP) {
  const setItem = (id: string, patch: Partial<MaintItem>) =>
    setSettings({ ...s, manutencao: s.manutencao.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const d = s.depreciacao;
  const setD = (patch: Partial<Settings['depreciacao']>) => setSettings({ ...s, depreciacao: { ...d, ...patch } });
  const total = maintenancePerKm(s) + depreciationPerKm(s);

  return (
    <Card className="xl:col-span-2">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="aj-desgaste" className="scroll-mt-24 font-display text-xl font-semibold tracking-wide">
          Manutenção e desgaste
        </h2>
        <span className="tnum text-sm">
          Total: <strong>{brl4(total)}/km</strong>
        </span>
      </div>
      <p className="mb-3 text-sm text-muted">
        Preço do serviço ÷ km até a próxima vez = quanto guardar por km. Valores de <strong>{s.veiculo.nome}</strong>.
        {s.manutencao.some((i) => i.categoria === 'blindagem') && ' O peso extra da blindagem já está nos pneus, freios e suspensão; o item da blindagem cobre só o que é dela.'}
      </p>
      <div className="flex flex-col divide-y divide-line">
        {s.manutencao.map((i) => (
          <div key={i.id} className="grid grid-cols-2 items-start gap-x-3 gap-y-2 py-2.5 md:grid-cols-[minmax(0,1fr)_130px_130px_100px_32px] md:items-center">
            <div className="col-span-2 flex min-w-0 flex-col gap-1 md:col-span-1">
              <input
                aria-label="Serviço"
                className="w-full min-w-0 rounded-md border border-transparent bg-transparent px-1 py-1 font-medium outline-none hover:border-line focus:border-accent"
                value={i.nome}
                onChange={(e) => setItem(i.id, { nome: e.target.value })}
              />
              {(i.estimado || i.obs) && (
                <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted">
                  {i.estimado && <EstBadge onConfirm={() => setItem(i.id, { estimado: false })} />}
                  {i.obs}
                </div>
              )}
            </div>
            <NumField id={`mi-p-${i.id}`} label="Preço" prefix="R$" value={i.preco} onChange={(preco) => setItem(i.id, { preco, estimado: false })} />
            <NumField id={`mi-k-${i.id}`} label="A cada" suffix="km" value={i.intervaloKm} onChange={(intervaloKm) => setItem(i.id, { intervaloKm, estimado: false })} allowZero={false} decimals={false} />
            <div className="tnum text-sm font-semibold md:pt-5 md:text-right">{brl4(itemPerKm({ ...i, ativo: true }))}<span className="font-normal text-muted">/km</span></div>
            <button
              aria-label={`Remover ${i.nome}`}
              className="justify-self-end text-muted hover:text-bad md:pt-5"
              onClick={() => setSettings({ ...s, manutencao: s.manutencao.filter((x) => x.id !== i.id) })}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <Btn
        className="mt-2"
        onClick={() =>
          setSettings({
            ...s,
            manutencao: [...s.manutencao, { id: `m${Date.now()}`, nome: 'Novo serviço', categoria: 'outro', preco: 0, intervaloKm: 10000, ativo: true, estimado: false }],
          })
        }
      >
        + Adicionar serviço
      </Btn>

      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold">
            Depreciação {d.ativo && d.estimado && <EstBadge onConfirm={() => setD({ estimado: false })} />}
          </h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.ativo} onChange={(e) => setD({ ativo: e.target.checked })} />
            Incluir · <span className="tnum font-semibold">{brl4(depreciationPerKm(s))}/km</span>
          </label>
        </div>
        {d.ativo && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <NumField id="dp-a" label="Vale hoje" prefix="R$" value={d.valorAtual} onChange={(n) => setD({ valorAtual: n, estimado: false })} />
              <NumField id="dp-f" label="Vai valer" prefix="R$" value={d.valorFuturo} onChange={(n) => setD({ valorFuturo: n, estimado: false })} />
              <NumField id="dp-k" label="Depois de" suffix="km" value={d.kmPeriodo} onChange={(n) => setD({ kmPeriodo: n, estimado: false })} allowZero={false} decimals={false} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {activeVehicle(s)?.valorFipe
                ? `FIPE ${activeVehicle(s)?.fipeMes ?? ''}: ${brl(activeVehicle(s)!.valorFipe!)}. `
                : 'Use o valor da tabela FIPE ou de anúncios parecidos com o seu. '}
              Veículo muito rodado vale menos que a FIPE. O valor só “sai” quando você vender ou trocar o veículo.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

/* -------- Fixos -------- */
function FixedSection({ s, setSettings }: SP) {
  const setFixed = (id: string, patch: Partial<FixedItem>) =>
    setSettings({ ...s, fixos: { ...s.fixos, itens: s.fixos.itens.map((i) => (i.id === id ? { ...i, ...patch } : i)) } });
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="aj-fixos" className="scroll-mt-24 font-display text-xl font-semibold tracking-wide">
          Custos fixos
        </h2>
        <span className="tnum text-sm">
          <strong>{brl(fixedPerHour(s))}</strong>/h de trabalho
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {s.fixos.itens.map((f) => (
          <div key={f.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,140px)_24px] items-center gap-2">
            <div className="min-w-0">
              <input
                aria-label="Nome do custo"
                className="w-full min-w-0 rounded-md border border-transparent bg-transparent px-1 py-1 outline-none hover:border-line focus:border-accent"
                value={f.nome}
                onChange={(e) => setFixed(f.id, { nome: e.target.value })}
              />
              {f.estimado && (
                <div className="px-1">
                  <EstBadge onConfirm={() => setFixed(f.id, { estimado: false })} />
                </div>
              )}
            </div>
            <NumField id={`fx-v-${f.id}`} label="Por mês" prefix="R$" value={f.valorMensal} onChange={(valorMensal) => setFixed(f.id, { valorMensal, estimado: false })} />
            <button
              aria-label={`Remover ${f.nome}`}
              className="pt-5 text-muted hover:text-bad"
              onClick={() => setSettings({ ...s, fixos: { ...s.fixos, itens: s.fixos.itens.filter((x) => x.id !== f.id) } })}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <Btn
        className="mt-3"
        onClick={() => setSettings({ ...s, fixos: { ...s.fixos, itens: [...s.fixos.itens, { id: `f${Date.now()}`, nome: 'Novo custo', valorMensal: 0, estimado: false }] } })}
      >
        + Adicionar custo
      </Btn>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
        <NumField
          id="fx-pct"
          label="Parte do trabalho"
          suffix="%"
          max={100}
          value={s.fixos.percentualEntregas}
          onChange={(n) => setSettings({ ...s, fixos: { ...s.fixos, percentualEntregas: n } })}
          hint="O resto é seu uso pessoal."
        />
        <NumField
          id="fx-h"
          label="Horas de trabalho/mês"
          suffix="h"
          value={s.fixos.horasEntregaMes}
          onChange={(n) => setSettings({ ...s, fixos: { ...s.fixos, horasEntregaMes: n } })}
          allowZero={false}
        />
      </div>
      <p className="tnum mt-2 text-xs text-muted">
        {brl(fixedMonthlyTotal(s))}/mês × {num(s.fixos.percentualEntregas)}% = {brl(fixedMonthlyForDeliveries(s))} ÷ {num(s.fixos.horasEntregaMes)} h ={' '}
        {brl(fixedPerHour(s))}/h
      </p>
    </Card>
  );
}

/* -------- Backup -------- */
function Backup({ s, setSettings, history, setHistory, cloud }: Props) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function exportJson() {
    const json = JSON.stringify({ app: 'vale-a-corrida', versao: 1, settings: s, history }, null, 2);
    downloadText('vale-a-corrida-backup.json', json, 'application/json');
    setText(json);
    setMsg('Backup gerado. Se o download não começar, copie o texto da caixa e guarde em um arquivo.');
  }
  function importJson(raw: string) {
    try {
      const p = JSON.parse(raw);
      if (!p || typeof p !== 'object' || !p.settings) throw new Error();
      const n = normalize(p);
      setSettings(n.settings);
      if (Array.isArray(p.history)) setHistory(n.history);
      setMsg('Backup restaurado.');
    } catch {
      setMsg('Não consegui ler esse backup. Cole o conteúdo completo gerado pelo app.');
    }
  }

  return (
    <Card className="xl:col-span-2">
      <h2 id="aj-dados" className="mb-1 scroll-mt-24 font-display text-xl font-semibold tracking-wide">
        Backup
      </h2>
      <p className="mb-3 text-sm text-muted">
        {cloud
          ? 'Seus dados ficam salvos na sua conta. O backup é uma cópia extra em arquivo, que você guarda onde quiser.'
          : 'Sem conta, tudo fica salvo só neste navegador. Gere um backup antes de trocar de celular ou limpar os dados do navegador, ou crie uma conta.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={exportJson}>Gerar backup</Btn>
        <label className="cursor-pointer rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold hover:bg-sunk">
          Abrir arquivo
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => importJson(String(r.result));
              r.readAsText(f);
              e.target.value = '';
            }}
          />
        </label>
        <Btn onClick={() => importJson(text)} disabled={!text.trim()}>
          Restaurar do texto
        </Btn>
        {confirmReset ? (
          <>
            <Btn
              kind="danger"
              onClick={() => {
                setSettings(resetToExamples(s));
                setConfirmReset(false);
                setMsg('Os custos do veículo em uso, os fixos e as metas voltaram aos valores de exemplo. Veículos, plataformas e histórico foram mantidos.');
              }}
            >
              Sim, voltar aos exemplos
            </Btn>
            <Btn onClick={() => setConfirmReset(false)}>Cancelar</Btn>
          </>
        ) : (
          <Btn kind="danger" onClick={() => setConfirmReset(true)}>
            Voltar aos valores de exemplo
          </Btn>
        )}
      </div>
      {msg && (
        <p className="mt-3 text-sm" role="status">
          {msg}
        </p>
      )}
      <textarea
        id="backup-text"
        aria-label="Texto do backup"
        placeholder="O backup aparece aqui. Para restaurar, cole um backup e toque em Restaurar do texto."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-3 h-24 w-full rounded-md border border-line bg-sunk p-2 font-mono text-xs"
      />
    </Card>
  );
}

/** Volta os custos do veículo em uso, os fixos e as metas aos exemplos, sem mexer na garagem nem nas plataformas. */
function resetToExamples(s: Settings): Settings {
  const base: Settings = {
    ...DEFAULT_SETTINGS,
    veiculo: { ...DEFAULT_SETTINGS.veiculo, nome: s.veiculo.nome },
    veiculos: s.veiculos,
    veiculoAtivo: s.veiculoAtivo,
    plataformas: s.plataformas,
    plataformaAtiva: s.plataformaAtiva,
    plataforma: s.plataforma,
  };
  const v = activeVehicle(s);
  if (!v) return base;
  const fresh = buildVehicle({ ...v, id: v.id, valorFipe: v.valorFipe });
  return applyVehicleToFixed(replaceVehicle(base, fresh), fresh);
}
