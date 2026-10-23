export type Fuel = 'gasolina' | 'etanol';
export type FuelChoice = Fuel | 'auto';

/** Item de manutenção/desgaste: custo do serviço ÷ km até a próxima realização = reserva por km */
export interface MaintItem {
  id: string;
  nome: string;
  categoria: 'oleo' | 'pneus' | 'freios' | 'suspensao' | 'manutencao' | 'blindagem' | 'outro';
  preco: number; // R$
  intervaloKm: number; // km
  ativo: boolean;
  estimado: boolean; // true = valor de exemplo, ainda não confirmado pelo usuário
  obs?: string;
}

export interface FixedItem {
  id: string;
  nome: string;
  valorMensal: number; // R$/mês
  estimado: boolean;
}

export type VehicleType = 'popular' | 'hatch_sedan' | 'suv' | 'picape' | 'utilitario' | 'moto';

/** Um veículo da garagem. Os campos de custo do veículo ATIVO vivem no topo de Settings (veiculo, manutencao, depreciacao). */
export interface VehicleProfile {
  id: string;
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
  kmlGasolina: number;
  kmlEtanol: number;
  combustivelPadrao: FuelChoice;
  consumoEstimado: boolean;
  manutencao: MaintItem[];
  depreciacao: Settings['depreciacao'];
}

export type PlatformKind = 'passageiros' | 'entregas';

/** Uma plataforma em que o usuário trabalha. As taxas da ATIVA vivem no topo de Settings (plataforma). */
export interface PlatformProfile {
  id: string; // 'uber', '99', 'lalamove'… ou 'outra-…'
  nome: string;
  tipo: PlatformKind;
  taxaPercentual: number;
  taxaFixa: number;
  estimado: boolean;
}

export interface Settings {
  exemplosVersao?: number; // versão dos valores de exemplo (para atualizar só o que ainda não foi editado)
  /** Garagem. Vazia = usuário ainda não configurou (mostra o assistente de primeiro uso). */
  veiculos: VehicleProfile[];
  veiculoAtivo: string | null;
  plataformas: PlatformProfile[];
  plataformaAtiva: string | null;
  veiculo: {
    nome: string;
    precoGasolina: number;
    precoEtanol: number;
    kmlGasolina: number;
    kmlEtanol: number;
    combustivelPadrao: FuelChoice;
    consumoEstimado: boolean;
    precosEstimados: boolean;
  };
  manutencao: MaintItem[];
  depreciacao: {
    ativo: boolean;
    valorAtual: number;
    valorFuturo: number;
    kmPeriodo: number;
    estimado: boolean;
  };
  fixos: {
    itens: FixedItem[];
    percentualEntregas: number; // % dos custos fixos atribuídos às entregas
    horasEntregaMes: number; // horas de entrega por mês para ratear
  };
  plataforma: {
    taxaPercentual: number; // % sobre o valor da corrida (0 se o app já mostra o líquido)
    taxaFixa: number; // R$ por corrida
  };
  criterios: {
    margemMinima: number; // %
    metaHora: number; // R$/h
    incluirFixosNaDecisao: boolean;
  };
  metas: {
    dia: number;
    semana: number;
    mes: number;
    horasPorDia: number;
    diasPorSemana: number;
    diasPorMes: number;
    kmPorHora: number; // média de km rodados por hora trabalhada (inclui deslocamentos vazios)
    usarMediaHistorico: boolean;
  };
}

export interface Offer {
  valor: number;
  kmAteColeta: number;
  kmEntrega: number;
  kmRetorno: number;
  minutos: number;
  pedagio: number;
  estacionamento: number;
  outrasDespesas: number;
  taxaExtra: number; // taxa adicional cobrada nesta corrida (R$)
  bonus: number; // desconto/bônus/gorjeta a favor do motorista (R$)
  combustivel: FuelChoice;
}

export interface HistoryEntry {
  id: string;
  data: string; // ISO
  valor: number;
  bonus: number;
  km: number;
  minutos: number;
  despesas: number; // pedágio + estacionamento + outras
  taxas: number; // taxas da plataforma (R$)
  combustivel: Fuel;
  precoLitro: number;
  kml: number;
  custoCombustivel: number;
  custoDesgaste: number; // manutenção + depreciação (reserva)
  custoFixo: number; // rateio
  lucro: number; // valor + bonus − tudo
  obs?: string;
  veiculo?: string; // id do veículo usado
  plataforma?: string; // id da plataforma
}

export type Tab = 'corrida' | 'historico' | 'metas' | 'ajustes';
