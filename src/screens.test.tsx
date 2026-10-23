import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import { Calculator } from './components/Calculator';
import { Goals } from './components/Goals';
import { History } from './components/History';
import { LegalScreen } from './components/LegalScreen';
import { Onboarding } from './components/Onboarding';
import { PlanScreen } from './components/PlanScreen';
import { SettingsPanel } from './components/SettingsPanel';
import { DEFAULT_SETTINGS, EXAMPLE_OFFER } from './defaults';
import { buildEntry, summarize } from './lib/calc';
import { FREE_PLAN, PlanContext, type Plan } from './lib/plan';
import { addPlatform, buildPlatform } from './lib/platforms';
import { addVehicle, buildVehicle } from './lib/vehicles';
import type { Settings } from './types';

/** Teste de fumaça: cada tela renderiza sem quebrar, no Grátis e no Pro. */
const PRO: Plan = { ...FREE_PLAN, pro: true, status: 'active', periodEnd: '2099-01-01T00:00:00Z' };
const noop = () => undefined;

function configured(): Settings {
  let s = addVehicle(DEFAULT_SETTINGS, buildVehicle({ id: 'a', nome: 'Onix 1.0', tipo: 'popular', automatico: false, blindado: false }));
  s = addVehicle(s, buildVehicle({ id: 'b', nome: 'CG 160', tipo: 'moto', automatico: false, blindado: false }));
  s = addPlatform(addPlatform(s, buildPlatform('uber')), buildPlatform('lalamove'));
  return s;
}

function history(s: Settings) {
  const base = { valor: 30, bonus: 0, km: 10, minutos: 30, despesas: 0, taxas: 0, combustivel: 'gasolina' as const };
  return [
    buildEntry({ ...base, data: new Date().toISOString(), plataforma: 'uber', veiculo: 'a' }, s, 'h1'),
    buildEntry({ ...base, data: new Date().toISOString(), valor: 50, plataforma: 'lalamove', veiculo: 'b' }, s, 'h2'),
    buildEntry({ ...base, data: new Date(Date.now() - 60 * 86400000).toISOString(), plataforma: 'uber' }, s, 'h3'),
  ];
}

const withPlan = (plan: Plan, el: JSX.Element) => renderToString(<PlanContext.Provider value={{ plan, upgrade: noop }}>{el}</PlanContext.Provider>);

describe('telas', () => {
  it('app novo (convidado) abre o assistente de primeiro uso', () => {
    const html = renderToString(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(html).toContain('Bem-vindo');
  });

  it('assistente de primeiro uso', () => {
    expect(withPlan(FREE_PLAN, <Onboarding s={DEFAULT_SETTINGS} setSettings={noop} />)).toContain('Onde você trabalha');
  });

  for (const [nome, plan] of [
    ['grátis', FREE_PLAN],
    ['pro', PRO],
  ] as const) {
    describe(nome, () => {
      const s = configured();
      const h = history(s);

      it('calculadora usa os rótulos da plataforma em uso', () => {
        const html = withPlan(plan, <Calculator offer={EXAMPLE_OFFER} setOffer={noop} settings={s} setSettings={noop} onRegister={noop} onOpenSettings={noop} today={{ qtd: 0, lucro: 0 }} />);
        expect(html).toContain('Lalamove');
        expect(html).toContain('Até a coleta');
      });

      it('histórico', () => {
        const html = withPlan(plan, <History s={s} history={h} setHistory={noop} draft={null} setDraft={noop} />);
        expect(html).toContain('Corridas');
        if (plan.pro) expect(html).toContain('Lucro por plataforma');
        else expect(html).toContain('Qual plataforma dá mais lucro'); // trava do Pro
      });

      it('metas', () => {
        const html = withPlan(plan, <Goals s={s} setSettings={noop} hist={summarize(h)} />);
        expect(html).toContain(plan.pro ? 'Por semana' : 'Metas da semana e do mês');
      });

      it('ajustes com garagem e plataformas', () => {
        const html = withPlan(plan, <SettingsPanel s={s} setSettings={noop} history={h} setHistory={noop} />);
        expect(html).toContain('Veículos');
        expect(html).toContain('CG 160');
        expect(html).toContain('Plataformas e taxas');
      });

      it('tela do plano', () => {
        expect(withPlan(plan, <PlanScreen plan={plan} loggedIn onLogin={noop} onBack={noop} refresh={async () => undefined} />)).toContain('49,99');
      });
    });
  }

  it('termos e privacidade', () => {
    expect(renderToString(<LegalScreen doc="termos" onDoc={noop} onBack={noop} />)).toContain('Planos e pagamento');
    expect(renderToString(<LegalScreen doc="privacidade" onDoc={noop} onBack={noop} />)).toContain('LGPD');
  });
});
