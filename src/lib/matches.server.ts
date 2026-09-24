import type { MatchPrediction, MarketId } from "./types";
import { fetchMatchesForDate, fetchLiveMatches, fetchUpcomingMatches } from "./data-pipeline";
import { type SupabaseCacheInterface } from "./supabase-cache.interface";

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
      if (data && new Date(data.expires_at).getTime() > now) {
        return data.payload as T;
      }
    } catch {
      // cache read failed, fall through to factory
    }
  }

  const fresh = await factory();
  // ─── Cache helper with progressive TTL ──────────────────────────────────
  //
  // Strategy:
  // - Non-empty results: full TTL (e.g. 15min) — good for normal operation
  // - Empty results: short TTL (e.g. 60s) — tells users "data currently unavailable"
  //   instead of "no data ever", allowing recovery when API comes back online.
  //
  // OBS: this is a best-effort cache; failures to write are silently ignored
  // per design (the pipeline already handles upstream API limits gracefully).
  const isEmpty = Array.isArray(fresh) && fresh.length === 0;
  const cacheTtl = isEmpty ? 60 : ttlSeconds; // short TTL for empty, full TTL otherwise
  if (supabase) {
    try {
      const now = Date.now();
      const expires_at = new Date(now + cacheTtl * 1000).toISOString();
      await supabase
        .from("api_cache")
        .upsert({ key, payload: fresh as unknown as object, expires_at });
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

export async function getUpcomingMatches(
  fromISO: string,
  toISO: string,
): Promise<MatchPrediction[]> {
  return fetchUpcomingMatches(fromISO, toISO);
}

export type BettingOption = {
  market: MarketId;
  label: string;
  odds: number;
  probability: number;
};

export function bettingOptionsFor(match: MatchPrediction): BettingOption[] {
  const options: BettingOption[] = [];
  const homeOrDraw = match.probabilities.home + match.probabilities.draw;
  // odds reais > 1; sem odd real não exibe aposta (fairOdds é só referência do modelo)
  const dcOdd = match.odds.doubleChance1X;
  const bttsOdd = match.odds.btts;

  if (Number.isFinite(homeOrDraw) && homeOrDraw > 0 && dcOdd != null && dcOdd > 1) {
    options.push({
      market: "DOUBLE_CHANCE_1X",
      label: `Vitória ou empate (${match.home.short}/Empate)`,
      odds: dcOdd,
      probability: homeOrDraw,
    });
  }

  if (
    Number.isFinite(match.probabilities.btts) &&
    match.probabilities.btts > 0 &&
    bttsOdd != null &&
    bttsOdd > 1
  ) {
    options.push({
      market: "BTTS",
      label: "BTTS Sim",
      odds: bttsOdd,
      probability: match.probabilities.btts,
    });
  }

  return options.slice(0, 2);
}

export function marketLabelFor(
  match: MatchPrediction,
  market: MarketId,
): { label: string; odds: number | null; probability: number } {
  const p = match.probabilities;
  const o = match.odds;
  const fair = match.fairOdds?.[market];
  switch (market) {
    case "1X2_HOME":
      return { label: `Vitória ${match.home.short}`, odds: o.home, probability: p.home };
    case "1X2_AWAY":
      return { label: `Vitória ${match.away.short}`, odds: o.away, probability: p.away };
    case "DRAW":
      return { label: "Empate", odds: o.draw, probability: p.draw };
    case "OVER_1_5":
      return { label: "Over 1.5 gols", odds: o.over15, probability: p.over15 };
    case "OVER_2_5":
      return { label: "Over 2.5 gols", odds: o.over25, probability: p.over25 };
    case "OVER_3_5":
      return { label: "Over 3.5 gols", odds: o.over35, probability: p.over35 };
    case "UNDER_1_5":
      return { label: "Under 1.5 gols", odds: o.under15, probability: 1 - p.over15 };
    case "UNDER_2_5":
      return { label: "Under 2.5 gols", odds: o.under25, probability: 1 - p.over25 };
    case "UNDER_3_5":
      return { label: "Under 3.5 gols", odds: o.under35, probability: 1 - p.over35 };
    case "BTTS":
      return { label: "BTTS Sim", odds: o.btts, probability: p.btts };
    case "BTTS_NO":
      return { label: "BTTS Não", odds: o.bttsNo, probability: 1 - p.btts };
    case "DOUBLE_CHANCE_1X":
      return {
        label: `Vitória ou empate (${match.home.short}/Empate)`,
        odds: o.doubleChance1X,
        probability: p.home + p.draw,
      };
    case "DOUBLE_CHANCE_X2":
      return {
        label: `Empate ou vitória (${match.away.short})`,
        odds: o.doubleChanceX2,
        probability: p.draw + p.away,
      };
    case "DOUBLE_CHANCE_12":
      return {
        label: `Sem empate (${match.home.short}/${match.away.short})`,
        odds: o.doubleChance12,
        probability: 1 - p.draw,
      };
    default: {
      const edge = match.markets?.find((m) => m.market === market);
      return {
        label: market,
        odds: edge?.odd ?? null,
        probability: edge?.probability ?? 0,
        ...(fair != null ? {} : {}),
      };
    }
  }
}
