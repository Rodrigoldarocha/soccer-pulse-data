// Simple in-memory rate limiter for server functions.
// Resets on each deploy — not a substitute for edge rate limiting.

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitOptions {
  /** Max requests per window. Default 30. */
  max?: number;
  /** Window in milliseconds. Default 60_000 (1 min). */
  windowMs?: number;
}

export function checkRateLimit(
  identifier: string,
  opts: RateLimitOptions = {},
): void {
  const { max = 30, windowMs = 60_000 } = opts;
  const now = Date.now();
  cleanup();

  const existing = store.get(identifier);
  if (!existing || existing.resetAt <= now) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return;
  }

  existing.count++;
  if (existing.count > max) {
    throw new Error("Too Many Requests");
  }
}
