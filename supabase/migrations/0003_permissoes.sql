-- Permissões explícitas para o usuário logado (papel `authenticated`).
-- Projetos Supabase recentes não concedem isso automaticamente a tabelas criadas por SQL.
-- As regras RLS continuam valendo: cada usuário só alcança as próprias linhas.
-- Pode rodar mais de uma vez sem problema.

grant usage on schema public to authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.user_settings to authenticated;
grant select, insert, update, delete on public.rides to authenticated;
grant select on public.subscriptions to authenticated;

grant execute on function public.is_pro() to authenticated;
grant execute on function public.get_my_plan() to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- Visitantes sem login continuam sem acesso a nada
revoke all on public.profiles, public.user_settings, public.rides, public.subscriptions from anon;
