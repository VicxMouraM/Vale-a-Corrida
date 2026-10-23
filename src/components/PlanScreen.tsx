import { useState, type FormEvent } from 'react';
import { brl } from '../lib/format';
import { cancelSubscription, cpfCnpjValido, daysLeft, DIAS_HISTORICO_GRATIS, PRECO_PRO, startCheckout, type Plan } from '../lib/plan';
import { ProTag } from './Pro';
import { Btn, Card, Segmented, TextField } from './ui';

type Billing = 'PIX' | 'CREDIT_CARD' | 'BOLETO';

const RECURSOS: { nome: string; gratis: string | boolean; pro: string | boolean }[] = [
  { nome: 'Calculadora e semáforo da corrida', gratis: true, pro: true },
  { nome: 'Meta do dia', gratis: true, pro: true },
  { nome: 'Histórico de corridas', gratis: `últimos ${DIAS_HISTORICO_GRATIS} dias`, pro: 'completo' },
  { nome: 'Veículos', gratis: '1', pro: 'vários' },
  { nome: 'Plataformas (Uber, 99, Lalamove…)', gratis: '1', pro: 'várias, com comparação' },
  { nome: 'Metas da semana e do mês', gratis: false, pro: true },
  { nome: 'Gráficos e relatórios', gratis: false, pro: true },
  { nome: 'Exportar para Excel (CSV)', gratis: false, pro: true },
];

const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface Props {
  plan: Plan;
  loggedIn: boolean;
  onLogin: () => void;
  onBack: () => void;
  refresh: () => Promise<void>;
}

export function PlanScreen({ plan, loggedIn, onLogin, onBack, refresh }: Props) {
  const [cpf, setCpf] = useState('');
  const [billing, setBilling] = useState<Billing>(plan.billingType ?? 'PIX');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const pago = plan.periodEnd && new Date(plan.periodEnd) > new Date();
  const ativo = plan.status === 'active' && pago;
  const podeCancelar = ['active', 'overdue', 'pending', 'trial'].includes(plan.status) && !!plan.billingType;

  async function assinar(e: FormEvent) {
    e.preventDefault();
    if (!cpfCnpjValido(cpf)) return setError('Confira o CPF (ou CNPJ). Ele é exigido para emitir a cobrança.');
    setBusy(true);
    setError(null);
    const r = await startCheckout(cpf, billing);
    setBusy(false);
    if (r.error || !r.invoiceUrl) return setError(r.error ?? 'Não foi possível gerar a cobrança.');
    setWaiting(true);
    // Mesma janela: funciona igual no navegador e no app instalado. Ao voltar, o plano é conferido de novo.
    window.location.assign(r.invoiceUrl);
  }

  async function cancelar() {
    setBusy(true);
    setError(null);
    const r = await cancelSubscription();
    setBusy(false);
    setConfirmCancel(false);
    if (r.error) return setError(r.error);
    setMsg(pago ? `Assinatura cancelada. O Pro continua liberado até ${fmtData(plan.periodEnd!)}.` : 'Assinatura cancelada.');
    void refresh();
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <button onClick={onBack} className="justify-self-start text-sm font-semibold text-muted hover:text-ink">
        ← Voltar
      </button>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-wide">
            Vale a Corrida <ProTag />
          </h1>
          <div className="font-display text-2xl font-semibold text-accent">
            {brl(PRECO_PRO)}
            <span className="text-sm font-normal text-muted">/mês</span>
          </div>
        </div>
        <Situacao plan={plan} />

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="label-caps border-b border-line text-left text-muted">
                <th className="py-2 pr-2 font-semibold">Recurso</th>
                <th className="py-2 pr-2 text-center font-semibold">Grátis</th>
                <th className="py-2 text-center font-semibold text-accent">Pro</th>
              </tr>
            </thead>
            <tbody>
              {RECURSOS.map((r) => (
                <tr key={r.nome} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-2">{r.nome}</td>
                  <td className="py-2 pr-2 text-center text-muted">{cell(r.gratis)}</td>
                  <td className="py-2 text-center font-medium">{cell(r.pro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {!loggedIn ? (
        <Card>
          <p className="mb-3 text-sm">Para assinar o Pro, primeiro crie sua conta (ganha 7 dias de Pro grátis).</p>
          <Btn kind="primary" onClick={onLogin}>
            Criar conta ou entrar
          </Btn>
        </Card>
      ) : ativo ? null : (
        <Card>
          <h2 className="mb-1 font-display text-xl font-semibold tracking-wide">Assinar o Pro</h2>
          <p className="mb-3 text-sm text-muted">
            Pagamento processado pelo Asaas. Renova todo mês; cancele quando quiser, aqui mesmo.
            {plan.trialEndsAt && new Date(plan.trialEndsAt) > new Date() && ' Se assinar durante o teste, a primeira cobrança vence só quando o teste acabar.'}
          </p>
          <form onSubmit={assinar} className="grid gap-3" noValidate>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-muted">Forma de pagamento</span>
              <Segmented<Billing>
                label="Forma de pagamento"
                value={billing}
                onChange={setBilling}
                options={[
                  { value: 'PIX', label: 'Pix' },
                  { value: 'CREDIT_CARD', label: 'Cartão' },
                  { value: 'BOLETO', label: 'Boleto' },
                ]}
              />
              <span className="text-xs text-muted">
                {billing === 'CREDIT_CARD'
                  ? 'Cobrado automaticamente todo mês no cartão.'
                  : billing === 'PIX'
                    ? 'Todo mês chega um Pix para pagar. Libera na hora.'
                    : 'Todo mês chega um boleto. Libera em até 3 dias úteis após o pagamento.'}
              </span>
            </div>
            <TextField label="CPF ou CNPJ (exigido para a cobrança)" value={cpf} onChange={setCpf} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" />
            <p className="-mt-1 text-xs text-muted">O CPF vai só para o Asaas, que emite a cobrança. Não guardamos no app.</p>
            {error && (
              <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
                {error}
              </p>
            )}
            <Btn type="submit" kind="primary" disabled={busy || cpf.replace(/\D/g, '').length < 11} className="py-2.5">
              {busy ? 'Gerando cobrança…' : `Assinar por ${brl(PRECO_PRO)}/mês`}
            </Btn>
          </form>
          {waiting && (
            <div className="mt-3 rounded-md bg-sunk px-3 py-2 text-sm" role="status">
              Abrindo a página de pagamento… Depois de pagar, volte para o app: o Pro é liberado sozinho em alguns segundos.{' '}
              <button className="font-semibold text-accent" onClick={() => void refresh()}>
                Já paguei, conferir
              </button>
            </div>
          )}
        </Card>
      )}

      {loggedIn && podeCancelar && (
        <Card>
          <h2 className="mb-1 font-display text-xl font-semibold tracking-wide">Cancelar assinatura</h2>
          <p className="mb-3 text-sm text-muted">
            Sem multa. {pago ? `O Pro continua liberado até ${fmtData(plan.periodEnd!)}.` : ''} Seu histórico fica guardado: se voltar a assinar, tudo reaparece.
          </p>
          {confirmCancel ? (
            <div className="flex flex-wrap gap-2">
              <Btn kind="danger" disabled={busy} onClick={cancelar}>
                Sim, cancelar
              </Btn>
              <Btn onClick={() => setConfirmCancel(false)}>Voltar</Btn>
            </div>
          ) : (
            <Btn kind="danger" onClick={() => setConfirmCancel(true)}>
              Cancelar assinatura
            </Btn>
          )}
          {ativo && error && <p className="mt-2 text-sm text-bad">{error}</p>}
        </Card>
      )}
      {msg && (
        <p className="rounded-md bg-good-soft px-3 py-2 text-sm text-good" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}

function Situacao({ plan }: { plan: Plan }) {
  const now = new Date();
  let texto: string;
  let tom = 'text-muted';
  if (plan.status === 'active' && plan.periodEnd && new Date(plan.periodEnd) > now) {
    texto = `Assinatura ativa. Renova em ${fmtData(plan.periodEnd)}.`;
    tom = 'text-good';
  } else if (plan.status === 'overdue' && plan.pro) {
    texto = `Pagamento em atraso. O Pro continua até ${fmtData(plan.periodEnd!)}: pague a cobrança para não perder o acesso.`;
    tom = 'text-warn';
  } else if (plan.status === 'canceled' && plan.pro && plan.periodEnd) {
    texto = `Assinatura cancelada. O Pro continua até ${fmtData(plan.periodEnd)}.`;
    tom = 'text-warn';
  } else if (plan.pro && plan.trialEndsAt && new Date(plan.trialEndsAt) > now) {
    const d = daysLeft(plan.trialEndsAt);
    texto = `Você está no teste grátis do Pro: ${d} ${d === 1 ? 'dia restante' : 'dias restantes'} (até ${fmtData(plan.trialEndsAt)}).`;
    tom = 'text-good';
  } else if (plan.status === 'pending') {
    texto = 'Aguardando o pagamento da primeira cobrança.';
    tom = 'text-warn';
  } else {
    texto = 'Você está no plano grátis.';
  }
  return <p className={`mt-1 text-sm ${tom}`}>{texto}</p>;
}

function cell(v: string | boolean) {
  if (v === true) return '✓';
  if (v === false) return '—';
  return v;
}
