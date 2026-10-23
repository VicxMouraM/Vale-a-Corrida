-- Agenda a rotina diária de cancelamento automático (todo dia às 9h de Brasília = 12h UTC).
-- Rode UMA VEZ no SQL Editor, depois de publicar a função `rotina-assinaturas`.
-- Troque os dois valores marcados abaixo DIRETO NO SQL EDITOR do Supabase. Eles ficam guardados no Vault (criptografados).
-- ⚠ NÃO salve este arquivo com o segredo preenchido: o repositório é público e o segredo vazaria no GitHub.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1) Endereço do seu projeto e o mesmo CRON_SECRET configurado em `supabase secrets set`
select vault.create_secret('https://SEU-PROJECT-REF.supabase.co', 'projeto_url');   -- << troque
select vault.create_secret('COLE-AQUI-O-CRON_SECRET', 'cron_secret');               -- << troque

-- 2) Agendamento
select cron.schedule(
  'rotina-assinaturas',
  '0 12 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'projeto_url') || '/functions/v1/rotina-assinaturas',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Conferir: select * from cron.job;            Últimas execuções: select * from cron.job_run_details order by start_time desc limit 5;
-- Desfazer:  select cron.unschedule('rotina-assinaturas');
