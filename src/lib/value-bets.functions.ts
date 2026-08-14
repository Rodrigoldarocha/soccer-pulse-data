// Server functions that expose Bzzoiro value bets to the client through
// TanStack Start's typed RPC. The token stays server-side.

import { createServerFn } from "@tanstack/react-start";

import type { OddsBestEntry, Prediction, ValueBet, ValueMarket } from "./bzzoiro/types";

// Limiares de valor. EV = prob × odd − 1.
const MIN_EV = 0.05;
const MIN_ODDS = 1.01;
const MAX_ODDS = 50.0;

/** Mercados com valor: prob do modelo ↔ melhor odd da casa. */
const MARKET_JOINS: {
  market: ValueMarket;
  oddsOutcome: string;
  pick: (p: Prediction) => number | null;
}[] = [
  { market: "1x2", oddsOutcome: "HOME", pick: (p) => p.markets.match_result.prob_home },
  { market: "over_under_25", oddsOutcome: "over", pick: (p) => p.markets.over_under.prob_over_25 },
  { market: "btts", oddsOutcome: "yes", pick: (p) => p.markets.btts.prob_yes },
];

/**
 * Normaliza o shape de `/api/v2/odds/best/` defensivamente (array de eventos
 * com outcomes), tolerando variantes de wrapper — padrão predictions.
 */
export function normalizeOddsBest(raw: unknown): OddsBestEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is OddsBestEntry =>
      !!e && typeof e === "object" && typeof (e as OddsBestEntry).event_id === "number",
  );
}

/** Entradas de melhor odd por evento, com outcome normalizado em uppercase. */
function oddsByEvent(oddsBest: OddsBestEntry[]): Map<number, Map<string, number>> {
  const map = new Map<number, Map<string, number>>();
  for (const entry of oddsBest) {
    const outcomes = new Map<string, number>();
    for (const o of entry.outcomes ?? []) {
      if (o.best_odds != null && o.outcome) {
        outcomes.set(o.outcome.toUpperCase(), o.best_odds);
      }
    }
    map.set(entry.event_id, outcomes);
  }
  return map;
}

/**
 * Cruza predictions com melhores odds, calcula EV por mercado, filtra
 * EV >= MIN_EV e odd em [MIN_ODDS, MAX_ODDS]. Ordena por EV desc.
 */
export function computeValueBets(predictions: Prediction[], oddsBest: OddsBestEntry[]): ValueBet[] {
  const oddsMap = oddsByEvent(oddsBest);
  const bets: ValueBet[] = [];

  for (const p of predictions) {
    const outcomes = oddsMap.get(p.event.id);
    if (!outcomes) continue;

    for (const join of MARKET_JOINS) {
      const prob = join.pick(p);
      const odds = outcomes.get(join.oddsOutcome.toUpperCase());
      if (prob == null || odds == null) continue;
      if (odds < MIN_ODDS || odds > MAX_ODDS) continue;

      const ev = Math.round(((prob / 100) * odds - 1) * 10_000) / 10_000;
      if (ev < MIN_EV) continue;

      bets.push({
        event_id: p.event.id,
        home_team: p.event.home_team,
        away_team: p.event.away_team,
        league_name: p.event.league_name,
        market: join.market,
        outcome: join.oddsOutcome,
        prob: prob / 100,
        odds,
        ev,
        evPct: Math.round(ev * 100),
      });
    }
  }

  return bets.sort((a, b) => b.ev - a.ev);
}

export const getValueBets = createServerFn({ method: "GET" }).handler(
  async (): Promise<ValueBet[]> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { checkRateLimit } = await import("./rate-limit.server");
    const { getRequestIP } = await import("./request-ip");
    await checkRateLimit(`value-bets:${getRequestIP(getRequest())}`, {
      max: 20,
      windowMs: 60_000,
    });

    const { bzzoiroCachedFetch } = await import("./bzzoiro/cache.server");

    // 1. Predictions upcoming (probs do modelo).
    const rawPredictions = await bzzoiroCachedFetch<unknown>("/api/v2/predictions/", {
      key: "value-bets:predictions:upcoming",
      ttlSeconds: 2 * 60,
      params: { status: "upcoming", limit: 200 },
    });

    let predictions: Prediction[];
    if (Array.isArray(rawPredictions)) {
      predictions = rawPredictions as Prediction[];
    } else if (
      rawPredictions &&
      typeof rawPredictions === "object" &&
      "results" in rawPredictions &&
      Array.isArray((rawPredictions as { results: unknown }).results)
    ) {
      predictions = (rawPredictions as { results: Prediction[] }).results;
    } else {
      predictions = [];
    }

    // 2. Melhores odds por mercado (1 call por mercado, sem N+1 por jogo).
    const markets: ValueMarket[] = ["1x2", "over_under_25", "btts"];
    const oddsEntries: OddsBestEntry[] = [];
    for (const market of markets) {
      const rawOdds = await bzzoiroCachedFetch<unknown>("/api/v2/odds/best/", {
        key: `value-bets:odds-best:${market}`,
        ttlSeconds: 5 * 60,
        params: { market },
      });
      oddsEntries.push(...normalizeOddsBest(rawOdds));
    }

    return computeValueBets(predictions, oddsEntries);
  },
);
