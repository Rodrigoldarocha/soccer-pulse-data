import type { MatchPrediction } from "./types";
import { fetchMatchesForDate, fetchLiveMatches, fetchUpcomingMatches } from "./data-pipeline";
import { type SupabaseCacheInterface } from "./supabase-cache.interface";

/**
 * R3 — SWR: TTL curto perto do kickoff + stale-while-revalidate.
 * Se cache expirou há < staleMs, retorna stale e revalida em background.
 */
const SWR_STALE_MS = 90_000;

async function getSupabaseAdmin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  } catch {
    return null;
  }
}

async function getSupabaseCache(): Promise<SupabaseCacheInterface | null> {
  const admin = await getSupabaseAdmin();
  if (!admin) return null;
  const db = admin as unknown as SupabaseCacheInterface;
  return db;
}

export async function getCachedOrGenerate<T>(
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T> | T,
): Promise<T> {
  const supabase = await getSupabaseCache();

  if (supabase) {
    try {
      const { data } = await supabase
        .from("api_cache")
        .select("payload, expires_at")
        .eq("key", key)
        .maybeSingle();

      const now = Date.now();
      if (data) {
        const exp = new Date(data.expires_at).getTime();
        if (exp > now) {
          return data.payload as T;
        }
        // stale dentro da janela SWR → retorna e revalida em background
        if (now - exp < SWR_STALE_MS) {
          void (async () => {
            try {
              const fresh = await factory();
              await writeCache(supabase, key, fresh, ttlSeconds);
            } catch {
              // revalidação falha: mantém stale
            }
          })();
          return data.payload as T;
        }
      }
    } catch {
      // cache read failed, fall through to factory
    }
  }

  const fresh = await factory();
  // Empty → TTL 60s; senão full TTL. Best-effort write.
  const isEmpty = Array.isArray(fresh) && fresh.length === 0;
  const cacheTtl = isEmpty ? 60 : ttlSeconds;
  if (supabase) {
    await writeCache(supabase, key, fresh, cacheTtl);
  }
  return fresh;
}

async function writeCache(
  supabase: SupabaseCacheInterface,
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  try {
    const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabase.from("api_cache").upsert({ key, payload: value as object, expires_at });
  } catch {
    // cache write failed, ignore
  }
}

export async function getRealMatches(dateISO: string): Promise<MatchPrediction[]> {
  return fetchMatchesForDate(dateISO);
}

export async function getRealLiveMatches(_dateISO: string): Promise<MatchPrediction[]> {
  return fetchLiveMatches();
}

export async function getUpcomingMatches(
  fromISO: string,
  toISO: string,
): Promise<MatchPrediction[]> {
  return fetchUpcomingMatches(fromISO, toISO);
}

export type { BettingOption } from "./market-helpers";
export { bettingOptionsFor, marketLabelFor } from "./market-helpers";

// Re-export legado (MatchCard etc.); implementação em market-helpers (R7).
