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

  const contexto = limparContexto(body.contexto);
  const { data: salvo, error } = await db
    .from('feedback')
    .insert({ tipo, mensagem, contato, user_id: user?.id ?? null, contexto, origem_hash: origem })
    .select('id')
    .single();
  if (error) {
    console.error('feedback', error);
    return json(req, { error: 'Não foi possível enviar agora. Tente de novo ou fale pelo WhatsApp.' }, 500);
  }
  // Aviso por e-mail para a dona do app. Se falhar, a mensagem já está salva: só registra no log.
  await avisarPorEmail({ id: salvo.id, tipo, mensagem, contato, contexto, logado: !!user }).catch((e) => console.error('feedback: e-mail', e));
  return json(req, { ok: true });
});

/* ---------- Aviso por e-mail (Brevo) ---------- */

const ROTULO: Record<string, string> = { problema: '🐞 Problema', sugestao: '💡 Sugestão', elogio: '👏 Elogio', outro: '✉️ Outro' };
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const EMAIL_OK = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;

async function avisarPorEmail(f: { id: number; tipo: string; mensagem: string; contato: string | null; contexto: Record<string, string>; logado: boolean }) {
  const chave = Deno.env.get('BREVO_API_KEY');
  const para = Deno.env.get('FEEDBACK_EMAIL_PARA');
  const de = Deno.env.get('FEEDBACK_EMAIL_DE') ?? 'nao-responda@valeacorrida.app.br';
  if (!chave || !para) return; // aviso desligado até configurar os segredos

  const resumo = f.mensagem.replace(/\s+/g, ' ').slice(0, 60) + (f.mensagem.length > 60 ? '…' : '');
  const linhasContexto = Object.entries(f.contexto)
    .map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;color:#586270">${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join('');
  const projeto = (Deno.env.get('SUPABASE_URL') ?? '').match(/https:\/\/([a-z0-9]+)\./)?.[1];
  const linkTabela = projeto ? `https://supabase.com/dashboard/project/${projeto}/editor` : 'https://supabase.com/dashboard';
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#131921">
<h2 style="margin:0 0 4px">${esc(ROTULO[f.tipo] ?? f.tipo)}</h2>
<p style="margin:0 0 12px;color:#586270;font-size:13px">Nova mensagem nº ${f.id} pelo app · ${f.logado ? 'usuário com conta' : 'sem conta'}</p>
<div style="white-space:pre-wrap;background:#EFF1F4;border-radius:8px;padding:12px 14px;font-size:15px">${esc(f.mensagem)}</div>
<p style="font-size:14px"><strong>Contato:</strong> ${f.contato ? esc(f.contato) : 'não informado'}</p>
${linhasContexto ? `<table style="font-size:13px;border-collapse:collapse">${linhasContexto}</table>` : ''}
<p style="font-size:13px;margin-top:16px"><a href="${linkTabela}">Abrir a tabela feedback no Supabase</a> para marcar como resolvido.</p>
</div>`;

  const corpo: Record<string, unknown> = {
    sender: { name: 'Vale a Corrida', email: de },
    to: [{ email: para }],
    subject: `${ROTULO[f.tipo] ?? 'Mensagem'}: ${resumo}`,
    htmlContent: html,
  };
  // Se a pessoa deixou um e-mail válido, "Responder" vai direto para ela
  if (f.contato && EMAIL_OK.test(f.contato)) corpo.replyTo = { email: f.contato };

  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': chave, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
