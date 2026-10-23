import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ADS_MODE, ADSENSE_CLIENT, ADSENSE_SLOT, loadHouseAds, pickAd, type HouseAd } from '../lib/ads';
import { usePlan } from '../lib/plan';

/** Espaço de anúncio. Pro não vê nada. `slot` diferencia os espaços da mesma tela. */
export function AdSlot({ slot }: { slot: number }) {
  const { plan, loading } = usePlan();
  if (plan.pro || loading || ADS_MODE === 'off') return null;
  return ADS_MODE === 'adsense' ? <AdSense /> : <HouseAdCard slot={slot} />;
}

function Frame({ children }: { children: ReactNode }) {
  const { upgrade } = usePlan();
  return (
    <aside aria-label="Anúncio" className="rounded-xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
        <span className="label-caps">Anúncio</span>
        <button className="font-semibold text-accent" onClick={upgrade}>
          Remover anúncios com o Pro
        </button>
      </div>
      {children}
    </aside>
  );
}

function HouseAdCard({ slot }: { slot: number }) {
  const [ad, setAd] = useState<HouseAd | null>(null);
  useEffect(() => {
    let alive = true;
    // Sorteio novo a cada dia, diferente para cada espaço
    const seed = Math.floor(Date.now() / 86400000) * 7 + slot;
    void loadHouseAds().then((ads) => alive && setAd(pickAd(ads, seed)));
    return () => {
      alive = false;
    };
  }, [slot]);
  if (!ad) return null;
  return (
    <Frame>
      {/* rel=sponsored: link pago; noopener/noreferrer: o site do anunciante não acessa o app nem sabe de onde veio */}
      <a href={ad.link_url} target="_blank" rel="sponsored noopener noreferrer" className="flex items-center gap-3 rounded-lg hover:bg-sunk">
        {ad.imagem_url && <img src={ad.imagem_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-16 w-16 shrink-0 rounded-md object-cover" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-muted">{ad.anunciante}</div>
          <div className="font-semibold leading-tight">{ad.titulo}</div>
          {ad.texto && <div className="line-clamp-2 text-sm text-muted">{ad.texto}</div>}
        </div>
        <span className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink">{ad.chamada}</span>
      </a>
    </Frame>
  );
}

let adsenseLoaded = false;
function AdSense() {
  const ref = useRef<HTMLModElement | null>(null);
  useEffect(() => {
    if (!ADSENSE_CLIENT || !ADSENSE_SLOT) return;
    const w = window as unknown as { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };
    w.adsbygoogle = w.adsbygoogle || [];
    w.adsbygoogle.requestNonPersonalizedAds = 1; // sem anúncios personalizados: não precisa de consentimento de rastreamento
    if (!adsenseLoaded) {
      const s = document.createElement('script');
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
      document.head.appendChild(s);
      adsenseLoaded = true;
    }
    try {
      w.adsbygoogle.push({});
    } catch {
      /* bloqueador de anúncios */
    }
  }, []);
  if (!ADSENSE_CLIENT || !ADSENSE_SLOT) return null;
  return (
    <Frame>
      <ins ref={ref} className="adsbygoogle block" style={{ display: 'block' }} data-ad-client={ADSENSE_CLIENT} data-ad-slot={ADSENSE_SLOT} data-ad-format="auto" data-full-width-responsive="true" />
    </Frame>
  );
}
