// Cancela a assinatura Pro no Asaas (para de gerar cobranças). O acesso continua até o fim do período já pago
// e depois volta sozinho ao Grátis (a data decide; não precisa de outra ação).
// Corpo opcional: { motivo?: string } — ajuda a entender por que as pessoas cancelam.
import { admin, asaas, audit, cors, json, userFrom } from '../_shared/util.ts';

const MOTIVOS = ['caro', 'nao_uso', 'faltou_recurso', 'problema', 'parei_de_rodar', 'outro'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405);

  const user = await userFrom(req);
  if (!user) return json(req, { error: 'Entre na sua conta.' }, 401);

  let motivo = 'nao_informado';
  try {
    const b = await req.json();
    if (MOTIVOS.includes(b?.motivo)) motivo = b.motivo;
  } catch {
    /* corpo vazio */
  }

  const db = admin();
  const { data: sub } = await db.from('subscriptions').select('asaas_subscription_id, status, current_period_end').eq('user_id', user.id).maybeSingle();
  if (!sub?.asaas_subscription_id || ['canceled', 'refunded'].includes(sub.status)) {
    return json(req, { error: 'Você não tem assinatura ativa.' }, 404);
  }

  try {
    await asaas('DELETE', `/subscriptions/${sub.asaas_subscription_id}`);
  } catch (e) {
    console.error('cancelar', e);
    return json(req, { error: 'Não foi possível cancelar agora. Tente de novo.' }, 502);
  }
  const up = await db
    .from('subscriptions')
    .update({ status: 'canceled', cancelado_em: new Date().toISOString(), motivo_cancelamento: motivo })
    .eq('user_id', user.id);
  await audit(db, user.id, 'cancelar', { motivo, ate: sub.current_period_end });
  if (up.error) return json(req, { error: 'Cancelado no Asaas, mas houve erro ao atualizar. Avise o suporte.' }, 500);
  return json(req, { ok: true, ate: sub.current_period_end });
});
