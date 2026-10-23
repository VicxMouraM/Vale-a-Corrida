// Lê prints do histórico de corridas (Uber, 99, iFood, Lalamove, inDrive…) com a visão do Claude
// e devolve a lista de corridas para a pessoa conferir antes de importar.
//
// Corpo: { plataforma: string, imagens: { tipo: 'image/png' | 'image/jpeg' | 'image/webp', base64: string }[] }
// Segredo necessário: ANTHROPIC_API_KEY.
//
// Privacidade: as imagens não são guardadas; a IA é instruída a não devolver nomes nem endereços.
// Custo: limite por usuário (Grátis: 3 envios a cada 30 dias; Pro: 40 por dia), cada envio com até 5 prints.
import Anthropic from 'npm:@anthropic-ai/sdk@1.1.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@1.1.0/helpers/zod';
import { z } from 'npm:zod@4.6.7';
import { admin, audit, cors, countRecent, json, userFrom } from '../_shared/util.ts';

const TIPOS = ['image/png', 'image/jpeg', 'image/webp'] as const;
const MAX_IMAGENS = 5;
const MAX_BASE64 = 6_000_000; // ~4,5 MB por imagem depois de decodificada (o limite da API é 5 MB)

const Corrida = z.object({
  data: z.string().nullable().describe('Data da corrida no formato AAAA-MM-DD, ou null se o print não mostra'),
  hora: z.string().nullable().describe('Hora de início no formato HH:MM (24 h), ou null'),
  valor: z.number().nullable().describe('Quanto o motorista recebeu nessa corrida, em reais'),
  km: z.number().nullable().describe('Distância da corrida em km, só se aparecer no print'),
  minutos: z.number().nullable().describe('Duração da corrida em minutos, só se aparecer no print'),
  status: z.enum(['concluida', 'cancelada', 'desconhecido']),
});
const Resultado = z.object({
  corridas: z.array(Corrida),
  aviso: z.string().nullable().describe('Se os prints não forem de histórico de corridas ou estiverem ilegíveis, explique em uma frase curta; senão null'),
});

const SISTEMA = `Você extrai dados de prints (capturas de tela) do histórico de corridas e entregas de apps de motorista e entregador brasileiros (Uber, 99, iFood, Lalamove, inDrive e outros).

Regras:
- Liste cada corrida ou entrega que aparece nos prints, uma vez só (o mesmo item pode aparecer em dois prints que se sobrepõem: não repita).
- "valor" é o que o MOTORISTA recebeu (ganho, repasse, "você recebeu"). Se o print mostra só o preço pago pelo passageiro, use esse. Valores em reais, como número (R$ 23,50 → 23.5).
- Preencha km e minutos SOMENTE se estiverem escritos no print. Nunca estime nem invente: use null.
- Datas: converta para AAAA-MM-DD. Se o print mostra só dia e mês, use o ano da data de hoje informada; se isso cair no futuro, use o ano anterior. "Hoje" e "ontem" são relativos à data de hoje informada.
- status: "cancelada" para canceladas/recusadas/não concluídas; "concluida" para finalizadas; "desconhecido" se não der para saber.
- NÃO devolva nomes de passageiros, endereços, placas, telefones nem qualquer outro dado pessoal: só os campos pedidos.
- Ignore totais da semana, saldos, promoções, gráficos e anúncios: só corridas individuais.
- Se os prints não forem de histórico de corridas, devolva a lista vazia e explique em "aviso".`;

// A leitura só liga quando a chave existir; até lá o app mostra "Em breve" (sem gastar o limite de ninguém)
const DISPONIVEL = !!Deno.env.get('ANTHROPIC_API_KEY');
const anthropic = DISPONIVEL ? new Anthropic() : null; // lê ANTHROPIC_API_KEY do ambiente

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  // GET: o app pergunta se a leitura de prints já está ligada
  if (req.method === 'GET') return json(req, { disponivel: DISPONIVEL });
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido' }, 405);
  if (!anthropic) return json(req, { error: 'A leitura de prints ainda não está disponível. Use a planilha por enquanto.' }, 503);

  const user = await userFrom(req);
  if (!user) return json(req, { error: 'Entre na sua conta para importar por print.' }, 401);

  let body: { plataforma?: string; imagens?: { tipo?: string; base64?: string }[] };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: 'Pedido inválido.' }, 400);
  }
  const imagens = Array.isArray(body.imagens) ? body.imagens : [];
  if (imagens.length === 0 || imagens.length > MAX_IMAGENS) return json(req, { error: `Envie de 1 a ${MAX_IMAGENS} prints por vez.` }, 400);
  for (const i of imagens) {
    if (!TIPOS.includes(i.tipo as (typeof TIPOS)[number]) || typeof i.base64 !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(i.base64)) {
      return json(req, { error: 'Envie só imagens PNG, JPG ou WEBP.' }, 400);
    }
    if (i.base64.length > MAX_BASE64) return json(req, { error: 'Um dos prints é grande demais.' }, 413);
  }
  const plataforma = String(body.plataforma ?? '').slice(0, 40).replace(/[^\p{L}\p{N} _.-]/gu, '');

  const db = admin();
  // Limite de uso: protege o custo da IA e evita abuso
  const { data: pro } = await db.rpc('is_pro_de', { uid: user.id });
  const usados = pro ? await countRecent(db, user.id, 'ler_print', 24 * 60) : await countRecent(db, user.id, 'ler_print', 30 * 24 * 60);
  const limite = pro ? 40 : 3;
  if (usados >= limite) {
    return json(
      req,
      { error: pro ? 'Você chegou ao limite de 40 envios de prints hoje. Tente amanhã.' : 'No plano Grátis são 3 envios de prints a cada 30 dias. Assine o Pro para importar mais.' },
      429,
    );
  }
  await audit(db, user.id, 'ler_print', { imagens: imagens.length, plataforma });

  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

  try {
    const resposta = await anthropic.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'low', format: zodOutputFormat(Resultado) },
      system: SISTEMA,
      messages: [
        {
          role: 'user',
          content: [
            ...imagens.map((i) => ({
              type: 'image' as const,
              source: { type: 'base64' as const, media_type: i.tipo as (typeof TIPOS)[number], data: i.base64! },
            })),
            { type: 'text' as const, text: `Data de hoje: ${hoje}. Plataforma informada pelo motorista: ${plataforma || 'não informada'}. Extraia as corridas.` },
          ],
        },
      ],
    });

    if (resposta.stop_reason === 'refusal') return json(req, { error: 'Não consegui ler esses prints. Tente outros.' }, 422);
    if (resposta.stop_reason === 'max_tokens') return json(req, { error: 'Prints com corridas demais de uma vez. Envie menos prints por vez.' }, 422);
    const saida = resposta.parsed_output;
    if (!saida) return json(req, { error: 'Não consegui ler esses prints. Tente de novo.' }, 502);
    return json(req, { corridas: saida.corridas.slice(0, 300), aviso: saida.aviso, restantes: Math.max(0, limite - usados - 1) });
  } catch (e) {
    console.error('ler-print', e);
    if (e instanceof Anthropic.RateLimitError) return json(req, { error: 'Muita gente usando agora. Tente de novo em instantes.' }, 503);
    if (e instanceof Anthropic.BadRequestError) return json(req, { error: 'Não consegui abrir esses prints. Tente tirar de novo.' }, 400);
    return json(req, { error: 'Não foi possível ler os prints agora. Tente de novo.' }, 502);
  }
});
