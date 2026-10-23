import { useState } from 'react';
import { brl } from '../lib/format';
import { usePlan } from '../lib/plan';
import { activatePlatform, addPlatform, buildPlatform, PLATFORM_CATALOG } from '../lib/platforms';
import { addVehicle, applyVehicleToFixed, buildVehicle } from '../lib/vehicles';
import type { PlatformKind, Settings, VehicleProfile } from '../types';
import { Btn, Card, NumField, Segmented, TextField } from './ui';
import { VehicleForm } from './VehicleForm';

const PASSOS = ['Plataformas', 'Veículo', 'Metas'] as const;

/** Primeiro uso: plataformas → veículo → metas. Em uns 2 minutos o app já calcula com os dados da pessoa. */
export function Onboarding({ s, setSettings }: { s: Settings; setSettings: (s: Settings) => void }) {
  const { plan } = usePlan();
  const [passo, setPasso] = useState(0);
  const [plats, setPlats] = useState<string[]>([]);
  const [outraNome, setOutraNome] = useState('');
  const [outraTipo, setOutraTipo] = useState<PlatformKind>('entregas');
  const [veiculo, setVeiculo] = useState<VehicleProfile | null>(null);
  const [metaDia, setMetaDia] = useState(s.metas.dia);
  const [horas, setHoras] = useState(s.metas.horasPorDia);
  const [dias, setDias] = useState(s.metas.diasPorSemana);
  const [metaHora, setMetaHora] = useState(s.criterios.metaHora);
  const [gasolina, setGasolina] = useState(s.veiculo.precoGasolina);
  const [etanol, setEtanol] = useState(s.veiculo.precoEtanol);

  const limite = plan.pro ? 20 : 1;

  function toggle(id: string) {
    setPlats((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : limite === 1 ? [id] : [...cur, id].slice(0, limite)));
  }

  function concluir(v: VehicleProfile) {
    let n: Settings = {
      ...s,
      veiculo: {
        ...s.veiculo,
        precoGasolina: gasolina,
        precoEtanol: etanol,
        precosEstimados: gasolina === s.veiculo.precoGasolina && etanol === s.veiculo.precoEtanol && s.veiculo.precosEstimados,
      },
      criterios: { ...s.criterios, metaHora },
      metas: {
        ...s.metas,
        dia: metaDia,
        horasPorDia: horas,
        diasPorSemana: dias,
        diasPorMes: Math.round(dias * 4.4),
        semana: Math.round(metaDia * dias),
        mes: Math.round(metaDia * dias * 4.4),
      },
      fixos: { ...s.fixos, horasEntregaMes: Math.round(horas * dias * 4.4) },
    };
    n = applyVehicleToFixed(addVehicle(n, v), v);
    const escolhidas = plats.length ? plats : ['outra'];
    for (const id of escolhidas) n = addPlatform(n, id === 'outra' ? buildPlatform('outra', outraNome || 'Minha plataforma', outraTipo) : buildPlatform(id));
    n = activatePlatform(n, n.plataformas[0].id);
    setSettings(n);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <h1 className="font-display text-3xl font-bold tracking-wide">
          Bem-vindo ao Vale a <span className="text-accent">Corrida?</span>
        </h1>
        <p className="text-sm text-muted">Três passos rápidos para o app calcular o lucro real das suas corridas. Dá para mudar tudo depois em Ajustes.</p>
        <ol className="mt-3 flex gap-2">
          {PASSOS.map((p, i) => (
            <li key={p} className={`flex-1 rounded-full py-1 text-center text-xs font-semibold ${i === passo ? 'bg-accent text-accent-ink' : i < passo ? 'bg-good-soft text-good' : 'bg-sunk text-muted'}`}>
              {i + 1}. {p}
            </li>
          ))}
        </ol>
      </div>

      {passo === 0 && (
        <Card>
          <h2 className="font-display text-xl font-semibold tracking-wide">Onde você trabalha?</h2>
          <p className="mb-3 text-sm text-muted">{limite === 1 ? 'Escolha a principal. No Pro dá para usar várias e comparar.' : 'Marque todas em que você roda.'}</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_CATALOG.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={plats.includes(c.id)}
                onClick={() => toggle(c.id)}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium ${plats.includes(c.id) ? 'border-accent bg-accent text-accent-ink' : 'border-line hover:bg-sunk'}`}
              >
                {c.nome}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={plats.includes('outra')}
              onClick={() => toggle('outra')}
              className={`rounded-full border px-3.5 py-2 text-sm font-medium ${plats.includes('outra') ? 'border-accent bg-accent text-accent-ink' : 'border-line hover:bg-sunk'}`}
            >
              Outra
            </button>
          </div>
          {plats.includes('outra') && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <TextField label="Nome da plataforma" value={outraNome} onChange={setOutraNome} />
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-muted">Tipo</span>
                <Segmented<PlatformKind>
                  label="Tipo"
                  value={outraTipo}
                  onChange={setOutraTipo}
                  options={[
                    { value: 'entregas', label: 'Entregas' },
                    { value: 'passageiros', label: 'Passageiros' },
                  ]}
                />
              </div>
            </div>
          )}
          <div className="mt-4">
            <Btn kind="primary" disabled={plats.length === 0 || (plats.includes('outra') && !outraNome.trim())} onClick={() => setPasso(1)}>
              Continuar
            </Btn>
          </div>
        </Card>
      )}

      {passo === 1 && (
        <Card>
          <h2 className="font-display text-xl font-semibold tracking-wide">Qual é o seu veículo?</h2>
          <p className="mb-3 text-sm text-muted">Com marca, modelo e ano, o app já preenche valor, consumo e manutenção típicos.</p>
          <VehicleForm
            saveLabel="Continuar"
            cancelLabel="Voltar"
            onSave={(v) => {
              setVeiculo(v);
              setPasso(2);
            }}
            onCancel={() => setPasso(0)}
          />
          <button
            className="mt-3 text-sm font-semibold text-muted hover:text-ink"
            onClick={() => {
              setVeiculo(buildVehicle({ nome: 'Meu carro', tipo: 'popular', automatico: false, blindado: false }));
              setPasso(2);
            }}
          >
            Pular: usar um carro popular de exemplo
          </button>
        </Card>
      )}

      {passo === 2 && veiculo && (
        <Card>
          <h2 className="font-display text-xl font-semibold tracking-wide">Suas metas</h2>
          <p className="mb-3 text-sm text-muted">Usadas no semáforo: verde quando a corrida paga pelo menos o seu lucro mínimo por hora.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumField label="Lucro por dia" prefix="R$" value={metaDia} onChange={setMetaDia} />
            <NumField label="Horas por dia" value={horas} onChange={setHoras} max={24} allowZero={false} />
            <NumField label="Dias por semana" value={dias} onChange={setDias} max={7} decimals={false} allowZero={false} />
            <NumField label="Mínimo por hora" prefix="R$" value={metaHora} onChange={setMetaHora} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {horas > 0 && `${brl(metaDia)} em ${horas} h dá ${brl(metaDia / horas)}/h. `}A meta semanal fica em {brl(metaDia * dias)}.
          </p>
          <h3 className="mb-2 mt-4 font-semibold">Preço do combustível onde você abastece</h3>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Gasolina" prefix="R$" suffix="/L" value={gasolina} onChange={setGasolina} allowZero={false} />
            <NumField label="Etanol" prefix="R$" suffix="/L" value={etanol} onChange={setEtanol} allowZero={false} />
          </div>
          <p className="mt-1 text-xs text-muted">Já vem com a média da ANP em São Paulo. Troque pelo preço do seu posto.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn kind="primary" onClick={() => concluir(veiculo)}>
              Começar a usar
            </Btn>
            <Btn onClick={() => setPasso(1)}>Voltar</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
