import { useState } from 'react';
import { brl } from '../lib/format';
import { usePlan } from '../lib/plan';
import { activatePlatform, addPlatform, buildPlatform, catalogEntry, PLATFORM_CATALOG, platforms, removePlatform, updatePlatform } from '../lib/platforms';
import { activateVehicle, addVehicle, garage, removeVehicle, renameVehicle, typeInfo } from '../lib/vehicles';
import type { PlatformKind, Settings } from '../types';
import { ProLock, ProTag } from './Pro';
import { Btn, Card, EstBadge, NumField, Segmented, TextField } from './ui';
import { VehicleForm } from './VehicleForm';

type SP = { s: Settings; setSettings: (s: Settings) => void };

/* -------- Veículos -------- */
export function GarageSection({ s, setSettings }: SP) {
  const { plan } = usePlan();
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const list = garage(s);
  const podeAdicionar = plan.pro || list.length === 0;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="aj-veiculos" className="scroll-mt-24 font-display text-xl font-semibold tracking-wide">
          Veículos
        </h2>
        {!plan.pro && <span className="text-xs text-muted">Grátis: 1 veículo</span>}
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {list.map((v, idx) => {
          const ativo = v.id === s.veiculoAtivo;
          const bloqueado = !plan.pro && !ativo && idx > 0;
          return (
            <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
              <div className="min-w-0 flex-1">
                <input
                  aria-label="Nome do veículo"
                  className="w-full min-w-0 rounded-md border border-transparent bg-transparent px-1 py-0.5 font-semibold outline-none hover:border-line focus:border-accent"
                  value={v.nome}
                  onChange={(e) => setSettings(renameVehicle(s, v.id, { nome: e.target.value }))}
                />
                <div className="px-1 text-xs text-muted">
                  {typeInfo(v.tipo).nome}
                  {v.valorFipe ? ` · FIPE ${brl(v.valorFipe)}` : ''}
                  {v.automatico ? ' · automático' : ''}
                  {v.blindado ? ' · blindado' : ''}
                </div>
              </div>
              {ativo ? (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-ink">Em uso</span>
              ) : bloqueado ? (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <ProTag /> para usar
                </span>
              ) : (
                <button className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-sunk" onClick={() => setSettings(activateVehicle(s, v.id))}>
                  Usar este
                </button>
              )}
              {list.length > 1 &&
                (confirmDel === v.id ? (
                  <span className="flex gap-1">
                    <button className="rounded bg-bad px-2 py-1 text-xs font-semibold text-surface" onClick={() => { setSettings(removeVehicle(s, v.id)); setConfirmDel(null); }}>
                      Excluir
                    </button>
                    <button className="rounded px-2 py-1 text-xs text-muted" onClick={() => setConfirmDel(null)}>
                      Não
                    </button>
                  </span>
                ) : (
                  <button aria-label={`Excluir ${v.nome}`} className="px-1 text-muted hover:text-bad" onClick={() => setConfirmDel(v.id)}>
                    ✕
                  </button>
                ))}
            </li>
          );
        })}
      </ul>
      <p className="mt-1 text-xs text-muted">Combustível, manutenção e depreciação abaixo são do veículo em uso. Cada veículo guarda os seus.</p>

      <div className="mt-3">
        {adding ? (
          <div className="rounded-lg border border-line p-3">
            <VehicleForm
              onSave={(v) => {
                setSettings(addVehicle(s, v));
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        ) : podeAdicionar ? (
          <Btn onClick={() => setAdding(true)}>+ Adicionar veículo</Btn>
        ) : (
          <ProLock compact title="Mais de um veículo" hint="Cadastre carro, moto e utilitário, cada um com seus custos." />
        )}
      </div>
    </Card>
  );
}

/* -------- Plataformas -------- */
export function PlatformsSection({ s, setSettings }: SP) {
  const { plan } = usePlan();
  const [adding, setAdding] = useState(false);
  const [escolha, setEscolha] = useState('');
  const [outraNome, setOutraNome] = useState('');
  const [outraTipo, setOutraTipo] = useState<PlatformKind>('entregas');
  const list = platforms(s);
  const podeAdicionar = plan.pro || list.length === 0;
  const disponiveis = PLATFORM_CATALOG.filter((c) => !list.some((p) => p.id === c.id));

  function add() {
    if (!escolha) return;
    setSettings(addPlatform(s, escolha === 'outra' ? buildPlatform('outra', outraNome, outraTipo) : buildPlatform(escolha)));
    setAdding(false);
    setEscolha('');
    setOutraNome('');
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="aj-plataforma" className="scroll-mt-24 font-display text-xl font-semibold tracking-wide">
          Plataformas e taxas
        </h2>
        {!plan.pro && <span className="text-xs text-muted">Grátis: 1 plataforma</span>}
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {list.map((p, idx) => {
          const ativa = p.id === s.plataformaAtiva;
          const bloqueada = !plan.pro && !ativa && idx > 0;
          const dica = catalogEntry(p.id)?.dica ?? 'Se o valor da oferta já é o que cai na sua conta, deixe 0.';
          return (
            <li key={p.id} className="py-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-semibold">{p.nome}</span>
                <span className="text-xs text-muted">{p.tipo === 'passageiros' ? 'passageiros' : 'entregas'}</span>
                {p.estimado && <EstBadge onConfirm={() => setSettings(updatePlatform(s, p.id, { estimado: false }))} />}
                <span className="flex-1" />
                {ativa ? (
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-ink">Em uso</span>
                ) : bloqueada ? (
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <ProTag /> para usar
                  </span>
                ) : (
                  <button className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-sunk" onClick={() => setSettings(activatePlatform(s, p.id))}>
                    Usar esta
                  </button>
                )}
                {list.length > 1 && (
                  <button aria-label={`Remover ${p.nome}`} className="px-1 text-muted hover:text-bad" onClick={() => setSettings(removePlatform(s, p.id))}>
                    ✕
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumField
                  id={`pl-p-${p.id}`}
                  label="Taxa percentual"
                  suffix="%"
                  max={99}
                  value={p.taxaPercentual}
                  onChange={(n) => setSettings(updatePlatform(s, p.id, { taxaPercentual: n, estimado: false }))}
                />
                <NumField
                  id={`pl-f-${p.id}`}
                  label="Taxa fixa por corrida"
                  prefix="R$"
                  value={p.taxaFixa}
                  onChange={(n) => setSettings(updatePlatform(s, p.id, { taxaFixa: n, estimado: false }))}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">{dica}</p>
            </li>
          );
        })}
      </ul>

      <div className="mt-2">
        {adding ? (
          <div className="grid gap-3 rounded-lg border border-line p-3">
            <div className="flex flex-wrap gap-2">
              {disponiveis.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={escolha === c.id}
                  onClick={() => setEscolha(c.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${escolha === c.id ? 'border-accent bg-accent/10' : 'border-line hover:bg-sunk'}`}
                >
                  {c.nome}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={escolha === 'outra'}
                onClick={() => setEscolha('outra')}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${escolha === 'outra' ? 'border-accent bg-accent/10' : 'border-line hover:bg-sunk'}`}
              >
                Outra…
              </button>
            </div>
            {escolha === 'outra' && (
              <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="flex gap-2">
              <Btn kind="primary" disabled={!escolha || (escolha === 'outra' && !outraNome.trim())} onClick={add}>
                Adicionar
              </Btn>
              <Btn onClick={() => setAdding(false)}>Cancelar</Btn>
            </div>
          </div>
        ) : podeAdicionar ? (
          <Btn onClick={() => setAdding(true)}>+ Adicionar plataforma</Btn>
        ) : (
          <ProLock compact title="Mais de uma plataforma" hint="Trabalhe em várias e compare qual dá mais lucro por hora." />
        )}
      </div>
    </Card>
  );
}
