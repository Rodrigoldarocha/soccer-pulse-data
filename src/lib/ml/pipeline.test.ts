import { describe, expect, it } from "vitest";
import { buildPrediction } from "./pipeline";
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

describe("buildPrediction trustSource", () => {
  it("repasse exato da API, sem mistura", async () => {
    const m = await buildPrediction(event, api, meta, { trustSource: true, modelVersion: "v2" });
    expect(m.probabilities.home).toBe(+api.probHome.toFixed(3));
    expect(m.probabilities.draw).toBe(+api.probDraw.toFixed(3));
    expect(m.probabilities.away).toBe(+api.probAway.toFixed(3));
    expect(m.probabilities.over25).toBe(+api.probOver25.toFixed(3));
    expect(m.probabilities.btts).toBe(0);
    expect(m.odds.doubleChance1X).toBeGreaterThan(1);
    expect(m.predictionSource).toBe("api");
    expect(m.modelVersion).toBe("v2");
    expect(m.predictionKind).toBe("pre");
  });

  it("zero válido preservado", async () => {
    const m = await buildPrediction(event, api, meta, { trustSource: true });
    expect(m.probabilities.btts).toBe(0);
  });

  it("probabilidade alta não vira confiança comprovada", async () => {
    const m = await buildPrediction(event, api, meta, { trustSource: true });
    expect(m.confidence).toBe("low");
  });

  it("valor não-finito rejeitado", async () => {
    await expect(
      buildPrediction(event, { ...api, probHome: NaN }, meta, { trustSource: true }),
    ).rejects.toThrow();
  });

  it.each([
    ["cancelled", "scheduled"],
    ["postponed", "scheduled"],
  ] as const)("status %s não resolve como final (%s)", async (raw, expected) => {
    const m = await buildPrediction({ ...event, status: raw as FootballEvent["status"] }, api, meta, { trustSource: true });
    expect(m.status).toBe(expected);
  });

  it("ao vivo marca kind live", async () => {
    const m = await buildPrediction({ ...event, status: "live" }, api, meta, {
      trustSource: true,
    });
    expect(m.predictionKind).toBe("live");
  });
});

describe("buildPrediction local", () => {
  it("fonte local sem histórico", async () => {
    const m = await buildPrediction(event, api, meta);
    expect(m.predictionSource).toBe("local");
    expect(m.predictionKind).toBe("pre");
  });

  it("sem dados joga erro explícito", async () => {
    await expect(buildPrediction(event, undefined, meta)).rejects.toThrow();
  });
});
