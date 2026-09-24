// ─── Palpites simples do dia ─────────────────────────────────────────

import type { MatchPrediction, MarketId } from "../types";
import { MARKET_LABELS } from "../types";
import { evaluateValue, type ValueMetrics } from "./value";
import { PICK_CONFIG, type PickConfig } from "./config";
import { suggestedStakeUnits, loadBankroll, exposureSummary } from "./bankroll";

export interface Pick {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  leagueLabel: string;
  kickoff: string;
  market: MarketId;
  selectionLabel: string;
  p: number;
  odd: number;
  bookmaker: string;
  fairOdds: number;
  fairMarketP: number;
  EV: number;
  edge: number;
  kelly: number;
  stakeUnits: number;
  confidence: "low" | "medium" | "high";
  confidenceReason?: string;
  reason: string[];
  risk: "baixo" | "médio" | "alto";
  sources: { api: boolean; dc: boolean; market: boolean };
  modelsDiverge?: boolean;
}

export interface RadarPick extends Omit<Pick, "EV"> {
  EV: number;
}

export interface DailyPicksResult {
  date: string;
  analyzed: number;
  withValue: number;
  withoutOdd: number;
  picks: Pick[];
  radar: Pick[];
  partial: boolean;
  notes: string[];
  oddsMode: "market" | "probability";
  exposure: ReturnType<typeof exposureSummary>;
}

function oddMapFor(m: MatchPrediction, market: MarketId): number[] | undefined {
  if (!m.markets) return undefined;
  const related: MarketId[] = [];
  if (market === "1X2_HOME" || market === "DRAW" || market === "1X2_AWAY") {
    related.push("1X2_HOME", "DRAW", "1X2_AWAY");
  } else if (market.startsWith("OVER_") || market.startsWith("UNDER_")) {
    related.push(
      ...(m.markets
        .map((x) => x.market)
        .filter((x) => x.startsWith("OVER_") || x.startsWith("UNDER_")) as MarketId[]),
    );
  } else if (market === "BTTS" || market === "BTTS_NO") {
    related.push("BTTS", "BTTS_NO");
  } else {
    return undefined;
  }
  return m.markets
    .filter((x) => related.includes(x.market) && x.odd != null)
    .map((x) => x.odd as number);
}

function lineupPenalty(m: MatchPrediction): boolean {
  // kickoff < 90min e sem odd → rebaixa (feito pelo caller via confidence)
  const t = new Date(m.kickoff).getTime() - Date.now();
  return t > 0 && t < 90 * 60 * 1000;
}

export function buildPicksFromMatches(
  matches: MatchPrediction[],
  date: string,
  cfg: PickConfig = PICK_CONFIG,
  opts: { partial?: boolean; notes?: string[] } = {},
): DailyPicksResult {
  const notes = [...(opts.notes ?? [])];
  const candidates: Pick[] = [];
  const radar: Pick[] = [];
  let withoutOdd = 0;

  for (const m of matches) {
    if (m.predictionStatus === "unavailable" || m.status === "finished") continue;
    if (!m.markets || m.markets.length === 0) continue;

    const gamePicks: Array<{ pick: Pick; metrics: ValueMetrics; score: number }> = [];

    for (const edge of m.markets) {
      if (edge.odd == null || edge.odd <= 1) continue;
      const marketOdds = oddMapFor(m, edge.market);
      let conf = m.confidence;
      // rebaixa se kickoff muito próximo e linha duvidosa
      if (lineupPenalty(m) && m.confidence === "high") conf = "medium";

      const metrics = evaluateValue(
        {
          p: edge.probability,
          odd: edge.odd,
          marketOdds,
          confidence: conf,
          modelDelta: m.modelsDiverge ? 0.16 : 0,
        },
        cfg,
      );

      const reason = [
        ...metrics.reasons,
        `Fair do modelo ${edge.fairOdds.toFixed(2)} vs mercado ${edge.odd.toFixed(2)}`,
        m.confidenceReason ?? "Modelos avaliados",
      ].slice(0, 3);

      const stake = suggestedStakeUnits(metrics.quarterKelly, loadBankroll());
      const pick: Pick = {
        eventId: m.id,
        homeTeam: m.home.name,
        awayTeam: m.away.name,
        league: m.league,
        leagueLabel: m.leagueLabel,
        kickoff: m.kickoff,
        market: edge.market,
        selectionLabel: selectionLabel(m, edge.market),
        p: edge.probability,
        odd: edge.odd,
        bookmaker: "consensus",
        fairOdds: edge.fairOdds,
        fairMarketP: edge.fairMarketProb ?? 1 / edge.odd,
        EV: metrics.ev,
        edge: metrics.edge,
        kelly: metrics.quarterKelly,
        stakeUnits: stake,
        confidence: conf,
        confidenceReason: m.confidenceReason,
        reason,
        risk: metrics.risk,
        sources: m.sources ?? { api: false, dc: true, market: true },
        modelsDiverge: m.modelsDiverge,
      };

      if (metrics.isValue) {
        gamePicks.push({
          pick,
          metrics,
          score: metrics.ev * (conf === "high" ? 1.3 : conf === "medium" ? 1 : 0.5),
        });
      } else if (metrics.ev > 0 && metrics.skipReason !== "sem_odd") {
        radar.push(pick);
      }
    }

    if (gamePicks.length > 0) {
      gamePicks.sort((a, b) => b.score - a.score);
      candidates.push(gamePicks[0].pick); // máx 1 por jogo
    } else if (!m.oddsAvailable) {
      withoutOdd++;
    }
  }

  candidates.sort((a, b) => b.EV - a.EV);
  radar.sort((a, b) => b.EV - a.EV);

  const picks = candidates.slice(0, cfg.maxPicksPerDay);
  if (candidates.length === 0) {
    notes.push(
      withoutOdd > 0 && withoutOdd === matches.length
        ? "Odds indisponíveis — modo probabilidade. Sem palpite de valor."
        : "Sem palpites de valor hoje. Isso é normal — disciplina também é resultado.",
    );
  }

  const bank = loadBankroll();
  const exposure = exposureSummary(
    picks.map((p) => p.stakeUnits),
    bank,
  );

  return {
    date,
    analyzed: matches.length,
    withValue: picks.length,
    withoutOdd,
    picks,
    radar: radar.slice(0, 10),
    partial: !!opts.partial,
    notes,
    oddsMode: matches.some((m) => m.oddsAvailable) ? "market" : "probability",
    exposure,
  };
}

function selectionLabel(m: MatchPrediction, market: MarketId): string {
  if (market === "1X2_HOME") return `Vitória ${m.home.name}`;
  if (market === "1X2_AWAY") return `Vitória ${m.away.name}`;
  if (market === "DOUBLE_CHANCE_1X") return `${m.home.name} ou Empate`;
  if (market === "DOUBLE_CHANCE_X2") return `Empate ou ${m.away.name}`;
  if (market === "DOUBLE_CHANCE_12") return `${m.home.name} ou ${m.away.name}`;
  return MARKET_LABELS[market] ?? market;
}
