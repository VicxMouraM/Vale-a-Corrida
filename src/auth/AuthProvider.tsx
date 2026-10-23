import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { LEGAL } from '../legal';
import { redirectUrl, supabase } from '../lib/supabase';

const ACEITE_GOOGLE = 'vale-a-corrida:aceite-google';

interface AuthState {
  /** false quando o app não tem Supabase configurado (só modo convidado). */
  enabled: boolean;
  loading: boolean;
  user: User | null;
  /** true depois de abrir o link de "esqueci a senha": o app pede a nova senha. */
  recovering: boolean;
  signInPassword: (email: string, password: string, captchaToken?: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string, captchaToken?: string) => Promise<'confirm-email' | 'signed-in'>;
  signInGoogle: () => Promise<void>;
  sendPasswordReset: (email: string, captchaToken?: string) => Promise<void>;
  resendConfirmation: (email: string, captchaToken?: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: (everywhere?: boolean) => Promise<void>;
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
  if (m.includes('captcha')) return 'Confirme que você não é um robô e tente de novo.';
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
      if (event === 'SIGNED_IN' && s) recordGoogleConsent(s.user.id);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    enabled: !!supabase,
    loading,
    user: session?.user ?? null,
    recovering,
    async signInPassword(email, password, captchaToken) {
      const { error } = await need().auth.signInWithPassword({ email: email.trim(), password, options: { captchaToken } });
      if (error) throw error;
    },
    async signUp(email, password, nome, captchaToken) {
      const { data, error } = await need().auth.signUp({
        email: email.trim(),
        password,
        // termos_versao: o banco grava o aceite dos Termos e da Política no perfil
        options: { emailRedirectTo: redirectUrl(), captchaToken, data: { nome: nome.trim(), termos_versao: LEGAL.versao } },
      });
      if (error) throw error;
      return data.session ? 'signed-in' : 'confirm-email';
    },
    async signInGoogle() {
      // O aviso de aceite aparece antes do botão; o aceite é gravado quando a pessoa volta logada
      try {
        sessionStorage.setItem(ACEITE_GOOGLE, LEGAL.versao);
      } catch {
        /* sem sessionStorage */
      }
      const { error } = await need().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl() } });
      if (error) throw error;
    },
    async resendConfirmation(email, captchaToken) {
      const { error } = await need().auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectUrl(), captchaToken } });
      if (error) throw error;
    },
    async sendPasswordReset(email, captchaToken) {
      const { error } = await need().auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl(), captchaToken });
      if (error) throw error;
    },
    async updatePassword(password) {
      const { error } = await need().auth.updateUser({ password });
      if (error) throw error;
      setRecovering(false);
    },
    async signOut(everywhere = false) {
      // everywhere: encerra a sessão em todos os aparelhos (celular perdido ou roubado)
      await need().auth.signOut({ scope: everywhere ? 'global' : 'local' });
      setRecovering(false);
    },
    async deleteAccount() {
      // Pelo servidor: cancela a assinatura no Asaas antes de apagar (senão continuaria cobrando)
      const sb = need();
      const { error } = await sb.functions.invoke('excluir-conta', { body: { confirmacao: 'EXCLUIR' } });
      if (error) {
        let msg = 'Não foi possível excluir a conta agora. Tente de novo.';
        try {
          const j = await (error as { context?: Response }).context?.json();
          if (j?.error) msg = j.error;
        } catch {
          /* sem corpo */
        }
        throw new Error(msg);
      }
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

/** Grava o aceite dos Termos de quem entrou com Google (só se viu o aviso nesta sessão e ainda não tinha aceite). */
function recordGoogleConsent(uid: string) {
  let versao: string | null = null;
  try {
    versao = sessionStorage.getItem(ACEITE_GOOGLE);
    sessionStorage.removeItem(ACEITE_GOOGLE);
  } catch {
    return;
  }
  const sb = supabase;
  if (!versao || !sb) return;
  // setTimeout: o Supabase pede para não chamar a API dentro do onAuthStateChange
  setTimeout(() => {
    void sb.from('profiles').update({ aceitou_termos_em: new Date().toISOString(), termos_versao: versao }).eq('id', uid).is('aceitou_termos_em', null);
  }, 0);
}
