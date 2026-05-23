SELECT cron.unschedule('push-dispatcher-every-5-min');

SELECT cron.schedule(
  'push-dispatcher-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jxijruuclgskxlbqittk.supabase.co/functions/v1/push-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dispatch-secret', 'a7f3c9e2d1b80456e7a0c4f5b982d1e6a3c7f0e5b9d2a4c8f1e3b6d0a5c7f9e2d4b8a1c6f3e0d5b9a2c7f4e1d6b0a3c8f5e2d9b4a1c7f0e6d3a8b2c5f1e0d4a9b6c3f7e2d0a5b8c1f4e9d2a6b0c3f5e8d1a4b7c0f2e5d9b3a6c8f0e4d1a7b2c5f9'
    ),
    body := '{}'::jsonb
  );
  $$
);