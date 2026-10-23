import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { redirectUrl, supabase } from '../lib/supabase';

interface AuthState {
  /** false quando o app não tem Supabase configurado (só modo convidado). */
  enabled: boolean;
  loading: boolean;
  user: User | null;
  /** true depois de abrir o link de "esqueci a senha": o app pede a nova senha. */
  recovering: boolean;
  signInPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string) => Promise<'confirm-email' | 'signed-in'>;
  signInGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

function need() {
  if (!supabase) throw new Error('Contas indisponíveis nesta versão do app.');
  return supabase;
}

/** Mensagens do Supabase em português, sem revelar se um e-mail existe ou não. */
export function authErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme o seu e-mail pelo link que enviamos antes de entrar.';
  if (m.includes('user already registered')) return 'Não foi possível criar a conta com esse e-mail. Tente entrar ou recuperar a senha.';
  if (m.includes('password should be') || m.includes('weak password')) return 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) return 'Essa forma de login ainda não está ativada.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão. Verifique a internet.';
  return msg;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    enabled: !!supabase,
    loading,
    user: session?.user ?? null,
    recovering,
    async signInPassword(email, password) {
      const { error } = await need().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },
    async signUp(email, password, nome) {
      const { data, error } = await need().auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirectUrl(), data: { nome: nome.trim() } },
      });
      if (error) throw error;
      return data.session ? 'signed-in' : 'confirm-email';
    },
    async signInGoogle() {
      const { error } = await need().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl() } });
      if (error) throw error;
    },
    async sendPasswordReset(email) {
      const { error } = await need().auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl() });
      if (error) throw error;
    },
    async updatePassword(password) {
      const { error } = await need().auth.updateUser({ password });
      if (error) throw error;
      setRecovering(false);
    },
    async signOut() {
      await need().auth.signOut();
      setRecovering(false);
    },
    async deleteAccount() {
      const sb = need();
      const { error } = await sb.rpc('delete_my_account');
      if (error) throw error;
      await sb.auth.signOut({ scope: 'local' });
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fora do AuthProvider');
  return v;
}

/** Regras mínimas de senha, checadas antes de enviar (o Supabase checa de novo no servidor). */
export function passwordProblem(p: string): string | null {
  if (p.length < 8) return 'Use pelo menos 8 caracteres.';
  if (!/[a-zA-Z]/.test(p) || !/\d/.test(p)) return 'Misture letras e números.';
  return null;
}
