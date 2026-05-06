
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  lead_times integer[] NOT NULL DEFAULT ARRAY[60],
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_enabled ON public.push_subscriptions(enabled) WHERE enabled = true;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert subscription"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update by endpoint"
  ON public.push_subscriptions FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE TABLE public.push_sent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  lead_time integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, event_id, lead_time)
);

CREATE INDEX idx_push_sent_log_sent_at ON public.push_sent_log(sent_at);

ALTER TABLE public.push_sent_log ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (edge functions) can read/write
