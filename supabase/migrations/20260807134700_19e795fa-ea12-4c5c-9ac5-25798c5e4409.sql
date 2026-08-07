CREATE TABLE IF NOT EXISTS public.rate_limits (
  identifier text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_identifier text,
  p_max integer,
  p_window_start timestamptz,
  p_window_ms integer
)
RETURNS TABLE (current_count integer, exceeded boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.rate_limits AS rl (identifier, count, window_start, updated_at)
  VALUES (p_identifier, 1, p_window_start, now())
  ON CONFLICT (identifier) DO UPDATE
    SET count = CASE
          WHEN rl.window_start < p_window_start - (p_window_ms || ' milliseconds')::interval THEN 1
          ELSE rl.count + 1
        END,
        window_start = CASE
          WHEN rl.window_start < p_window_start - (p_window_ms || ' milliseconds')::interval THEN p_window_start
          ELSE rl.window_start
        END,
        updated_at = now()
  RETURNING rl.count INTO v_count;

  RETURN QUERY SELECT v_count, v_count > p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_rate_limit(text, integer, timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(text, integer, timestamptz, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.purge_expired_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.bzzoiro_cache WHERE expires_at < now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_cache() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_cache() TO service_role;

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits (window_start);
CREATE INDEX IF NOT EXISTS idx_bzzoiro_cache_expires_at ON public.bzzoiro_cache (expires_at);