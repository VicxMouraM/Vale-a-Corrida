import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { fipeAnos, fipeMarcas, fipeModelos, fipePreco, looksAutomatic, type FipeItem, type FipePrice } from '../lib/fipe';
import { brl } from '../lib/format';
import { buildVehicle, typeInfo, VEHICLE_TYPES } from '../lib/vehicles';
import type { VehicleProfile, VehicleType } from '../types';
import { Btn, NumField, Segmented, TextField, Toggle } from './ui';

interface Props {
  onSave: (v: VehicleProfile) => void;
  onCancel?: () => void;
  saveLabel?: string;
}

export function VehicleForm({ onSave, onCancel, saveLabel = 'Salvar veículo' }: Props) {
  const [tipo, setTipo] = useState<VehicleType | null>(null);
  const [modo, setModo] = useState<'fipe' | 'manual'>('fipe');
  const [nome, setNome] = useState('');
  const [nomeEditado, setNomeEditado] = useState(false);
  const [ano, setAno] = useState(0);
  const [valor, setValor] = useState(0);
  const [automatico, setAutomatico] = useState(false);
  const [blindado, setBlindado] = useState(false);
  const [fipe, setFipe] = useState<FipePrice | null>(null);

  const kind = tipo ? typeInfo(tipo).fipe : 'carros';

  function pickFipe(p: FipePrice | null) {
    setFipe(p);
    if (!p) return;
    if (!nomeEditado) setNome(`${p.marca} ${p.modelo} ${p.ano}`);
    setAutomatico(looksAutomatic(p.modelo));
    setAno(p.ano);
    setValor(p.valor);
  }

  function save() {
    if (!tipo) return;
    onSave(
      buildVehicle({
        nome: nome || (fipe ? `${fipe.marca} ${fipe.modelo} ${fipe.ano}` : typeInfo(tipo).nome),
        tipo,
        marca: fipe?.marca,
        modelo: fipe?.modelo,
        ano: ano || undefined,
        fipeCodigo: fipe?.codigoFipe,
        valorFipe: valor || undefined,
        fipeMes: fipe?.mesReferencia,
        automatico,
        blindado,
      }),
    );
  }

  const pronto = !!tipo && (modo === 'manual' ? nome.trim().length > 0 : !!fipe);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 text-[13px] font-medium text-muted">Tipo de veículo</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {VEHICLE_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tipo === t.id}
              onClick={() => {
                if (typeInfo(t.id).fipe !== kind) pickFipe(null);
                setTipo(t.id);
              }}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${tipo === t.id ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:bg-sunk'}`}
            >
              <div className="text-sm font-semibold">{t.nome}</div>
              <div className="truncate text-xs text-muted">{t.exemplo}</div>
            </button>
          ))}
        </div>
      </div>

      {tipo && (
        <>
          <Segmented<'fipe' | 'manual'>
            label="Como cadastrar"
            value={modo}
            onChange={setModo}
            options={[
              { value: 'fipe', label: 'Buscar na tabela FIPE' },
              { value: 'manual', label: 'Digitar à mão' },
            ]}
          />

          {modo === 'fipe' ? (
            <FipePicker key={kind} kind={kind} onPick={pickFipe} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <TextField label="Nome do veículo" value={nome} onChange={setNome} placeholder="Ex.: Onix 1.0 2020 prata" />
              </div>
              <NumField label="Ano" value={ano} onChange={setAno} decimals={false} max={new Date().getFullYear() + 1} />
              <NumField label="Valor de mercado (opcional)" prefix="R$" value={valor} onChange={setValor} hint="Usado para a depreciação." />
            </div>
          )}

          {modo === 'fipe' && fipe && (
            <div className="rounded-lg bg-sunk px-3 py-2 text-sm">
              <div className="font-semibold">
                {fipe.marca} {fipe.modelo} {fipe.ano}
              </div>
              <div className="tnum text-muted">
                FIPE {brl(fipe.valor)} · {fipe.mesReferencia} · código {fipe.codigoFipe}
              </div>
              <div className="mt-2">
                <TextField
                  label="Como chamar este veículo"
                  value={nome}
                  onChange={(v) => {
                    setNome(v);
                    setNomeEditado(true);
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {tipo !== 'moto' && <Toggle checked={automatico} onChange={setAutomatico} label="Câmbio automático" hint="Inclui a troca do fluido do câmbio na manutenção." />}
            {tipo !== 'moto' && (
              <Toggle checked={blindado} onChange={setBlindado} label="Blindado" hint="Pneus, freios e suspensão duram menos e o consumo é maior." />
            )}
          </div>

          <p className="text-xs text-muted">
            Consumo, manutenção, depreciação, seguro e IPVA começam com valores típicos de um {typeInfo(tipo).nome.toLowerCase()}, marcados como estimativa. Ajuste
            depois em Ajustes com os números do seu veículo.
          </p>

          <div className="flex flex-wrap gap-2">
            <Btn kind="primary" disabled={!pronto} onClick={save}>
              {saveLabel}
            </Btn>
            {onCancel && <Btn onClick={onCancel}>Cancelar</Btn>}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Marca → modelo → ano, consultando a FIPE ---------- */
function FipePicker({ kind, onPick }: { kind: 'carros' | 'motos'; onPick: (p: FipePrice | null) => void }) {
  const [marcas, setMarcas] = useState<FipeItem[] | null>(null);
  const [modelos, setModelos] = useState<FipeItem[] | null>(null);
  const [anos, setAnos] = useState<FipeItem[] | null>(null);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState('');
  const [filtro, setFiltro] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(fn: () => Promise<T>, then: (r: T) => void) {
    setBusy(true);
    setError(null);
    try {
      then(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao consultar a FIPE.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void run(() => fipeMarcas(kind), setMarcas);
  }, [kind]);

  const modelosFiltrados = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    return f ? (modelos ?? []).filter((m) => m.nome.toLowerCase().includes(f)) : (modelos ?? []);
  }, [modelos, filtro]);

  return (
    <div className="grid gap-3">
      <Select
        label="Marca"
        value={marca}
        disabled={!marcas}
        onChange={(v) => {
          setMarca(v);
          setModelo('');
          setAno('');
          setModelos(null);
          setAnos(null);
          setFiltro('');
          onPick(null);
          if (v) void run(() => fipeModelos(kind, v), setModelos);
        }}
        options={marcas ?? []}
        placeholder={marcas ? 'Escolha a marca' : 'Carregando…'}
      />
      {marca && (
        <>
          <TextField label="Filtrar modelo" value={filtro} onChange={setFiltro} placeholder="Ex.: onix 1.0, ix35, cg 160" autoComplete="off" />
          <Select
            label={`Modelo${modelos ? ` (${modelosFiltrados.length})` : ''}`}
            value={modelo}
            disabled={!modelos}
            onChange={(v) => {
              setModelo(v);
              setAno('');
              setAnos(null);
              onPick(null);
              if (v) void run(() => fipeAnos(kind, marca, v), setAnos);
            }}
            options={modelosFiltrados}
            placeholder={modelos ? 'Escolha o modelo' : 'Carregando…'}
          />
        </>
      )}
      {modelo && (
        <Select
          label="Ano e combustível"
          value={ano}
          disabled={!anos}
          onChange={(v) => {
            setAno(v);
            onPick(null);
            if (v) void run(() => fipePreco(kind, marca, modelo, v), onPick);
          }}
          options={anos ?? []}
          placeholder={anos ? 'Escolha o ano' : 'Carregando…'}
        />
      )}
      {busy && <p className="text-xs text-muted">Consultando a FIPE…</p>}
      {error && (
        <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
          {error} Você pode usar “Digitar à mão”.
        </p>
      )}
    </div>
  );
}

function Select(props: { label: ReactNode; value: string; onChange: (v: string) => void; options: FipeItem[]; placeholder: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium text-muted">
        {props.label}
      </label>
      <select
        id={id}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent disabled:opacity-50"
      >
        <option value="">{props.placeholder}</option>
        {props.options.map((o) => (
          <option key={o.codigo} value={o.codigo}>
            {o.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
