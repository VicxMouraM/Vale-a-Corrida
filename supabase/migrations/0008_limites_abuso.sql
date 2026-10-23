-- Limites contra abuso de armazenamento e permissões explícitas das funções auxiliares.
-- Pode rodar mais de uma vez sem problema.

-- ---------------------------------------------------------------------------
-- Teto de corridas por conta: 50 mil (≈ 20 por dia durante 7 anos).
-- Checado uma vez por comando (não por linha), então importar um backup grande continua rápido.
-- ---------------------------------------------------------------------------
create or replace function public.limite_corridas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.rides r where r.user_id = auth.uid()) > 50000 then
    raise exception 'Limite de 50 mil corridas por conta atingido. Exporte e apague corridas antigas.' using errcode = 'P0001';
  end if;
  return null;
end;
$$;

drop trigger if exists rides_limite on public.rides;
create trigger rides_limite
  after insert on public.rides
  for each statement execute function public.limite_corridas();

-- ---------------------------------------------------------------------------
-- Funções auxiliares: só o servidor precisa delas
-- ---------------------------------------------------------------------------
revoke all on function public.email_hash(text) from public, anon, authenticated;
revoke all on function public.email_normalizado(text) from public, anon, authenticated;
grant execute on function public.email_hash(text) to service_role;
grant execute on function public.email_normalizado(text) to service_role;
-- (Funções de gatilho não são chamáveis pela API; não mexemos na permissão delas para não arriscar o cadastro.)
