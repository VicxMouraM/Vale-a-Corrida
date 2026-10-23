import { describe, expect, it } from 'vitest';
import { pickAd, safeUrl, type HouseAd } from './ads';

const ad = (id: number, peso = 1): HouseAd => ({ id, anunciante: 'X', titulo: 'T', texto: null, imagem_url: null, link_url: 'https://x.com', chamada: 'Ver', peso });

describe('anúncios próprios', () => {
  it('só aceita links https sem usuário/senha embutidos', () => {
    expect(safeUrl('https://oficina.com.br/promo')).toBe(true);
    expect(safeUrl('http://oficina.com.br')).toBe(false);
    expect(safeUrl('javascript:alert(1)')).toBe(false);
    expect(safeUrl('data:text/html,<script>')).toBe(false);
    expect(safeUrl('https://banco.com.br@golpe.com')).toBe(false); // parece o banco, vai para o golpe
    expect(safeUrl('não é url')).toBe(false);
  });
  it('sorteio respeita o peso e sempre devolve um anúncio da lista', () => {
    const lista = [ad(1, 1), ad(2, 99)];
    const contagem = { 1: 0, 2: 0 } as Record<number, number>;
    for (let seed = 0; seed < 1000; seed++) contagem[pickAd(lista, seed)!.id]++;
    expect(contagem[2]).toBeGreaterThan(contagem[1] * 10);
    expect(pickAd([], 1)).toBeNull();
  });
});
