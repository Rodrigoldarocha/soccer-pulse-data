// Server function that backtests past predictions against real results to
// expose measurable acertividade per league.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Prediction } from "./bzzoiro/types";

const accuracyInput = z.object({
  market: z.enum(["1x2", "btts", "over25"]).default("1x2"),
  leagueId: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(200).default(200),
});

export type AccuracyMarket = "1x2" | "btts" | "over25";

export interface AccuracyPick {
  event_id: number;
  event_date: string;
  home_team: string;
  away_team: string;
  predicted: "H" | "D" | "A" | "Sim" | "Não" | "Over" | "Under" | null;
  actual: "H" | "D" | "A" | "Sim" | "Não" | "Over" | "Under" | null;
  confidence: number | null;
  hit: boolean | null;
}

export interface MarketSummary {
  market: AccuracyMarket;
  total: number;
  decided: number;
  hits: number;
  hit_rate: number | null;
  avg_confidence: number | null;
  picks: AccuracyPick[];
}

export interface LeagueAccuracy {
  league_id?: number;
  /** Amostra crua (todos os mercados usam os mesmos picks). */
  sample: number;
  markets: Record<AccuracyMarket, MarketSummary>;
  /** Resumo do mercado selecionado — apenas troca o dedo sem refetch. */
  market: AccuracyMarket;
}

function pctBinary<T extends string>(
  pred: T | null,
  actual: T | null,
): { predicted: T | null; actual: T | null; hit: boolean | null } {
  const hit = pred != null && actual != null ? pred === actual : null;
  return { predicted: pred, actual, hit };
}

function summaryFor(market: AccuracyMarket, picks: AccuracyPick[]): MarketSummary {
  const decided = picks.filter((p) => p.hit != null);
  const hits = decided.filter((p) => p.hit).length;
  const confidences = decided.map((p) => p.confidence).filter((c): c is number => c != null);
  return {
    market,
    total: picks.length,
    decided: decided.length,
    hits,
    hit_rate: decided.length > 0 ? hits / decided.length : null,
    avg_confidence:
      confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null,
    picks: picks.sort((a, b) => b.event_date.localeCompare(a.event_date)),
  };
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
      max: 60,
      windowMs: 60_000,
    });

    const { bzzoiroCachedFetch, hashKey } = await import("./bzzoiro/cache.server");

    // The upstream /predictions/ endpoint ignores `status`, so we bound the
    // sample by date instead: a closed window that ends yesterday (UTC) only
    // contains matches that already have a final score.
    const day = (offsetDays: number) =>
      new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
    const dateTo = day(-1);
    const dateFrom = day(-8);

    const predParams: Record<string, string | number | undefined> = {
      limit: data.limit,
      league_id: data.leagueId,
      date_from: dateFrom,
      date_to: dateTo,
    };

    const predKey = await hashKey("accuracy:v2:predictions", predParams as Record<string, unknown>);

    // Scores live on /events/, which pages at 200 items — walk enough pages to
    // cover the same window so every prediction can be resolved.
    type EventRow = { id: number; home_score?: number | null; away_score?: number | null };
    const PAGE = 200;
    const MAX_PAGES = 6;

    const fetchEventsPage = async (offset: number) => {
      const evParams: Record<string, string | number | undefined> = {
        status: "finished",
        limit: PAGE,
        offset,
        league_id: data.leagueId,
        date_from: dateFrom,
        date_to: dateTo,
      };
      const evKey = await hashKey("accuracy:v2:events", evParams as Record<string, unknown>);
      return bzzoiroCachedFetch<unknown>("/api/v2/events/", {
        key: evKey,
        ttlSeconds: 10 * 60,
        params: evParams,
        timeoutMs: 20_000,
        retries: 2,
      });
    };

    const [predRaw, firstEvRaw] = await Promise.all([
      bzzoiroCachedFetch<unknown>("/api/v2/predictions/", {
        key: predKey,
        ttlSeconds: 10 * 60,
        params: predParams,
        timeoutMs: 20_000,
        retries: 2,
      }),
      fetchEventsPage(0),
    ]);

    const totalEvents =
      firstEvRaw && typeof firstEvRaw === "object" && "count" in firstEvRaw
        ? Number((firstEvRaw as { count: unknown }).count) || 0
        : 0;

    const events: EventRow[] = normalizeList<EventRow>(firstEvRaw);
    const pages = Math.min(MAX_PAGES, Math.ceil(totalEvents / PAGE) || 1);
    if (pages > 1) {
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) => fetchEventsPage((i + 1) * PAGE)),
      );
      for (const page of rest) events.push(...normalizeList<EventRow>(page));
    }

    const allPredictions = normalizeList<Prediction>(predRaw);

    const scoreById = new Map<number, { home: number | null; away: number | null }>();
    for (const ev of events) {
      if (ev.home_score == null || ev.away_score == null) continue;
      scoreById.set(ev.id, { home: ev.home_score, away: ev.away_score });
    }

    // Only keep picks we can actually score — no undecided rows presented as backtest.
    const predictions = allPredictions.filter((p) => scoreById.has(p.event.id));


    const base = (p: Prediction) => ({
      event_id: p.event.id,
      event_date: p.event.event_date,
      home_team: p.event.home_team,
      away_team: p.event.away_team,
      confidence: p.model?.confidence ?? null,
      predicted: null as AccuracyPick["predicted"],
      actual: null as AccuracyPick["actual"],
      hit: null as boolean | null,
    });

    const picksAll: AccuracyPick[] = predictions.map((p) => {
      const sc = scoreById.get(p.event.id);
      const actual3 = sc ? outcomeFromScore(sc.home, sc.away) : null;
      const predicted3 = p.markets.match_result?.predicted ?? null;
      const picked = pctBinary(predicted3, actual3);
      return { ...base(p), predicted: picked.predicted, actual: picked.actual, hit: picked.hit };
    });


    const picksBtts: AccuracyPick[] = predictions.map((p) => {
      const sc = scoreById.get(p.event.id);
      const yes = p.markets.btts?.prob_yes;
      const bothScored =
        sc && sc.home != null && sc.away != null ? sc.home > 0 && sc.away > 0 : null;
      const predicted: AccuracyPick["predicted"] = yes == null ? null : yes >= 50 ? "Sim" : "Não";
      const picked = pctBinary(predicted, bothScored == null ? null : bothScored ? "Sim" : "Não");
      return { ...base(p), predicted: picked.predicted, actual: picked.actual, hit: picked.hit };
    });

    const picksOver: AccuracyPick[] = predictions.map((p) => {
      const sc = scoreById.get(p.event.id);
      const over = p.markets.over_under?.prob_over_25;
      const goals = sc && sc.home != null && sc.away != null ? sc.home + sc.away : null;
      const predicted: AccuracyPick["predicted"] =
        over == null ? null : over >= 50 ? "Over" : "Under";
      const picked = pctBinary(predicted, goals == null ? null : goals >= 3 ? "Over" : "Under");
      return { ...base(p), predicted: picked.predicted, actual: picked.actual, hit: picked.hit };
    });

    const markets: Record<AccuracyMarket, MarketSummary> = {
      "1x2": summaryFor("1x2", picksAll),
      btts: summaryFor("btts", picksBtts),
      over25: summaryFor("over25", picksOver),
    };

    return {
      league_id: data.leagueId,
      sample: predictions.length,
      markets,
      market: data.market,
    };
  });
