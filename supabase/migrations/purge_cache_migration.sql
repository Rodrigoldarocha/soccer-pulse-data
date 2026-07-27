-- Auto-purge expired cache entries.
-- Called probabilistically from bzzoiroCachedFetch (10% of calls).

CREATE OR REPLACE FUNCTION purge_expired_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted integer;
BEGIN
  DELETE FROM public.bzzoiro_cache
  WHERE expires_at < NOW() - INTERVAL '1 day';

  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '1 day';

  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- Optional: scheduled purge via pg_cron (uncomment if pg_cron extension is enabled)
-- SELECT cron.schedule('purge-cache', '0 */6 * * *', 'SELECT purge_expired_cache();');
