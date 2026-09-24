import { describe, expect, it } from "vitest";
import {
  evaluateValue,
  fairOdds,
  fairMarketProbability,
  devigProportional,
  devigPower,
  kellyFraction,
} from "./value";

describe("fairOdds", () => {
  it("é 1/p sem margem", () => {
    expect(fairOdds(0.5)).toBe(2);
    expect(fairOdds(0.25)).toBe(4);
    expect(fairOdds(0.8)).toBe(1.25);
  });
});

describe("devig", () => {
  it("soma 1 (proporcional)", () => {
    const p = devigProportional([2.0, 3.5, 3.5]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });

  it("soma 1 (potência 2 vias)", () => {
    const p = devigPower([1.9, 2.0]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });
});

describe("fairMarketProbability", () => {
  it("com lista deviga para prob justa", () => {
    const list = [1.9, 4.0, 4.0];
    const fp = fairMarketProbability(1.9, list);
    expect(fp).toBeGreaterThan(0.4);
    expect(fp).toBeLessThan(0.7);
    expect(fp).toBeLessThan(1 / 1.9); // remove margem
  });

  it("sem lista usa implícita simples", () => {
    expect(fairMarketProbability(2.0)).toBeCloseTo(0.5, 5);
  });
});

describe("kelly", () => {
  it("(p*o-1)/(o-1)", () => {
    // p=0.6 o=2 → (1.2-1)/1 = 0.2
    expect(kellyFraction(0.6, 2.0, 1)).toBeCloseTo(0.2, 5);
  });
  it("nunca negativo", () => {
    expect(kellyFraction(0.3, 1.5, 1)).toBe(0);
  });
});

describe("evaluateValue", () => {
  it("EV positivo com edge e confiança → isValue", () => {
    const r = evaluateValue({
      p: 0.5,
      odd: 2.3,
      marketOdds: [2.3, 3.4, 3.2],
      confidence: "medium",
      modelDelta: 0.05,
    });
    // p*o-1 = 0.15 > 0.04
    expect(r.ev).toBeCloseTo(0.15, 5);
    expect(r.isValue).toBe(true);
    expect(r.quarterKelly).toBeGreaterThan(0);
  });

  it("nunca recomenda EV ≤ 0", () => {
    const r = evaluateValue({ p: 0.3, odd: 2.5, confidence: "high", modelDelta: 0.02 });
    // 0.3*2.5-1 = -0.25
    expect(r.ev).toBeLessThan(0);
    expect(r.isValue).toBe(false);
  });

  it("sem odd → sem_odd", () => {
    const r = evaluateValue({ p: 0.5, odd: null });
    expect(r.isValue).toBe(false);
    expect(r.skipReason).toBe("sem_odd");
  });

  it("modelos divergem → rejeita", () => {
    const r = evaluateValue({
      p: 0.55,
      odd: 2.2,
      confidence: "high",
      modelDelta: 0.2,
    });
    expect(r.isValue).toBe(false);
    expect(r.skipReason).toBe("modelos_divergem");
  });

  it("confiança baixa → rejeita mesmo com EV", () => {
    const r = evaluateValue({ p: 0.55, odd: 2.2, confidence: "low", modelDelta: 0.01 });
    expect(r.isValue).toBe(false);
  });

  it("odd < 1.25 descartada (armadilha)", () => {
    const r = evaluateValue({ p: 0.9, odd: 1.1, confidence: "high", modelDelta: 0 });
    expect(r.skipReason).toBe("odd_baixa");
  });
});
