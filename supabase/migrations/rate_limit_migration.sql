-- Rate limit table for distributed rate limiting across serverless instances.
-- Used by src/lib/rate-limit.server.ts in production (Supabase mode).

CREATE TABLE IF NOT EXISTS rate_limits (
  identifier TEXT PRIMARY KEY,
  count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW()
);

-- Atomic increment RPC — avoids race conditions in serverless
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_identifier TEXT,
  p_max INT,
  p_window_start TIMESTAMPTZ,
  p_window_ms INT
)
RETURNS TABLE(exceeded BOOLEAN, current_count INT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  INSERT INTO rate_limits (identifier, count, window_start)
  VALUES (p_identifier, 1, NOW())
  ON CONFLICT (identifier) DO UPDATE
    SET count = rate_limits.count + 1,
        window_start = CASE
          WHEN NOW() - rate_limits.window_start < (p_window_ms || ' milliseconds')::INTERVAL
          THEN rate_limits.window_start
          ELSE NOW()
        END
  RETURNING count, window_start INTO v_count, v_window_start;

  IF v_window_start > NOW() - (p_window_ms || ' milliseconds')::INTERVAL THEN
    RETURN QUERY SELECT v_count > p_max, v_count;
  ELSE
    RETURN QUERY SELECT FALSE, 1;
  END IF;
END;
$$;

GRANT ALL ON rate_limits TO service_role;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (via server functions) accesses this table.
