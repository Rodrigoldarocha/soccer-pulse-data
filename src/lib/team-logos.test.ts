import { describe, expect, it } from "vitest";
import { applyLogos, buildLogoMap, findLogo } from "./team-logos";
import type { EspnEvent } from "./api/espn";
import type { MatchPrediction } from "./types";

function espnEvent(home: string, away: string): EspnEvent {
  const team = (name: string) => ({
    id: name,
    name,
    short: name.slice(0, 3).toUpperCase(),
    logo: `https://logo.test/${encodeURIComponent(name)}.png`,
  });
  return {
    id: "e1",
    date: "2026-09-09T19:00:00Z",
    name: `${home} vs ${away}`,
    shortName: `${home} vs ${away}`,
    league: "bra.1",
    leagueName: "Brasileirão Série A",
    status: "scheduled",
    clock: "",
    homeTeam: team(home),
    awayTeam: team(away),
    venue: "",
  };
}

function match(
  home: string,
  away: string,
  status: MatchPrediction["status"] = "scheduled",
): MatchPrediction {
  const team = (name: string) => ({
    name,
    short: name.slice(0, 3).toUpperCase(),
    logo: "⚽",
    xg: 1.5,
    xga: 1.2,
  });
  return {
    id: "m1",
    league: "brasileirao",
    leagueLabel: "Brasileirão",
    kickoff: "2026-09-09T19:00:00-03:00",
    status,
    home: team(home),
    away: team(away),
    probabilities: { home: 0.5, draw: 0.25, away: 0.25, over25: 0.5, btts: 0.5 },
    odds: { home: 2, draw: 3, away: 4, over25: 2, btts: 2, doubleChance1X: 1.3 },
    oddsUpdatedAt: new Date().toISOString(),
    suggestedMarket: "1X2_HOME",
    suggestedProbability: 0.5,
    suggestedOdds: 2,
    suggestedLabel: "Vitória",
    confidence: "medium",
  };
}

describe("buildLogoMap", () => {
  it("indexa mandante e visitante por nome normalizado", () => {
    const map = buildLogoMap([espnEvent("Flamengo", "Palmeiras")]);
    expect(map.get("flamengo")).toContain("logo.test");
    expect(map.get("palmeiras")).toContain("logo.test");
  });
});

describe("findLogo", () => {
  const map = buildLogoMap([espnEvent("Athletico-PR", "Coritiba")]);

  it("casa exato ignorando acento/caixa", () => {
    expect(findLogo("ATHLETICO-PR", map)).toContain("Athletico-PR");
  });

  it("casa parcial (nome curto da API vs nome completo)", () => {
    expect(findLogo("Athletico Paranaense", map)).toContain("Athletico-PR");
  });

  it("sem match retorna null", () => {
    expect(findLogo("Time Inexistente FC", map)).toBeNull();
  });
});

describe("applyLogos", () => {
  it("aplica escudo e mantém ⚽ quando sem match", () => {
    const map = buildLogoMap([espnEvent("Flamengo", "Palmeiras")]);
    const [out] = applyLogos([match("Flamengo", "Time Inexistente FC")], map);
    expect(out.home.logo).toContain("logo.test");
    expect(out.away.logo).toBe("⚽");
  });

  it("não altera probabilidades nem status", () => {
    const map = buildLogoMap([espnEvent("Flamengo", "Palmeiras")]);
    const [out] = applyLogos([match("Flamengo", "Palmeiras", "live")], map);
    expect(out.probabilities).toEqual({
      home: 0.5,
      draw: 0.25,
      away: 0.25,
      over25: 0.5,
      btts: 0.5,
    });
    expect(out.status).toBe("live");
  });
});
