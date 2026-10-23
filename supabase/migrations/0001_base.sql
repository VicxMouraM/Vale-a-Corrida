-- Vale a Corrida: base com contas de usuário.
-- Rode no Supabase em SQL Editor (ou `supabase db push`).
-- Regra de ouro: toda tabela tem RLS e cada usuário só enxerga e altera as próprias linhas.

-- ---------------------------------------------------------------------------
-- Perfil (1 por usuário, criado automaticamente no cadastro)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text check (char_length(nome) <= 80),
  aceitou_termos_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "perfil: ler o próprio" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "perfil: alterar o próprio" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Ajustes e última oferta digitada (JSON, 1 linha por usuário)
-- ---------------------------------------------------------------------------
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null,
  offer jsonb,
  atualizado_em timestamptz not null default now(),
  -- limite de tamanho para ninguém usar o banco como depósito
  constraint settings_tamanho check (pg_column_size(settings) < 200000),
  constraint offer_tamanho check (offer is null or pg_column_size(offer) < 20000)
);

alter table public.user_settings enable row level security;

create policy "ajustes: ler os próprios" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "ajustes: criar os próprios" on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ajustes: alterar os próprios" on public.user_settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Corridas registradas (histórico)
-- ---------------------------------------------------------------------------
create table public.rides (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id text not null check (char_length(id) between 1 and 64),
  data timestamptz not null,
  valor double precision not null check (valor >= 0 and valor < 100000),
  bonus double precision not null default 0 check (bonus >= 0 and bonus < 100000),
  km double precision not null check (km >= 0 and km < 100000),
  minutos double precision not null check (minutos >= 0 and minutos < 100000),
  despesas double precision not null default 0 check (despesas >= 0 and despesas < 100000),
  taxas double precision not null default 0 check (taxas >= 0 and taxas < 100000),
  combustivel text not null check (combustivel in ('gasolina', 'etanol')),
  preco_litro double precision not null default 0,
  kml double precision not null default 0,
  custo_combustivel double precision not null default 0,
  custo_desgaste double precision not null default 0,
  custo_fixo double precision not null default 0,
  lucro double precision not null,
  plataforma text check (char_length(plataforma) <= 40),
  obs text check (char_length(obs) <= 500),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (user_id, id)
);

create index rides_user_data on public.rides (user_id, data desc);

alter table public.rides enable row level security;

create policy "corridas: ler as próprias" on public.rides
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "corridas: criar as próprias" on public.rides
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "corridas: alterar as próprias" on public.rides
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "corridas: apagar as próprias" on public.rides
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- atualizado_em automático
-- ---------------------------------------------------------------------------
create function public.touch_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_atualizado_em();
create trigger user_settings_touch before update on public.user_settings for each row execute function public.touch_atualizado_em();
create trigger rides_touch before update on public.rides for each row execute function public.touch_atualizado_em();

-- ---------------------------------------------------------------------------
-- LGPD: o próprio usuário pode excluir a conta e todos os dados
-- ---------------------------------------------------------------------------
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  delete from auth.users where id = auth.uid(); -- as tabelas acima caem junto (on delete cascade)
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Visitantes sem login não têm acesso a nada
revoke all on public.profiles, public.user_settings, public.rides from anon;
