-- Menor privilégio: o app (visitante e usuário logado) só precisa ler/gravar linhas, sempre filtradas pelo RLS.
-- O padrão do Supabase também concede TRUNCATE (apaga a tabela inteira e IGNORA o RLS), TRIGGER e REFERENCES.
-- A API não expõe esses comandos hoje, mas não há motivo para a porta existir.
-- Pode rodar mais de uma vez sem problema.

do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t.tablename);
  end loop;
end;
$$;

-- Tabelas criadas no futuro já nascem sem esses privilégios
alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;
