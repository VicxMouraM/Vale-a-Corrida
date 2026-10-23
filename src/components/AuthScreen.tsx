import { useState, type FormEvent, type ReactNode } from 'react';
import { authErrorMessage, passwordProblem, useAuth } from '../auth/AuthProvider';
import { LegalLinks, type LegalDoc } from './LegalScreen';
import { Turnstile, TURNSTILE_SITE_KEY } from './Turnstile';
import { Btn, Card, TextField } from './ui';

type Mode = 'entrar' | 'criar' | 'esqueci';

const MODES: { id: Mode; label: string }[] = [
  { id: 'entrar', label: 'Entrar' },
  { id: 'criar', label: 'Criar conta' },
];

export function AuthScreen({ onClose, onLegal }: { onClose: () => void; onLegal: (d: LegalDoc) => void }) {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [aceite, setAceite] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const captchaOk = !TURNSTILE_SITE_KEY || !!captcha;
  const token = captcha ?? undefined;

  function go(m: Mode) {
    setMode(m);
    setError(null);
    setInfo(null);
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
      setCaptchaReset((n) => n + 1); // o token do CAPTCHA só vale uma vez
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'entrar') return run(() => auth.signInPassword(email, password, token));
    if (mode === 'esqueci')
      return run(async () => {
        await auth.sendPasswordReset(email, token);
        setInfo('Se esse e-mail tiver conta, enviamos um link para criar uma nova senha. Confira também o spam.');
      });
    // criar
    const p = passwordProblem(password);
    if (p) return setError(p);
    if (password !== password2) return setError('As senhas não são iguais.');
    if (!aceite) return setError('Para criar a conta, aceite os Termos de uso e a Política de privacidade.');
    return run(async () => {
      const r = await auth.signUp(email, password, nome, token);
      if (r === 'exists') {
        setError('Já existe uma conta com esse e-mail. Toque em Entrar (com a senha ou com o Google) ou use “Esqueci a senha”.');
        return;
      }
      if (r === 'confirm-email') setInfo(`Enviamos um link de confirmação para ${email.trim()}. Abra o e-mail e toque no link para ativar a conta. Confira também o spam.`);
    });
  }

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const canSubmit =
    mode === 'entrar'
      ? emailOk && password.length > 0
      : mode === 'esqueci'
        ? emailOk
        : emailOk && password.length > 0 && password2.length > 0 && aceite;

  const submitLabel = mode === 'entrar' ? 'Entrar' : mode === 'criar' ? 'Criar conta' : 'Enviar link';

  return (
    <div className="mx-auto max-w-md">
      <button onClick={onClose} className="mb-3 text-sm font-semibold text-muted hover:text-ink">
        ← Continuar sem conta
      </button>
      <Card>
        <h1 className="font-display text-2xl font-bold tracking-wide">{mode === 'esqueci' ? 'Recuperar senha' : 'Sua conta'}</h1>
        <p className="mb-4 text-sm text-muted">
          {mode === 'esqueci'
            ? 'Digite o e-mail da conta. Você recebe um link para criar uma senha nova.'
            : 'Com uma conta, seu histórico fica salvo na nuvem e aparece em qualquer aparelho.'}
        </p>

        {mode !== 'esqueci' && (
          <>
            <SocialBtn onClick={() => run(auth.signInGoogle)} disabled={busy}>
              <GoogleIcon /> Continuar com Google
            </SocialBtn>
            <p className="mt-2 text-center text-xs text-muted">
              Ao continuar com o Google, você aceita os <LegalLinks onOpen={onLegal} />.
            </p>
            <div className="my-4 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
            </div>
            <div role="tablist" className="mb-4 grid grid-cols-2 rounded-lg border border-line bg-sunk p-0.5">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  role="tab"
                  type="button"
                  aria-selected={mode === m.id}
                  onClick={() => go(m.id)}
                  className={`rounded-md py-1.5 text-sm font-medium ${mode === m.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </>
        )}

        <form onSubmit={submit} className="grid gap-3" noValidate>
          {mode === 'criar' && <TextField label="Seu nome (opcional)" value={nome} onChange={setNome} autoComplete="name" />}
          <TextField label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" />
          {mode !== 'esqueci' && (
            <TextField
              label="Senha"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
            />
          )}
          {mode === 'criar' && (
            <>
              <TextField label="Repita a senha" type="password" value={password2} onChange={setPassword2} autoComplete="new-password" />
              <p className="-mt-1 text-xs text-muted">Pelo menos 8 caracteres, com letras e números.</p>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
                <span>
                  Li e aceito os <LegalLinks onOpen={onLegal} />.
                </span>
              </label>
            </>
          )}
          <Turnstile onToken={setCaptcha} resetKey={captchaReset} />

          {error && (
            <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
              {error}
              {error.startsWith('Confirme o seu e-mail') && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="font-semibold underline"
                    disabled={busy || !captchaOk}
                    onClick={() =>
                      run(async () => {
                        await auth.resendConfirmation(email, token);
                        setInfo(`Enviamos um novo link para ${email.trim()}. Confira também o spam.`);
                      })
                    }
                  >
                    Reenviar e-mail
                  </button>
                </>
              )}
            </p>
          )}
          {info && (
            <p role="status" className="rounded-md bg-good-soft px-3 py-2 text-sm text-good">
              {info}
            </p>
          )}

          <Btn type="submit" kind="primary" disabled={busy || !canSubmit || !captchaOk} className="py-2.5">
            {busy ? 'Aguarde…' : submitLabel}
          </Btn>
        </form>

        <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
          {mode === 'entrar' && (
            <button type="button" className="font-semibold text-accent" onClick={() => go('esqueci')}>
              Esqueci a senha
            </button>
          )}
          {mode === 'esqueci' && (
            <button type="button" className="font-semibold text-accent" onClick={() => go('entrar')}>
              ← Voltar para entrar
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

/** Aberta pelo link de "esqueci a senha". */
export function NewPasswordScreen() {
  const auth = useAuth();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const prob = passwordProblem(p1);
    if (prob) return setError(prob);
    if (p1 !== p2) return setError('As senhas não são iguais.');
    setBusy(true);
    setError(null);
    try {
      await auth.updatePassword(p1);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gutter mx-auto max-w-md py-10">
      <Card>
        <h1 className="mb-1 font-display text-2xl font-bold tracking-wide">Nova senha</h1>
        <p className="mb-4 text-sm text-muted">Escolha uma senha nova para a sua conta.</p>
        <form onSubmit={submit} className="grid gap-3" noValidate>
          <TextField label="Nova senha" type="password" value={p1} onChange={setP1} autoComplete="new-password" />
          <TextField label="Repita a nova senha" type="password" value={p2} onChange={setP2} autoComplete="new-password" />
          {error && (
            <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
              {error}
            </p>
          )}
          <Btn type="submit" kind="primary" disabled={busy || !p1 || !p2} className="py-2.5">
            {busy ? 'Aguarde…' : 'Salvar senha'}
          </Btn>
        </form>
      </Card>
    </div>
  );
}

function SocialBtn({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface py-2.5 text-sm font-semibold hover:bg-sunk disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 01-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0012 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 010-4.6V6.6h-4a12 12 0 000 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 001.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}
