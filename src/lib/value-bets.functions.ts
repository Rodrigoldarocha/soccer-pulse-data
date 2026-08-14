// Server functions that expose Bzzoiro value bets to the client through
// TanStack Start's typed RPC. The token stays server-side.

import { createServerFn } from "@tanstack/react-start";

import type { OddsBestEntry, Prediction, ValueBet, ValueMarket } from "./bzzoiro/types";

// Limiares de valor. EV = prob × odd − 1.
const MIN_EV = 0.05;
const MIN_ODDS = 1.01;
const MAX_ODDS = 50.0;

// -------- Settlement (pure) --------

export type ValueBetStatus = "pending" | "won" | "lost";

export interface ValueBetRow {
  id: number;
  event_id: number;
  market: ValueMarket;
  outcome: string;
  prob: number;
  odds: number;
  ev: number;
  event_date: string;
  home_team: string;
  away_team: string;
  league_name: string | null;
  status: ValueBetStatus;
  settled_at: string | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Decide win/loss de um palpite contra o placar final. Retorna null quando o
 * resultado ainda não é determinável (score ausente). Stake unitária = 1.
 */
export function settleOutcome(
  market: ValueMarket,
  outcome: string,
  home: number | null,
  away: number | null,
): boolean | null {
  if (home == null || away == null) return null;
  const o = outcome.toUpperCase();
  const total = home + away;

  switch (market) {
    case "1x2":
      if (o === "HOME") return home > away;
      if (o === "AWAY") return away > home;
      if (o === "DRAW") return home === away;
      return null;
    case "over_under_25":
      if (o === "OVER") return total >= 3;
      if (o === "UNDER") return total <= 2;
      return null;
    case "btts":
      if (o === "YES") return home > 0 && away > 0;
      if (o === "NO") return home === 0 || away === 0;
      return null;
    default:
      return null;
  }
}

export interface RoiStats {
  total: number;
  settled: number;
  pending: number;
  won: number;
  lost: number;
  hit_rate: number | null;
  roi: number | null;
  profit: number;
}

/** ROI com stake unitária: ganho = odds, perda = 0, retorno sobre stakes liquidados. */
export function computeRoiStats(rows: ValueBetRow[]): RoiStats {
  const settledRows = rows.filter((r) => r.status !== "pending");
  const won = settledRows.filter((r) => r.status === "won");
  const returns = won.reduce((a, r) => a + r.odds, 0);
  const profit = returns - settledRows.length;
  return {
    total: rows.length,
    settled: settledRows.length,
    pending: rows.length - settledRows.length,
    won: won.length,
    lost: settledRows.length - won.length,
    hit_rate: settledRows.length > 0 ? won.length / settledRows.length : null,
    roi: settledRows.length > 0 ? profit / settledRows.length : null,
    profit,
  };
}

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
    // /api/v2/odds/best/ é chamado uma vez por mercado, então o mesmo evento
    // aparece várias vezes com outcomes parciais — merge, não sobrescreve.
    const existing = map.get(entry.event_id);
    if (existing) {
      for (const [outcome, odds] of outcomes) existing.set(outcome, odds);
    } else {
      map.set(entry.event_id, outcomes);
    }
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
        event_date: p.event.event_date,
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

    const bets = computeValueBets(predictions, oddsEntries);

    // Settlement do feed: liquida vencidas a cada consulta — o ROI anda sem
    // depender do usuário abrir o backtest. Falha só loga.
    try {
      await settlePendingValueBets();
    } catch (error) {
      console.warn("[value-bets] settlement do feed falhou:", error);
    }

    // Snapshot idempotente p/ o backtest de ROI: registra bets novos sem
    // duplicar. Falha de persistência não derruba o feed (tabela ausente → log).
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const snapshot = bets.map((b) => ({
        event_id: b.event_id,
        market: b.market,
        outcome: b.outcome,
        prob: b.prob,
        odds: b.odds,
        ev: b.ev,
        event_date: b.event_date,
        home_team: b.home_team,
        away_team: b.away_team,
        league_name: b.league_name ?? null,
      }));
      if (snapshot.length > 0) {
        await supabaseAdmin
          .from("value_bets")
          .upsert(snapshot, { onConflict: "event_id,market,outcome", ignoreDuplicates: true });

        // Web push: avisa bets de alto valor ainda não notificados (dedup).
        const { notifyHighValueBets } = await import("./push.functions");
        const { data: freshRows } = await supabaseAdmin
          .from("value_bets")
          .select("*")
          .eq("status", "pending")
          .is("notified_at", null);
        if (freshRows && freshRows.length > 0) {
          try {
            await notifyHighValueBets(freshRows as unknown as ValueBetRow[]);
          } catch (pushError) {
            console.warn("[value-bets] web push falhou:", pushError);
          }
        }
      }
    } catch (error) {
      console.warn("[value-bets] snapshot não persistido:", error);
    }

    return bets;
  },
);

const ROI_LIMIT = 20;

async function settlePendingValueBets(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { bzzoiroCachedFetch, hashKey } = await import("./bzzoiro/cache.server");

  const { data: pending, error } = await supabaseAdmin
    .from("value_bets")
    .select("id,event_id,market,outcome,event_date")
    .eq("status", "pending")
    .lt("event_date", new Date(Date.now() - 3 * 3_600_000).toISOString())
    .limit(500);

  if (error) throw error;
  if (!pending || pending.length === 0) return 0;

  const minDate = pending.map((p) => p.event_date).sort()[0];
  const dateFrom = new Date(new Date(minDate).getTime() - 86_400_000).toISOString().slice(0, 10);

  type EventRow = { id: number; home_score?: number | null; away_score?: number | null };
  const PAGE = 200;
  const MAX_PAGES = 6;
  const events: EventRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = {
      status: "finished",
      limit: PAGE,
      offset: page * PAGE,
      date_from: dateFrom,
      date_to: new Date().toISOString(),
    };
    const key = await hashKey("value-bets:settle:events", params);
    const raw = await bzzoiroCachedFetch<unknown>("/api/v2/events/", {
      key,
      ttlSeconds: 10 * 60,
      params,
      timeoutMs: 20_000,
      retries: 2,
    });
    const rows = Array.isArray(raw) ? (raw as EventRow[]) : [];
    events.push(...rows);
    if (rows.length < PAGE) break;
  }

  const scoreById = new Map<number, { home: number | null; away: number | null }>();
  for (const ev of events) {
    if (ev.home_score != null && ev.away_score != null) {
      scoreById.set(ev.id, { home: ev.home_score, away: ev.away_score });
    }
  }

  const updates: { id: number; status: ValueBetStatus; settled_at: string }[] = [];
  for (const p of pending) {
    const score = scoreById.get(p.event_id);
    if (!score) continue;
    const won = settleOutcome(p.market as ValueMarket, p.outcome, score.home, score.away);
    if (won == null) continue;
    updates.push({ id: p.id, status: won ? "won" : "lost", settled_at: new Date().toISOString() });
  }

  if (updates.length === 0) return 0;
  for (const u of updates) {
    const { error } = await supabaseAdmin
      .from("value_bets")
      .update({ status: u.status, settled_at: u.settled_at })
      .eq("id", u.id);
    if (error) throw error;
  }
  return updates.length;
}

export const getValueBetsBacktest = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ stats: RoiStats; recent: ValueBetRow[] }> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { checkRateLimit } = await import("./rate-limit.server");
    const { getRequestIP } = await import("./request-ip");
    await checkRateLimit(`value-bets:roi:${getRequestIP(getRequest())}`, {
      max: ROI_LIMIT,
      windowMs: 60_000,
    });

    // Settlement lazy: liquida vencidas antes de ler. Sem cron — roda sob
    // demanda na primeira consulta do backtest (rate limit 20/min).
    try {
      await settlePendingValueBets();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("value_bets")
        .select("*")
        .order("event_date", { ascending: false })
        .limit(500);

      if (error) throw error;
      const rows = (data ?? []) as unknown as ValueBetRow[];

      return {
        stats: computeRoiStats(rows),
        recent: rows.filter((r) => r.status !== "pending").slice(0, 10),
      };
    } catch (error) {
      // Tabela ausente (migration não aplicada) → backtest vazio em vez de crash.
      console.warn("[value-bets] backtest indisponível:", error);
      return { stats: computeRoiStats([]), recent: [] };
    }
  },
);
