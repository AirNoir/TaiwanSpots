-- Nightly cleanup of stale guest accounts (docs/spec.md §5.4): calls the
-- cleanup-anonymous edge function at 03:30 Taiwan time with mode=delete and
-- the 30-day retention. The shared secret is NOT in this file: it lives in
-- Vault under the name cleanup_cron_secret, created once by hand with
--   select vault.create_secret('<value of CLEANUP_CRON_SECRET>', 'cleanup_cron_secret');
-- and must equal the function's CLEANUP_CRON_SECRET (supabase secrets set).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'cleanup-anonymous',
  '30 19 * * *',
  $$
  select net.http_post(
    url := 'https://cbpljsnzqsucgjiinztk.supabase.co/functions/v1/cleanup-anonymous',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cleanup_cron_secret')
    ),
    body := '{"mode":"delete","retention_days":30}'::jsonb
  );
  $$
);
