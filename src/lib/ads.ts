import { supabase } from './supabase';

/**
 * Anúncios para quem não é Pro.
 *
 * VITE_ADS escolhe o modo:
 *  - 'proprios' (padrão quando há Supabase): patrocinadores cadastrados na tabela `anuncios`.
 *    Só texto, imagem e link; nenhum script de terceiros roda no app. É o modo seguro.
 *  - 'adsense': Google AdSense (exige domínio próprio e aprovação do Google). Roda um script do Google
 *    dentro do app, então a política de segurança (CSP) é afrouxada para ele.
 *  - 'misto': patrocinador próprio quando houver um ativo; senão, Google AdSense.
 *  - 'off': sem anúncios.
 */
export type AdsMode = 'proprios' | 'adsense' | 'misto' | 'off';

const env = (import.meta.env.VITE_ADS as string | undefined)?.trim();
export const ADS_MODE: AdsMode =
  env === 'adsense' || env === 'off' || env === 'proprios' || env === 'misto' ? env : supabase ? 'proprios' : 'off';
export const ADSENSE_CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) ?? '';
export const ADSENSE_SLOT = (import.meta.env.VITE_ADSENSE_SLOT as string | undefined) ?? '';
/** AdSense só liga com o ID do editor e do bloco preenchidos. */
export const ADSENSE_ON = (ADS_MODE === 'adsense' || ADS_MODE === 'misto') && /^ca-pub-\d{10,20}$/.test(ADSENSE_CLIENT) && /^\d{5,20}$/.test(ADSENSE_SLOT);

export interface HouseAd {
  id: number;
  anunciante: string;
  titulo: string;
  texto: string | null;
  imagem_url: string | null;
  link_url: string;
  chamada: string;
  peso: number;
}

let cache: Promise<HouseAd[]> | null = null;

/** Anúncios ativos (uma consulta por sessão). */
export function loadHouseAds(): Promise<HouseAd[]> {
  if (!supabase) return Promise.resolve([]);
  if (!cache) {
    const sb = supabase;
    cache = (async () => {
      const { data, error } = await sb.from('anuncios').select('id, anunciante, titulo, texto, imagem_url, link_url, chamada, peso').limit(50);
      if (error) return [];
      return ((data ?? []) as HouseAd[]).filter((a) => safeUrl(a.link_url) && (!a.imagem_url || safeUrl(a.imagem_url)));
    })().catch(() => []);
  }
  return cache;
}

/** Sorteio ponderado pelo peso. `seed` deixa cada espaço da tela com um anúncio diferente. */
export function pickAd(ads: HouseAd[], seed: number): HouseAd | null {
  if (ads.length === 0) return null;
  const total = ads.reduce((s, a) => s + Math.max(1, a.peso), 0);
  let r = ((seed * 9301 + 49297) % 233280) / 233280 * total;
  for (const a of ads) {
    r -= Math.max(1, a.peso);
    if (r < 0) return a;
  }
  return ads[ads.length - 1];
}

/** Só https, sem usuário/senha embutidos na URL (truque comum de phishing). */
export function safeUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}
