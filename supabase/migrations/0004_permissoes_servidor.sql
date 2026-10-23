-- Permissões do servidor (papel `service_role`, usado só pelas Edge Functions: assinar, cancelar, asaas-webhook).
-- Projetos Supabase recentes não concedem isso automaticamente a tabelas criadas por SQL.
-- Esse papel nunca chega ao app: a chave dele existe só dentro do Supabase.
-- Pode rodar mais de uma vez sem problema.

grant usage on schema public to service_role;

grant select, insert, update, delete on public.subscriptions to service_role;
grant select, insert, update, delete on public.payment_events to service_role;
grant select, insert, update, delete on public.trial_usage to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.user_settings to service_role;
grant select, insert, update, delete on public.rides to service_role;
