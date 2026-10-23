-- Registro do aceite dos Termos de uso e da Política de privacidade.
-- Cadastro por e-mail: o app manda a versão aceita junto com o cadastro (metadados) e o banco grava aqui.
-- Login com Google: o app grava na primeira entrada (o aviso aparece antes do botão).
-- Pode rodar mais de uma vez sem problema.

alter table public.profiles add column if not exists termos_versao text check (char_length(termos_versao) <= 20);

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
    insert into public.trial_usage (email_hash) values (h) on conflict do nothing;
    ganhou_teste := found;
  end if;

  insert into public.subscriptions (user_id, status, trial_ends_at)
  values (new.id, case when ganhou_teste then 'trial' else 'free' end, case when ganhou_teste then now() + interval '7 days' end);
  return new;
end;
$$;

-- O usuário só pode registrar o próprio aceite (e o nome); o resto do perfil não muda pelo app.
revoke update on public.profiles from authenticated;
grant update (nome, aceitou_termos_em, termos_versao) on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;
