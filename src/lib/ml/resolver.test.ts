import { describe, expect, it } from "vitest";
import { outcomeForMarket } from "./resolver.server";

describe("outcomeForMarket", () => {
  it("0-0", () => {
    expect(outcomeForMarket({ market: "1X2_HOME", homeScore: 0, awayScore: 0 })).toBe(false);
    expect(outcomeForMarket({ market: "DRAW", homeScore: 0, awayScore: 0 })).toBe(true);
    expect(outcomeForMarket({ market: "1X2_AWAY", homeScore: 0, awayScore: 0 })).toBe(false);
    expect(outcomeForMarket({ market: "BTTS", homeScore: 0, awayScore: 0 })).toBe(false);
    expect(outcomeForMarket({ market: "BTTS_NO", homeScore: 0, awayScore: 0 })).toBe(true);
    expect(outcomeForMarket({ market: "OVER_2_5", homeScore: 0, awayScore: 0 })).toBe(false);
    expect(outcomeForMarket({ market: "UNDER_2_5", homeScore: 0, awayScore: 0 })).toBe(true);
    expect(outcomeForMarket({ market: "DOUBLE_CHANCE_1X", homeScore: 0, awayScore: 0 })).toBe(true);
  });

  it("3-3", () => {
    expect(outcomeForMarket({ market: "DRAW", homeScore: 3, awayScore: 3 })).toBe(true);
    expect(outcomeForMarket({ market: "BTTS", homeScore: 3, awayScore: 3 })).toBe(true);
    expect(outcomeForMarket({ market: "OVER_3_5", homeScore: 3, awayScore: 3 })).toBe(true);
    expect(outcomeForMarket({ market: "DOUBLE_CHANCE_12", homeScore: 3, awayScore: 3 })).toBe(
      false,
    );
    expect(outcomeForMarket({ market: "HOME_OVER_1_5", homeScore: 3, awayScore: 3 })).toBe(true);
  });

  it("2-1 home", () => {
    expect(outcomeForMarket({ market: "1X2_HOME", homeScore: 2, awayScore: 1 })).toBe(true);
    expect(outcomeForMarket({ market: "DOUBLE_CHANCE_X2", homeScore: 2, awayScore: 1 })).toBe(
      false,
    );
    expect(outcomeForMarket({ market: "DNB_HOME", homeScore: 2, awayScore: 1 })).toBe(true);
    expect(outcomeForMarket({ market: "AH_HOME_M1", homeScore: 2, awayScore: 1 })).toBe(false);
    expect(outcomeForMarket({ market: "AH_HOME_M1", homeScore: 3, awayScore: 1 })).toBe(true);
    expect(outcomeForMarket({ market: "AH_AWAY_P1", homeScore: 2, awayScore: 1 })).toBe(false); // push (diff=0)
    expect(outcomeForMarket({ market: "AH_AWAY_P1", homeScore: 1, awayScore: 1 })).toBe(true);
  });

  it("placar inválido → null", () => {
    expect(outcomeForMarket({ market: "DRAW", homeScore: Number.NaN, awayScore: 1 })).toBeNull();
  });
});
