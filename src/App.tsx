import { useEffect, useMemo, useState } from 'react';
import { Calculator } from './components/Calculator';
import { Goals } from './components/Goals';
import { History, type Draft } from './components/History';
import { SettingsPanel } from './components/SettingsPanel';
import { summarize, type Analysis } from './lib/calc';
import { dayKey } from './lib/period';
import { load, save } from './lib/storage';
import type { Tab } from './types';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'corrida', label: 'Corrida', icon: 'M4 17h16M6 17l1.5-6h9L18 17M8 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM9 7h6' },
  { id: 'historico', label: 'Histórico', icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
  { id: 'metas', label: 'Metas', icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01' },
  { id: 'ajustes', label: 'Ajustes', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z' },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export default function App() {
  const initial = useMemo(load, []);
  const [settings, setSettings] = useState(initial.settings);
  const [offer, setOffer] = useState(initial.offer);
  const [history, setHistory] = useState(initial.history);
  const [tab, setTab] = useState<Tab>(() => {
    const h = typeof location !== 'undefined' ? location.hash.slice(1) : '';
    return (TABS.some((t) => t.id === h) ? h : 'corrida') as Tab;
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setSaved(save({ settings, offer, history }));
  }, [settings, offer, history]);

  useEffect(() => {
    try {
      if (location.hash.slice(1) !== tab) window.history.replaceState(null, '', `#${tab}`);
    } catch {
      /* ambiente sem history */
    }
  }, [tab]);

  const hist = useMemo(() => summarize(history), [history]);
  const today = useMemo(() => {
    const k = dayKey(new Date());
    const t = summarize(history.filter((e) => dayKey(new Date(e.data)) === k));
    return { qtd: t.qtd, lucro: t.lucro };
  }, [history]);

  function openSettings() {
    setTab('ajustes');
    setTimeout(() => document.getElementById('aj-combustivel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }

  function goTab(t: Tab) {
    setTab(t);
    window.scrollTo({ top: 0 });
  }

  function registerFromAnalysis(a: Analysis) {
    setDraft({
      input: {
        data: new Date().toISOString(),
        valor: offer.valor,
        bonus: offer.bonus,
        km: Math.round(a.km * 10) / 10,
        minutos: offer.minutos,
        despesas: a.despesas,
        taxas: Math.round(a.taxas * 100) / 100,
        combustivel: a.combustivel,
      },
    });
    goTab('historico');
  }

  return (
    <div className="min-h-screen pb-[calc(76px+env(safe-area-inset-bottom,0px))] sm:pb-10">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="gutter mx-auto flex max-w-6xl items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <div className="font-display text-2xl font-bold leading-none tracking-wide">
              Vale a <span className="text-accent">Corrida?</span>
            </div>
            <div className="truncate text-xs text-muted">{settings.veiculo.nome}</div>
          </div>
          <nav className="hidden gap-1 sm:flex" aria-label="Seções">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => goTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  tab === t.id ? 'bg-accent text-accent-ink' : 'text-muted hover:bg-sunk hover:text-ink'
                }`}
              >
                <Icon d={t.icon} />
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
          </nav>
          {!saved && <span className="shrink-0 text-xs text-warn">Não foi possível salvar neste navegador</span>}
        </div>
      </header>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[env(safe-area-inset-top,0px)] bg-bg" />

      <main className="gutter mx-auto max-w-6xl py-5">
        {tab === 'corrida' && <Calculator offer={offer} setOffer={setOffer} settings={settings} onRegister={registerFromAnalysis} onOpenSettings={openSettings} today={today} />}
        {tab === 'metas' && <Goals s={settings} setSettings={setSettings} hist={hist} />}
        {tab === 'historico' && <History s={settings} history={history} setHistory={setHistory} draft={draft} setDraft={setDraft} />}
        {tab === 'ajustes' && <SettingsPanel s={settings} setSettings={setSettings} history={history} setHistory={setHistory} />}
      </main>

      {/* Navegação inferior no celular */}
      <div className="fixed inset-x-0 bottom-0 z-20 sm:hidden">
        <nav
          className="grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
          aria-label="Seções"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => goTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${tab === t.id ? 'text-accent' : 'text-muted'}`}
            >
              <Icon d={t.icon} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
