import { describe, expect, it } from "vitest";
import { clamp01, fmtPct, probGroupsFor, probLevel, x12Sum } from "./probability-view";
import type { MatchPrediction } from "./types";

function sample(over: Partial<MatchPrediction["probabilities"]>): MatchPrediction {
  return {
    id: "t1",
    league: "brasileirao",
    leagueLabel: "Brasileirão",
    kickoff: "2026-09-09T19:00:00-03:00",
    status: "scheduled",
    home: { name: "Flamengo", short: "FLA", logo: "⚽", xg: 1.8, xga: 1.1 },
    away: { name: "Palmeiras", short: "PAL", logo: "⚽", xg: 1.2, xga: 1.4 },
    probabilities: { home: 0.61, draw: 0.23, away: 0.16, over25: 0.68, btts: 0.72, ...over },
    odds: { home: 1.6, draw: 3.4, away: 5.0, over25: 1.9, btts: 1.8, doubleChance1X: 1.2 },
    oddsUpdatedAt: new Date().toISOString(),
    suggestedMarket: "BTTS",
    suggestedProbability: 0.72,
    suggestedOdds: 1.8,
    suggestedLabel: "Ambas marcam",
    confidence: "high",
  };
}

describe("fmtPct", () => {
  it("formato inteiro com %", () => {
    expect(fmtPct(0.72)).toBe("72%");
    expect(fmtPct(0.724)).toBe("72%");
    expect(fmtPct(0)).toBe("0%");
    expect(fmtPct(1)).toBe("100%");
  });
});

describe("clamp01", () => {
  it("limita faixa e NaN", () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(1.4)).toBe(1);
    expect(clamp01(0.5)).toBe(0.5);
  });
});

describe("probLevel", () => {
  it("limiares da hierarquia visual", () => {
    expect(probLevel(0.65)).toBe("strong");
    expect(probLevel(0.9)).toBe("strong");
    expect(probLevel(0.5)).toBe("moderate");
    expect(probLevel(0.64)).toBe("moderate");
    expect(probLevel(0.49)).toBe("neutral");
  });
});

describe("probGroupsFor", () => {
  it("expõe os dois lados de BTTS e Over/Under como complementos", () => {
    const g = probGroupsFor(sample({}));
    expect(g.btts[0]).toMatchObject({ label: "SIM", pct: "72%" });
    expect(g.btts[1]).toMatchObject({ label: "NÃO", pct: "28%" });
    expect(g.overUnder[0]).toMatchObject({ label: "OVER 2.5", pct: "68%" });
    expect(g.overUnder[1]).toMatchObject({ label: "UNDER 2.5", pct: "32%" });
    expect(g.btts[0].p + g.btts[1].p).toBeCloseTo(1, 10);
    expect(g.overUnder[0].p + g.overUnder[1].p).toBeCloseTo(1, 10);
  });

  it("1X2 exibe os três lados", () => {
    const g = probGroupsFor(sample({}));
    expect(g.x12.map((r) => r.label)).toEqual(["CASA", "EMPATE", "FORA"]);
    expect(g.x12.map((r) => r.pct)).toEqual(["61%", "23%", "16%"]);
  });
});

describe("invariantes do pipeline", () => {
  const cases: Array<[string, Partial<MatchPrediction["probabilities"]>]> = [
    ["favorito em casa", { home: 0.61, draw: 0.23, away: 0.16, over25: 0.68, btts: 0.72 }],
    ["jogo equilibrado", { home: 0.34, draw: 0.3, away: 0.36, over25: 0.42, btts: 0.48 }],
    ["azarão fora", { home: 0.2, draw: 0.25, away: 0.55, over25: 0.55, btts: 0.58 }],
    ["under forte", { home: 0.4, draw: 0.32, away: 0.28, over25: 0.2, btts: 0.3 }],
  ];

  it.each(cases)("%s: nenhuma probabilidade NaN/fora de [0,1]", (_n, probs) => {
    const m = sample(probs);
    const g = probGroupsFor(m);
    const all = [...g.btts, ...g.x12, ...g.overUnder];
    for (const r of all) {
      expect(Number.isNaN(r.p)).toBe(false);
      expect(r.p).toBeGreaterThanOrEqual(0);
      expect(r.p).toBeLessThanOrEqual(1);
    }
    expect(x12Sum(m)).toBeCloseTo(1, 1);
  });
});
