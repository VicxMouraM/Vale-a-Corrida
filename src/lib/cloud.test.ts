import { describe, expect, it } from 'vitest';
import type { HistoryEntry } from '../types';
import { applyOps, diffHistory, fromRow, mergeHistories, toRow } from './cloud';
import { cleanHistory } from './storage';

function entry(id: string, over: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id,
    data: '2026-10-20T12:00:00.000Z',
    valor: 40,
    bonus: 0,
    km: 15,
    minutos: 45,
    despesas: 0,
    taxas: 0,
    combustivel: 'gasolina',
    precoLitro: 6.34,
    kml: 5,
    custoCombustivel: 19.02,
    custoDesgaste: 4.5,
    custoFixo: 2.1,
    lucro: 14.38,
    ...over,
  };
}

describe('conversão app ↔ banco', () => {
  it('ida e volta mantém a corrida', () => {
    const e = entry('a', { obs: 'chuva' });
    expect(fromRow(toRow(e))).toEqual(e);
  });
  it('obs vazia vira null no banco e some na volta', () => {
    expect(toRow(entry('a')).obs).toBeNull();
    expect(fromRow(toRow(entry('a')))).not.toHaveProperty('obs', null);
  });
  it('data com fuso do Postgres volta igual', () => {
    const r = { ...toRow(entry('a')), data: '2026-10-20T12:00:00+00:00' };
    expect(fromRow(r).data).toBe('2026-10-20T12:00:00.000Z');
  });
});

describe('diffHistory', () => {
  it('detecta novas, alteradas e apagadas', () => {
    const base = [entry('a'), entry('b'), entry('c')];
    const next = [base[0], { ...base[1], valor: 50 }, entry('d')];
    const ops = diffHistory(base, next);
    expect(ops.upserts.map((e) => e.id)).toEqual(['b', 'd']);
    expect(ops.deletes).toEqual(['c']);
  });
  it('cópia igual não gera envio', () => {
    const base = [entry('a')];
    expect(diffHistory(base, [{ ...base[0] }])).toEqual({ upserts: [], deletes: [] });
  });
});

describe('applyOps', () => {
  it('pendência local vence o servidor', () => {
    const server = [entry('a'), entry('b'), entry('c')];
    const out = applyOps(server, { upserts: [entry('b', { valor: 99 }), entry('z')], deletes: ['c'] });
    expect(out.map((e) => e.id).sort()).toEqual(['a', 'b', 'z']);
    expect(out.find((e) => e.id === 'b')!.valor).toBe(99);
  });
});

describe('mergeHistories', () => {
  it('não duplica e mantém a versão da conta', () => {
    const out = mergeHistories([entry('a', { valor: 1 })], [entry('a', { valor: 2 }), entry('b')]);
    expect(out.map((e) => [e.id, e.valor])).toEqual([
      ['a', 1],
      ['b', 40],
    ]);
  });
});

describe('cleanHistory', () => {
  it('mantém corridas válidas', () => {
    expect(cleanHistory([entry('a'), entry('b', { lucro: -5 })])).toHaveLength(2);
  });
  it('descarta malformadas, duplicadas e absurdas', () => {
    const ruins = [
      null,
      'texto',
      { ...entry('x'), id: '' },
      { ...entry('x'), data: 'ontem' },
      { ...entry('x'), combustivel: 'diesel' },
      { ...entry('x'), valor: '40' },
      { ...entry('x'), km: -1 },
      { ...entry('x'), valor: 1e9 },
      { ...entry('x'), minutos: NaN },
    ];
    expect(cleanHistory([entry('a'), entry('a'), ...ruins]).map((e) => e.id)).toEqual(['a']);
  });
  it('completa campos numéricos ausentes com zero e corta obs longa', () => {
    const { bonus: _b, ...semBonus } = entry('a');
    const [e] = cleanHistory([{ ...semBonus, obs: 'x'.repeat(900) }]);
    expect(e.bonus).toBe(0);
    expect(e.obs).toHaveLength(500);
  });
  it('não é lista: vazio', () => {
    expect(cleanHistory({})).toEqual([]);
  });
});
