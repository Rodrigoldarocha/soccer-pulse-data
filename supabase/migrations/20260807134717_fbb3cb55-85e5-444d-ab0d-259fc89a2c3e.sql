REVOKE ALL ON FUNCTION public.increment_rate_limit(text, integer, timestamptz, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_expired_cache() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(text, integer, timestamptz, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_expired_cache() TO service_role;