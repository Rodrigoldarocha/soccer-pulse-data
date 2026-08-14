import { describe, it, expect } from "vitest";

import { computeValueBets } from "../lib/value-bets.functions";
import type { OddsBestEntry, Prediction } from "../lib/bzzoiro/types";

function makePrediction(
  id: number,
  overrides: {
    probHome?: number;
    probDraw?: number;
    probAway?: number;
    probOver25?: number;
    probBtts?: number;
  } = {},
): Prediction {
  const {
    probHome = 50,
    probDraw = 25,
    probAway = 25,
    probOver25 = null,
    probBtts = null,
  } = overrides;
  return {
    id,
    created_at: "2026-08-14T00:00:00Z",
    event: {
      id,
      event_date: "2026-08-15T19:00:00Z",
      status: "notstarted",
      home_team_id: 1,
      home_team: "Home",
      away_team_id: 2,
      away_team: "Away",
      league_id: 1,
      league_name: "Liga Teste",
    },
    markets: {
      match_result: {
        prob_home: probHome,
        prob_draw: probDraw,
        prob_away: probAway,
        predicted: "H",
      },
      expected_goals: { home: null, away: null },
      over_under: { prob_over_15: null, prob_over_25: probOver25, prob_over_35: null },
      btts: { prob_yes: probBtts },
      score: { most_likely: null },
      draw_no_bet: { prob_home: null },
      corners: null,
    },
    model: { confidence: 0.7, version: "test" },
    recommendations: {},
  };
}

const oddsBest: OddsBestEntry[] = [
  {
    event_id: 1,
    outcomes: [
      { outcome: "HOME", best_odds: 2.0 },
      { outcome: "DRAW", best_odds: 3.5 },
      { outcome: "AWAY", best_odds: 4.0 },
    ],
  },
];

describe("computeValueBets", () => {
  it("computes positive EV entry for 1x2 (prob 50% × odd 2.0 → EV 0)", () => {
    // 0.50 * 2.0 - 1 = 0.0 → below MIN_EV 0.05 → excluded
    const bets = computeValueBets([makePrediction(1, { probHome: 50 })], oddsBest);
    expect(bets).toEqual([]);
  });

  it("includes bet with EV >= threshold", () => {
    // 0.60 * 2.0 - 1 = 0.20 → included
    const bets = computeValueBets([makePrediction(1, { probHome: 60 })], oddsBest);
    expect(bets).toHaveLength(1);
    expect(bets[0]).toMatchObject({
      event_id: 1,
      market: "1x2",
      outcome: "HOME",
      prob: 0.6,
      odds: 2.0,
      ev: 0.2,
      evPct: 20,
    });
  });

  it("joins over_under_25 and btts markets when odds present", () => {
    const odds: OddsBestEntry[] = [
      {
        event_id: 2,
        outcomes: [
          { outcome: "over", best_odds: 1.8 },
          { outcome: "yes", best_odds: 2.1 },
        ],
      },
    ];
    const bets = computeValueBets([makePrediction(2, { probOver25: 65, probBtts: 55 })], odds);
    // over: 0.65*1.8-1 = 0.17 ✓ ; btts: 0.55*2.1-1 = 0.155 ✓
    expect(bets.map((b) => b.market).sort()).toEqual(["btts", "over_under_25"]);
    expect(bets[0].ev).toBeGreaterThan(bets[1].ev);
  });

  it("excludes entries below EV threshold", () => {
    // 0.52 * 2.0 - 1 = 0.04 → below 0.05
    const bets = computeValueBets([makePrediction(1, { probHome: 52 })], oddsBest);
    expect(bets).toEqual([]);
  });

  it("excludes odds outside [1.01, 50] range", () => {
    const bets = computeValueBets(
      [makePrediction(1, { probHome: 90 })],
      [{ event_id: 1, outcomes: [{ outcome: "HOME", best_odds: 100 }] }],
    );
    expect(bets).toEqual([]);
  });

  it("excludes null probs and null odds", () => {
    const bets = computeValueBets(
      [makePrediction(1, { probHome: null as unknown as number })],
      [{ event_id: 1, outcomes: [{ outcome: "HOME", best_odds: null }] }],
    );
    expect(bets).toEqual([]);
  });

  it("sorts by EV descending across markets", () => {
    const odds: OddsBestEntry[] = [
      { event_id: 3, outcomes: [{ outcome: "HOME", best_odds: 3.0 }] }, // 0.5*3-1=0.5
    ];
    const p = makePrediction(3, { probHome: 50 });
    p.markets.over_under.prob_over_25 = 80;
    odds[0].outcomes = [
      { outcome: "HOME", best_odds: 3.0 },
      { outcome: "over", best_odds: 1.3 }, // 0.8*1.3-1=0.04 → excluded
    ];
    const bets = computeValueBets([p], odds);
    expect(bets.map((b) => b.market)).toEqual(["1x2"]);
  });
});
