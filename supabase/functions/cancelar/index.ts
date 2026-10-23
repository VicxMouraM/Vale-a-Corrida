// Cancela a assinatura Pro. O acesso continua até o fim do período já pago.
import { admin, asaas, cors, json, userFrom } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405);

  const user = await userFrom(req);
  if (!user) return json(req, { error: 'Entre na sua conta.' }, 401);

  const db = admin();
  const { data: sub } = await db.from('subscriptions').select('asaas_subscription_id, status').eq('user_id', user.id).maybeSingle();
  if (!sub?.asaas_subscription_id || ['canceled', 'refunded'].includes(sub.status)) {
    return json(req, { error: 'Você não tem assinatura ativa.' }, 404);
  }

  try {
    await asaas('DELETE', `/subscriptions/${sub.asaas_subscription_id}`);
  } catch (e) {
    console.error('cancelar', e);
    return json(req, { error: 'Não foi possível cancelar agora. Tente de novo.' }, 502);
  }
  const up = await db.from('subscriptions').update({ status: 'canceled' }).eq('user_id', user.id);
  if (up.error) return json(req, { error: 'Cancelado no Asaas, mas houve erro ao atualizar. Avise o suporte.' }, 500);
  return json(req, { ok: true });
});
