export const VERDICT = {
  vale: { icon: '🟢', title: 'Vale a pena', action: 'Pode aceitar.', short: 'Aceitar', box: 'border-good/50 bg-good-soft', text: 'text-good' },
  baixo: { icon: '🟡', title: 'Lucro baixo', action: 'Dá lucro, mas abaixo das suas metas.', short: 'Pensar', box: 'border-warn/50 bg-warn-soft', text: 'text-warn' },
  nao: { icon: '🔴', title: 'Não compensa', action: 'Recuse: você paga para rodar.', short: 'Recusar', box: 'border-bad/50 bg-bad-soft', text: 'text-bad' },
} as const;
