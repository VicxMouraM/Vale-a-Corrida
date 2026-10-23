-- Vale a Corrida: antifraude, bloqueios, auditoria e anúncios próprios.
-- Pode rodar mais de uma vez sem problema.

-- ---------------------------------------------------------------------------
-- 1. Teste grátis à prova de truques de e-mail
--    joao.silva+1@gmail.com, joaosilva@googlemail.com e JoaoSilva@gmail.com são a mesma pessoa.
--    E-mails descartáveis (10minutemail etc.) criam conta, mas não ganham teste.
-- ---------------------------------------------------------------------------
create or replace function public.email_normalizado(email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  e text := lower(trim(email));
  usuario text := split_part(e, '@', 1);
  dominio text := split_part(e, '@', 2);
begin
  usuario := split_part(usuario, '+', 1); -- tira o +apelido (Gmail, Outlook, iCloud, Proton…)
  if dominio in ('gmail.com', 'googlemail.com') then
    usuario := replace(usuario, '.', ''); -- Gmail ignora pontos
    dominio := 'gmail.com';
  end if;
  return usuario || '@' || dominio;
end;
$$;

create or replace function public.email_hash(email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(public.email_normalizado(email), 'sha256'), 'hex');
$$;

create table if not exists public.dominios_descartaveis (dominio text primary key);
alter table public.dominios_descartaveis enable row level security; -- sem políticas: só o servidor
revoke all on public.dominios_descartaveis from anon, authenticated;

insert into public.dominios_descartaveis (dominio) values
  ('10minutemail.com'), ('10minutemail.net'), ('20minutemail.com'), ('33mail.com'), ('anonaddy.me'), ('burnermail.io'),
  ('discard.email'), ('dispostable.com'), ('dropmail.me'), ('emailondeck.com'), ('fakeinbox.com'), ('fakemail.net'),
  ('getairmail.com'), ('getnada.com'), ('guerrillamail.com'), ('guerrillamail.net'), ('guerrillamail.org'), ('guerrillamailblock.com'),
  ('harakirimail.com'), ('inboxkitten.com'), ('mail.tm'), ('mail-temp.com'), ('maildrop.cc'), ('mailinator.com'), ('mailinator.net'),
  ('mailnesia.com'), ('mintemail.com'), ('mohmal.com'), ('mytemp.email'), ('nada.email'), ('sharklasers.com'), ('spam4.me'),
  ('spamgourmet.com'), ('temp-mail.io'), ('temp-mail.org'), ('tempail.com'), ('tempmail.dev'), ('tempmail.net'), ('tempmailo.com'),
  ('tempr.email'), ('throwawaymail.com'), ('tmail.ws'), ('tmpmail.net'), ('tmpmail.org'), ('trashmail.com'), ('trashmail.de'),
  ('yopmail.com'), ('yopmail.fr'), ('yopmail.net'), ('emailtemporario.com.br'), ('tempemail.com.br')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. Bloqueios (chargeback, fraude) — guarda só hashes, nunca o CPF ou e-mail em texto
-- ---------------------------------------------------------------------------
create table if not exists public.bloqueios (
  tipo text not null check (tipo in ('cpf', 'email')),
  hash text not null,
  motivo text not null,
  criado_em timestamptz not null default now(),
  primary key (tipo, hash)
);
alter table public.bloqueios enable row level security; -- sem políticas: só o servidor
revoke all on public.bloqueios from anon, authenticated;
grant select, insert, update, delete on public.bloqueios to service_role;

alter table public.subscriptions add column if not exists bloqueado boolean not null default false;
alter table public.subscriptions add column if not exists motivo_bloqueio text;
alter table public.subscriptions add column if not exists cancelado_em timestamptz;
alter table public.subscriptions add column if not exists motivo_cancelamento text;

-- ---------------------------------------------------------------------------
-- 3. Auditoria das ações sensíveis (assinar, cancelar, estorno, exclusão de conta…)
--    Sem chave estrangeira de propósito: o registro sobrevive à exclusão da conta.
-- ---------------------------------------------------------------------------
create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  user_id uuid,
  acao text not null,
  detalhes jsonb not null default '{}',
  criado_em timestamptz not null default now()
);
create index if not exists auditoria_user_acao on public.auditoria (user_id, acao, criado_em desc);
alter table public.auditoria enable row level security; -- sem políticas: só o servidor
revoke all on public.auditoria from anon, authenticated;
grant select, insert on public.auditoria to service_role;

-- ---------------------------------------------------------------------------
-- 4. Novo usuário: teste só para e-mail real, nunca usado e não bloqueado
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  h text;
  ganhou_teste boolean := false;
  versao text := left(new.raw_user_meta_data ->> 'termos_versao', 20);
  descartavel boolean := false;
  email_bloqueado boolean := false;
begin
  insert into public.profiles (id, nome, aceitou_termos_em, termos_versao)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80),
    case when versao is not null then now() end,
    versao
  );

  if new.email is not null then
    h := public.email_hash(new.email);
    descartavel := exists (select 1 from public.dominios_descartaveis d where d.dominio = split_part(lower(new.email), '@', 2));
    email_bloqueado := exists (select 1 from public.bloqueios b where b.tipo = 'email' and b.hash = h);
    if not descartavel and not email_bloqueado then
      insert into public.trial_usage (email_hash) values (h) on conflict do nothing;
      ganhou_teste := found;
    end if;
  end if;

  insert into public.subscriptions (user_id, status, trial_ends_at, bloqueado, motivo_bloqueio)
  values (
    new.id,
    case when ganhou_teste then 'trial' else 'free' end,
    case when ganhou_teste then now() + interval '7 days' end,
    email_bloqueado,
    case when email_bloqueado then 'E-mail bloqueado por contestação de pagamento' end
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Pro exige não estar bloqueado
-- ---------------------------------------------------------------------------
create or replace function public.is_pro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select not s.bloqueado and ((s.trial_ends_at > now()) or (s.current_period_end > now()))
       from public.subscriptions s
      where s.user_id = auth.uid()),
    false);
$$;

create or replace function public.get_my_plan()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'pro', public.is_pro(),
    'status', coalesce(s.status, 'free'),
    'trial_ends_at', s.trial_ends_at,
    'current_period_end', s.current_period_end,
    'billing_type', s.asaas_billing_type,
    'bloqueado', coalesce(s.bloqueado, false),
    'agora', now()
  )
  from (select 1) x
  left join public.subscriptions s on s.user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 6. Exclusão de conta passa a ser pela Edge Function `excluir-conta`,
--    que cancela a assinatura no Asaas antes (senão o Asaas continuaria cobrando).
-- ---------------------------------------------------------------------------
revoke execute on function public.delete_my_account() from authenticated;

-- ---------------------------------------------------------------------------
-- 7. Anúncios próprios (patrocinadores), cadastrados por você no Table Editor.
--    Aparecem só para quem não é Pro. Só texto, imagem e link: nenhum script de terceiros.
-- ---------------------------------------------------------------------------
create table if not exists public.anuncios (
  id bigint generated always as identity primary key,
  anunciante text not null check (char_length(anunciante) between 1 and 60),
  titulo text not null check (char_length(titulo) between 1 and 60),
  texto text check (char_length(texto) <= 140),
  imagem_url text check (imagem_url is null or imagem_url ~ '^https://'),
  link_url text not null check (link_url ~ '^https://'),
  chamada text not null default 'Saiba mais' check (char_length(chamada) <= 24),
  ativo boolean not null default true,
  inicio timestamptz not null default now(),
  fim timestamptz,
  peso int not null default 1 check (peso between 1 and 100),
  criado_em timestamptz not null default now()
);
alter table public.anuncios enable row level security;
drop policy if exists "anúncios: ver os ativos" on public.anuncios;
create policy "anúncios: ver os ativos" on public.anuncios
  for select to anon, authenticated
  using (ativo and inicio <= now() and (fim is null or fim > now()));
grant select on public.anuncios to anon, authenticated;
grant select, insert, update, delete on public.anuncios to service_role;

grant select, insert, update, delete on public.subscriptions, public.trial_usage, public.payment_events to service_role;

-- ---------------------------------------------------------------------------
-- 8. Cancelamento automático: quem deve ser encerrado pela rotina diária
--    - pendente (gerou cobrança e nunca pagou) há mais de N dias
--    - atrasado há mais de N dias depois do fim do Pro (pago ou teste); sem data, conta a última atualização
-- ---------------------------------------------------------------------------
create or replace function public.assinaturas_para_cancelar(dias int default 7)
returns table (user_id uuid, asaas_subscription_id text, motivo text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id, s.asaas_subscription_id,
         case when s.status = 'pending' then 'nunca_pagou' else 'atraso' end
    from public.subscriptions s
   where (s.status = 'pending' and s.atualizado_em < now() - make_interval(days => dias))
      or (s.status = 'overdue'
          and coalesce(greatest(s.current_period_end, s.trial_ends_at), s.atualizado_em) < now() - make_interval(days => dias))
   limit 500;
$$;

revoke all on function public.assinaturas_para_cancelar(int) from public, anon, authenticated;
grant execute on function public.assinaturas_para_cancelar(int) to service_role;
