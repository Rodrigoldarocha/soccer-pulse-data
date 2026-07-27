-- Schema update for bzzoiro_cache: indexes and tracking columns

-- Index for efficient expiry-based queries
CREATE INDEX IF NOT EXISTS idx_bzzoiro_cache_expires_at ON bzzoiro_cache(expires_at);

-- Add hit_count for usage tracking (optional)
ALTER TABLE bzzoiro_cache ADD COLUMN IF NOT EXISTS hit_count INT DEFAULT 0;

-- Add last_accessed timestamp
ALTER TABLE bzzoiro_cache ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMPTZ DEFAULT NOW();

-- Trigger function to update last_accessed on read
CREATE OR REPLACE FUNCTION update_cache_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on UPDATE (fires when cache is refreshed)
DROP TRIGGER IF EXISTS update_cache_last_accessed_trigger ON bzzoiro_cache;
CREATE TRIGGER update_cache_last_accessed_trigger
BEFORE UPDATE ON bzzoiro_cache
FOR EACH ROW
EXECUTE FUNCTION update_cache_last_accessed();
