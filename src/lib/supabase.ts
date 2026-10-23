import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null quando o app foi publicado sem as chaves: aí só existe o modo convidado (dados no aparelho). */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'vale-a-corrida:auth',
        },
      })
    : null;

/** Endereço para onde o login social, a confirmação de e-mail e a troca de senha voltam. */
export function redirectUrl(): string {
  return `${location.origin}${location.pathname}`;
}
