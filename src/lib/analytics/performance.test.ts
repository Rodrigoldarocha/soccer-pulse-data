import { describe, expect, it } from "vitest";
import {
  summarizeLedger,
  computeBaselines,
  pickProfitUnits,
  clv,
  wilsonLower,
  maxDrawdown,
} from "./performance";
import type { LedgerRow } from "./types";

function row(over: Partial<LedgerRow>): LedgerRow {
  return {
    id: 1,
    pickKind: "single",
    parlayId: null,
    eventId: 1,
    leagueId: 41,
    market: "1X2_HOME",
    selection: "Home",
    probability: 0.55,
    oddAtPick: 2.0,
    closingOdd: 1.9,
    ev: 0.1,
    edge: 0.05,
    stakeUnits: 1,
    confidence: "medium",
    modelVersion: "v2",
    outcome: true,
    void: false,
    createdAt: "2026-09-01",
    resolvedAt: "2026-09-02",
    ...over,
  };
}

describe("summarizeLedger", () => {
  it("ROI flat = profit/n, hit rate correto", () => {
    const rows = [
      row({ id: 1, outcome: true, oddAtPick: 2.0 }), // +1
      row({ id: 2, outcome: false, oddAtPick: 2.0 }), // -1
      row({ id: 3, outcome: true, oddAtPick: 3.0 }), // +2
    ];
    const s = summarizeLedger(rows);
    expect(s.resolved).toBe(3);
    expect(s.wins).toBe(2);
    expect(s.hitRate).toBeCloseTo(2 / 3, 5);
    // +1 +(-1) +2 = 2u
    expect(s.profitUnits).toBeCloseTo(2, 5);
    expect(s.roiFlat).toBeCloseTo(2 / 3, 5);
    expect(s.insufficientSample).toBe(true);
  });

  it("void não conta", () => {
    const rows = [row({ id: 1, outcome: null, void: true }), row({ id: 2, outcome: true })];
    const s = summarizeLedger(rows);
    expect(s.resolved).toBe(1);
    expect(s.voids).toBe(1);
  });
});

describe("computeBaselines", () => {
  it("retorna 4 baselines", () => {
    const b = computeBaselines([row({})]);
    expect(b).toHaveLength(4);
    expect(b[0].name).toContain("favorito");
  });
});

describe("helpers", () => {
  it("pickProfitUnits win/loss/void", () => {
    expect(pickProfitUnits(2.0, true, false, 1)).toBe(1);
    expect(pickProfitUnits(2.0, false, false, 1)).toBe(-1);
    expect(pickProfitUnits(2.0, false, true, 1)).toBe(0);
  });

  it("clv positivo se odd caiu", () => {
    expect(clv(2.2, 1.9)).toBeCloseTo(2.2 / 1.9 - 1, 5);
    expect(clv(2.0, null)).toBeNull();
  });

  it("wilsonLower ≤ p", () => {
    expect(wilsonLower(0.6, 50)).toBeLessThan(0.6);
    expect(wilsonLower(0.6, 0)).toBe(0);
  });

  it("maxDrawdown", () => {
    expect(maxDrawdown([0, 2, 1, 0, 3])).toBe(2);
  });
});
