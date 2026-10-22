import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, EXAMPLE_OFFER } from '../defaults';
import type { Settings } from '../types';
import { analyze, compareFuels, depreciationPerKm, goalRows, maintenancePerKm, validateOffer } from './calc';
import { parseNum } from './format';

const S: Settings = structuredClone(DEFAULT_SETTINGS);

describe('combustível', () => {
  it('compara pelo consumo real, sem regra dos 70%', () => {
    const c = compareFuels(S);
    const v = S.veiculo;
    expect(c.custoKmGasolina).toBeCloseTo(v.precoGasolina / v.kmlGasolina, 6);
    expect(c.custoKmEtanol).toBeCloseTo(v.precoEtanol / v.kmlEtanol, 6);
    expect(c.precoMaxEtanol).toBeCloseTo(v.precoGasolina * (v.kmlEtanol / v.kmlGasolina), 6);
    expect(c.maisBarato).toBe(c.custoKmEtanol < c.custoKmGasolina ? 'etanol' : 'gasolina');
  });
});

describe('reservas', () => {
  it('soma preço ÷ intervalo de cada item ativo', () => {
    const esperado = S.manutencao.reduce((a, i) => a + i.preco / i.intervaloKm, 0);
    expect(maintenancePerKm(S)).toBeCloseTo(esperado, 8);
    const d = S.depreciacao;
    expect(depreciationPerKm(S)).toBeCloseTo((d.valorAtual - d.valorFuturo) / d.kmPeriodo, 8);
  });
});

describe('análise da corrida', () => {
  const a = analyze(EXAMPLE_OFFER, S);
  it('soma todos os km, inclusive vazios', () => expect(a.km).toBe(21));
  it('lucro = receita − variáveis − fixos', () => {
    expect(a.lucroFinal).toBeCloseTo(a.receita - a.custosVariaveis - a.custoFixo, 8);
  });
  it('valor mínimo zera o lucro', () => {
    const b = analyze({ ...EXAMPLE_OFFER, valor: a.minimoSemPrejuizo }, S);
    expect(b.lucroDecisao).toBeCloseTo(0, 6);
  });
  it('valor mínimo da meta/hora bate a meta exatamente', () => {
    const b = analyze({ ...EXAMPLE_OFFER, valor: a.minimoMetaHora }, S);
    expect(b.lucroHora).toBeCloseTo(S.criterios.metaHora, 6);
  });
  it('fórmulas fecham com taxa percentual e bônus', () => {
    const s2: Settings = { ...S, plataforma: { taxaPercentual: 12, taxaFixa: 1.5 } };
    const o = { ...EXAMPLE_OFFER, bonus: 4, taxaExtra: 2 };
    const x = analyze(o, s2);
    expect(analyze({ ...o, valor: x.minimoSemPrejuizo }, s2).lucroDecisao).toBeCloseTo(0, 6);
    expect(analyze({ ...o, valor: x.minimoMargem! }, s2).margem).toBeCloseTo(S.criterios.margemMinima, 6);
    const v = analyze({ ...o, valor: x.minimoVale! + 0.01 }, s2);
    expect(v.veredito).toBe('vale');
  });
  it('classifica prejuízo como vermelho', () => {
    expect(analyze({ ...EXAMPLE_OFFER, valor: 10 }, S).veredito).toBe('nao');
  });
});

describe('metas', () => {
  it('faturamento cobre lucro + custos', () => {
    const r = goalRows(S, 18, 1)[1];
    expect(r.faturamento - r.custoCombustivel - r.custoDesgaste - r.custoFixo - r.taxas).toBeCloseTo(r.lucroMeta, 6);
  });
});

describe('validação', () => {
  it('bloqueia entradas vazias', () => {
    expect(validateOffer({ ...EXAMPLE_OFFER, valor: 0, minutos: 0 }, S).length).toBeGreaterThan(0);
  });
  it('lê números em formato brasileiro', () => {
    expect(parseNum('1.234,56')).toBeCloseTo(1234.56);
    expect(parseNum('5,2')).toBeCloseTo(5.2);
    expect(Number.isNaN(parseNum('abc'))).toBe(true);
  });
});

describe('atualização dos exemplos', () => {
  it('troca só o que ainda é estimativa', async () => {
    const { refreshExamples } = await import('./storage');
    const antigo: Settings = structuredClone(S);
    antigo.veiculo.precoGasolina = 9.99; // ainda estimativa → deve ser trocado
    antigo.veiculo.kmlGasolina = 4.2;
    antigo.veiculo.consumoEstimado = false; // usuário mediu → deve ser mantido
    antigo.manutencao = [{ ...S.manutencao[0], preco: 999, estimado: false }];
    const r = refreshExamples(antigo, 1);
    expect(r.veiculo.precoGasolina).toBe(S.veiculo.precoGasolina);
    expect(r.veiculo.kmlGasolina).toBe(4.2);
    expect(r.manutencao.find((i) => i.id === 'oleo')!.preco).toBe(999);
    expect(r.manutencao.length).toBe(S.manutencao.length);
  });
});
