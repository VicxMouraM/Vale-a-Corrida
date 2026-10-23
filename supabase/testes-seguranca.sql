-- TESTES DE SEGURANÇA E ANTIFRAUDE (npx supabase db query --linked -f supabase/testes-seguranca.sql). Ver o README.
--
-- Cria contas falsas e tenta burlar o teste grátis, o plano e o acesso aos dados de outras pessoas.
-- NADA FICA GRAVADO: tudo roda numa transação que termina com um erro proposital, que desfaz tudo.
-- O resultado aparece na própria mensagem de erro: cada linha "OK" é um ataque barrado; "FALHOU" é um problema.

do $$
declare
  r text := '';
  falhas int := 0;
  a uuid := gen_random_uuid(); -- "vítima": conta normal com dados
  b uuid := gen_random_uuid(); -- "atacante"
  x uuid;
  n int;
  v boolean;
  base text := 'teste.seguranca.' || substr(md5(random()::text), 1, 8);

  tem_teste text;
begin
  -- conta A (o insert dispara o mesmo gatilho do cadastro real)
  insert into auth.users (id, email, aud, role, raw_user_meta_data, created_at, updated_at, email_confirmed_at)
  values (a, base || '@gmail.com', 'authenticated', 'authenticated', '{}', now(), now(), now());
  select (trial_ends_at > now()) into v from public.subscriptions where user_id = a;
  if v then r := r || E'\nOK      cadastro novo com e-mail real ganha 7 dias de teste';
  else r := r || E'\nFALHOU  cadastro novo deveria ganhar teste'; falhas := falhas + 1; end if;

  -- ===================== 1. TESTE GRÁTIS =====================
  -- 1a. mesmo Gmail com pontos e maiúsculas
  x := gen_random_uuid();
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values (x, upper(replace(base, '.', '..')) || '@GMAIL.com', 'authenticated', 'authenticated', '{}');
  -- (pontos extras: Gmail ignora pontos)
  select coalesce(trial_ends_at > now(), false) into v from public.subscriptions where user_id = x;
  if not v then r := r || E'\nOK      mesmo Gmail com pontos/maiúsculas NÃO ganha outro teste';
  else r := r || E'\nFALHOU  Gmail com pontos ganhou outro teste'; falhas := falhas + 1; end if;

  -- 1b. mesmo Gmail com +apelido
  x := gen_random_uuid();
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values (x, base || '+fake123@gmail.com', 'authenticated', 'authenticated', '{}');
  select coalesce(trial_ends_at > now(), false) into v from public.subscriptions where user_id = x;
  if not v then r := r || E'\nOK      mesmo Gmail com +apelido NÃO ganha outro teste';
  else r := r || E'\nFALHOU  Gmail com +apelido ganhou outro teste'; falhas := falhas + 1; end if;

  -- 1c. googlemail.com = gmail.com
  x := gen_random_uuid();
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values (x, base || '@googlemail.com', 'authenticated', 'authenticated', '{}');
  select coalesce(trial_ends_at > now(), false) into v from public.subscriptions where user_id = x;
  if not v then r := r || E'\nOK      mesmo endereço em @googlemail.com NÃO ganha outro teste';
  else r := r || E'\nFALHOU  @googlemail.com ganhou outro teste'; falhas := falhas + 1; end if;

  -- 1d. e-mail descartável
  x := gen_random_uuid();
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values (x, base || '@mailinator.com', 'authenticated', 'authenticated', '{}');
  select coalesce(trial_ends_at > now(), false) into v from public.subscriptions where user_id = x;
  if not v then r := r || E'\nOK      e-mail descartável (mailinator) NÃO ganha teste';
  else r := r || E'\nFALHOU  e-mail descartável ganhou teste'; falhas := falhas + 1; end if;

  -- 1e. excluir a conta e criar de novo com o mesmo e-mail
  x := gen_random_uuid();
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values (x, base || '.recria@outlook.com', 'authenticated', 'authenticated', '{}');
  delete from auth.users where id = x;
  x := gen_random_uuid();
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values (x, base || '.recria@outlook.com', 'authenticated', 'authenticated', '{}');
  select coalesce(trial_ends_at > now(), false) into v from public.subscriptions where user_id = x;
  if not v then r := r || E'\nOK      excluir a conta e recriar com o mesmo e-mail NÃO ganha outro teste';
  else r := r || E'\nFALHOU  conta recriada ganhou outro teste'; falhas := falhas + 1; end if;

  -- 1f. Outlook com +apelido
  x := gen_random_uuid();
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values (x, base || '.recria+2@outlook.com', 'authenticated', 'authenticated', '{}');
  select coalesce(trial_ends_at > now(), false) into v from public.subscriptions where user_id = x;
  if not v then r := r || E'\nOK      Outlook com +apelido NÃO ganha outro teste';
  else r := r || E'\nFALHOU  Outlook +apelido ganhou outro teste'; falhas := falhas + 1; end if;

  -- 1g. e-mail bloqueado por chargeback: cria conta já bloqueada
  insert into public.bloqueios (tipo, hash, motivo) values ('email', public.email_hash(base || '.golpe@hotmail.com'), 'teste');
  x := gen_random_uuid();
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values (x, base || '.golpe@hotmail.com', 'authenticated', 'authenticated', '{}');
  select bloqueado, coalesce(trial_ends_at > now(), false) into v, tem_teste from public.subscriptions where user_id = x;
  if v and tem_teste = 'false' then r := r || E'\nOK      e-mail com chargeback anterior: conta nasce bloqueada e sem teste';
  else r := r || E'\nFALHOU  e-mail bloqueado não foi barrado'; falhas := falhas + 1; end if;

  -- ===================== 2. BURLAR O PLANO E OS DADOS (como usuário logado) =====================
  -- conta B (atacante), sem teste (simula plano Grátis) e A com uma corrida antiga e uma nova
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values (b, base || '.atacante@yahoo.com', 'authenticated', 'authenticated', '{}');
  update public.subscriptions set trial_ends_at = null, status = 'free' where user_id = b;
  insert into public.rides (user_id, id, data, valor, km, minutos, combustivel, lucro) values
    (a, 'vitima-1', now(), 30, 10, 20, 'gasolina', 10),
    (b, 'antiga-1', now() - interval '60 days', 30, 10, 20, 'gasolina', 10),
    (b, 'nova-1', now() - interval '2 days', 30, 10, 20, 'gasolina', 10);

  -- vira o atacante: mesmo papel e identidade que a API usa para um usuário logado
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', b::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.rides where user_id = a;
  if n = 0 then r := r || E'\nOK      atacante NÃO vê corridas de outra pessoa';
  else r := r || E'\nFALHOU  atacante viu corridas de outra pessoa'; falhas := falhas + 1; end if;

  begin
    insert into public.rides (user_id, id, data, valor, km, minutos, combustivel, lucro) values (a, 'plantada', now(), 1, 1, 1, 'gasolina', 1);
    r := r || E'\nFALHOU  atacante gravou corrida na conta de outra pessoa'; falhas := falhas + 1;
  exception when others then r := r || E'\nOK      atacante NÃO grava corrida na conta de outra pessoa';
  end;

  update public.rides set valor = 9999 where user_id = a;
  get diagnostics n = row_count;
  if n = 0 then r := r || E'\nOK      atacante NÃO altera corridas de outra pessoa';
  else r := r || E'\nFALHOU  atacante alterou corridas de outra pessoa'; falhas := falhas + 1; end if;

  delete from public.rides where user_id = a;
  get diagnostics n = row_count;
  if n = 0 then r := r || E'\nOK      atacante NÃO apaga corridas de outra pessoa';
  else r := r || E'\nFALHOU  atacante apagou corridas de outra pessoa'; falhas := falhas + 1; end if;

  select count(*) into n from public.rides where user_id = b;
  if n = 1 then r := r || E'\nOK      plano Grátis NÃO vê corrida com mais de 30 dias (servidor esconde)';
  else r := r || E'\nFALHOU  plano Grátis viu ' || n || ' corridas (esperado 1)'; falhas := falhas + 1; end if;

  begin
    update public.subscriptions set cortesia = true, current_period_end = now() + interval '10 years', status = 'active' where user_id = b;
    get diagnostics n = row_count;
    if n = 0 then r := r || E'\nOK      atacante NÃO se dá Pro/cortesia (0 linhas alteradas)';
    else r := r || E'\nFALHOU  atacante se deu Pro'; falhas := falhas + 1; end if;
  exception when others then r := r || E'\nOK      atacante NÃO se dá Pro/cortesia (permissão negada)';
  end;

  begin
    insert into public.subscriptions (user_id, status, current_period_end) values (gen_random_uuid(), 'active', now() + interval '1 year');
    r := r || E'\nFALHOU  atacante criou assinatura'; falhas := falhas + 1;
  exception when others then r := r || E'\nOK      atacante NÃO cria assinatura';
  end;

  begin
    insert into public.user_settings (user_id, settings) values (b, '{"veiculos":[{"id":"1"},{"id":"2"}],"plataformas":[{"id":"uber"}]}');
    r := r || E'\nFALHOU  plano Grátis gravou 2 veículos'; falhas := falhas + 1;
  exception when others then r := r || E'\nOK      plano Grátis NÃO grava 2 veículos (limite no banco)';
  end;

  begin
    insert into public.user_settings (user_id, settings) values (b, '{"veiculos":[{"id":"1"}],"plataformas":[{"id":"uber"},{"id":"99"}]}');
    r := r || E'\nFALHOU  plano Grátis gravou 2 plataformas'; falhas := falhas + 1;
  exception when others then r := r || E'\nOK      plano Grátis NÃO grava 2 plataformas (limite no banco)';
  end;

  begin
    insert into public.user_settings (user_id, settings) values (a, '{"veiculos":[]}');
    r := r || E'\nFALHOU  atacante gravou ajustes de outra pessoa'; falhas := falhas + 1;
  exception when others then r := r || E'\nOK      atacante NÃO grava ajustes de outra pessoa';
  end;

  select public.is_pro() into v;
  if not v then r := r || E'\nOK      atacante continua Grátis depois de todas as tentativas';
  else r := r || E'\nFALHOU  atacante virou Pro'; falhas := falhas + 1; end if;

  -- tabelas internas
  declare t text;
  begin
    foreach t in array array['auditoria', 'bloqueios', 'payment_events', 'trial_usage', 'feedback', 'dominios_descartaveis'] loop
      begin
        execute format('select count(*) from public.%I', t) into n;
        r := r || E'\nFALHOU  atacante leu a tabela interna ' || t; falhas := falhas + 1;
      exception when others then r := r || E'\nOK      atacante NÃO lê a tabela interna ' || t;
      end;
    end loop;
  end;

  begin
    perform public.is_pro_de(a);
    r := r || E'\nFALHOU  atacante consultou o plano de outra pessoa'; falhas := falhas + 1;
  exception when others then r := r || E'\nOK      atacante NÃO consulta o plano de outra pessoa';
  end;

  begin
    perform public.delete_my_account();
    r := r || E'\nFALHOU  função antiga de excluir conta ainda acessível'; falhas := falhas + 1;
  exception when others then r := r || E'\nOK      exclusão de conta só pelo servidor (que cancela a assinatura antes)';
  end;

  begin
    execute 'truncate public.rides';
    r := r || E'\nFALHOU  atacante apagou a tabela inteira (TRUNCATE)'; falhas := falhas + 1;
  exception when others then r := r || E'\nOK      atacante NÃO apaga a tabela inteira (TRUNCATE)';
  end;

  execute 'reset role';

  raise exception E'RESULTADO (nada foi gravado): % ataques barrados, % falhas%',
    (length(r) - length(replace(r, E'\nOK', ''))) / 3, falhas, r;
end;
$$;
