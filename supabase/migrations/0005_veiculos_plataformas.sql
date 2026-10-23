-- Veículos e plataformas: cada corrida guarda em qual veículo e plataforma foi feita,
-- e o plano Grátis fica limitado a 1 veículo e 1 plataforma (Pro: vários).
-- Pode rodar mais de uma vez sem problema.

alter table public.rides add column if not exists veiculo text check (char_length(veiculo) <= 64);
create index if not exists rides_user_plataforma on public.rides (user_id, plataforma);

-- ---------------------------------------------------------------------------
-- Limite do plano Grátis, checado no banco (o app só esconde os botões).
-- Só barra quando a lista CRESCE além de 1: quem foi Pro e voltou ao Grátis
-- com vários veículos continua conseguindo salvar os ajustes.
-- ---------------------------------------------------------------------------
create or replace function public.limite_plano_gratis()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novo int := coalesce(jsonb_array_length(case when jsonb_typeof(new.settings -> 'veiculos') = 'array' then new.settings -> 'veiculos' end), 0);
  p_novo int := coalesce(jsonb_array_length(case when jsonb_typeof(new.settings -> 'plataformas') = 'array' then new.settings -> 'plataformas' end), 0);
  v_antes int := 0;
  p_antes int := 0;
begin
  if public.is_pro() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    v_antes := coalesce(jsonb_array_length(case when jsonb_typeof(old.settings -> 'veiculos') = 'array' then old.settings -> 'veiculos' end), 0);
    p_antes := coalesce(jsonb_array_length(case when jsonb_typeof(old.settings -> 'plataformas') = 'array' then old.settings -> 'plataformas' end), 0);
  end if;
  if v_novo > 1 and v_novo > v_antes then
    raise exception 'Plano Grátis permite 1 veículo. Assine o Pro para cadastrar mais.' using errcode = 'P0001';
  end if;
  if p_novo > 1 and p_novo > p_antes then
    raise exception 'Plano Grátis permite 1 plataforma. Assine o Pro para cadastrar mais.' using errcode = 'P0001';
  end if;
  -- Limites gerais (também para o Pro), para ninguém usar o banco como depósito
  if v_novo > 20 or p_novo > 20 then
    raise exception 'Limite de 20 veículos e 20 plataformas.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists user_settings_limite on public.user_settings;
create trigger user_settings_limite
  before insert or update on public.user_settings
  for each row execute function public.limite_plano_gratis();

grant select, insert, update, delete on public.rides to authenticated, service_role;
