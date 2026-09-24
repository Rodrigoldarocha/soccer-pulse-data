import { describe, expect, it } from "vitest";
import { eventOddsToMatchOdds, emptyMatchOdds, hasAnyOdd, getOddsMode } from "./odds";
import { devigProportional } from "../picks/value";

describe("eventOddsToMatchOdds", () => {
  it("mapeia consenso sem inventar nulls ausentes", () => {
    const m = eventOddsToMatchOdds({
      home: 1.9,
      draw: 3.6,
      away: 4.2,
      over25: 1.85,
      btts: 1.95,
      bookmaker: "consensus",
      source: "bzzoiro",
    });
    expect(m.home).toBe(1.9);
    expect(m.btts).toBe(1.95);
    expect(m.over15).toBeNull();
    expect(m.doubleChance1X).toBeNull();
    expect(hasAnyOdd(m)).toBe(true);
  });

  it("undefined → base cheio null", () => {
    const m = eventOddsToMatchOdds(undefined);
    expect(m).toEqual(emptyMatchOdds());
    expect(hasAnyOdd(m)).toBe(false);
  });
});

describe("getOddsMode", () => {
  it("market | probability", () => {
    expect(["market", "probability"]).toContain(getOddsMode());
  });
});

describe("devig em path api", () => {
  it("soma 1", () => {
    const p = devigProportional([2, 3.5, 3.5]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });
});
