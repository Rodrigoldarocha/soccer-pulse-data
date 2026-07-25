CREATE TABLE public.bzzoiro_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX bzzoiro_cache_expires_at_idx ON public.bzzoiro_cache (expires_at);
GRANT ALL ON public.bzzoiro_cache TO service_role;
ALTER TABLE public.bzzoiro_cache ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy: só service_role (via server functions) acessa.