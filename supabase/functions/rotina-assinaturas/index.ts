// Rotina diária (chamada pelo agendador do Supabase, pg_cron) — cancelamento automático:
// 1. Pagamento atrasado há mais de 7 dias depois do fim do Pro (pago ou teste) → cancela no Asaas e encerra.
// 2. Cobrança gerada e nunca paga há mais de 7 dias → cancela no Asaas para não acumular cobranças.
// Quem entra na lista: função SQL public.assinaturas_para_cancelar (migração 0007).
// Publicar com `--no-verify-jwt`; a autenticação é o cabeçalho `x-cron-secret`, igual ao segredo CRON_SECRET.
import { admin, asaas, AsaasError, audit, igual } from '../_shared/util.ts';

const DIAS = 7;

Deno.serve(async (req) => {
  const esperado = Deno.env.get('CRON_SECRET') ?? '';
  if (esperado.length < 32 || !igual(req.headers.get('x-cron-secret') ?? '', esperado)) return new Response('não autorizado', { status: 401 });

  const db = admin();
  const resultado = { atraso: 0, nunca_pagou: 0, erros: 0 };

  const { data, error } = await db.rpc('assinaturas_para_cancelar', { dias: DIAS });
  if (error) {
    console.error('rotina', error);
    return new Response('erro', { status: 500 });
  }

  for (const s of (data ?? []) as { user_id: string; asaas_subscription_id: string | null; motivo: 'atraso' | 'nunca_pagou' }[]) {
    try {
      if (s.asaas_subscription_id) {
        await asaas('DELETE', `/subscriptions/${s.asaas_subscription_id}`).catch((e) => {
          if (!(e instanceof AsaasError && e.status === 404)) throw e; // já não existe no Asaas: segue
        });
      }
      const up = await db
        .from('subscriptions')
        .update({ status: 'canceled', cancelado_em: new Date().toISOString(), motivo_cancelamento: `automatico_${s.motivo}` })
        .eq('user_id', s.user_id);
      if (up.error) throw up.error;
      await audit(db, s.user_id, 'cancelamento_automatico', { motivo: s.motivo });
      resultado[s.motivo]++;
    } catch (e) {
      console.error('rotina: cancelar', s.user_id, e);
      resultado.erros++;
    }
  }

  await audit(db, null, 'rotina_assinaturas', resultado);
  return new Response(JSON.stringify(resultado), { headers: { 'Content-Type': 'application/json' } });
});
