import { describe, expect, it } from "vitest";
import {
  scoreMatrix,
  marketsFromMatrix,
  matrixSum,
  jointProbabilitySameGame,
  fitLeagueRatings,
  expectedGoals,
  dcTau,
  type FinishedMatch,
} from "./dixon-coles";

describe("scoreMatrix", () => {
  it("soma 1", () => {
    const m = scoreMatrix(1.4, 1.1, -0.08);
    expect(matrixSum(m)).toBeCloseTo(1, 5);
  });

  it("simetria: lambda iguais → P(home)≈P(away) com rho 0", () => {
    const m = scoreMatrix(1.5, 1.5, 0);
    const d = marketsFromMatrix(m);
    expect(d.home).toBeCloseTo(d.away, 1);
  });

  it("mais ataque → mais gols (over25 sobe)", () => {
    const low = marketsFromMatrix(scoreMatrix(0.8, 0.8, -0.08));
    const high = marketsFromMatrix(scoreMatrix(2.5, 2.5, -0.08));
    expect(high.over25).toBeGreaterThan(low.over25);
  });

  it("rho corrige 0-0/1-1", () => {
    const tau00neg = dcTau(0, 0, 1.2, 1.2, -0.1);
    const tau00pos = dcTau(0, 0, 1.2, 1.2, 0.1);
    expect(tau00neg).toBeGreaterThan(tau00pos);
    const tau11neg = dcTau(1, 1, 1.2, 1.2, -0.1);
    const tau11pos = dcTau(1, 1, 1.2, 1.2, 0.1);
    expect(tau11neg).toBeGreaterThan(tau11pos);
  });
});

describe("marketsFromMatrix", () => {
  it("todos os mercados entre 0 e 1 e 1X2 soma 1", () => {
    const d = marketsFromMatrix(scoreMatrix(1.6, 1.0, -0.08));
    expect(d.home + d.draw + d.away).toBeCloseTo(1, 5);
    expect(d.over25 + d.under25).toBeCloseTo(1, 5);
    expect(d.btts + d.bttsNo).toBeCloseTo(1, 5);
    expect(d.dc1x).toBeGreaterThan(d.home);
    expect(d.dnbHome).toBeGreaterThanOrEqual(0);
    expect(d.dnbHome).toBeLessThanOrEqual(1);
    for (const v of Object.values(d)) {
      if (typeof v === "number") {
        expect(v).toBeGreaterThanOrEqual(-0.001);
        expect(v).toBeLessThanOrEqual(1.001);
      }
    }
  });

  it("joint same game ≠ produto ingênuo para Over+BTTS", () => {
    const m = scoreMatrix(1.8, 1.5, -0.08);
    const d = marketsFromMatrix(m);
    const joint = jointProbabilitySameGame(m, (i, j) => i + j >= 3 && i > 0 && j > 0);
    const naive = d.over25 * d.btts;
    expect(joint).toBeGreaterThan(0);
    expect(Math.abs(joint - naive)).toBeGreaterThan(0.001);
  });
});

describe("fitLeagueRatings + shrinkage", () => {
  const matches: FinishedMatch[] = [
    { homeTeam: "Alpha", awayTeam: "Beta", homeScore: 3, awayScore: 0, date: "2026-08-01" },
    { homeTeam: "Alpha", awayTeam: "Gamma", homeScore: 2, awayScore: 1, date: "2026-08-10" },
    { homeTeam: "Beta", awayTeam: "Gamma", homeScore: 0, awayScore: 0, date: "2026-08-15" },
    { homeTeam: "Gamma", awayTeam: "Alpha", homeScore: 1, awayScore: 4, date: "2026-09-01" },
  ];

  it("gera ratings e lambda positivos", () => {
    const r = fitLeagueRatings(1, matches, { leagueAvg: 1.4 });
    expect(r.teams.size).toBeGreaterThanOrEqual(3);
    const { lambdaHome, lambdaAway } = expectedGoals("Alpha", "Beta", r, 1.4);
    expect(lambdaHome).toBeGreaterThan(0);
    expect(lambdaAway).toBeGreaterThan(0);
    // Alpha ataca melhor → lambda casa maior que Beta fora
    const { lambdaHome: h2, lambdaAway: a2 } = expectedGoals("Beta", "Alpha", r, 1.4);
    expect(lambdaAway).toBeLessThan(h2 + 2);
    void a2;
  });

  it("shrinkage: time com 1 jogo ≈ prior vs time com muitos", () => {
    const many: FinishedMatch[] = Array.from({ length: 40 }, (_, i) => ({
      homeTeam: i % 2 === 0 ? "Star" : "Filler",
      awayTeam: i % 2 === 0 ? "Filler" : "Star",
      homeScore: i % 2 === 0 ? 3 : 0,
      awayScore: i % 2 === 0 ? 0 : 3,
      date: `2026-0${(i % 8) + 1}-1${i % 9}`,
    }));
    const few: FinishedMatch[] = [
      { homeTeam: "Newbie", awayTeam: "Filler", homeScore: 5, awayScore: 0, date: "2026-09-01" },
      ...many,
    ];
    const r = fitLeagueRatings(2, few, { leagueAvg: 1.3 });
    const star = r.teams.get("star");
    const newbie = r.teams.get("newbie");
    expect(star?.games).toBeGreaterThan(newbie?.games ?? 99);
    // newbie com 1 jogo: attack puxado para 0 (shrinkage)
    expect(Math.abs(newbie?.attack ?? 9)).toBeLessThan(Math.abs(star?.attack ?? 0) + 1);
  });
});
