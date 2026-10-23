// Recebe relatos de problema, sugestões e elogios da tela "Ajuda e feedback".
// Funciona com e sem conta. Corpo: { tipo, mensagem, contato?, contexto? }
// Contra spam: no máximo 5 por hora por origem (endereço de internet, guardado só como hash com segredo)
// e 10 por dia por conta; textos com tamanho limitado.
import { admin, cors, hmac, json, userFrom } from '../_shared/util.ts';

const TIPOS = ['problema', 'sugestao', 'elogio', 'outro'];

/** Só campos conhecidos e textos curtos: nada do que vem do app vira HTML ou comando. */
function limparContexto(c: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!c || typeof c !== 'object') return out;
  for (const k of ['versao', 'tela', 'plano', 'navegador', 'tamanhoTela', 'plataforma', 'veiculo', 'instalado']) {
    const v = (c as Record<string, unknown>)[k];
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = String(v).slice(0, 200);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405);

  let body: { tipo?: string; mensagem?: string; contato?: string; contexto?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: 'Pedido inválido.' }, 400);
  }
  const tipo = String(body.tipo ?? '');
  const mensagem = String(body.mensagem ?? '').trim();
  const contato = String(body.contato ?? '').trim().slice(0, 120) || null;
  if (!TIPOS.includes(tipo)) return json(req, { error: 'Escolha o tipo da mensagem.' }, 400);
  if (mensagem.length < 3) return json(req, { error: 'Escreva um pouco mais sobre o que aconteceu.' }, 400);
  if (mensagem.length > 2000) return json(req, { error: 'Mensagem longa demais (máximo 2.000 caracteres).' }, 400);

  const user = await userFrom(req); // opcional: sem conta também pode enviar
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconhecido';
  const origem = await hmac(`ip:${ip}`);
  const db = admin();

  const umaHora = new Date(Date.now() - 3600_000).toISOString();
  const umDia = new Date(Date.now() - 86400_000).toISOString();
  const porOrigem = await db.from('feedback').select('id', { count: 'exact', head: true }).eq('origem_hash', origem).gte('criado_em', umaHora);
  const porConta = user ? await db.from('feedback').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('criado_em', umDia) : { count: 0 };
  if ((porOrigem.count ?? 0) >= 5 || (porConta.count ?? 0) >= 10) {
    return json(req, { error: 'Recebemos várias mensagens suas agora há pouco. Tente de novo mais tarde ou fale pelo WhatsApp.' }, 429);
  }

  const { error } = await db.from('feedback').insert({
    tipo,
    mensagem,
    contato,
    user_id: user?.id ?? null,
    contexto: limparContexto(body.contexto),
    origem_hash: origem,
  });
  if (error) {
    console.error('feedback', error);
    return json(req, { error: 'Não foi possível enviar agora. Tente de novo ou fale pelo WhatsApp.' }, 500);
  }
  return json(req, { ok: true });
});
