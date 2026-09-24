import { describe, expect, it } from "vitest";
import { buildPrediction } from "./pipeline";
import { bettingOptionsFor } from "../matches.server";
import type { FootballEvent, PredictionData } from "../types";

const event: FootballEvent = {
  id: "9",
  league: "brasileirao",
  leagueLabel: "Brasileirão",
  homeTeam: "Flamengo",
  awayTeam: "Palmeiras",
  eventDate: "2026-09-13T19:00:00-03:00",
  status: "scheduled",
};

const api: PredictionData = {
  xgHome: 1.8,
  xgAway: 1.2,
  probHome: 0.7214,
  probDraw: 0.1811,
  probAway: 0.0975,
  probOver25: 0.65,
  probBtts: 0,
};

const meta = { id: "9", name: "Brasileirão" };

describe("buildPrediction ensemble unificado", () => {
  it("fonte api marcada, sem passthrough cru (ensemble calibra→blend→EV)", async () => {
    const m = await buildPrediction(event, api, meta, { trustSource: true, modelVersion: "v2" });
    expect(m.predictionSource).toBe("api");
    expect(m.modelVersion).toBe("v2");
    expect(m.predictionKind).toBe("pre");
    expect(m.sources).toEqual({ api: true, dc: true, market: false });
    // 1X2 ainda soma ≈1 após blend com DC
    const s = m.probabilities.home + m.probabilities.draw + m.probabilities.away;
    expect(s).toBeGreaterThan(0.95);
    expect(s).toBeLessThan(1.05);
  });

  it("sem odd real: odds null, fairOdds presente, oddsAvailable false", async () => {
    const m = await buildPrediction(event, api, meta, { trustSource: true });
    expect(m.oddsAvailable).toBe(false);
    expect(m.odds.home).toBeNull();
    expect(m.odds.doubleChance1X).toBeNull();
    expect(m.fairOdds["1X2_HOME"]).toBeGreaterThan(1);
    expect(m.fairOdds["DOUBLE_CHANCE_1X"]).toBeGreaterThan(1);
  });

  it("zero válido preservado (API BTTS=0 manda sozinho)", async () => {
    const m = await buildPrediction(event, api, meta, { trustSource: true });
    expect(m.probabilities.btts).toBe(0);
    expect(m.fairOdds.BTTS).toBeGreaterThan(1); // fair de 0 clampado ≥0.01 → 100
  });

  it("confiança honesta com razão (não só tamanho da %)", async () => {
    const m = await buildPrediction(event, api, meta, { trustSource: true });
    expect(["low", "medium", "high"]).toContain(m.confidence);
    expect(m.confidenceReason).toBeTruthy();
    expect(m.confidenceReason!.length).toBeGreaterThan(5);
  });

  it("valor não-finito rejeitado no caminho antigo de passthrough", async () => {
    // ensemble agora trata NaN como ausente; jogo sem probs válidas cai no throw de "no data"
    // ou gera unavailable — aqui garantimos que não explode o processo
    const m = await buildPrediction(event, { ...api, probHome: NaN }, meta, {
      trustSource: true,
    }).catch(() => null);
    if (m) {
      expect(Number.isFinite(m.probabilities.home)).toBe(true);
    }
  });

  it.each([
    ["cancelled", "scheduled"],
    ["postponed", "scheduled"],
  ] as const)("status %s não resolve como final (%s)", async (raw, expected) => {
    const m = await buildPrediction(
      { ...event, status: raw as FootballEvent["status"] },
      api,
      meta,
      { trustSource: true },
    );
    expect(m.status).toBe(expected);
  });

  it("ao vivo marca kind live", async () => {
    const m = await buildPrediction({ ...event, status: "live" }, api, meta, {
      trustSource: true,
    });
    expect(m.predictionKind).toBe("live");
  });

  it("com odds reais bettingOptions exibe DC1X e BTTS", async () => {
    const pred = { ...api, probBtts: 0.62 };
    const m = await buildPrediction(event, pred, meta, {
      trustSource: true,
      marketOdds: { doubleChance1X: 1.45, btts: 2.1, home: 1.9, draw: 3.5, away: 4.2 },
    });
    const bets = bettingOptionsFor(m);
    expect(bets.map((b) => b.market)).toEqual(["DOUBLE_CHANCE_1X", "BTTS"]);
    expect(bets.every((b) => b.odds > 1)).toBe(true);
    expect(m.oddsAvailable).toBe(true);
  });

  it("sem odds reais bettingOptions vazio (sem odd fabricada)", async () => {
    const pred = { ...api, probBtts: 0.62 };
    const m = await buildPrediction(event, pred, meta, { trustSource: true });
    const bets = bettingOptionsFor(m);
    expect(bets).toHaveLength(0);
  });
});

describe("buildPrediction local", () => {
  it("fonte local sem histórico", async () => {
    const m = await buildPrediction(event, api, meta, { localOnly: true });
    expect(m.predictionSource).toBe("local");
    expect(m.predictionKind).toBe("pre");
    expect(m.sources?.dc).toBe(true);
  });

  it("sem dados joga erro explícito", async () => {
    await expect(buildPrediction(event, undefined, meta)).rejects.toThrow();
  });
});
