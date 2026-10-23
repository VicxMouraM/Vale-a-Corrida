import type { Offer, Settings } from './types';

/**
 * VALORES PADRÃO = EXEMPLOS PARA UM HYUNDAI ix35 GLS 2.0 FLEX AUTOMÁTICO 2012 BLINDADO, EM SÃO PAULO.
 * Pesquisados em out/2026. Continuam marcados como "estimativa" até você confirmar ou editar.
 *  - Combustível: média ANP na capital paulista, semana 04–10/10/2026 (gasolina R$ 6,34; etanol R$ 3,91).
 *  - Consumo: 5,0 km/L na gasolina (informado pelo usuário). Etanol = 68% disso, a proporção
 *    entre etanol e gasolina nos dados de consumo do ix35 2.0 flex. Meça no seu carro.
 *  - Valor: FIPE out/2026 R$ 63.609 (sem blindagem). Blindagem usada costuma somar algo ao preço de revenda.
 *  - Peças e serviços: faixas de mercado para o ix35, com intervalos encurtados pelo peso da blindagem.
 * Não há nenhuma taxa oficial da Lalamove embutida: a taxa da plataforma começa em 0.
 */
export const EXEMPLOS_VERSAO = 2;

export const DEFAULT_SETTINGS: Settings = {
  exemplosVersao: EXEMPLOS_VERSAO,
  veiculos: [],
  veiculoAtivo: null,
  plataformas: [],
  plataformaAtiva: null,
  veiculo: {
    nome: 'Hyundai ix35 GLS 2.0 2012 automático blindado',
    precoGasolina: 6.34,
    precoEtanol: 3.91,
    kmlGasolina: 5.0,
    kmlEtanol: 3.4,
    combustivelPadrao: 'auto',
    consumoEstimado: true,
    precosEstimados: true,
  },
  manutencao: [
    {
      id: 'oleo',
      nome: 'Óleo 5W30 + filtros (óleo, ar, combustível)',
      categoria: 'oleo',
      preco: 450,
      intervaloKm: 5000,
      ativo: true,
      estimado: true,
      obs: 'Intervalo de uso severo: trânsito e entregas.',
    },
    {
      id: 'pneus',
      nome: 'Jogo de 4 pneus + alinhamento e balanceamento',
      categoria: 'pneus',
      preco: 3800,
      intervaloKm: 25000,
      ativo: true,
      estimado: true,
      obs: 'Confira a medida na lateral do pneu (o GLS costuma usar aro 17 ou 18). Blindado gasta mais rápido.',
    },
    {
      id: 'freios',
      nome: 'Freios: pastilhas, discos e fluido',
      categoria: 'freios',
      preco: 1600,
      intervaloKm: 20000,
      ativo: true,
      estimado: true,
      obs: 'Pastilhas duram menos com o peso extra.',
    },
    {
      id: 'suspensao',
      nome: 'Suspensão: 4 amortecedores, buchas e bieletas',
      categoria: 'suspensao',
      preco: 3900,
      intervaloKm: 40000,
      ativo: true,
      estimado: true,
    },
    {
      id: 'cambio',
      nome: 'Fluido do câmbio automático (troca completa)',
      categoria: 'manutencao',
      preco: 900,
      intervaloKm: 40000,
      ativo: true,
      estimado: true,
    },
    {
      id: 'manut',
      nome: 'Imprevistos e revisão geral (velas, bateria, arrefecimento)',
      categoria: 'manutencao',
      preco: 2000,
      intervaloKm: 10000,
      ativo: true,
      estimado: true,
      obs: 'Carro de 14 anos: reserve para o que quebrar.',
    },
    {
      id: 'blind',
      nome: 'Itens exclusivos da blindagem',
      categoria: 'blindagem',
      preco: 1800,
      intervaloKm: 30000,
      ativo: true,
      estimado: true,
      obs: 'Só o que é da blindagem: vidros, borrachas de vedação, máquinas de vidro, dobradiças.',
    },
  ],
  depreciacao: {
    ativo: true,
    valorAtual: 70000,
    valorFuturo: 62000,
    kmPeriodo: 30000,
    estimado: true,
  },
  fixos: {
    itens: [
      { id: 'seguro', nome: 'Seguro (blindado)', valorMensal: 400, estimado: true },
      { id: 'ipva', nome: 'IPVA 4% + licenciamento (÷12)', valorMensal: 230, estimado: true },
      { id: 'celular', nome: 'Celular / internet', valorMensal: 60, estimado: true },
    ],
    percentualEntregas: 40,
    horasEntregaMes: 60,
  },
  plataforma: {
    taxaPercentual: 0,
    taxaFixa: 0,
  },
  criterios: {
    margemMinima: 30,
    metaHora: 30,
    incluirFixosNaDecisao: true,
  },
  metas: {
    dia: 120,
    semana: 600,
    mes: 2640,
    horasPorDia: 4,
    diasPorSemana: 5,
    diasPorMes: 22,
    kmPorHora: 18,
    usarMediaHistorico: true,
  },
};

export const EXAMPLE_OFFER: Offer = {
  valor: 48,
  kmAteColeta: 3,
  kmEntrega: 12,
  kmRetorno: 6,
  minutos: 60,
  pedagio: 0,
  estacionamento: 0,
  outrasDespesas: 0,
  taxaExtra: 0,
  bonus: 0,
  combustivel: 'auto',
};

export const EMPTY_OFFER: Offer = {
  valor: 0,
  kmAteColeta: 0,
  kmEntrega: 0,
  kmRetorno: 0,
  minutos: 0,
  pedagio: 0,
  estacionamento: 0,
  outrasDespesas: 0,
  taxaExtra: 0,
  bonus: 0,
  combustivel: 'auto',
};
