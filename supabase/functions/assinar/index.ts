// Cria (ou reaproveita) a assinatura Pro no Asaas e devolve o link de pagamento da cobrança em aberto.
// Chamada pelo app com o usuário logado. Corpo: { nome: string, cpfCnpj: string, billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO' }
//
// Antifraude:
// - conta bloqueada (chargeback, fraude) ou CPF/e-mail em lista de bloqueio → recusa
// - no máximo 5 cobranças geradas por hora e 10 por dia por usuário (evita teste de cartões e spam de cobranças)
// - e-mail precisa estar confirmado
import {
  admin,
  asaas,
  AsaasError,
  audit,
  cors,
  countRecent,
  cpfCnpjValido,
  cpfHash,
  emailHashDb,
  hojeSP,
  isBlocked,
  json,
  PRECO_PRO,
  userFrom,
} from '../_shared/util.ts';

type Billing = 'PIX' | 'CREDIT_CARD' | 'BOLETO';
const TIPOS: Billing[] = ['PIX', 'CREDIT_CARD', 'BOLETO'];

interface Payment {
  id: string;
  status: string;
  invoiceUrl: string;
  dueDate: string;
}

/**
 * Depois de pagar (Pix ou cartão), o Asaas manda a pessoa de volta ao app.
 * APP_URL precisa ser do MESMO domínio cadastrado em Asaas → Minha conta → Informações (site).
 */
const APP_URL = (Deno.env.get('APP_URL') ?? '').trim();
const CALLBACK = /^https:\/\/[^/]+/.test(APP_URL)
  ? { successUrl: `${APP_URL.replace(/\/+$/, '')}/?pagamento=ok#corrida`, autoRedirect: true }
  : null;

const MSG_BLOQUEIO = 'Não é possível assinar com esta conta. Se acha que é um engano, fale com o suporte pelo e-mail dos Termos de uso.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405);

  const user = await userFrom(req);
  if (!user) return json(req, { error: 'Entre na sua conta para assinar.' }, 401);
  if (user.email && !user.email_confirmed_at) return json(req, { error: 'Confirme o seu e-mail antes de assinar.' }, 403);

  let body: { nome?: string; cpfCnpj?: string; billingType?: string };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: 'Pedido inválido.' }, 400);
  }
  const cpfCnpj = String(body.cpfCnpj ?? '').replace(/\D/g, '');
  const billingType = body.billingType as Billing;
  if (!cpfCnpjValido(cpfCnpj)) return json(req, { error: 'CPF ou CNPJ inválido.' }, 400);
  if (!TIPOS.includes(billingType)) return json(req, { error: 'Forma de pagamento inválida.' }, 400);
  // Nome do comprador (aparece na cobrança e no recibo). Nome de pessoa ou razão social (MEI tem números).
  const nome = String(body.nome ?? '').replace(/\s+/g, ' ').trim();
  if (nome.length < 3 || nome.length > 100 || !/^[\p{L}\p{N}][\p{L}\p{N} .,'&/\-]*$/u.test(nome) || !nome.includes(' ')) {
    return json(req, { error: 'Informe o nome completo (nome e sobrenome), igual ao do CPF ou CNPJ.' }, 400);
  }

  const db = admin();
  const { data: sub, error } = await db.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();
  if (error) {
    console.error('assinar: leitura de subscriptions', error); // aparece em Edge Functions → assinar → Logs
    return json(req, { error: 'Erro ao ler a assinatura.' }, 500);
  }

  try {
    // Bloqueios: conta, CPF ou e-mail com histórico de contestação/fraude
    const hCpf = await cpfHash(cpfCnpj);
    const hEmail = user.email ? await emailHashDb(db, user.email) : null;
    if (sub?.bloqueado || (await isBlocked(db, 'cpf', hCpf)) || (hEmail && (await isBlocked(db, 'email', hEmail)))) {
      await audit(db, user.id, 'assinar_bloqueado', { cpf_hash: hCpf.slice(0, 12) });
      return json(req, { error: MSG_BLOQUEIO }, 403);
    }

    // Limite de tentativas (conta todas, inclusive as que falham)
    if ((await countRecent(db, user.id, 'assinar_tentativa', 60)) >= 5 || (await countRecent(db, user.id, 'assinar_tentativa', 24 * 60)) >= 10) {
      return json(req, { error: 'Muitas tentativas de assinatura. Espere um pouco e tente de novo.' }, 429);
    }
    await audit(db, user.id, 'assinar_tentativa', { billingType });

    // Já paga e em dia: nada a fazer
    if (sub?.status === 'active' && sub.current_period_end && new Date(sub.current_period_end) > new Date()) {
      return json(req, { error: 'Sua assinatura Pro já está ativa.' }, 409);
    }

    // Cliente no Asaas (CPF fica só no Asaas; aqui guardamos só o hash com segredo, para bloqueios)
    let customerId: string | null = sub?.asaas_customer_id ?? null;
    if (!customerId) {
      const c = await asaas<{ id: string }>('POST', '/customers', {
        name: nome,
        email: user.email,
        cpfCnpj,
        externalReference: user.id,
        notificationDisabled: false,
      });
      customerId = c.id;
    } else {
      await asaas('PUT', `/customers/${customerId}`, { name: nome, cpfCnpj });
    }

    // Assinatura em aberto com a mesma forma de pagamento: devolve o link que já existe
    let subscriptionId: string | null = sub?.asaas_subscription_id ?? null;
    const emAberto = !!subscriptionId && !['canceled', 'refunded'].includes(sub?.status ?? '');
    const reaproveitavel = emAberto && sub?.asaas_billing_type === billingType;
    if (emAberto && !reaproveitavel) {
      // Trocou a forma de pagamento antes de pagar: cancela a antiga
      await asaas('DELETE', `/subscriptions/${subscriptionId}`).catch(() => undefined);
      subscriptionId = null;
    }
    if (!reaproveitavel || !subscriptionId) {
      const dados = {
        customer: customerId,
        billingType,
        value: PRECO_PRO,
        nextDueDate: primeiroVencimento([sub?.trial_ends_at, sub?.current_period_end]),
        cycle: 'MONTHLY',
        description: 'Vale a Corrida Pro',
        externalReference: user.id,
      };
      // Com retorno ao site; se o Asaas recusar o endereço (domínio diferente do cadastrado na conta), cria sem.
      const s = await asaas<{ id: string }>('POST', '/subscriptions', CALLBACK ? { ...dados, callback: CALLBACK } : dados).catch((e) => {
        if (!CALLBACK || !(e instanceof AsaasError) || e.status >= 500) throw e;
        console.warn('assinar: retorno ao site recusado pelo Asaas, criando sem', e.message);
        return asaas<{ id: string }>('POST', '/subscriptions', dados);
      });
      subscriptionId = s.id;
    }

    const pays = await asaas<{ data: Payment[] }>('GET', `/subscriptions/${subscriptionId}/payments`);
    const aberta = pays.data.find((p) => p.status === 'PENDING' || p.status === 'OVERDUE') ?? pays.data[0];
    // Cobrança reaproveitada (criada antes do retorno existir): coloca o retorno nela também
    if (CALLBACK && aberta && reaproveitavel) {
      await asaas('PUT', `/payments/${aberta.id}`, { callback: CALLBACK }).catch((e) => console.warn('assinar: callback na cobrança', e));
    }

    const novoStatus = sub?.status === 'trial' || sub?.status === 'active' || sub?.status === 'overdue' ? sub.status : 'pending';
    const up = await db.from('subscriptions').upsert({
      user_id: user.id,
      status: novoStatus,
      asaas_customer_id: customerId,
      asaas_subscription_id: subscriptionId,
      asaas_billing_type: billingType,
      cancelado_em: null,
      motivo_cancelamento: null,
    });
    if (up.error) throw up.error;
    await audit(db, user.id, 'assinar', { billingType, subscriptionId, reaproveitada: reaproveitavel, cpf_hash: hCpf.slice(0, 12) });

    if (!aberta?.invoiceUrl) return json(req, { error: 'A cobrança ainda está sendo gerada. Tente de novo em alguns segundos.' }, 503);
    return json(req, { invoiceUrl: aberta.invoiceUrl });
  } catch (e) {
    console.error('assinar', e);
    if (e instanceof AsaasError && e.status < 500) return json(req, { error: e.message }, 400);
    return json(req, { error: 'Não foi possível gerar a cobrança agora. Tente de novo.' }, 502);
  }
});

/**
 * Se ainda há Pro liberado (teste grátis ou período pago antes de cancelar), a primeira cobrança
 * vence quando ele acaba: dá para pagar antes sem perder dias.
 */
function primeiroVencimento(fins: (string | null | undefined)[]): string {
  const hoje = hojeSP();
  const ultimo = Math.max(0, ...fins.filter(Boolean).map((f) => new Date(f!).getTime()));
  if (ultimo <= Date.now()) return hoje;
  const fim = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(ultimo));
  return fim > hoje ? fim : hoje;
}
