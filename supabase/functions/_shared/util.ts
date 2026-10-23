// Código comum das Edge Functions (Deno).
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

/**
 * Preço do Pro. O segredo PRECO_PRO permite um valor menor só para testar a cobrança real
 * (mínimo do Asaas: R$ 5 no cartão, R$ 10 no Pix/boleto). Sem o segredo, vale R$ 49,99.
 */
const precoEnv = Number(Deno.env.get('PRECO_PRO'));
export const PRECO_PRO = Number.isFinite(precoEnv) && precoEnv >= 5 && precoEnv <= 1000 ? precoEnv : 49.99;
export const TOLERANCIA_DIAS = 3;

/* ---------- CORS: só o endereço do app pode chamar ---------- */
// Endereço de site não diferencia maiúsculas: o navegador sempre manda em minúsculas
// (https://vicxmouram.github.io), mesmo que o segredo tenha sido escrito como VicxMouraM.
// Barra no fim também é ignorada.
const ORIGENS = (Deno.env.get('APP_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase().replace(/\/+$/, ''))
  .filter(Boolean);

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  // localhost só quando ALLOW_LOCALHOST=1 (desenvolvimento); em produção, só os endereços do app
  const ok = ORIGENS.includes(origin.toLowerCase()) || (Deno.env.get('ALLOW_LOCALHOST') === '1' && /^http:\/\/localhost:\d+$/.test(origin));
  return {
    'Access-Control-Allow-Origin': ok ? origin : (ORIGENS[0] ?? 'null'),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
}

/* ---------- Supabase ---------- */
export function admin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
}

/** Usuário dono do token enviado pelo app (null se inválido). */
export async function userFrom(req: Request): Promise<User | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(auth.slice(7));
  return error ? null : data.user;
}

/* ---------- Asaas ---------- */
const ASAAS_URL = Deno.env.get('ASAAS_API_URL') ?? 'https://api-sandbox.asaas.com/v3';

export async function asaas<T = Record<string, unknown>>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${ASAAS_URL}${path}`, {
    method,
    headers: {
      access_token: Deno.env.get('ASAAS_API_KEY')!,
      'Content-Type': 'application/json',
      'User-Agent': 'ValeACorrida/1.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = (data?.errors?.[0]?.description as string | undefined) ?? `Asaas ${res.status}`;
    throw new AsaasError(msg, res.status);
  }
  return data as T;
}

export class AsaasError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/* ---------- Diversos ---------- */
export function cpfCnpjValido(raw: string): boolean {
  const d = raw.replace(/\D/g, '');
  if (d.length === 11) return digitosOk(d, [10, 9, 8, 7, 6, 5, 4, 3, 2], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d.length === 14) return digitosOk(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return false;
}

function digitosOk(d: string, p1: number[], p2: number[]): boolean {
  if (/^(\d)\1+$/.test(d)) return false;
  const dv = (pesos: number[]) => {
    const s = pesos.reduce((acc, p, i) => acc + Number(d[i]) * p, 0) % 11;
    return s < 2 ? 0 : 11 - s;
  };
  return dv(p1) === Number(d[p1.length]) && dv(p2) === Number(d[p2.length]);
}

/** Data de hoje no fuso de São Paulo, no formato AAAA-MM-DD que o Asaas espera. */
export function hojeSP(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

/** Comparação em tempo constante (para o token do webhook). */
export function igual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

/* ---------- Segurança e antifraude ---------- */

/**
 * HMAC-SHA256 com um segredo do servidor (HASH_PEPPER). Usado para guardar CPF e e-mail bloqueados
 * sem guardar o dado: um hash simples de CPF seria revertido por força bruta (só ~1 bilhão de CPFs).
 */
export async function hmac(valor: string): Promise<string> {
  const pepper = Deno.env.get('HASH_PEPPER');
  if (!pepper || pepper.length < 32) throw new Error('HASH_PEPPER ausente ou curto');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(valor));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const cpfHash = (cpfCnpj: string) => hmac(`cpf:${cpfCnpj.replace(/\D/g, '')}`);

/** Registra uma ação sensível. Nunca derruba a operação principal se falhar. */
export async function audit(db: SupabaseClient, userId: string | null, acao: string, detalhes: Record<string, unknown> = {}) {
  const { error } = await db.from('auditoria').insert({ user_id: userId, acao, detalhes });
  if (error) console.error('auditoria', acao, error);
}

/** Quantas vezes o usuário fez `acao` na última janela. Para limitar abusos (ex.: gerar cobranças em massa). */
export async function countRecent(db: SupabaseClient, userId: string, acao: string, minutos: number): Promise<number> {
  const desde = new Date(Date.now() - minutos * 60_000).toISOString();
  const { count, error } = await db.from('auditoria').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('acao', acao).gte('criado_em', desde);
  if (error) throw error;
  return count ?? 0;
}

export async function isBlocked(db: SupabaseClient, tipo: 'cpf' | 'email', hash: string): Promise<boolean> {
  const { data } = await db.from('bloqueios').select('hash').eq('tipo', tipo).eq('hash', hash).maybeSingle();
  return !!data;
}

/** Hash do e-mail igual ao do banco (public.email_hash): normaliza Gmail (pontos) e +apelidos. */
export async function emailHashDb(db: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await db.rpc('email_hash', { email });
  return error ? null : (data as string);
}
