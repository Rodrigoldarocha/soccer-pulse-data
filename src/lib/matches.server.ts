import type { MatchPrediction, MarketId } from "./types";
import { fetchMatchesForDate, fetchLiveMatches } from "./data-pipeline";

async function getSupabaseAdmin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  } catch {
    return null;
  }
}

interface SupabaseCache {
  from(t: string): {
    select(c: string): { eq(k: string, v: string): { maybeSingle(): Promise<{ data: { payload: unknown; expires_at: string } | null }> } };
    upsert(row: Record<string, unknown>): Promise<unknown>;
  };
}

async function getSupabaseCache(): Promise<SupabaseCache | null> {
  const admin = await getSupabaseAdmin();
  if (!admin) return null;
  const db = admin as unknown as SupabaseCache;
  return db;
}

export async function getCachedOrGenerate<T>(key: string, ttlSeconds: number, factory: () => Promise<T> | T): Promise<T> {
  const supabase = await getSupabaseCache();

  if (supabase) {
    try {
      const { data } = await supabase
        .from("api_cache")
        .select("payload, expires_at")
        .eq("key", key)
        .maybeSingle();

      const now = Date.now();
      if (data && new Date(data.expires_at).getTime() > now) {
        return data.payload as T;
      }
    } catch {
      // cache read failed, fall through to factory
    }
  }

  const fresh = await factory();
  if (supabase) {
    try {
      const now = Date.now();
      const expires_at = new Date(now + ttlSeconds * 1000).toISOString();
      await supabase.from("api_cache").upsert({ key, payload: fresh as unknown as object, expires_at });
    } catch {
      // cache write failed, ignore
    }
  }
  return fresh;
}

export async function getRealMatches(dateISO: string): Promise<MatchPrediction[]> {
  return fetchMatchesForDate(dateISO);
}

export async function getRealLiveMatches(_dateISO: string): Promise<MatchPrediction[]> {
  return fetchLiveMatches();
}

export function marketLabelFor(match: MatchPrediction, market: MarketId): { label: string; odds: number; probability: number } {
  switch (market) {
    case "1X2_HOME": return { label: `Vitória ${match.home.short}`, odds: match.odds.home, probability: match.probabilities.home };
    case "1X2_AWAY": return { label: `Vitória ${match.away.short}`, odds: match.odds.away, probability: match.probabilities.away };
    case "DRAW": return { label: "Empate", odds: match.odds.draw, probability: match.probabilities.draw };
    case "OVER_2_5": return { label: "Over 2.5 gols", odds: match.odds.over25, probability: match.probabilities.over25 };
    case "BTTS": return { label: "Ambas marcam", odds: match.odds.btts, probability: match.probabilities.btts };
    case "DOUBLE_CHANCE_1X": return { label: `Dupla chance 1X (${match.home.short}/Empate)`, odds: match.odds.doubleChance1X, probability: match.probabilities.home + match.probabilities.draw };
  }
}
