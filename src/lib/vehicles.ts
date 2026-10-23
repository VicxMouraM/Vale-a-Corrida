import type { MaintItem, Settings, VehicleProfile, VehicleType } from '../types';

/**
 * VALORES PADRÃO POR TIPO DE VEÍCULO (estimativas de mercado, São Paulo, out/2026).
 * Servem para o app já sair calculando; todos ficam marcados como "estimativa" até o usuário editar ou confirmar.
 * Consumo: médias urbanas típicas de cada categoria (INMETRO/PBE, uso urbano). Etanol ≈ 70% da gasolina.
 */
export const VEHICLE_TYPES: { id: VehicleType; nome: string; exemplo: string; fipe: 'carros' | 'motos' }[] = [
  { id: 'popular', nome: 'Popular / compacto', exemplo: 'Mobi, Kwid, HB20, Onix 1.0', fipe: 'carros' },
  { id: 'hatch_sedan', nome: 'Hatch ou sedã médio', exemplo: 'Corolla, Cruze, Virtus, City', fipe: 'carros' },
  { id: 'suv', nome: 'SUV', exemplo: 'Creta, T-Cross, Compass, ix35', fipe: 'carros' },
  { id: 'picape', nome: 'Picape', exemplo: 'Strada, Saveiro, Toro, Hilux', fipe: 'carros' },
  { id: 'utilitario', nome: 'Utilitário / furgão', exemplo: 'Fiorino, Kangoo, Doblò, Partner', fipe: 'carros' },
  { id: 'moto', nome: 'Moto', exemplo: 'CG 160, Fazer, NMax, Biz', fipe: 'motos' },
];

interface Preset {
  kml: number; // gasolina, urbano
  valor: number; // valor típico quando não há FIPE
  depreciacaoAno: number; // fração perdida em kmPeriodo
  kmPeriodo: number;
  itens: [id: string, nome: string, categoria: MaintItem['categoria'], preco: number, intervaloKm: number][];
  cambio: number; // fluido do câmbio automático (troca completa)
}

const PRESETS: Record<VehicleType, Preset> = {
  popular: {
    kml: 11.5,
    valor: 45000,
    depreciacaoAno: 0.12,
    kmPeriodo: 30000,
    cambio: 600,
    itens: [
      ['oleo', 'Óleo + filtros', 'oleo', 250, 5000],
      ['pneus', 'Jogo de 4 pneus + alinhamento e balanceamento', 'pneus', 1800, 40000],
      ['freios', 'Freios: pastilhas, discos e fluido', 'freios', 700, 25000],
      ['suspensao', 'Suspensão: amortecedores, buchas e bieletas', 'suspensao', 1800, 50000],
      ['manut', 'Imprevistos e revisão geral', 'manutencao', 1200, 10000],
    ],
  },
  hatch_sedan: {
    kml: 10.5,
    valor: 75000,
    depreciacaoAno: 0.12,
    kmPeriodo: 30000,
    cambio: 800,
    itens: [
      ['oleo', 'Óleo + filtros', 'oleo', 320, 5000],
      ['pneus', 'Jogo de 4 pneus + alinhamento e balanceamento', 'pneus', 2400, 40000],
      ['freios', 'Freios: pastilhas, discos e fluido', 'freios', 900, 25000],
      ['suspensao', 'Suspensão: amortecedores, buchas e bieletas', 'suspensao', 2400, 50000],
      ['manut', 'Imprevistos e revisão geral', 'manutencao', 1500, 10000],
    ],
  },
  suv: {
    kml: 8.5,
    valor: 95000,
    depreciacaoAno: 0.12,
    kmPeriodo: 30000,
    cambio: 900,
    itens: [
      ['oleo', 'Óleo + filtros', 'oleo', 420, 5000],
      ['pneus', 'Jogo de 4 pneus + alinhamento e balanceamento', 'pneus', 3400, 35000],
      ['freios', 'Freios: pastilhas, discos e fluido', 'freios', 1300, 25000],
      ['suspensao', 'Suspensão: amortecedores, buchas e bieletas', 'suspensao', 3200, 45000],
      ['manut', 'Imprevistos e revisão geral', 'manutencao', 2000, 10000],
    ],
  },
  picape: {
    kml: 9.0,
    valor: 110000,
    depreciacaoAno: 0.1,
    kmPeriodo: 30000,
    cambio: 1000,
    itens: [
      ['oleo', 'Óleo + filtros', 'oleo', 400, 5000],
      ['pneus', 'Jogo de 4 pneus + alinhamento e balanceamento', 'pneus', 3200, 35000],
      ['freios', 'Freios: pastilhas, discos/lonas e fluido', 'freios', 1200, 25000],
      ['suspensao', 'Suspensão: amortecedores, buchas e feixe de molas', 'suspensao', 3000, 45000],
      ['manut', 'Imprevistos e revisão geral', 'manutencao', 1800, 10000],
    ],
  },
  utilitario: {
    kml: 9.5,
    valor: 80000,
    depreciacaoAno: 0.12,
    kmPeriodo: 30000,
    cambio: 800,
    itens: [
      ['oleo', 'Óleo + filtros', 'oleo', 300, 5000],
      ['pneus', 'Jogo de 4 pneus (carga) + alinhamento', 'pneus', 2400, 35000],
      ['freios', 'Freios: pastilhas, discos/lonas e fluido', 'freios', 1000, 20000],
      ['suspensao', 'Suspensão: amortecedores, buchas e molas', 'suspensao', 2600, 40000],
      ['manut', 'Imprevistos e revisão geral', 'manutencao', 1600, 10000],
    ],
  },
  moto: {
    kml: 38,
    valor: 16000,
    depreciacaoAno: 0.15,
    kmPeriodo: 25000,
    cambio: 0,
    itens: [
      ['oleo', 'Óleo + filtro', 'oleo', 70, 2000],
      ['pneus', 'Par de pneus', 'pneus', 600, 15000],
      ['relacao', 'Kit relação (corrente, coroa e pinhão)', 'outro', 350, 20000],
      ['freios', 'Freios: pastilhas/lonas e fluido', 'freios', 200, 12000],
      ['manut', 'Imprevistos e revisão geral', 'manutencao', 500, 8000],
    ],
  },
};

export const ETANOL_RATIO = 0.7;

export function typeInfo(t: VehicleType) {
  return VEHICLE_TYPES.find((x) => x.id === t) ?? VEHICLE_TYPES[1];
}

const round = (n: number, step: number) => Math.round(n / step) * step;

/** Monta um veículo completo com valores padrão para o tipo, usando o valor FIPE quando houver. */
export function buildVehicle(input: {
  id?: string;
  nome: string;
  tipo: VehicleType;
  marca?: string;
  modelo?: string;
  ano?: number;
  fipeCodigo?: string;
  valorFipe?: number;
  fipeMes?: string;
  automatico: boolean;
  blindado: boolean;
}): VehicleProfile {
  const p = PRESETS[input.tipo];
  const pesado = input.blindado ? 0.8 : 1; // blindagem: pneus, freios e suspensão duram ~20% menos
  const consumo = input.blindado ? 0.88 : 1; // e o consumo piora ~12%
  const ano = input.ano ?? new Date().getFullYear();
  const idade = Math.max(0, new Date().getFullYear() - ano);
  const manutencao: MaintItem[] = p.itens.map(([id, nome, categoria, preco, intervaloKm]) => ({
    id,
    nome,
    categoria,
    // carro mais velho: mais imprevistos
    preco: id === 'manut' && idade >= 10 ? round(preco * 1.3, 50) : preco,
    intervaloKm: ['pneus', 'freios', 'suspensao'].includes(categoria) ? round(intervaloKm * pesado, 1000) : intervaloKm,
    ativo: true,
    estimado: true,
  }));
  if (input.automatico && p.cambio > 0) {
    manutencao.push({ id: 'cambio', nome: 'Fluido do câmbio automático (troca completa)', categoria: 'manutencao', preco: p.cambio, intervaloKm: 40000, ativo: true, estimado: true });
  }
  if (input.blindado) {
    manutencao.push({
      id: 'blind',
      nome: 'Itens exclusivos da blindagem',
      categoria: 'blindagem',
      preco: 1800,
      intervaloKm: 30000,
      ativo: true,
      estimado: true,
      obs: 'Vidros, borrachas de vedação, máquinas de vidro, dobradiças.',
    });
  }
  const valorAtual = input.valorFipe && input.valorFipe > 0 ? input.valorFipe : p.valor;
  const kmlGasolina = Math.round(p.kml * consumo * 10) / 10;
  return {
    id: input.id ?? newId('v'),
    nome: input.nome.trim() || typeInfo(input.tipo).nome,
    tipo: input.tipo,
    marca: input.marca,
    modelo: input.modelo,
    ano: input.ano,
    fipeCodigo: input.fipeCodigo,
    valorFipe: input.valorFipe,
    fipeMes: input.fipeMes,
    automatico: input.automatico,
    blindado: input.blindado,
    kmlGasolina,
    kmlEtanol: Math.round(kmlGasolina * ETANOL_RATIO * 10) / 10,
    combustivelPadrao: 'auto',
    consumoEstimado: true,
    manutencao,
    depreciacao: {
      ativo: true,
      valorAtual: round(valorAtual, 100),
      valorFuturo: round(valorAtual * (1 - p.depreciacaoAno), 100),
      kmPeriodo: p.kmPeriodo,
      estimado: true,
    },
  };
}

export function newId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* ---------- Garagem: o veículo ativo mora no topo de Settings ---------- */

/** Copia os campos de custo do topo para o perfil do veículo ativo. */
function fromTop(s: Settings, v: VehicleProfile): VehicleProfile {
  return {
    ...v,
    nome: s.veiculo.nome,
    kmlGasolina: s.veiculo.kmlGasolina,
    kmlEtanol: s.veiculo.kmlEtanol,
    combustivelPadrao: s.veiculo.combustivelPadrao,
    consumoEstimado: s.veiculo.consumoEstimado,
    manutencao: s.manutencao,
    depreciacao: s.depreciacao,
  };
}

function toTop(s: Settings, v: VehicleProfile): Settings {
  return {
    ...s,
    veiculoAtivo: v.id,
    veiculo: {
      ...s.veiculo,
      nome: v.nome,
      kmlGasolina: v.kmlGasolina,
      kmlEtanol: v.kmlEtanol,
      combustivelPadrao: v.combustivelPadrao,
      consumoEstimado: v.consumoEstimado,
    },
    manutencao: v.manutencao,
    depreciacao: v.depreciacao,
  };
}

/** Lista de veículos com os dados do ativo atualizados. */
export function garage(s: Settings): VehicleProfile[] {
  return s.veiculos.map((v) => (v.id === s.veiculoAtivo ? fromTop(s, v) : v));
}

export function activeVehicle(s: Settings): VehicleProfile | null {
  return garage(s).find((v) => v.id === s.veiculoAtivo) ?? null;
}

export function activateVehicle(s: Settings, id: string): Settings {
  const list = garage(s);
  const v = list.find((x) => x.id === id);
  if (!v) return s;
  return toTop({ ...s, veiculos: list }, v);
}

export function addVehicle(s: Settings, v: VehicleProfile): Settings {
  return toTop({ ...s, veiculos: [...garage(s), v] }, v);
}

/** Troca os dados de um veículo (ex.: refez pela FIPE). */
export function replaceVehicle(s: Settings, v: VehicleProfile): Settings {
  const list = garage(s).map((x) => (x.id === v.id ? v : x));
  return v.id === s.veiculoAtivo ? toTop({ ...s, veiculos: list }, v) : { ...s, veiculos: list };
}

export function removeVehicle(s: Settings, id: string): Settings {
  const list = garage(s).filter((v) => v.id !== id);
  if (list.length === 0) return s; // sempre fica pelo menos um
  if (s.veiculoAtivo !== id) return { ...s, veiculos: list };
  return toTop({ ...s, veiculos: list }, list[0]);
}

/** Atualiza só a identificação (nome, ano, blindado…) sem mexer nos custos. */
export function renameVehicle(s: Settings, id: string, patch: Partial<Pick<VehicleProfile, 'nome' | 'automatico' | 'blindado'>>): Settings {
  const list = garage(s).map((v) => (v.id === id ? { ...v, ...patch } : v));
  const next = { ...s, veiculos: list };
  if (id === s.veiculoAtivo && patch.nome !== undefined) next.veiculo = { ...s.veiculo, nome: patch.nome };
  return next;
}

/** Quem já usava o app (antes da garagem) tem o carro nos campos do topo: vira o primeiro veículo. */
export function vehicleFromLegacy(s: Settings): VehicleProfile {
  const nome = s.veiculo.nome;
  return {
    id: 'v1',
    nome,
    tipo: /ix35|suv|tucson|creta|compass|renegade|kicks|t-?cross|hr-?v|ecosport|duster|tiguan|sportage/i.test(nome) ? 'suv' : 'hatch_sedan',
    automatico: /autom|aut\b|cvt/i.test(nome),
    blindado: /blind/i.test(nome),
    kmlGasolina: s.veiculo.kmlGasolina,
    kmlEtanol: s.veiculo.kmlEtanol,
    combustivelPadrao: s.veiculo.combustivelPadrao,
    consumoEstimado: s.veiculo.consumoEstimado,
    manutencao: s.manutencao,
    depreciacao: s.depreciacao,
  };
}

/** Seguro e IPVA de exemplo para o veículo (só troca o que ainda é estimativa). */
export function applyVehicleToFixed(s: Settings, v: VehicleProfile): Settings {
  const valor = v.depreciacao.valorAtual;
  const seguroMes = v.tipo === 'moto' ? 150 : round((valor * 0.05 * (v.blindado ? 1.3 : 1)) / 12, 10);
  const ipvaMes = round((valor * (v.tipo === 'moto' ? 0.02 : 0.04)) / 12 + 15, 10); // 4% em SP (2% motos) + licenciamento
  const itens = s.fixos.itens.map((i) => {
    if (!i.estimado) return i;
    if (i.id === 'seguro') return { ...i, nome: 'Seguro', valorMensal: seguroMes };
    if (i.id === 'ipva') return { ...i, nome: 'IPVA + licenciamento (÷12)', valorMensal: ipvaMes };
    return i;
  });
  return { ...s, fixos: { ...s.fixos, itens } };
}
