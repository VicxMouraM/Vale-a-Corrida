-- Pro de cortesia: acesso Pro permanente sem cobrança (dona do app, parceiros, testadores).
-- Independe da assinatura: cancelamento, webhook do Asaas e a rotina automática não mexem nela.
-- Só o servidor altera (o app só lê a própria linha de subscriptions, sem permissão de gravar).
-- Pode rodar mais de uma vez sem problema.

alter table public.subscriptions add column if not exists cortesia boolean not null default false;
alter table public.subscriptions add column if not exists cortesia_motivo text check (char_length(cortesia_motivo) <= 120);

create or replace function public.is_pro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.cortesia or (not s.bloqueado and ((s.trial_ends_at > now()) or (s.current_period_end > now())))
       from public.subscriptions s
      where s.user_id = auth.uid()),
    false);
$$;

create or replace function public.is_pro_de(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.cortesia or (not s.bloqueado and ((s.trial_ends_at > now()) or (s.current_period_end > now())))
       from public.subscriptions s
      where s.user_id = uid),
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
    'cortesia', coalesce(s.cortesia, false),
    'agora', now()
  )
  from (select 1) x
  left join public.subscriptions s on s.user_id = auth.uid();
$$;

-- Permissões continuam as mesmas (recriar a função mantém os grants, mas garantimos)
revoke all on function public.is_pro_de(uuid) from public, anon, authenticated;
grant execute on function public.is_pro_de(uuid) to service_role;
grant execute on function public.is_pro() to authenticated;
grant execute on function public.get_my_plan() to authenticated;

-- Para dar ou tirar cortesia (SQL Editor):
--   update public.subscriptions set cortesia = true, cortesia_motivo = 'parceiro X'
--    where user_id = (select id from auth.users where email = 'pessoa@exemplo.com');
-- Quem tem cortesia:
--   select u.email, s.cortesia_motivo from public.subscriptions s join auth.users u on u.id = s.user_id where s.cortesia;
