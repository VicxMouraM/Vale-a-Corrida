import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../defaults';
import { detectar, lerData, lerDinheiro, lerDistancia, lerDuracao, montar, parseCsv } from './importer';
import { addVehicle, buildVehicle } from './vehicles';

const s = addVehicle(DEFAULT_SETTINGS, buildVehicle({ id: 'v1', nome: 'Onix', tipo: 'popular', automatico: false, blindado: false }));

const CSV_BR = `﻿Data;Plataforma;Valor recebido;Distância total (km);Duração;Status
20/10/2026 14:33;99;R$ 23,50;12,4;00:25:10;Concluída
20/10/2026 15:10;99;R$ 12.050,00;8;20 min;Concluída
21/10/2026 09:02;99;R$ 18,00;6,1;18 min;Cancelada pelo passageiro
21/10/2026;99;;5;10;Concluída
"22/10/2026 10:00";99;"R$ 30,00";"10,0";"1h 05min";"Concluída"`;

const CSV_EN = `Trip Status,Request Time,Distance (miles),Duration (seconds),Earnings
completed,2026-10-20 14:33:00 +0000 UTC,5.5,1500,22.40
canceled,2026-10-20 15:00:00 +0000 UTC,1.0,300,5.00
completed,2026-10-21T08:00:00Z,3.2,960,15.10`;

describe('parseCsv', () => {
  it('detecta ; e lida com aspas, BOM e linhas vazias', () => {
    const p = parseCsv(CSV_BR);
    expect(p.cabecalho[0]).toBe('Data');
    expect(p.linhas).toHaveLength(5);
    expect(p.linhas[4][2]).toBe('R$ 30,00');
  });
  it('detecta vírgula e aspas com separador dentro', () => {
    const p = parseCsv('a,b\n"1,5",x\n"diz ""oi""",y');
    expect(p.linhas).toEqual([
      ['1,5', 'x'],
      ['diz "oi"', 'y'],
    ]);
  });
});

describe('detectar colunas', () => {
  it('planilha em português: não confunde "Distância total" com valor', () => {
    const p = parseCsv(CSV_BR);
    const m = detectar(p.cabecalho, p.linhas);
    expect([m.data, m.valor, m.km, m.duracao, m.status]).toEqual([0, 2, 3, 4, 5]);
    expect(m.dist).toBe('km');
  });
  it('exportação em inglês: milhas e segundos pela unidade no nome', () => {
    const p = parseCsv(CSV_EN);
    const m = detectar(p.cabecalho, p.linhas);
    expect([m.data, m.valor, m.km, m.duracao, m.status]).toEqual([1, 4, 2, 3, 0]);
    expect(m.dist).toBe('mi');
    expect(m.tempo).toBe('seg');
  });
  it('"Valor por km" não vira a coluna de distância', () => {
    const m = detectar(['Data', 'Valor por km', 'Km', 'Ganho'], []);
    expect(m.km).toBe(2);
    expect(m.valor).toBe(3);
  });
});

describe('leitura de valores', () => {
  it('dinheiro', () => {
    expect(lerDinheiro('R$ 1.050,00')).toBe(1050);
    expect(lerDinheiro('22.40')).toBeCloseTo(22.4);
    expect(lerDinheiro('')).toBeNaN();
  });
  it('distância', () => {
    expect(lerDistancia('12,4', 'km')).toBeCloseTo(12.4);
    expect(lerDistancia('5.5', 'mi')).toBeCloseTo(8.85, 1);
    expect(lerDistancia('1500', 'm')).toBeCloseTo(1.5);
  });
  it('duração em vários formatos', () => {
    expect(lerDuracao('00:25:10', 'auto')).toBeCloseTo(25.17, 1);
    expect(lerDuracao('25:30', 'auto')).toBeCloseTo(25.5);
    expect(lerDuracao('1h 05min', 'auto')).toBe(65);
    expect(lerDuracao('20 min', 'auto')).toBe(20);
    expect(lerDuracao('1500', 'seg')).toBe(25);
    expect(lerDuracao('1,5', 'h')).toBe(90);
  });
  it('datas', () => {
    expect(lerData('20/10/2026 14:33')?.getHours()).toBe(14);
    expect(lerData('20/10/26')?.getFullYear()).toBe(2026);
    expect(lerData('2026-10-20 14:33:00 +0000 UTC')?.toISOString()).toBe('2026-10-20T14:33:00.000Z');
    expect(lerData('2026-10-21T08:00:00Z')?.toISOString()).toBe('2026-10-21T08:00:00.000Z');
    expect(lerData('31/02/2026')).toBeNull();
    expect(lerData('ontem')).toBeNull();
  });
});

describe('montar', () => {
  it('importa as válidas e explica o resto', () => {
    const p = parseCsv(CSV_BR);
    const r = montar(p, detectar(p.cabecalho, p.linhas), s, { plataforma: '99', existentes: new Set() });
    expect(r.validas).toHaveLength(2); // 23,50 e 30,00
    expect(r.canceladas).toBe(1);
    expect(r.invalidas.map((x) => x.motivo).sort()).toEqual(['sem valor', 'valor fora do normal']);
    const e = r.validas[0];
    expect(e.plataforma).toBe('99');
    expect(e.veiculo).toBe('v1');
    expect(e.minutos).toBe(25);
    expect(e.lucro).toBeLessThan(e.valor); // custos calculados com o veículo
  });
  it('importar de novo não duplica', () => {
    const p = parseCsv(CSV_EN);
    const m = detectar(p.cabecalho, p.linhas);
    const r1 = montar(p, m, s, { plataforma: 'uber', existentes: new Set() });
    expect(r1.validas).toHaveLength(2);
    expect(r1.canceladas).toBe(1);
    const r2 = montar(p, m, s, { plataforma: 'uber', existentes: new Set(r1.validas.map((e) => e.id)) });
    expect(r2.validas).toHaveLength(0);
    expect(r2.repetidas).toBe(2);
  });
});
