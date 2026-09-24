DO $$
DECLARE j text;
BEGIN
  FOR j IN SELECT jobname FROM cron.job WHERE jobname LIKE 'push-%' LOOP
    PERFORM cron.unschedule(j);
  END LOOP;
END $$;
COMMENT ON TABLE public.push_subscriptions IS 'DEPRECATED: notifiche push rimosse il 2026-09-24';
COMMENT ON TABLE public.push_sent_log IS 'DEPRECATED: notifiche push rimosse il 2026-09-24';