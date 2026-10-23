// Recebe os avisos do Asaas e libera, mantém ou corta o Pro.
// Publicar com verificação de JWT desligada (quem chama é o Asaas): `supabase functions deploy asaas-webhook --no-verify-jwt`
// A autenticação é o cabeçalho `asaas-access-token`, igual ao token cadastrado no webhook do Asaas.
//
// Regras:
// - Pagamento confirmado: Pro até o próximo vencimento + tolerância (nunca encurta um período maior).
// - Atraso: continua Pro até acabar a tolerância; a rotina diária cancela de vez depois de 7 dias.
// - Estorno: corta na hora e cancela a assinatura. O 1º é direito de arrependimento (CDC art. 49);
//   a partir do 2º, a conta, o CPF e o e-mail ficam bloqueados para assinar de novo.
// - Chargeback (contestação no cartão): corta, cancela e bloqueia conta, CPF e e-mail.
// - Pagamento de outro cliente ou com valor abaixo do preço: ignorado e registrado na auditoria.
import { admin, asaas, audit, cpfHash, emailHashDb, igual, PRECO_PRO, TOLERANCIA_DIAS } from '../_shared/util.ts';

interface Evento {
  id: string;
  event: string;
  payment?: { id: string; subscription?: string; externalReference?: string; customer?: string; dueDate?: string; value?: number };
  subscription?: { id: string; externalReference?: string; customer?: string };
}

interface Sub {
  user_id: string;
  current_period_end: string | null;
  asaas_subscription_id: string | null;
  asaas_customer_id: string | null;
}

const ok = () => new Response('ok', { status: 200 });
const CHARGEBACK = ['PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('método não permitido', { status: 405 });

  const esperado = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';
  const recebido = req.headers.get('asaas-access-token') ?? '';
  if (esperado.length < 32 || !igual(recebido, esperado)) return new Response('não autorizado', { status: 401 });

  let ev: Evento;
  try {
    ev = await req.json();
  } catch {
    return new Response('json inválido', { status: 400 });
  }
  if (!ev?.id || !ev?.event) return new Response('evento inválido', { status: 400 });

  const db = admin();

  // Já processado? (o Asaas pode mandar o mesmo evento mais de uma vez)
  const ja = await db.from('payment_events').select('id').eq('id', ev.id).maybeSingle();
  if (ja.data) return ok();

  // Encontra o usuário: pela assinatura, ou pela referência que mandamos (id do usuário)
  const subId = ev.payment?.subscription ?? ev.subscription?.id ?? null;
  const ref = ev.payment?.externalReference ?? ev.subscription?.externalReference ?? null;
  const cliente = ev.payment?.customer ?? ev.subscription?.customer ?? null;
  const cols = 'user_id, current_period_end, asaas_subscription_id, asaas_customer_id';
  let atual: Sub | null = null;
  if (subId) atual = (await db.from('subscriptions').select(cols).eq('asaas_subscription_id', subId).maybeSingle()).data;
  if (!atual && ref && /^[0-9a-f-]{36}$/i.test(ref)) atual = (await db.from('subscriptions').select(cols).eq('user_id', ref).maybeSingle()).data;
  const userId = atual?.user_id ?? null;

  try {
    if (!userId) {
      console.warn('webhook sem usuário', ev.event, subId, ref);
    } else if (cliente && atual?.asaas_customer_id && cliente !== atual.asaas_customer_id) {
      // Evento de um cliente Asaas diferente do dono da conta: não mexe em nada
      await audit(db, userId, 'webhook_cliente_divergente', { evento: ev.event, cliente, esperado: atual.asaas_customer_id });
    } else {
      const daAssinaturaAtual = !subId || !atual?.asaas_subscription_id || atual.asaas_subscription_id === subId;
      switch (ev.event) {
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED': {
          const valor = Number(ev.payment?.value ?? 0);
          if (valor + 0.01 < PRECO_PRO) {
            await audit(db, userId, 'pagamento_valor_divergente', { valor, esperado: PRECO_PRO, payment: ev.payment?.id });
            break;
          }
          const base = ev.payment?.dueDate ? new Date(`${ev.payment.dueDate}T23:59:59-03:00`) : new Date();
          if (base < new Date()) base.setTime(Date.now());
          const fim = new Date(base);
          fim.setMonth(fim.getMonth() + 1);
          fim.setDate(fim.getDate() + TOLERANCIA_DIAS);
          const anterior = atual?.current_period_end ? new Date(atual.current_period_end) : null;
          const novoFim = anterior && anterior > fim ? anterior : fim;
          await atualiza(db, userId, { status: 'active', current_period_end: novoFim.toISOString(), ...(subId ? { asaas_subscription_id: subId } : {}) });
          await audit(db, userId, 'pagamento', { evento: ev.event, valor, ate: novoFim.toISOString() });
          break;
        }
        case 'PAYMENT_OVERDUE':
          if (daAssinaturaAtual) await atualiza(db, userId, { status: 'overdue' });
          await audit(db, userId, 'atraso', { payment: ev.payment?.id });
          break;
        case 'PAYMENT_REFUNDED': {
          const anteriores = await contaEstornos(db, userId);
          await cortaECancela(db, userId, subId, 'refunded', 'estorno');
          await audit(db, userId, 'estorno', { payment: ev.payment?.id, anteriores });
          if (anteriores >= 1) await bloqueia(db, userId, cliente, 'Estornos repetidos');
          break;
        }
        default:
          if (CHARGEBACK.includes(ev.event)) {
            await cortaECancela(db, userId, subId, 'refunded', 'chargeback');
            await audit(db, userId, 'chargeback', { evento: ev.event, payment: ev.payment?.id });
            await bloqueia(db, userId, cliente, 'Contestação de pagamento (chargeback)');
          } else if (ev.event === 'SUBSCRIPTION_DELETED' || ev.event === 'SUBSCRIPTION_INACTIVATED') {
            if (daAssinaturaAtual) await atualiza(db, userId, { status: 'canceled', cancelado_em: new Date().toISOString() });
            await audit(db, userId, 'assinatura_encerrada', { evento: ev.event });
          }
      }
    }
    await db.from('payment_events').insert({ id: ev.id, evento: ev.event, payload: ev });
    return ok();
  } catch (e) {
    console.error('webhook', ev.event, e);
    return new Response('erro', { status: 500 }); // o Asaas tenta de novo
  }
});

async function atualiza(db: ReturnType<typeof admin>, userId: string, campos: Record<string, unknown>) {
  const { error } = await db.from('subscriptions').update(campos).eq('user_id', userId);
  if (error) throw error;
}

async function contaEstornos(db: ReturnType<typeof admin>, userId: string): Promise<number> {
  const { count } = await db.from('auditoria').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('acao', 'estorno');
  return count ?? 0;
}

/** Corta o Pro agora e cancela a assinatura no Asaas (para não gerar novas cobranças). */
async function cortaECancela(db: ReturnType<typeof admin>, userId: string, subId: string | null, status: string, motivo: string) {
  if (subId) await asaas('DELETE', `/subscriptions/${subId}`).catch((e) => console.warn('cancelar no Asaas', e));
  await atualiza(db, userId, {
    status,
    current_period_end: new Date().toISOString(),
    trial_ends_at: null,
    cancelado_em: new Date().toISOString(),
    motivo_cancelamento: motivo,
  });
}

/** Bloqueia a conta e guarda hashes (com segredo) do CPF e do e-mail para impedir novas assinaturas. */
async function bloqueia(db: ReturnType<typeof admin>, userId: string, cliente: string | null, motivo: string) {
  await atualiza(db, userId, { bloqueado: true, motivo_bloqueio: motivo });
  const linhas: { tipo: string; hash: string; motivo: string }[] = [];
  if (cliente) {
    try {
      const c = await asaas<{ cpfCnpj?: string }>('GET', `/customers/${cliente}`);
      if (c.cpfCnpj) linhas.push({ tipo: 'cpf', hash: await cpfHash(c.cpfCnpj), motivo });
    } catch (e) {
      console.warn('bloqueio: cliente Asaas', e);
    }
  }
  const { data } = await db.auth.admin.getUserById(userId);
  if (data.user?.email) {
    const h = await emailHashDb(db, data.user.email);
    if (h) linhas.push({ tipo: 'email', hash: h, motivo });
  }
  if (linhas.length) {
    const { error } = await db.from('bloqueios').upsert(linhas);
    if (error) throw error;
  }
  await audit(db, userId, 'bloqueio', { motivo, tipos: linhas.map((l) => l.tipo) });
}
