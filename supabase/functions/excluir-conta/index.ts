// Exclui a conta e todos os dados (LGPD). Antes, cancela a assinatura no Asaas:
// sem isso, o Asaas continuaria gerando cobranças para uma conta que não existe mais.
// Corpo: { confirmacao: 'EXCLUIR' }
import { admin, asaas, audit, cors, json, userFrom } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405);

  const user = await userFrom(req);
  if (!user) return json(req, { error: 'Entre na sua conta.' }, 401);

  let confirmacao = '';
  try {
    confirmacao = String((await req.json())?.confirmacao ?? '');
  } catch {
    /* sem corpo */
  }
  if (confirmacao !== 'EXCLUIR') return json(req, { error: 'Confirmação inválida.' }, 400);

  const db = admin();
  const { data: sub } = await db.from('subscriptions').select('asaas_subscription_id, status, bloqueado').eq('user_id', user.id).maybeSingle();

  if (sub?.asaas_subscription_id && !['canceled', 'refunded'].includes(sub.status)) {
    try {
      await asaas('DELETE', `/subscriptions/${sub.asaas_subscription_id}`);
    } catch (e) {
      console.error('excluir-conta: cancelar no Asaas', e);
      return json(req, { error: 'Não consegui cancelar a sua assinatura agora, então a conta não foi excluída. Tente de novo em alguns minutos.' }, 502);
    }
  }

  // Registro mínimo, sem dados pessoais (exigência de prestação de contas da LGPD)
  await audit(db, user.id, 'conta_excluida', { tinha_assinatura: !!sub?.asaas_subscription_id, bloqueado: !!sub?.bloqueado });

  const { error } = await db.auth.admin.deleteUser(user.id); // perfil, ajustes, corridas e assinatura caem junto (on delete cascade)
  if (error) {
    console.error('excluir-conta', error);
    return json(req, { error: 'Não foi possível excluir a conta agora. Tente de novo.' }, 500);
  }
  return json(req, { ok: true });
});
