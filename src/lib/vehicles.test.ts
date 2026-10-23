import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../defaults';
import type { Settings } from '../types';
import { looksAutomatic, parseBRL } from './fipe';
import { activatePlatform, addPlatform, buildPlatform, platforms, removePlatform, updatePlatform } from './platforms';
import { normalize } from './storage';
import { activateVehicle, addVehicle, applyVehicleToFixed, buildVehicle, garage, removeVehicle } from './vehicles';

const carro = (over: Partial<Parameters<typeof buildVehicle>[0]> = {}) =>
  buildVehicle({ nome: 'Onix', tipo: 'popular', automatico: false, blindado: false, ...over });

describe('buildVehicle', () => {
  it('usa o valor FIPE na depreciação', () => {
    const v = carro({ valorFipe: 60000 });
    expect(v.depreciacao.valorAtual).toBe(60000);
    expect(v.depreciacao.valorFuturo).toBeLessThan(60000);
  });
  it('blindado: desgaste mais rápido, consumo maior e item da blindagem', () => {
    const normal = carro();
    const blind = carro({ blindado: true });
    const pneus = (x: typeof normal) => x.manutencao.find((i) => i.id === 'pneus')!.intervaloKm;
    expect(pneus(blind)).toBeLessThan(pneus(normal));
    expect(blind.kmlGasolina).toBeLessThan(normal.kmlGasolina);
    expect(blind.manutencao.some((i) => i.categoria === 'blindagem')).toBe(true);
  });
  it('automático inclui o fluido do câmbio; moto não', () => {
    expect(carro({ automatico: true }).manutencao.some((i) => i.id === 'cambio')).toBe(true);
    expect(carro().manutencao.some((i) => i.id === 'cambio')).toBe(false);
    expect(buildVehicle({ nome: 'CG', tipo: 'moto', automatico: true, blindado: false }).manutencao.some((i) => i.id === 'cambio')).toBe(false);
  });
  it('tudo começa como estimativa e etanol a 70%', () => {
    const v = carro();
    expect(v.consumoEstimado && v.depreciacao.estimado && v.manutencao.every((i) => i.estimado)).toBe(true);
    expect(v.kmlEtanol).toBeCloseTo(v.kmlGasolina * 0.7, 0);
  });
});

describe('garagem', () => {
  const base = (): Settings => addVehicle(addVehicle(DEFAULT_SETTINGS, carro({ id: 'a', nome: 'A' })), carro({ id: 'b', nome: 'B', tipo: 'suv' }));

  it('o último adicionado fica em uso e os campos do topo são dele', () => {
    const s = base();
    expect(s.veiculoAtivo).toBe('b');
    expect(s.veiculo.nome).toBe('B');
  });
  it('editar o veículo em uso e trocar de veículo não perde a edição', () => {
    let s = base();
    s = { ...s, veiculo: { ...s.veiculo, kmlGasolina: 7.7 } }; // edição em Ajustes
    s = activateVehicle(s, 'a');
    expect(s.veiculo.nome).toBe('A');
    s = activateVehicle(s, 'b');
    expect(s.veiculo.kmlGasolina).toBe(7.7);
  });
  it('garage() mostra os dados atuais do veículo em uso', () => {
    let s = base();
    s = { ...s, manutencao: [] };
    expect(garage(s).find((v) => v.id === 'b')!.manutencao).toEqual([]);
    expect(garage(s).find((v) => v.id === 'a')!.manutencao.length).toBeGreaterThan(0);
  });
  it('excluir o veículo em uso passa para outro; o último nunca sai', () => {
    let s = removeVehicle(base(), 'b');
    expect(s.veiculoAtivo).toBe('a');
    expect(s.veiculo.nome).toBe('A');
    s = removeVehicle(s, 'a');
    expect(s.veiculos).toHaveLength(1);
  });
  it('seguro e IPVA de exemplo seguem o valor do veículo, sem mexer no que o usuário editou', () => {
    const v = carro({ valorFipe: 120000 });
    const editado: Settings = { ...DEFAULT_SETTINGS, fixos: { ...DEFAULT_SETTINGS.fixos, itens: DEFAULT_SETTINGS.fixos.itens.map((i) => (i.id === 'seguro' ? { ...i, valorMensal: 999, estimado: false } : i)) } };
    const s = applyVehicleToFixed(editado, v);
    expect(s.fixos.itens.find((i) => i.id === 'seguro')!.valorMensal).toBe(999);
    expect(s.fixos.itens.find((i) => i.id === 'ipva')!.valorMensal).toBe(Math.round((120000 * 0.04) / 12 / 10 + 1.5) * 10);
  });
});

describe('plataformas', () => {
  it('a taxa da plataforma em uso vai para o cálculo', () => {
    let s = addPlatform(addPlatform(DEFAULT_SETTINGS, buildPlatform('uber')), buildPlatform('indrive'));
    expect(s.plataformaAtiva).toBe('indrive');
    expect(s.plataforma.taxaPercentual).toBe(10);
    s = activatePlatform(s, 'uber');
    expect(s.plataforma.taxaPercentual).toBe(0);
  });
  it('editar a taxa da plataforma em uso atualiza o cálculo; de outra, não', () => {
    let s = addPlatform(addPlatform(DEFAULT_SETTINGS, buildPlatform('uber')), buildPlatform('99'));
    s = updatePlatform(s, '99', { taxaPercentual: 5 });
    expect(s.plataforma.taxaPercentual).toBe(5);
    s = updatePlatform(s, 'uber', { taxaFixa: 2 });
    expect(s.plataforma.taxaFixa).toBe(0);
    expect(platforms(s).find((p) => p.id === 'uber')!.taxaFixa).toBe(2);
  });
  it('não duplica e sempre sobra uma', () => {
    let s = addPlatform(addPlatform(DEFAULT_SETTINGS, buildPlatform('uber')), buildPlatform('uber'));
    expect(s.plataformas).toHaveLength(1);
    s = removePlatform(s, 'uber');
    expect(s.plataformas).toHaveLength(1);
  });
  it('"Outra" ganha id próprio e nome limitado', () => {
    const p = buildPlatform('outra', 'x'.repeat(80), 'passageiros');
    expect(p.id.startsWith('outra-')).toBe(true);
    expect(p.nome).toHaveLength(40);
    expect(p.tipo).toBe('passageiros');
  });
});

describe('migração de quem já usava o app', () => {
  it('ajustes antigos viram 1 veículo e 1 plataforma, mantendo os valores', () => {
    const antigo = { ...DEFAULT_SETTINGS, veiculos: undefined, plataformas: undefined, plataforma: { taxaPercentual: 3, taxaFixa: 1 } } as unknown as Settings;
    antigo.veiculo = { ...antigo.veiculo, kmlGasolina: 5.2, consumoEstimado: false };
    const s = normalize({ settings: antigo }).settings;
    expect(s.veiculos).toHaveLength(1);
    expect(s.veiculoAtivo).toBe(s.veiculos[0].id);
    expect(s.veiculos[0].tipo).toBe('suv'); // ix35
    expect(s.veiculos[0].blindado).toBe(true);
    expect(s.veiculo.kmlGasolina).toBe(5.2);
    expect(s.plataformas.map((p) => p.id)).toEqual(['lalamove']);
    expect(s.plataforma).toEqual({ taxaPercentual: 3, taxaFixa: 1 });
  });
  it('usuário novo fica sem veículo (abre o assistente)', () => {
    expect(normalize({}).settings.veiculos).toEqual([]);
    expect(normalize({ settings: DEFAULT_SETTINGS }).settings.veiculos).toEqual([]);
  });
});

describe('FIPE', () => {
  it('lê o valor em reais', () => {
    expect(parseBRL('R$ 64.993,00')).toBe(64993);
    expect(parseBRL('R$ 1.234.567,89')).toBeCloseTo(1234567.89);
  });
  it('reconhece câmbio automático pelo nome do modelo', () => {
    expect(looksAutomatic('ix35 2.0 16V 170cv 2WD/4WD Aut.')).toBe(true);
    expect(looksAutomatic('Onix 1.0 Turbo Flex AT')).toBe(true);
    expect(looksAutomatic('Corolla XEi 2.0 Flex 16V CVT')).toBe(true);
    expect(looksAutomatic('Onix 1.0 Flex Mec.')).toBe(false);
  });
});
