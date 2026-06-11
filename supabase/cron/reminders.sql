-- Schedule the `send-reminders` edge function to run every 15 minutes.
-- Run this in the Supabase SQL editor (Database → SQL).
--
-- Before running, replace:
--   <PROJECT_REF>   your project ref — the subdomain of your Supabase URL,
--                   e.g. https://abcd1234.supabase.co  ->  abcd1234
--                   (also at Project Settings → General → Reference ID)
--   <CRON_SECRET>   the same value you set with:
--                   supabase secrets set CRON_SECRET=...

-- 1. Enable the scheduler + HTTP extensions (one-time; safe to re-run).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. (Re)create the schedule. Unschedule first so re-running this is idempotent.
select cron.unschedule('send-reminders')
where exists (select 1 from cron.job where jobname = 'send-reminders');

select cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', '<CRON_SECRET>'
               ),
    body    := '{}'::jsonb
  );
  $$
);

-- 3. Verify it's scheduled.
select jobid, schedule, jobname, active from cron.job where jobname = 'send-reminders';

-- Handy later:
--   Test now:    select net.http_post(url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
--                  headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<CRON_SECRET>'),
--                  body := '{}'::jsonb);
--   Recent runs: select * from cron.job_run_details order by start_time desc limit 10;
--   Remove:      select cron.unschedule('send-reminders');
