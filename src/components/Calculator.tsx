import { useEffect, useMemo, useRef, useState } from 'react';
import { analyze, compareFuels, fuelParams, pendingEstimates, resolveFuel, validateOffer, type Analysis } from '../lib/calc';
import { brl, brl4, num, pct } from '../lib/format';
import type { FuelChoice, Offer, Settings } from '../types';
import { EMPTY_OFFER, EXAMPLE_OFFER } from '../defaults';
import { Btn, Card, Details, NumField, Segmented } from './ui';
import { VERDICT } from './Verdict';
import { AdSlot } from './AdSlot';
import { usePlan } from '../lib/plan';
import { activatePlatform, activePlatform, offerLabels, platforms } from '../lib/platforms';
import { activateVehicle, garage } from '../lib/vehicles';

interface Props {
  offer: Offer;
  setOffer: (o: Offer) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  onRegister: (a: Analysis) => void;
  onOpenSettings: (secao?: string) => void;
  today: { qtd: number; lucro: number };
  onQuick?: () => void;
}

export function Calculator({ offer, setOffer, settings: s, setSettings, onRegister, onOpenSettings, today, onQuick }: Props) {
  const L = offerLabels(activePlatform(s));
  const errors = useMemo(() => validateOffer(offer, s), [offer, s]);
  const a = useMemo(() => (errors.length ? null : analyze(offer, s)), [offer, s, errors]);
  const set = <K extends keyof Offer>(k: K) => (v: Offer[K]) => setOffer({ ...offer, [k]: v });
  const cmp = compareFuels(s);
  const fuel = resolveFuel(offer.combustivel, s);
  const fp = fuelParams(fuel, s);
  const extras = offer.pedagio + offer.estacionamento + offer.outrasDespesas + offer.taxaExtra + offer.bonus;

  // Barra fixa no celular: aparece só quando o painel de resultado está fora da tela
  const heroRef = useRef<HTMLElement | null>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const hasResult = a !== null;
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [hasResult]);

  return (
    <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start">
      {/* ------------------------- ENTRADA ------------------------- */}
      <div className="flex flex-col gap-3 lg:sticky lg:top-[76px]">
        <TodayStrip today={today} metaDia={s.metas.dia} />
        <WorkBar s={s} setSettings={setSettings} onOpenSettings={onOpenSettings} />
        {onQuick && (
          <button
            data-tour="rapida"
            onClick={onQuick}
            className="flex items-center justify-between gap-3 rounded-xl bg-accent px-4 py-3 text-left text-accent-ink shadow-sm hover:opacity-95"
          >
            <span>
              <span className="block font-display text-xl font-bold tracking-wide">⚡ Oferta rápida</span>
              <span className="block text-xs opacity-90">Teclado grande, 3 campos, resultado enquanto digita</span>
            </span>
            <span aria-hidden className="text-2xl">›</span>
          </button>
        )}
        <Card>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-semibold tracking-wide">Nova oferta</h2>
            <div className="flex gap-3">
              <button className="text-xs font-semibold text-accent" onClick={() => setOffer({ ...EXAMPLE_OFFER, combustivel: offer.combustivel })}>
                Exemplo
              </button>
              <button className="text-xs font-semibold text-muted" onClick={() => setOffer({ ...EMPTY_OFFER, combustivel: offer.combustivel })}>
                Limpar
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <NumField id="of-valor" big label={L.valor} prefix="R$" value={offer.valor} onChange={set('valor')} />
            <div className="grid grid-cols-3 gap-2">
              <NumField id="of-km1" label={L.km1} suffix="km" value={offer.kmAteColeta} onChange={set('kmAteColeta')} />
              <NumField id="of-km2" label={L.km2} suffix="km" value={offer.kmEntrega} onChange={set('kmEntrega')} />
              <NumField id="of-km3" label={L.km3} suffix="km" value={offer.kmRetorno} onChange={set('kmRetorno')} />
            </div>
            <NumField
              id="of-min"
              label="Tempo total"
              suffix="min"
              value={offer.minutos}
              onChange={set('minutos')}
              decimals={false}
              hint="Do aceite até ficar livre, com espera na coleta e retorno."
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-muted">Combustível</span>
                <Segmented<FuelChoice>
                  label="Combustível"
                  value={offer.combustivel}
                  onChange={set('combustivel')}
                  options={[
                    { value: 'auto', label: 'Mais barato' },
                    { value: 'gasolina', label: 'Gasolina' },
                    { value: 'etanol', label: 'Etanol' },
                  ]}
                />
              </div>
              <p className="tnum text-xs text-muted">
                {fuel === 'etanol' ? 'Etanol' : 'Gasolina'} a {brl(fp.preco)}/L · {num(fp.kml, 1)} km/L
                {offer.combustivel === 'auto' && cmp.valido ? ' (o mais barato hoje)' : ''} ·{' '}
                <button className="font-semibold text-accent" onClick={() => onOpenSettings()}>
                  alterar preços
                </button>
              </p>
            </div>
          </div>
        </Card>

        <Details summary={<span>Pedágio, estacionamento, taxas e bônus{extras > 0 ? ` (${brl(extras)})` : ''}</span>}>
          <div className="grid grid-cols-2 gap-3">
            <NumField id="of-ped" label="Pedágio" prefix="R$" value={offer.pedagio} onChange={set('pedagio')} />
            <NumField id="of-est" label="Estacionamento" prefix="R$" value={offer.estacionamento} onChange={set('estacionamento')} />
            <NumField id="of-out" label="Outras despesas" prefix="R$" value={offer.outrasDespesas} onChange={set('outrasDespesas')} />
            <NumField id="of-tx" label="Taxa desta corrida" prefix="R$" value={offer.taxaExtra} onChange={set('taxaExtra')} />
            <NumField id="of-bonus" label="Bônus / gorjeta" prefix="R$" value={offer.bonus} onChange={set('bonus')} />
          </div>
        </Details>
      </div>

      {/* ------------------------- RESULTADO ------------------------- */}
      <div className="flex min-w-0 flex-col gap-4">
        {!a ? (
          <Card className="border-dashed">
            <h2 className="font-display text-xl font-semibold">Preencha a oferta para ver o resultado</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Card>
        ) : (
          <>
            <Hero a={a} s={s} heroRef={heroRef} onRegister={() => onRegister(a)} />
            <Statement a={a} s={s} offer={offer} onOpenSettings={onOpenSettings} />
          </>
        )}
        <AdSlot slot={1} />
      </div>

      {a && !heroVisible && (
        <button
          onClick={() => heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className={`gutter fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom,0px))] z-20 flex items-center justify-between border-t-2 py-2 text-left sm:hidden ${VERDICT[a.veredito].box}`}
        >
          <span className={`font-display text-lg font-bold uppercase ${VERDICT[a.veredito].text}`}>
            {VERDICT[a.veredito].icon} {VERDICT[a.veredito].short}
          </span>
          <span className="tnum text-sm">
            sobra <strong>{brl(a.lucroDecisao)}</strong> · {brl(a.lucroHora)}/h
          </span>
        </button>
      )}
    </div>
  );
}

function TodayStrip({ today, metaDia }: { today: { qtd: number; lucro: number }; metaDia: number }) {
  const prog = metaDia > 0 ? Math.max(0, Math.min(1, today.lucro / metaDia)) : 0;
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-2.5">
      <div className="tnum flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted">
          Hoje: {today.qtd} {today.qtd === 1 ? 'corrida' : 'corridas'}
        </span>
        <span>
          <strong className={today.lucro < 0 ? 'text-bad' : ''}>{brl(today.lucro)}</strong>
          <span className="text-muted"> de {brl(metaDia)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-sunk">
        <div className="h-1.5 rounded-full bg-good" style={{ width: `${prog * 100}%` }} />
      </div>
    </div>
  );
}

/* Painel único da decisão: semáforo + os 4 números + o mínimo aceitável */
function Hero({ a, s, heroRef, onRegister }: { a: Analysis; s: Settings; heroRef: React.MutableRefObject<HTMLElement | null>; onRegister: () => void }) {
  const v = VERDICT[a.veredito];
  const custo = a.receita - a.lucroDecisao;
  return (
    <section ref={heroRef} data-tour="resultado" className={`scroll-mt-20 overflow-hidden rounded-xl border-2 ${v.box}`} aria-live="polite">
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none" aria-hidden>
            {v.icon}
          </span>
          <div className="min-w-0">
            <h2 className={`font-display text-3xl font-bold uppercase leading-none tracking-wide ${v.text}`}>{v.title}</h2>
            <p className="mt-1 text-sm font-medium">{v.action}</p>
          </div>
        </div>
        <ul className="mt-3 flex flex-col gap-0.5 text-sm">
          {a.motivos.map((m) => (
            <li key={m}>· {m}</li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-px border-y border-line/60 bg-line/60 sm:grid-cols-4">
        <Num label="Recebe" value={brl(a.receita)} />
        <Num label="Gasta" value={brl(custo)} />
        <Num label="Sobra" value={brl(a.lucroDecisao)} tone={a.lucroDecisao > 0 ? 'text-good' : 'text-bad'} />
        <Num label="Por hora" value={brl(a.lucroHora)} tone={a.lucroHora >= s.criterios.metaHora ? 'text-good' : a.lucroHora > 0 ? 'text-warn' : 'text-bad'} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface/60 px-4 py-3 sm:px-5">
        <div className="tnum text-sm">
          {a.veredito === 'vale' ? (
            <span className="text-muted">Abaixo de {brl(a.minimoSemPrejuizo)} daria prejuízo.</span>
          ) : (
            <span>
              Sem prejuízo a partir de <strong>{brl(a.minimoSemPrejuizo)}</strong>
              {a.minimoVale !== null && (
                <>
                  {' '}
                  · fica 🟢 a partir de <strong>{brl(a.minimoVale)}</strong>
                </>
              )}
            </span>
          )}
        </div>
        <Btn kind="primary" onClick={onRegister} tour="registrar">
          Aceitei: registrar
        </Btn>
      </div>
    </section>
  );
}

function Num({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 bg-surface px-4 py-3">
      <div className="label-caps text-muted">{label}</div>
      <div className={`tnum font-display text-[26px] font-semibold leading-tight ${tone}`}>{value}</div>
    </div>
  );
}

/* Extrato da corrida: cada linha traz a própria fórmula. */
function Statement({ a, s, offer, onOpenSettings }: { a: Analysis; s: Settings; offer: Offer; onOpenSettings: (secao?: string) => void }) {
  const incluiFixo = s.criterios.incluirFixosNaDecisao;
  const pend = pendingEstimates(s);
  const p = s.plataforma.taxaPercentual;
  const fuelName = a.combustivel === 'etanol' ? 'Etanol' : 'Gasolina';
  const taxaPartes = [
    p > 0 ? `${num(p)}% de ${brl(offer.valor)}` : '',
    s.plataforma.taxaFixa > 0 ? `${brl(s.plataforma.taxaFixa)} fixa` : '',
    offer.taxaExtra > 0 ? `${brl(offer.taxaExtra)} desta corrida` : '',
  ]
    .filter(Boolean)
    .join(' + ');

  const lines: { key: string; color: string; label: string; how: string; value: number; reserve?: boolean }[] = [
    { key: 'f', color: 'bg-fuel', label: fuelName, how: `${num(a.km, 1)} km ÷ ${num(a.kml, 1)} km/L = ${num(a.litros, 2)} L × ${brl(a.precoLitro)}`, value: a.custoCombustivel },
    { key: 'm', color: 'bg-wear', label: 'Manutenção', how: `${num(a.km, 1)} km × ${brl4(a.manutKm)}/km`, value: a.custoManutencao, reserve: true },
  ];
  if (a.custoDepreciacao > 0) lines.push({ key: 'd', color: 'bg-wear', label: 'Depreciação', how: `${num(a.km, 1)} km × ${brl4(a.deprKm)}/km`, value: a.custoDepreciacao, reserve: true });
  if (a.despesas > 0) lines.push({ key: 'x', color: 'bg-warn', label: 'Pedágio e despesas', how: 'informado na oferta', value: a.despesas });
  if (a.taxas > 0) lines.push({ key: 't', color: 'bg-warn', label: 'Taxas da plataforma', how: taxaPartes, value: a.taxas });

  const segs = [...lines.map((l) => ({ key: l.key, color: l.color, value: l.value }))];
  if (incluiFixo && a.custoFixo > 0) segs.push({ key: 'fx', color: 'bg-fixed', value: a.custoFixo });
  if (a.lucroDecisao > 0) segs.push({ key: 'l', color: 'bg-good', value: a.lucroDecisao });
  const total = segs.reduce((x, y) => x + y.value, 0) || 1;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold tracking-wide">A conta da corrida</h2>
        <span className="tnum text-xs text-muted">
          {num(offer.kmAteColeta, 1)} + {num(offer.kmEntrega, 1)} + {num(offer.kmRetorno, 1)} = {num(a.km, 1)} km · {Math.round(a.horas * 60)} min
        </span>
      </div>

      <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-sunk" role="img" aria-label="Divisão do valor da corrida">
        {segs.map((l) => (
          <div key={l.key} className={`${l.color} h-full`} style={{ width: `${(l.value / total) * 100}%` }} />
        ))}
      </div>

      <StatementRow label={offer.bonus > 0 ? 'Valor + bônus' : 'Valor da corrida'} value={brl(a.receita)} strong />
      {lines.map((l) => (
        <StatementRow key={l.key} dot={l.color} label={l.label} tag={l.reserve ? 'reserva' : undefined} how={l.how} value={`− ${brl(l.value)}`} />
      ))}
      <StatementRow label="Lucro operacional" sub="depois dos custos variáveis" value={brl(a.lucroOperacional)} strong total tone={a.lucroOperacional >= 0 ? 'text-good' : 'text-bad'} />
      <StatementRow
        dot="bg-fixed"
        label="Custos fixos rateados"
        how={`${brl(a.fixoHora)}/h × ${num(a.horas, 2)} h${incluiFixo ? '' : ' · não entra na decisão'}`}
        value={`− ${brl(a.custoFixo)}`}
        muted={!incluiFixo}
      />
      <StatementRow label="Resultado final" value={brl(a.lucroFinal)} strong total tone={a.lucroFinal >= 0 ? 'text-good' : 'text-bad'} />

      <div className="tnum mt-3 grid gap-2 rounded-lg bg-sunk p-3 text-xs sm:grid-cols-2">
        <div>
          <div className="font-semibold">Sai do bolso hoje: {brl(a.gastoNaHora)}</div>
          <div className="text-muted">combustível, pedágio e taxas</div>
        </div>
        <div>
          <div className="font-semibold">Guardar para o carro: {brl(a.custoDesgaste)}</div>
          <div className="text-muted">manutenção e depreciação, pagas no futuro</div>
        </div>
      </div>

      {pend.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          <span className="font-semibold text-warn">Ainda são estimativas:</span> {pend.join(', ')}.{' '}
          <button className="font-semibold text-accent" onClick={() => onOpenSettings()}>
            Revisar em Ajustes
          </button>
        </p>
      )}

      <div className="mt-3">
        <Details summary="Como os valores mínimos são calculados">
          <MinFormulas a={a} s={s} offer={offer} />
        </Details>
      </div>
    </Card>
  );
}

function StatementRow(props: {
  label: string;
  value: string;
  how?: string;
  sub?: string;
  dot?: string;
  tag?: string;
  strong?: boolean;
  total?: boolean;
  tone?: string;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${props.total ? 'mt-1 border-t border-line pt-2' : ''} ${props.muted ? 'opacity-60' : ''}`}>
      <div className="flex min-w-0 items-baseline gap-2">
        {props.dot ? <span className={`h-2.5 w-2.5 shrink-0 translate-y-px rounded-sm ${props.dot}`} /> : <span className="w-2.5 shrink-0" />}
        <div className="min-w-0">
          <div className={`text-sm ${props.strong ? 'font-semibold' : ''}`}>
            {props.label}
            {props.tag && <span className="ml-1.5 text-[11px] font-normal text-muted">({props.tag})</span>}
          </div>
          {(props.how || props.sub) && <div className="tnum text-xs text-muted">{props.how ?? props.sub}</div>}
        </div>
      </div>
      <div className={`tnum shrink-0 text-right text-sm ${props.strong ? 'font-semibold' : ''} ${props.tone ?? ''}`}>{props.value}</div>
    </div>
  );
}

function MinFormulas({ a, s, offer }: { a: Analysis; s: Settings; offer: Offer }) {
  const p = s.plataforma.taxaPercentual;
  const C = a.receita - a.lucroDecisao - offer.valor * (p / 100);
  const den = 1 - p / 100;
  const m = s.criterios.margemMinima;
  const rows: [string, string, string][] = [
    ['Sem prejuízo', `(${brl(C)} − ${brl(offer.bonus)}) ÷ ${num(den, 4)}`, brl(a.minimoSemPrejuizo)],
    [`Meta de ${brl(s.criterios.metaHora)}/h`, `(${brl(C)} + ${brl(s.criterios.metaHora)} × ${num(a.horas, 3)} h − ${brl(offer.bonus)}) ÷ ${num(den, 4)}`, brl(a.minimoMetaHora)],
    [`Margem de ${pct(m, 0)}`, `(${brl(C)} − ${brl(offer.bonus)} × ${num(1 - m / 100, 2)}) ÷ ${num(den - m / 100, 4)}`, a.minimoMargem === null ? 'impossível' : brl(a.minimoMargem)],
  ];
  return (
    <div className="flex flex-col gap-2">
      {rows.map(([n, e, r]) => (
        <div key={n}>
          <div className="text-xs font-semibold text-muted">{n}</div>
          <div className="tnum break-words font-mono text-[12px]">
            {e} = <span className="font-semibold text-accent">{r}</span>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted">
        {brl(C)} = custos que não dependem do valor da corrida{s.criterios.incluirFixosNaDecisao ? ' (incluindo os fixos rateados)' : ''}. Dividir por (1 − taxa %)
        compensa a taxa percentual, que cresce junto com o valor. Para ficar 🟢 vale o maior entre a meta por hora e a margem.
      </p>
    </div>
  );
}

/** Veículo e plataforma em uso, com troca rápida para quem tem mais de um. */
function WorkBar({ s, setSettings, onOpenSettings }: { s: Settings; setSettings: (s: Settings) => void; onOpenSettings: (secao?: string) => void }) {
  const { plan } = usePlan();
  const vs = garage(s);
  const ps = platforms(s);
  const pick = 'min-w-0 flex-1 truncate rounded-md border border-line bg-surface px-2 py-1.5 text-sm font-medium outline-none focus:border-accent';
  return (
    <div data-tour="workbar" className="flex items-center gap-2">
      {plan.pro && vs.length > 1 ? (
        <select aria-label="Veículo em uso" className={pick} value={s.veiculoAtivo ?? ''} onChange={(e) => setSettings(activateVehicle(s, e.target.value))}>
          {vs.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nome}
            </option>
          ))}
        </select>
      ) : (
        <button onClick={() => onOpenSettings('aj-veiculos')} className={`${pick} text-left`} title="Veículo em uso">
          {s.veiculo.nome}
        </button>
      )}
      {plan.pro && ps.length > 1 ? (
        <select aria-label="Plataforma em uso" className={pick} value={s.plataformaAtiva ?? ''} onChange={(e) => setSettings(activatePlatform(s, e.target.value))}>
          {ps.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      ) : (
        <button onClick={() => onOpenSettings('aj-plataforma')} className={`${pick} text-left`} title="Plataforma em uso">
          {activePlatform(s)?.nome ?? 'Plataforma'}
        </button>
      )}
    </div>
  );
}
