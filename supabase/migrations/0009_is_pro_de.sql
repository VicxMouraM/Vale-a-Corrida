-- is_pro() olha o usuário logado (auth.uid()). As Edge Functions usam a chave de servidor, sem usuário,
-- então precisam perguntar por um id específico. Só o servidor pode chamar esta versão.
-- Pode rodar mais de uma vez sem problema.

create or replace function public.is_pro_de(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select not s.bloqueado and ((s.trial_ends_at > now()) or (s.current_period_end > now()))
       from public.subscriptions s
      where s.user_id = uid),
    false);
$$;

revoke all on function public.is_pro_de(uuid) from public, anon, authenticated;
grant execute on function public.is_pro_de(uuid) to service_role;
