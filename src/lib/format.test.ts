import { describe, expect, it } from 'vitest';
import { maskCpfCnpj } from './format';
import { cpfCnpjValido } from './plan';

describe('maskCpfCnpj', () => {
  it('formata o CPF enquanto digita', () => {
    expect(maskCpfCnpj('5')).toBe('5');
    expect(maskCpfCnpj('5299')).toBe('529.9');
    expect(maskCpfCnpj('5299822')).toBe('529.982.2');
    expect(maskCpfCnpj('5299822472')).toBe('529.982.247-2');
    expect(maskCpfCnpj('52998224725')).toBe('529.982.247-25');
  });
  it('vira CNPJ a partir do 12º dígito', () => {
    expect(maskCpfCnpj('112223330001')).toBe('11.222.333/0001');
    expect(maskCpfCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });
  it('ignora letras e pontuação colada e corta no tamanho do CNPJ', () => {
    expect(maskCpfCnpj('529.982.247-25')).toBe('529.982.247-25');
    expect(maskCpfCnpj('abc52998224725')).toBe('529.982.247-25');
    expect(maskCpfCnpj('112223330001819999')).toBe('11.222.333/0001-81');
  });
  it('apagar caractere a caractere continua coerente', () => {
    let v = '529.982.247-25';
    while (v) {
      v = maskCpfCnpj(v.slice(0, -1));
      expect(v).toMatch(/^[\d.\-/]*$/);
    }
  });
  it('o valor mascarado passa na validação', () => {
    expect(cpfCnpjValido(maskCpfCnpj('52998224725'))).toBe(true);
    expect(cpfCnpjValido(maskCpfCnpj('11222333000181'))).toBe(true);
  });
});
