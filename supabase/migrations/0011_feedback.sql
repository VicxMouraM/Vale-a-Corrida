-- Relatos de problema, sugestões e elogios enviados pelo app (tela "Ajuda e feedback").
-- Só o servidor grava (Edge Function `feedback`, com limite contra spam) e só você lê (Table Editor).
-- Pode rodar mais de uma vez sem problema.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  tipo text not null check (tipo in ('problema', 'sugestao', 'elogio', 'outro')),
  mensagem text not null check (char_length(mensagem) between 3 and 2000),
  contato text check (char_length(contato) <= 120), -- e-mail ou telefone, se a pessoa quiser resposta
  user_id uuid, -- sem chave estrangeira: o relato sobrevive se a conta for excluída
  contexto jsonb not null default '{}' check (pg_column_size(contexto) < 4000), -- versão, tela, navegador, plano
  origem_hash text, -- hash (com segredo) do endereço de internet, só para limitar spam
  resolvido boolean not null default false,
  anotacao text -- para você anotar o que fez
);

create index if not exists feedback_recentes on public.feedback (criado_em desc);
create index if not exists feedback_origem on public.feedback (origem_hash, criado_em desc);

alter table public.feedback enable row level security; -- sem políticas: o app não lê nem grava direto
revoke all on public.feedback from anon, authenticated;
grant select, insert, update, delete on public.feedback to service_role;
