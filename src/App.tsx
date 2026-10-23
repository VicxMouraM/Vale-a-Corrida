import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './auth/AuthProvider';
import { AccountScreen, STATUS_TEXT } from './components/AccountScreen';
import { AuthScreen, NewPasswordScreen } from './components/AuthScreen';
import { Calculator } from './components/Calculator';
import { Goals } from './components/Goals';
import { LegalLinks, LegalScreen, type LegalDoc } from './components/LegalScreen';
import { Onboarding } from './components/Onboarding';
import { Tour, TUTORIAL } from './components/Tour';
import { PlanScreen } from './components/PlanScreen';
import { History, type Draft } from './components/History';
import { SettingsPanel } from './components/SettingsPanel';
import { summarize, type Analysis } from './lib/calc';
import { dayKey } from './lib/period';
import { PlanContext, planBadge, splitHistory, usePlanLoader, type Plan } from './lib/plan';
import { useAppData } from './lib/useAppData';
import type { HistoryEntry, Offer, Settings, Tab } from './types';

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
  const auth = useAuth();
  if (auth.loading) return <Splash text="Abrindo…" />;
  if (auth.recovering) return <NewPasswordScreen />;
  // key: trocar de usuário (ou sair) recomeça o estado do zero, sem misturar dados
  return <Main key={auth.user?.id ?? 'convidado'} uid={auth.user?.id ?? null} />;
}

function Splash({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="gutter flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <div className="font-display text-3xl font-bold tracking-wide">
        Vale a <span className="text-accent">Corrida?</span>
      </div>
      <p className="text-sm text-muted">{text}</p>
      {children}
    </div>
  );
}

function Main({ uid }: { uid: string | null }) {
  const auth = useAuth();
  const app = useAppData(uid);
  const planLoader = usePlanLoader(uid);
  const plan = planLoader.plan;
  type Screen = 'app' | 'login' | 'conta' | 'plano' | 'legal';
  const [screen, setScreen] = useState<Screen>('app');
  const [legal, setLegal] = useState<{ doc: LegalDoc; from: Screen }>({ doc: 'termos', from: 'app' });
  const openLegal = (doc: LegalDoc) => {
    setLegal({ doc, from: screen === 'legal' ? legal.from : screen });
    setScreen('legal');
    window.scrollTo({ top: 0 });
  };

  // Voltou da página de pagamento do Asaas (?pagamento=ok): avisa e confere o plano até o Pro liberar
  const [voltouDoPagamento] = useState(() => {
    try {
      const u = new URL(location.href);
      if (u.searchParams.get('pagamento') !== 'ok') return false;
      u.searchParams.delete('pagamento');
      window.history.replaceState(null, '', u.pathname + u.search + u.hash);
      return true;
    } catch {
      return false;
    }
  });
  const [pagamento, setPagamento] = useState<'aguardando' | 'liberado' | 'demorando' | null>(voltouDoPagamento ? 'aguardando' : null);
  useEffect(() => {
    if (pagamento !== 'aguardando' || !uid) return;
    if (plan.pro && plan.status === 'active') return setPagamento('liberado');
    let tentativas = 0;
    const t = setInterval(() => {
      tentativas++;
      if (tentativas > 20) {
        clearInterval(t);
        setPagamento('demorando');
      } else void planLoader.refresh();
    }, 3000);
    return () => clearInterval(t);
  }, [pagamento, uid, plan.pro, plan.status, planLoader.refresh]);
  useEffect(() => {
    if (pagamento !== 'liberado') return;
    const t = setTimeout(() => setPagamento(null), 10000);
    return () => clearTimeout(t);
  }, [pagamento]);

  // Virou Pro (pagou): busca de novo para trazer o histórico antigo que o plano grátis escondia
  const lastPro = useRef<boolean | null>(null);
  useEffect(() => {
    if (planLoader.loading) return;
    if (lastPro.current === false && plan.pro && uid) void app.retryLoad();
    lastPro.current = plan.pro;
  }, [plan.pro, planLoader.loading, uid, app.retryLoad]);

  if (!app.data) {
    return app.loadError ? (
      <Splash text="Não consegui carregar sua conta.">
        <p className="max-w-md break-words rounded-md bg-sunk px-3 py-2 font-mono text-xs text-muted">{app.loadError}</p>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink" onClick={() => void app.retryLoad()}>
          Tentar de novo
        </button>
      </Splash>
    ) : (
      <Splash text="Carregando sua conta…" />
    );
  }

  return (
    <PlanContext.Provider value={{ plan, upgrade: () => setScreen('plano'), loading: planLoader.loading }}>
    <Shell
      plan={plan}
      showPlan={auth.enabled}
      onPlan={() => setScreen('plano')}
      settings={app.data.settings}
      setSettings={app.setSettings}
      offer={app.data.offer}
      setOffer={app.setOffer}
      history={app.data.history}
      setHistory={app.setHistory}
      statusText={app.status === 'local' || app.status === 'synced' ? null : STATUS_TEXT[app.status]}
      statusBad={app.status === 'error' || app.status === 'local-err'}
      accountLabel={!auth.enabled ? null : uid ? 'Conta' : 'Entrar'}
      onAccount={() => setScreen(uid ? 'conta' : 'login')}
      closeOverlay={() => setScreen('app')}
      onLegal={openLegal}
      overlay={
        screen === 'login' && !uid ? (
          <AuthScreen onClose={() => setScreen('app')} onLegal={openLegal} />
        ) : screen === 'conta' && uid ? (
          <AccountScreen status={app.status} hasPending={app.hasPending} forgetDevice={app.forgetDevice} onBack={() => setScreen('app')} />
        ) : screen === 'legal' ? (
          <LegalScreen doc={legal.doc} onDoc={(doc) => setLegal({ ...legal, doc })} onBack={() => setScreen(legal.from)} />
        ) : screen === 'plano' ? (
          <PlanScreen
            plan={plan}
            loggedIn={!!uid}
            onLogin={() => setScreen('login')}
            onBack={() => setScreen('app')}
            refresh={planLoader.refresh}
            nomeConta={(auth.user?.user_metadata?.nome || auth.user?.user_metadata?.full_name || auth.user?.user_metadata?.name) as string | undefined}
          />
        ) : null
      }
      banner={
        <>
        {auth.notice && (
          <div
            role="status"
            className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm ${auth.notice.ok ? 'border-good/40 bg-good-soft' : 'border-warn/40 bg-warn-soft'}`}
          >
            <p>{auth.notice.text}</p>
            <button className="font-semibold text-muted hover:text-ink" onClick={auth.clearNotice}>
              Fechar
            </button>
          </div>
        )}
        {pagamento && (
          <div
            role="status"
            className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm ${
              pagamento === 'liberado' ? 'border-good/40 bg-good-soft' : pagamento === 'demorando' ? 'border-warn/40 bg-warn-soft' : 'border-accent/40 bg-surface'
            }`}
          >
            <p>
              {pagamento === 'liberado'
                ? '🎉 Pagamento confirmado! O Pro está liberado: histórico completo, gráficos e nada de anúncios.'
                : pagamento === 'demorando'
                  ? 'O pagamento ainda não foi confirmado. Pix e cartão costumam liberar em segundos; boleto leva até 3 dias úteis. O Pro aparece sozinho quando confirmar.'
                  : 'Pagamento recebido. Liberando o seu Pro… (leva alguns segundos)'}
            </p>
            <button className="font-semibold text-muted hover:text-ink" onClick={() => setPagamento(null)}>
              Fechar
            </button>
          </div>
        )}
        {app.importOffer && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-surface p-4">
            <p className="text-sm">
              Encontramos dados salvos neste aparelho
              {app.importOffer.corridas > 0 ? ` (${app.importOffer.corridas} corridas)` : ''}. Levar para a sua conta?
            </p>
            <div className="flex gap-2">
              <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink" onClick={app.importOffer.accept}>
                Levar para a conta
              </button>
              <button className="rounded-lg border border-line px-4 py-2 text-sm font-semibold" onClick={app.importOffer.dismiss}>
                Agora não
              </button>
            </div>
          </div>
        )}
        </>
      }
    />
    </PlanContext.Provider>
  );
}

interface ShellProps {
  plan: Plan;
  showPlan: boolean;
  onPlan: () => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  offer: Offer;
  setOffer: (o: Offer) => void;
  history: HistoryEntry[];
  setHistory: (h: HistoryEntry[]) => void;
  statusText: string | null;
  statusBad: boolean;
  accountLabel: string | null;
  onAccount: () => void;
  closeOverlay: () => void;
  onLegal: (d: LegalDoc) => void;
  overlay: ReactNode;
  banner: ReactNode;
}

function Shell({ plan, showPlan, onPlan, settings, setSettings, offer, setOffer, history, setHistory, statusText, statusBad, accountLabel, onAccount, closeOverlay, onLegal, overlay, banner }: ShellProps) {
  const [tab, setTab] = useState<Tab>(() => {
    const h = typeof location !== 'undefined' ? location.hash.slice(1) : '';
    return (TABS.some((t) => t.id === h) ? h : 'corrida') as Tab;
  });
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    try {
      if (location.hash.slice(1) !== tab) window.history.replaceState(null, '', `#${tab}`);
    } catch {
      /* ambiente sem history */
    }
  }, [tab]);

  // Plano grátis: as telas veem só os últimos 30 dias; o resto continua guardado intacto
  const { visible, hidden } = useMemo(() => splitHistory(history, plan.pro), [history, plan.pro]);
  const setVisible = (v: HistoryEntry[]) => setHistory(hidden.length ? [...hidden, ...v] : v);

  const hist = useMemo(() => summarize(visible), [visible]);
  const today = useMemo(() => {
    const k = dayKey(new Date());
    const t = summarize(visible.filter((e) => dayKey(new Date(e.data)) === k));
    return { qtd: t.qtd, lucro: t.lucro };
  }, [visible]);

  function openSettings(secao = 'aj-combustivel') {
    closeOverlay();
    setTab('ajustes');
    setTimeout(() => document.getElementById(secao)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }

  function goTab(t: Tab) {
    closeOverlay();
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
        veiculo: settings.veiculoAtivo ?? undefined,
        plataforma: settings.plataformaAtiva ?? undefined,
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
            <div className="truncate text-xs text-muted">{settings.veiculos.length ? settings.veiculo.nome : 'Primeiros passos'}</div>
          </div>
          <nav className="hidden gap-1 sm:flex" aria-label="Seções">
            {TABS.map((t) => (
              <button
                key={t.id}
                data-tour={`nav-${t.id}`}
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
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {statusText && <span className={`hidden text-xs sm:inline ${statusBad ? 'text-bad' : 'text-warn'}`}>{statusText}</span>}
            {showPlan && (
              <button
                data-tour="plano"
                onClick={onPlan}
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${plan.pro ? 'bg-accent text-accent-ink' : 'border border-accent/50 text-accent hover:bg-sunk'}`}
              >
                {plan.pro ? (
                  <>
                    <span className="sm:hidden">{planBadge(plan).replace('Teste Pro · ', 'Teste · ').replace(/ dias?$/, 'd')}</span>
                    <span className="hidden sm:inline">{planBadge(plan)}</span>
                  </>
                ) : (
                  'Seja Pro'
                )}
              </button>
            )}
            {accountLabel && (
              <button
                onClick={onAccount}
                aria-label={accountLabel}
                className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm font-semibold hover:bg-sunk sm:px-3"
              >
                <Icon d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" />
                <span className="hidden sm:inline">{accountLabel}</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[env(safe-area-inset-top,0px)] bg-bg" />

      <main className="gutter mx-auto max-w-6xl py-5">
        {statusText && <p className={`mb-3 text-xs sm:hidden ${statusBad ? 'text-bad' : 'text-warn'}`}>{statusText}</p>}
        {overlay ?? (
          <>
        {banner}
        {settings.veiculos.length === 0 ? (
          <Onboarding s={settings} setSettings={setSettings} />
        ) : (
          <>
        {tab === 'corrida' && !settings.tutorialVisto && !overlay && <Tour steps={TUTORIAL} onClose={() => setSettings({ ...settings, tutorialVisto: true })} />}
        {tab === 'corrida' && <Calculator offer={offer} setOffer={setOffer} settings={settings} setSettings={setSettings} onRegister={registerFromAnalysis} onOpenSettings={openSettings} today={today} />}
        {tab === 'metas' && <Goals s={settings} setSettings={setSettings} hist={hist} />}
        {tab === 'historico' && <History s={settings} history={visible} setHistory={setVisible} draft={draft} setDraft={setDraft} hiddenCount={hidden.length} />}
        {tab === 'ajustes' && <SettingsPanel s={settings} setSettings={setSettings} history={history} setHistory={setHistory} cloud={accountLabel === 'Conta'} onTutorial={() => {
          setSettings({ ...settings, tutorialVisto: false });
          goTab('corrida');
        }} />}
          </>
        )}
          </>
        )}
        <footer className="mt-10 border-t border-line pt-4 text-center text-xs text-muted">
          <a href="./como-calcular/" className="font-semibold text-accent underline-offset-2 hover:underline">
            Como calcular o lucro de uma corrida
          </a>
          <span className="mx-2">·</span>
          <LegalLinks onOpen={onLegal} />
        </footer>
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
              data-tour={`nav-${t.id}`}
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
