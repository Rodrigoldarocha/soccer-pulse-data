// Distributed rate limiter for server functions.
// Production: Supabase (atomic RPC) — works across serverless instances.
// Development: in-memory Map fallback.

interface Entry {
  count: number;
  resetAt: number;
}

const memStore = new Map<string, Entry>();
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function memCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of memStore) {
    if (entry.resetAt <= now) memStore.delete(key);
  }
}

async function memCheck(identifier: string, max: number, windowMs: number): Promise<void> {
  memCleanup();
  const now = Date.now();
  const existing = memStore.get(identifier);
  if (!existing || existing.resetAt <= now) {
    memStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return;
  }
  existing.count++;
  if (existing.count > max) {
    throw new Error("Too Many Requests");
  }
}

// Lazy Supabase admin client
type SupabaseAdmin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

let _admin: SupabaseAdmin | null = null;

async function getSupabaseAdmin(): Promise<SupabaseAdmin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function supabaseCheck(identifier: string, max: number, windowMs: number): Promise<void> {
  if (!_admin) _admin = await getSupabaseAdmin();

  // Tenta RPC; se não existir, fallback para SQL direto
  try {
    const { data, error } = await _admin.rpc("increment_rate_limit", {
      p_identifier: identifier,
      p_max: max,
      p_window_start: new Date().toISOString(),
      p_window_ms: windowMs,
    });

    if (error) throw error;

    if (data && data.length > 0 && data[0].exceeded) {
      throw new Error("Too Many Requests");
    }
    return;
  } catch (err) {
    if (err instanceof Error && err.message === "Too Many Requests") throw err;
    // Fallback: upsert manual (se RPC não existe ainda)
  }

  // Fallback manual
  const { data: existing } = await _admin
    .from("rate_limits")
    .select("count, window_start")
    .eq("identifier", identifier)
    .maybeSingle();

  const now = new Date();
  if (!existing || new Date(existing.window_start) < new Date(Date.now() - windowMs)) {
    await _admin
      .from("rate_limits")
      .upsert(
        { identifier, count: 1, window_start: now.toISOString() },
        { onConflict: "identifier" },
      );
  } else {
    const newCount = (existing.count as number) + 1;
    if (newCount > max) throw new Error("Too Many Requests");
    await _admin.from("rate_limits").update({ count: newCount }).eq("identifier", identifier);
  }
}

export interface RateLimitOptions {
  /** Max requests per window. Default 30. */
  max?: number;
  /** Window in milliseconds. Default 60_000 (1 min). */
  windowMs?: number;
}

export async function checkRateLimit(
  identifier: string,
  opts: RateLimitOptions = {},
): Promise<void> {
  const { max = 30, windowMs = 60_000 } = opts;

  const isDev =
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test" ||
    !process.env.NODE_ENV;

  if (isDev) {
    return memCheck(identifier, max, windowMs);
  }

  return supabaseCheck(identifier, max, windowMs);
}
