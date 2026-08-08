// Server function that backtests past predictions against real results to
// expose measurable acertividade per league.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Prediction } from "./bzzoiro/types";

const accuracyInput = z.object({
  leagueId: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(200).default(200),
});

export interface AccuracyPick {
  event_id: number;
  event_date: string;
  home_team: string;
  away_team: string;
  predicted: "H" | "D" | "A" | null;
  actual: "H" | "D" | "A" | null;
  confidence: number | null;
  hit: boolean | null;
}

export interface LeagueAccuracy {
  league_id?: number;
  total: number;
  decided: number;
  hits: number;
  hit_rate: number | null;
  avg_confidence: number | null;
  picks: AccuracyPick[];
}

function normalizeList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (
    raw &&
    typeof raw === "object" &&
    "results" in raw &&
    Array.isArray((raw as { results: unknown }).results)
  ) {
    return (raw as { results: T[] }).results;
  }
  return [];
}

function outcomeFromScore(home: number | null, away: number | null): "H" | "D" | "A" | null {
  if (home == null || away == null) return null;
  if (home > away) return "H";
  if (home < away) return "A";
  return "D";
}

export const getLeagueAccuracy = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => accuracyInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<LeagueAccuracy> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { checkRateLimit } = await import("./rate-limit.server");
    const { getRequestIP } = await import("./request-ip");
    await checkRateLimit(`accuracy:${getRequestIP(getRequest())}`, {
      max: 10,
      windowMs: 60_000,
    });

    const { bzzoiroCachedFetch, hashKey } = await import("./bzzoiro/cache.server");

    const predParams: Record<string, string | number | undefined> = {
      status: "finished",
      limit: data.limit,
      league_id: data.leagueId,
    };
    const evParams: Record<string, string | number | undefined> = {
      status: "finished",
      limit: data.limit,
      league_id: data.leagueId,
    };

    const predKey = await hashKey("accuracy:v1:predictions", predParams as Record<string, unknown>);
    const evKey = await hashKey("accuracy:v1:events", evParams as Record<string, unknown>);

    const [predRaw, evRaw] = await Promise.all([
      bzzoiroCachedFetch<unknown>("/api/v2/predictions/", {
        key: predKey,
        ttlSeconds: 10 * 60,
        params: predParams,
        timeoutMs: 20_000,
        retries: 2,
      }),
      bzzoiroCachedFetch<unknown>("/api/v2/events/", {
        key: evKey,
        ttlSeconds: 10 * 60,
        params: evParams,
        timeoutMs: 20_000,
        retries: 2,
      }),
    ]);

    const predictions = normalizeList<Prediction>(predRaw);
    const events = normalizeList<{
      id: number;
      home_score?: number | null;
      away_score?: number | null;
    }>(evRaw);

    const scoreById = new Map<number, { home: number | null; away: number | null }>();
    for (const ev of events) {
      scoreById.set(ev.id, { home: ev.home_score ?? null, away: ev.away_score ?? null });
    }

    const picks: AccuracyPick[] = predictions.map((p) => {
      const score = scoreById.get(p.event.id);
      const actual = score ? outcomeFromScore(score.home, score.away) : null;
      const predicted = p.markets.match_result?.predicted ?? null;
      const hit = predicted != null && actual != null ? predicted === actual : null;
      return {
        event_id: p.event.id,
        event_date: p.event.event_date,
        home_team: p.event.home_team,
        away_team: p.event.away_team,
        predicted,
        actual,
        confidence: p.model?.confidence ?? null,
        hit,
      };
    });

    const decided = picks.filter((p) => p.hit != null);
    const hits = decided.filter((p) => p.hit).length;
    const confidences = decided.map((p) => p.confidence).filter((c): c is number => c != null);

    return {
      league_id: data.leagueId,
      total: picks.length,
      decided: decided.length,
      hits,
      hit_rate: decided.length > 0 ? hits / decided.length : null,
      avg_confidence:
        confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null,
      picks: picks.sort((a, b) => b.event_date.localeCompare(a.event_date)),
    };
  });
