import { LEGAL, PRIVACIDADE, TERMOS } from '../legal';
import { Card, Segmented } from './ui';

export type LegalDoc = 'termos' | 'privacidade';

export function LegalScreen({ doc, onDoc, onBack }: { doc: LegalDoc; onDoc: (d: LegalDoc) => void; onBack: () => void }) {
  const secoes = doc === 'termos' ? TERMOS : PRIVACIDADE;
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <button onClick={onBack} className="justify-self-start text-sm font-semibold text-muted hover:text-ink">
        ← Voltar
      </button>
      <Segmented<LegalDoc>
        label="Documento"
        value={doc}
        onChange={onDoc}
        options={[
          { value: 'termos', label: 'Termos de uso' },
          { value: 'privacidade', label: 'Privacidade' },
        ]}
      />
      <Card>
        <h1 className="font-display text-2xl font-bold tracking-wide">{doc === 'termos' ? 'Termos de uso' : 'Política de privacidade'}</h1>
        <p className="mb-4 text-xs text-muted">Atualizado em {LEGAL.atualizadoEm}</p>
        <div className="flex flex-col gap-4">
          {secoes.map((s) => (
            <section key={s.titulo}>
              <h2 className="mb-1 font-semibold">{s.titulo}</h2>
              {s.paragrafos.map((p) => (
                <p key={p.slice(0, 40)} className="mb-2 text-sm leading-relaxed">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </Card>
    </div>
  );
}

/** Links pequenos para os dois documentos (rodapé, cadastro). */
export function LegalLinks({ onOpen, className = '' }: { onOpen: (d: LegalDoc) => void; className?: string }) {
  return (
    <span className={className}>
      <button type="button" className="font-semibold text-accent underline-offset-2 hover:underline" onClick={() => onOpen('termos')}>
        Termos de uso
      </button>{' '}
      e{' '}
      <button type="button" className="font-semibold text-accent underline-offset-2 hover:underline" onClick={() => onOpen('privacidade')}>
        Política de privacidade
      </button>
    </span>
  );
}
