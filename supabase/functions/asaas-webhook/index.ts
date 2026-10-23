// Recebe os avisos do Asaas e libera/bloqueia o Pro.
// Publicar com verificação de JWT desligada (quem chama é o Asaas): `supabase functions deploy asaas-webhook --no-verify-jwt`
// A autenticação é o cabeçalho `asaas-access-token`, igual ao token cadastrado no webhook do Asaas.
import { admin, igual, TOLERANCIA_DIAS } from '../_shared/util.ts';

interface Evento {
  id: string;
  event: string;
  payment?: { id: string; subscription?: string; externalReference?: string; customer?: string; dueDate?: string; value?: number };
  subscription?: { id: string; externalReference?: string };
}

const ok = () => new Response('ok', { status: 200 });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('método não permitido', { status: 405 });

  const esperado = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';
  const recebido = req.headers.get('asaas-access-token') ?? '';
  if (!esperado || !igual(recebido, esperado)) return new Response('não autorizado', { status: 401 });

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
  const cols = 'user_id, current_period_end, asaas_subscription_id';
  let atual: { user_id: string; current_period_end: string | null; asaas_subscription_id: string | null } | null = null;
  if (subId) atual = (await db.from('subscriptions').select(cols).eq('asaas_subscription_id', subId).maybeSingle()).data;
  if (!atual && ref && /^[0-9a-f-]{36}$/i.test(ref)) atual = (await db.from('subscriptions').select(cols).eq('user_id', ref).maybeSingle()).data;
  const userId = atual?.user_id ?? null;

  try {
    if (userId) {
      const eDaAssinaturaAtual = !subId || !atual?.asaas_subscription_id || atual.asaas_subscription_id === subId;
      switch (ev.event) {
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED': {
          // Libera até o próximo vencimento + tolerância. Nunca encurta um período já maior.
          const base = ev.payment?.dueDate ? new Date(`${ev.payment.dueDate}T23:59:59-03:00`) : new Date();
          if (base < new Date()) base.setTime(Date.now());
          const fim = new Date(base);
          fim.setMonth(fim.getMonth() + 1);
          fim.setDate(fim.getDate() + TOLERANCIA_DIAS);
          const anterior = atual?.current_period_end ? new Date(atual.current_period_end) : null;
          const novoFim = anterior && anterior > fim ? anterior : fim;
          await atualiza(db, userId, { status: 'active', current_period_end: novoFim.toISOString(), ...(subId ? { asaas_subscription_id: subId } : {}) });
          break;
        }
        case 'PAYMENT_OVERDUE':
          if (eDaAssinaturaAtual) await atualiza(db, userId, { status: 'overdue' });
          break;
        case 'PAYMENT_REFUNDED':
        case 'PAYMENT_CHARGEBACK_REQUESTED':
          await atualiza(db, userId, { status: 'refunded', current_period_end: new Date().toISOString() });
          break;
        case 'SUBSCRIPTION_DELETED':
        case 'SUBSCRIPTION_INACTIVATED':
          if (eDaAssinaturaAtual) await atualiza(db, userId, { status: 'canceled' });
          break;
      }
    } else {
      console.warn('webhook sem usuário', ev.event, subId, ref);
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
