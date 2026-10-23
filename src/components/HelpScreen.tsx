import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { usePlan } from '../lib/plan';
import { supabase } from '../lib/supabase';
import { Btn, Card, Segmented } from './ui';

/** WhatsApp do suporte (DDI + DDD + número, só dígitos). */
export const WHATSAPP_SUPORTE = '5511976520065';
const WHATSAPP_EXIBIR = '(11) 97652-0065';

type Tipo = 'problema' | 'sugestao' | 'elogio' | 'outro';

const TIPOS: { value: Tipo; label: string }[] = [
  { value: 'problema', label: '🐞 Problema' },
  { value: 'sugestao', label: '💡 Sugestão' },
  { value: 'elogio', label: '👏 Elogio' },
  { value: 'outro', label: 'Outro' },
];

const NOMES_TELA: Record<string, string> = { corrida: 'Corrida', historico: 'Histórico', metas: 'Metas', ajustes: 'Ajustes' };

/** Informações técnicas que ajudam a reproduzir um problema (sem dados pessoais). */
function contextoTecnico(tela: string, plano: string, plataforma?: string, veiculo?: string) {
  const temNavegador = typeof navigator !== 'undefined' && typeof window !== 'undefined';
  const ua = temNavegador ? navigator.userAgent : '';
  const sistema = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'outro';
  const nav = /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome/.test(ua) ? 'Chrome' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'outro';
  const instalado = temNavegador && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
  return {
    versao: (import.meta.env.VITE_VERSAO as string | undefined)?.slice(0, 7) || 'dev',
    tela: NOMES_TELA[tela] ?? tela,
    plano,
    navegador: `${sistema} · ${nav}`,
    tamanhoTela: temNavegador ? `${window.innerWidth}×${window.innerHeight}` : '',
    instalado: instalado ? 'app instalado' : 'navegador',
    ...(plataforma ? { plataforma } : {}),
    ...(veiculo ? { veiculo } : {}),
  };
}

export function HelpScreen({ tela, plataforma, veiculo, onBack }: { tela: string; plataforma?: string; veiculo?: string; onBack: () => void }) {
  const auth = useAuth();
  const { plan } = usePlan();
  const plano = !auth.user ? 'sem conta' : plan.pro ? 'Pro' : 'Grátis';
  const ctx = contextoTecnico(tela, plano, plataforma, veiculo);

  const [tipo, setTipo] = useState<Tipo>('problema');
  const [mensagem, setMensagem] = useState('');
  const [contato, setContato] = useState(auth.user?.email ?? '');
  const [incluirTecnico, setIncluirTecnico] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const linhaTecnica = `versão ${ctx.versao} · tela ${ctx.tela} · ${ctx.navegador} · ${ctx.instalado} · plano ${ctx.plano}`;
  const textoWhats = `Olá! Quero falar sobre o Vale a Corrida.\n\nO que aconteceu: \n\n(informações para o suporte: ${linhaTecnica})`;
  const linkWhats = `https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(textoWhats)}`;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (mensagem.trim().length < 3) return setErro('Escreva um pouco mais sobre o que aconteceu.');
    if (!supabase) return setErro('O envio pelo app não está disponível nesta versão. Use o WhatsApp.');
    setEnviando(true);
    setErro(null);
    const { error } = await supabase.functions.invoke('feedback', {
      body: { tipo, mensagem: mensagem.trim(), contato: contato.trim() || undefined, contexto: incluirTecnico ? ctx : { versao: ctx.versao } },
    });
    setEnviando(false);
    if (error) {
      let msg = 'Não foi possível enviar agora. Tente de novo ou fale pelo WhatsApp.';
      try {
        const j = await (error as { context?: Response }).context?.json();
        if (j?.error) msg = j.error;
      } catch {
        /* sem corpo */
      }
      return setErro(msg);
    }
    setEnviado(true);
    setMensagem('');
  }

  return (
    <div className="mx-auto grid max-w-md gap-4">
      <button onClick={onBack} className="justify-self-start text-sm font-semibold text-muted hover:text-ink">
        ← Voltar
      </button>

      <Card>
        <h1 className="font-display text-2xl font-bold tracking-wide">Ajuda e feedback</h1>
        <p className="mb-4 text-sm text-muted">Encontrou um problema, tem uma ideia ou quer elogiar? Fale com a gente do jeito que preferir.</p>

        <a
          href={linkWhats}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-xl bg-[#1F8F4E] px-4 py-3 text-white hover:opacity-95"
        >
          <span>
            <span className="block font-display text-lg font-bold tracking-wide">💬 Falar no WhatsApp</span>
            <span className="block text-xs opacity-90">{WHATSAPP_EXIBIR} · A mensagem já vai com os dados do seu celular</span>
          </span>
          <span aria-hidden className="text-2xl">›</span>
        </a>
        <p className="mt-2 text-xs text-muted">Se puder, mande um print da tela junto: ajuda muito a resolver.</p>
      </Card>

      <Card>
        <h2 className="mb-1 font-display text-xl font-semibold tracking-wide">Ou escreva aqui</h2>
        {enviado ? (
          <div role="status" className="rounded-md bg-good-soft px-3 py-3 text-sm text-good">
            <strong>Mensagem enviada. Obrigado!</strong>
            <span className="mt-1 block">{contato ? 'Se precisar, respondemos no contato que você deixou.' : 'Ela já chegou para a equipe do app.'}</span>
            <button className="mt-2 font-semibold underline" onClick={() => setEnviado(false)}>
              Enviar outra
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} className="grid min-w-0 gap-3 [&>*]:min-w-0" noValidate>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-muted">Sobre o quê?</span>
              <div className="overflow-x-auto">
                <Segmented<Tipo> label="Tipo da mensagem" value={tipo} onChange={setTipo} options={TIPOS} />
              </div>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-muted">
                {tipo === 'problema' ? 'O que aconteceu? O que você estava fazendo?' : tipo === 'sugestao' ? 'Qual é a sua ideia?' : 'Sua mensagem'}
              </span>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder={tipo === 'problema' ? 'Ex.: ao tocar em Importar, a tela ficou branca.' : ''}
                className="w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
              />
              <span className="text-right text-[11px] text-muted">{mensagem.length}/2000</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-muted">E-mail ou telefone para resposta (opcional)</span>
              <input
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                maxLength={120}
                autoComplete="email"
                className="w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
              />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={incluirTecnico} onChange={(e) => setIncluirTecnico(e.target.checked)} />
              <span>
                Incluir informações técnicas
                <span className="block text-xs text-muted">{linhaTecnica}</span>
              </span>
            </label>
            {erro && (
              <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
                {erro}
              </p>
            )}
            <Btn type="submit" kind="primary" disabled={enviando || mensagem.trim().length < 3} className="py-2.5">
              {enviando ? 'Enviando…' : 'Enviar mensagem'}
            </Btn>
          </form>
        )}
      </Card>
    </div>
  );
}
