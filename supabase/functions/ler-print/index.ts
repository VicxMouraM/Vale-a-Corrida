// Lê prints do histórico de corridas (Uber, 99, iFood, Lalamove, inDrive…) com a visão do Claude
// e devolve a lista de corridas para a pessoa conferir antes de importar.
//
// Corpo: { plataforma: string, imagens: { tipo: 'image/png' | 'image/jpeg' | 'image/webp', base64: string }[] }
// Segredo necessário: ANTHROPIC_API_KEY.
//
// Privacidade: as imagens não são guardadas; a IA é instruída a não devolver nomes nem endereços.
// Plano: Pro = 100 prints a cada 30 dias, até 5 por envio. Grátis = 1 print a cada 30 dias (um gostinho do Pro).
import Anthropic from 'npm:@anthropic-ai/sdk@1.1.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@1.1.0/helpers/zod';
import { z } from 'npm:zod@4.6.7';
import { admin, audit, cors, json, userFrom } from '../_shared/util.ts';

const MAX_IMAGENS = 5;

const TIPOS = ['image/png', 'image/jpeg', 'image/webp'] as const;
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

/**
 * Limites em PRINTS (não em envios), numa janela móvel de 30 dias. Ver a conta de custo no README.
 * Pro: 100 prints/30 dias, até 5 por envio. Teste grátis de 7 dias: 15 prints (quem cria contas só
 * para gastar a leitura não leva a cota cheia). Grátis: 1 print/30 dias.
 */
const JANELA_MIN = 30 * 24 * 60;
const LIMITES = {
  pro: { prints: 100, porEnvio: MAX_IMAGENS },
  teste: { prints: 15, porEnvio: MAX_IMAGENS },
  gratis: { prints: 1, porEnvio: 1 },
};

/** Quantos prints a pessoa usou nos últimos 30 dias, quantos restam e, se acabou, quando volta a ter. */
async function cota(db: ReturnType<typeof admin>, uid: string) {
  const { data: pro } = await db.rpc('is_pro_de', { uid });
  const { data: s } = await db.from('subscriptions').select('cortesia, current_period_end').eq('user_id', uid).maybeSingle();
  // Pro só pelo teste (sem pagamento nem cortesia)
  const teste = !!pro && !s?.cortesia && !(s?.current_period_end && new Date(s.current_period_end) > new Date());
  const l = !pro ? LIMITES.gratis : teste ? LIMITES.teste : LIMITES.pro;
  const desde = new Date(Date.now() - JANELA_MIN * 60_000).toISOString();
  const { data: linhas, error } = await db
    .from('auditoria')
    .select('criado_em, detalhes')
    .eq('user_id', uid)
    .eq('acao', 'ler_print')
    .gte('criado_em', desde)
    .order('criado_em', { ascending: true })
    .limit(500);
  if (error) throw error;
  const envios = (linhas ?? []).map((x) => ({ em: x.criado_em as string, n: Math.max(1, Number((x.detalhes as { imagens?: number })?.imagens) || 1) }));
  const usados = envios.reduce((t, e) => t + e.n, 0);
  const restantes = Math.max(0, l.prints - usados);
  // Se acabou: libera quando o envio mais antigo sair da janela de 30 dias
  const liberaEm = restantes === 0 && envios.length ? new Date(new Date(envios[0].em).getTime() + JANELA_MIN * 60_000).toISOString() : null;
  return { pro: !!pro, teste, usados, limite: l.prints, restantes, printsPorEnvio: Math.min(l.porEnvio, restantes), liberaEm };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  // GET: o app pergunta se a leitura está ligada e, para quem está logado, quanto ainda pode usar
  if (req.method === 'GET') {
    const u = await userFrom(req);
    if (!u || !DISPONIVEL) return json(req, { disponivel: DISPONIVEL });
    return json(req, { disponivel: true, ...(await cota(admin(), u.id)) });
  }
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
  const c = await cota(db, user.id);
  if (c.restantes <= 0) {
    const quando = c.liberaEm ? new Date(c.liberaEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null;
    return json(
      req,
      {
        error: c.teste
          ? `Você usou os ${c.limite} prints do teste grátis. Assinando o Pro são 100 prints por mês.`
          : c.pro
          ? `Você usou os ${c.limite} prints dos últimos 30 dias${quando ? `; volta a ter prints em ${quando}` : ''}.`
          : `Você já usou o print grátis destes 30 dias${quando ? `; o próximo libera em ${quando}` : ''}. No Pro são 100 prints por mês.`,
      },
      429,
    );
  }
  if (imagens.length > c.printsPorEnvio) {
    return json(
      req,
      {
        error: c.pro
          ? `Você pode enviar no máximo ${c.printsPorEnvio} ${c.printsPorEnvio === 1 ? 'print' : 'prints'} agora (restam ${c.restantes} neste mês).`
          : 'No plano Grátis é 1 print a cada 30 dias. No Pro são 100 por mês, até 5 por vez.',
      },
      403,
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
    // Custo real de cada leitura, para ajustar os limites com números de verdade (só tokens, nenhum dado da imagem)
    await audit(db, user.id, 'ler_print_uso', {
      imagens: imagens.length,
      entrada: resposta.usage.input_tokens,
      saida: resposta.usage.output_tokens,
      corridas: saida.corridas.length,
    });
    return json(req, { corridas: saida.corridas.slice(0, 300), aviso: saida.aviso, restantes: Math.max(0, c.restantes - imagens.length) });
  } catch (e) {
    console.error('ler-print', e);
    if (e instanceof Anthropic.RateLimitError) return json(req, { error: 'Muita gente usando agora. Tente de novo em instantes.' }, 503);
    if (e instanceof Anthropic.BadRequestError) return json(req, { error: 'Não consegui abrir esses prints. Tente tirar de novo.' }, 400);
    return json(req, { error: 'Não foi possível ler os prints agora. Tente de novo.' }, 502);
  }
});
