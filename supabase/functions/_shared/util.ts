// Código comum das Edge Functions (Deno).
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export const PRECO_PRO = 49.99;
export const TOLERANCIA_DIAS = 3;

/* ---------- CORS: só o endereço do app pode chamar ---------- */
const ORIGENS = (Deno.env.get('APP_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const ok = ORIGENS.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : (ORIGENS[0] ?? 'null'),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
