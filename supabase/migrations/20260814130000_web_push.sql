-- Web Push: inscrições de notificação + dedup de avisos de value bets.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Aviso único por bet de alto valor (ev >= 0.15): preenchido no primeiro envio.
ALTER TABLE public.value_bets ADD COLUMN IF NOT EXISTS notified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS idx_value_bets_notified ON public.value_bets (notified_at);