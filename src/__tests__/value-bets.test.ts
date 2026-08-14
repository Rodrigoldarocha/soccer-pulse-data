import { describe, it, expect } from "vitest";

import {
  computeValueBets,
  computeRoiStats,
  settleOutcome,
  type RoiStats,
  type ValueBetRow,
} from "../lib/value-bets.functions";
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

  it("merges outcomes across separate market entries for the same event", () => {
    // Production shape: /api/v2/odds/best/ is called once per market, so the
    // same event_id appears multiple times, each entry carrying only that
    // market's outcomes. Overwriting would drop 1x2/OU bets.
    const odds: OddsBestEntry[] = [
      { event_id: 4, outcomes: [{ outcome: "HOME", best_odds: 2.5 }] },
      { event_id: 4, outcomes: [{ outcome: "over", best_odds: 1.8 }] },
      { event_id: 4, outcomes: [{ outcome: "yes", best_odds: 2.2 }] },
    ];
    const p = makePrediction(4, { probHome: 60, probOver25: 65, probBtts: 55 });

    const bets = computeValueBets([p], odds);

    // 0.60*2.5-1 = 0.50 ; 0.65*1.8-1 = 0.17 ; 0.55*2.2-1 = 0.21
    expect(bets.map((b) => b.market).sort()).toEqual(["1x2", "btts", "over_under_25"]);
    expect(bets[0].market).toBe("1x2");
  });
});

describe("settleOutcome", () => {
  it("settles 1x2 HOME", () => {
    expect(settleOutcome("1x2", "HOME", 2, 1)).toBe(true);
    expect(settleOutcome("1x2", "HOME", 1, 2)).toBe(false);
    expect(settleOutcome("1x2", "HOME", 1, 1)).toBe(false);
  });

  it("settles 1x2 AWAY and DRAW", () => {
    expect(settleOutcome("1x2", "AWAY", 1, 3)).toBe(true);
    expect(settleOutcome("1x2", "DRAW", 2, 2)).toBe(true);
    expect(settleOutcome("1x2", "DRAW", 2, 1)).toBe(false);
  });

  it("settles over_under_25 on the 2.5 line", () => {
    expect(settleOutcome("over_under_25", "OVER", 2, 1)).toBe(true); // 3 goals
    expect(settleOutcome("over_under_25", "OVER", 1, 1)).toBe(false); // 2 goals
    expect(settleOutcome("over_under_25", "UNDER", 1, 1)).toBe(true);
  });

  it("settles btts", () => {
    expect(settleOutcome("btts", "YES", 1, 2)).toBe(true);
    expect(settleOutcome("btts", "YES", 0, 2)).toBe(false);
    expect(settleOutcome("btts", "NO", 0, 0)).toBe(true);
  });

  it("returns null when scores are unavailable", () => {
    expect(settleOutcome("1x2", "HOME", null, null)).toBeNull();
    expect(settleOutcome("btts", "YES", 1, null)).toBeNull();
  });

  it("is case-insensitive on outcome", () => {
    expect(settleOutcome("btts", "yes", 1, 1)).toBe(true);
  });
});

function row(partial: Partial<ValueBetRow>): ValueBetRow {
  return {
    id: 1,
    event_id: 1,
    market: "1x2",
    outcome: "HOME",
    prob: 0.6,
    odds: 2.0,
    ev: 0.2,
    event_date: "2026-08-01T19:00:00Z",
    home_team: "Home",
    away_team: "Away",
    league_name: null,
    status: "pending",
    settled_at: null,
    notified_at: null,
    created_at: "2026-07-30T00:00:00Z",
    updated_at: "2026-07-30T00:00:00Z",
    ...partial,
  };
}

describe("computeRoiStats", () => {
  it("computes ROI with 1 unit stake per settled bet", () => {
    const rows = [
      row({ id: 1, odds: 2.0, status: "won" }),
      row({ id: 2, odds: 1.5, status: "won" }),
      row({ id: 3, odds: 2.5, status: "lost" }),
      row({ id: 4, odds: 1.8, status: "pending" }),
    ];

    const stats = computeRoiStats(rows);

    expect(stats.total).toBe(4);
    expect(stats.settled).toBe(3);
    expect(stats.pending).toBe(1);
    expect(stats.won).toBe(2);
    expect(stats.lost).toBe(1);
    expect(stats.hit_rate).toBeCloseTo(2 / 3);
    // returns 2.0 + 1.5 = 3.5 ; staked 3 ; profit 0.5 ; roi 0.5/3
    expect(stats.profit).toBeCloseTo(0.5);
    expect(stats.roi).toBeCloseTo(0.5 / 3);
  });

  it("returns zeros for empty rows", () => {
    const stats = computeRoiStats([]);
    expect(stats).toMatchObject<RoiStats>({
      total: 0,
      settled: 0,
      pending: 0,
      won: 0,
      lost: 0,
      hit_rate: null,
      roi: null,
      profit: 0,
    });
  });

  it("returns null rates when nothing is settled", () => {
    const stats = computeRoiStats([row({ id: 1, status: "pending" })]);
    expect(stats.hit_rate).toBeNull();
    expect(stats.roi).toBeNull();
  });
});
