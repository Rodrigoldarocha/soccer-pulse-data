import { describe, expect, it } from "vitest";
import {
  isContradictory,
  combinedProbability,
  buildParlay,
  copyParlayText,
  type ParlayProfile,
} from "./parlays";
import type { Pick } from "./singles";

function pick(over: Partial<Pick>): Pick {
  return {
    eventId: "1",
    homeTeam: "Fla",
    awayTeam: "Pal",
    league: "brasileirao",
    leagueLabel: "Brasileirão",
    kickoff: "2026-09-23T19:00:00-03:00",
    market: "1X2_HOME",
    selectionLabel: "Vitória Fla",
    p: 0.55,
    odd: 2.1,
    bookmaker: "consensus",
    fairOdds: 1.82,
    fairMarketP: 0.48,
    EV: 0.15,
    edge: 0.07,
    kelly: 0.04,
    stakeUnits: 1,
    confidence: "medium",
    reason: ["EV positivo"],
    risk: "médio",
    sources: { api: true, dc: true, market: true },
    ...over,
  };
}

describe("isContradictory", () => {
  it("bloqueia 1X2 casa + fora no mesmo jogo", () => {
    const a = pick({ eventId: "1", market: "1X2_HOME" });
    const b = pick({ eventId: "1", market: "1X2_AWAY" });
    expect(isContradictory(a, b)).toBe(true);
  });

  it("bloqueia BTTS sim + não", () => {
    expect(
      isContradictory(
        pick({ eventId: "1", market: "BTTS" }),
        pick({ eventId: "1", market: "BTTS_NO" }),
      ),
    ).toBe(true);
  });

  it("jogos diferentes não conflitam", () => {
    expect(
      isContradictory(
        pick({ eventId: "1", market: "1X2_HOME" }),
        pick({ eventId: "2", market: "1X2_AWAY" }),
      ),
    ).toBe(false);
  });
});

describe("combinedProbability", () => {
  it("jogos distintos → produto × 0.98^(n-1)", () => {
    const legs = [pick({ eventId: "1", p: 0.6 }), pick({ eventId: "2", p: 0.5 })];
    const { p } = combinedProbability(legs, new Map());
    expect(p).toBeCloseTo(0.6 * 0.5 * 0.98, 5);
  });

  it("sem matriz usa produto dos legs do grupo", () => {
    const legs = [
      pick({ eventId: "1", p: 0.7 }),
      pick({ eventId: "1", market: "OVER_2_5", p: 0.55 }),
    ];
    const { usedMatrix, p } = combinedProbability(legs, new Map());
    expect(usedMatrix).toBe(false);
    expect(p).toBeCloseTo(0.7 * 0.55 * 0.98, 5);
  });
});

describe("buildParlay", () => {
  // segura: odd 2.0–3.0, p≥0.35, 2 legs — p*0.98 ≥ 0.35
  const legs2 = [
    pick({ eventId: "1", p: 0.7, odd: 2.0, EV: 0.4, market: "1X2_HOME" }),
    pick({ eventId: "2", p: 0.55, odd: 1.4, EV: 0.1, market: "BTTS", league: "premier-league" }),
  ];

  it("2 pernas perfil segura ok", () => {
    const pl = buildParlay(legs2, "segura", new Map());
    expect(pl).not.toBeNull();
    expect(pl!.legs).toHaveLength(2);
    expect(pl!.oddTotal).toBeCloseTo(2.8, 5);
    expect(pl!.EV).toBeGreaterThan(0);
    expect(pl!.risk).toBe("baixo");
  });

  it("1 perna → null", () => {
    expect(buildParlay([legs2[0]], "segura", new Map())).toBeNull();
  });

  it("mesmo jogo (2 legs) → null (máx 1/jogo)", () => {
    const same = [legs2[0], { ...legs2[1], eventId: "1" }];
    expect(buildParlay(same, "segura", new Map())).toBeNull();
  });

  it("EV ≤ 0 → null", () => {
    const dead = [
      pick({ eventId: "1", p: 0.3, odd: 1.5, EV: -0.1 }),
      pick({ eventId: "2", p: 0.3, odd: 1.5, EV: -0.1, league: "premier-league" }),
    ];
    expect(buildParlay(dead, "segura", new Map())).toBeNull();
  });

  it("ousada exige 3+ pernas", () => {
    expect(buildParlay(legs2, "ousada" as ParlayProfile, new Map())).toBeNull();
  });
});

describe("copyParlayText", () => {
  it("inclui disclaimer +18", () => {
    const legs = [
      pick({ eventId: "1", p: 0.7, odd: 2.0, EV: 0.4, market: "1X2_HOME" }),
      pick({ eventId: "2", p: 0.55, odd: 1.4, EV: 0.1, market: "BTTS", league: "premier-league" }),
    ];
    const pl = buildParlay(legs, "segura", new Map());
    expect(pl).not.toBeNull();
    const text = copyParlayText(pl!);
    expect(text).toContain("+18");
    expect(text).toContain("Jogue com responsabilidade");
    expect(text).toContain("Odd total");
  });
});
