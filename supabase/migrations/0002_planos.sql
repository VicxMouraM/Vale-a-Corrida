-- Vale a Corrida: planos Grátis e Pro (R$ 49,99/mês via Asaas), com 7 dias de teste do Pro.
-- Quem decide se o usuário é Pro é SEMPRE o banco. O app só mostra ou esconde telas.
-- Esta tabela só é alterada pelo servidor (Edge Functions com a chave service_role), nunca pelo app.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Assinatura (1 por usuário)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- trial | pending (gerou cobrança, ainda não pagou) | active | overdue | canceled | refunded | free
  status text not null default 'free' check (status in ('free', 'trial', 'pending', 'active', 'overdue', 'canceled', 'refunded')),
  trial_ends_at timestamptz,
  current_period_end timestamptz, -- Pro liberado até aqui (já inclui 3 dias de tolerância)
  asaas_customer_id text,
  asaas_subscription_id text unique,
  asaas_billing_type text check (asaas_billing_type in ('PIX', 'CREDIT_CARD', 'BOLETO')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- O usuário só LÊ a própria assinatura. Não há política de insert/update/delete: só o servidor escreve.
create policy "assinatura: ler a própria" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke all on public.subscriptions from anon;

create trigger subscriptions_touch before update on public.subscriptions for each row execute function public.touch_atualizado_em();

-- ---------------------------------------------------------------------------
-- Teste grátis só uma vez por e-mail (guarda só o hash, não o e-mail)
-- ---------------------------------------------------------------------------
create table public.trial_usage (
  email_hash text primary key,
  usado_em timestamptz not null default now()
);
alter table public.trial_usage enable row level security; -- sem políticas: ninguém do app acessa
revoke all on public.trial_usage from anon, authenticated;

create function public.email_hash(email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(lower(trim(email)), 'sha256'), 'hex');
$$;

-- ---------------------------------------------------------------------------
-- Eventos do Asaas já processados (o webhook pode chegar repetido)
-- ---------------------------------------------------------------------------
create table public.payment_events (
  id text primary key,
  evento text not null,
  payload jsonb not null,
  recebido_em timestamptz not null default now()
);
alter table public.payment_events enable row level security; -- sem políticas: só o servidor
revoke all on public.payment_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Novo usuário: perfil + assinatura (com teste de 7 dias se o e-mail nunca usou)
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
begin
  insert into public.profiles (id, nome)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80));

  if new.email is not null then
    h := public.email_hash(new.email);
    insert into public.trial_usage (email_hash) values (h) on conflict do nothing;
    ganhou_teste := found;
  end if;

  insert into public.subscriptions (user_id, status, trial_ends_at)
  values (new.id, case when ganhou_teste then 'trial' else 'free' end, case when ganhou_teste then now() + interval '7 days' end);
  return new;
end;
$$;

-- Contas que já existiam ganham o teste a partir de agora
insert into public.trial_usage (email_hash)
select public.email_hash(email) from auth.users where email is not null
on conflict do nothing;

insert into public.subscriptions (user_id, status, trial_ends_at)
select id, 'trial', now() + interval '7 days' from auth.users
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- É Pro agora? (usado nas regras de acesso e pelo app)
-- ---------------------------------------------------------------------------
create function public.is_pro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (s.trial_ends_at > now()) or (s.current_period_end > now())
       from public.subscriptions s
      where s.user_id = auth.uid()),
    false);
$$;

revoke all on function public.is_pro() from public, anon;
grant execute on function public.is_pro() to authenticated;

create function public.get_my_plan()
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
    'agora', now()
  )
  from (select 1) x
  left join public.subscriptions s on s.user_id = auth.uid();
$$;

revoke all on function public.get_my_plan() from public, anon;
grant execute on function public.get_my_plan() to authenticated;

-- ---------------------------------------------------------------------------
-- Plano grátis: histórico dos últimos 30 dias. As corridas antigas continuam guardadas
-- e voltam a aparecer quando a pessoa assina.
-- ---------------------------------------------------------------------------
drop policy "corridas: ler as próprias" on public.rides;
drop policy "corridas: alterar as próprias" on public.rides;
drop policy "corridas: apagar as próprias" on public.rides;

create policy "corridas: ler as próprias (grátis: 30 dias)" on public.rides
  for select to authenticated
  using ((select auth.uid()) = user_id and ((select public.is_pro()) or data >= now() - interval '30 days'));
create policy "corridas: alterar as próprias (grátis: 30 dias)" on public.rides
  for update to authenticated
  using ((select auth.uid()) = user_id and ((select public.is_pro()) or data >= now() - interval '30 days'))
  with check ((select auth.uid()) = user_id);
create policy "corridas: apagar as próprias (grátis: 30 dias)" on public.rides
  for delete to authenticated
  using ((select auth.uid()) = user_id and ((select public.is_pro()) or data >= now() - interval '30 days'));
