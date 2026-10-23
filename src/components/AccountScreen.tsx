import { useState } from 'react';
import { authErrorMessage, useAuth } from '../auth/AuthProvider';
import type { SyncStatus } from '../lib/useAppData';
import { Btn, Card, TextField } from './ui';

export const STATUS_TEXT: Record<SyncStatus, string> = {
  local: 'Salvo só neste aparelho',
  'local-err': 'Não foi possível salvar neste navegador',
  loading: 'Carregando sua conta…',
  synced: 'Tudo salvo na sua conta',
  saving: 'Salvando…',
  offline: 'Sem internet: salvo no aparelho, envia quando voltar',
  error: 'Erro ao salvar na conta. Tentaremos de novo.',
};

interface Props {
  status: SyncStatus;
  hasPending: () => boolean;
  forgetDevice: () => void;
  onBack: () => void;
}

export function AccountScreen({ status, hasPending, forgetDevice, onBack }: Props) {
  const auth = useAuth();
  const user = auth.user!;
  const [confirmOut, setConfirmOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nome = (user.user_metadata?.nome || user.user_metadata?.full_name || user.user_metadata?.name) as string | undefined;
  const ident = user.email || 'Conta';
  const provider = (user.app_metadata?.provider as string | undefined) ?? 'email';
  const providerLabel: Record<string, string> = { email: 'e-mail e senha', google: 'Google' };

  async function signOut() {
    if (hasPending() && !confirmOut) return setConfirmOut(true);
    setBusy(true);
    forgetDevice();
    await auth.signOut();
  }

  async function del() {
    setBusy(true);
    setError(null);
    try {
      await auth.deleteAccount();
      forgetDevice();
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-md gap-4">
      <button onClick={onBack} className="justify-self-start text-sm font-semibold text-muted hover:text-ink">
        ← Voltar
      </button>
      <Card>
        <h1 className="font-display text-2xl font-bold tracking-wide">{nome || 'Sua conta'}</h1>
        <p className="text-sm text-muted">{ident}</p>
        <p className="mt-1 text-xs text-muted">Entrou com {providerLabel[provider] ?? provider}</p>
        <p className={`mt-3 text-sm ${status === 'error' ? 'text-bad' : status === 'offline' ? 'text-warn' : 'text-good'}`} role="status">
          {STATUS_TEXT[status]}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn onClick={signOut} disabled={busy}>
            {confirmOut ? 'Sair mesmo assim' : 'Sair da conta'}
          </Btn>
          {confirmOut && <Btn onClick={() => setConfirmOut(false)}>Cancelar</Btn>}
        </div>
        {confirmOut && (
          <p className="mt-2 text-sm text-warn">
            Há alterações que ainda não chegaram à sua conta. Se sair agora, elas se perdem. Conecte-se à internet e espere aparecer "Tudo salvo".
          </p>
        )}
        <p className="mt-3 text-xs text-muted">Ao sair, os dados da conta são apagados deste aparelho. Eles continuam na sua conta.</p>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-semibold tracking-wide">Excluir conta</h2>
        <p className="mb-3 text-sm text-muted">
          Apaga para sempre a conta, os ajustes e todo o histórico de corridas. Não tem como desfazer. Se quiser guardar os dados, gere um backup em Ajustes antes.
        </p>
        {deleting ? (
          <div className="grid gap-3">
            <TextField label='Para confirmar, digite EXCLUIR' value={typed} onChange={setTyped} autoComplete="off" />
            <div className="flex flex-wrap gap-2">
              <Btn kind="danger" disabled={busy || typed.trim().toUpperCase() !== 'EXCLUIR'} onClick={del}>
                Excluir tudo
              </Btn>
              <Btn onClick={() => { setDeleting(false); setTyped(''); }}>Cancelar</Btn>
            </div>
          </div>
        ) : (
          <Btn kind="danger" onClick={() => setDeleting(true)}>
            Excluir minha conta
          </Btn>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-bad">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}
