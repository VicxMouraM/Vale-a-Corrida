import { describe, expect, it } from 'vitest';
import type { HistoryEntry } from '../types';
import { cpfCnpjValido, daysLeft, FREE_PLAN, planBadge, splitHistory } from './plan';

const now = new Date('2026-10-22T12:00:00Z');
const at = (diasAtras: number) => new Date(now.getTime() - diasAtras * 86400000).toISOString();
const e = (id: string, data: string) => ({ id, data }) as HistoryEntry;

describe('splitHistory', () => {
  const h = [e('hoje', at(0)), e('29d', at(29)), e('31d', at(31)), e('1ano', at(365))];
  it('Pro vê tudo', () => {
    expect(splitHistory(h, true, now).visible).toHaveLength(4);
  });
  it('grátis vê só os últimos 30 dias e o resto fica guardado', () => {
    const { visible, hidden } = splitHistory(h, false, now);
    expect(visible.map((x) => x.id)).toEqual(['hoje', '29d']);
    expect(hidden.map((x) => x.id)).toEqual(['31d', '1ano']);
  });
});

describe('cpfCnpjValido', () => {
  it('aceita CPF e CNPJ válidos, com ou sem pontuação', () => {
    expect(cpfCnpjValido('529.982.247-25')).toBe(true);
    expect(cpfCnpjValido('52998224725')).toBe(true);
    expect(cpfCnpjValido('11.222.333/0001-81')).toBe(true);
  });
  it('recusa dígito errado, repetidos e tamanho errado', () => {
    expect(cpfCnpjValido('529.982.247-24')).toBe(false);
    expect(cpfCnpjValido('111.111.111-11')).toBe(false);
    expect(cpfCnpjValido('1234')).toBe(false);
    expect(cpfCnpjValido('11.222.333/0001-82')).toBe(false);
  });
});

describe('planBadge', () => {
  it('grátis', () => expect(planBadge(FREE_PLAN)).toBe('Grátis'));
  it('teste mostra dias restantes', () => {
    const fim = new Date(Date.now() + 3 * 86400000 - 1000).toISOString();
    expect(planBadge({ ...FREE_PLAN, pro: true, status: 'trial', trialEndsAt: fim })).toBe('Teste Pro · 3 dias');
  });
  it('assinante', () => {
    expect(planBadge({ ...FREE_PLAN, pro: true, status: 'active', periodEnd: '2099-01-01T00:00:00Z' })).toBe('Pro');
  });
});

describe('daysLeft', () => {
  it('arredonda para cima e nunca fica negativo', () => {
    expect(daysLeft(new Date(now.getTime() + 1.2 * 86400000).toISOString(), now)).toBe(2);
    expect(daysLeft(at(5), now)).toBe(0);
    expect(daysLeft(null, now)).toBe(0);
  });
});
