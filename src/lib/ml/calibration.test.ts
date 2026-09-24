import { describe, expect, it } from "vitest";
import {
  fitPlatt,
  calibrateProbability,
  expectedCalibrationError,
  fitIsotonic,
  brierOf,
} from "./calibration";
import type { CalibrationParams } from "./types";

describe("fitPlatt", () => {
  it("reduz Brier em dataset sintético descalibrado", () => {
    // modelo superestima: perto de 0.7 mas y com taxa 0.4
    const probs: number[] = [];
    const outs: boolean[] = [];
    for (let i = 0; i < 200; i++) {
      const p = 0.55 + (i % 20) * 0.01; // 0.55..0.74
      probs.push(p);
      outs.push(i % 5 < 2); // ~40% positivos
    }
    const before = brierOf(probs, outs);
    const fit = fitPlatt(probs, outs);
    const after = brierOf(
      probs.map((p) => {
        const z = fit.a * Math.log(p / (1 - p)) + fit.b;
        return 1 / (1 + Math.exp(-z));
      }),
      outs,
    );
    expect(after).toBeLessThanOrEqual(before + 1e-6);
    expect(fit.n).toBe(200);
  });

  it("com poucos dados ridge mantém a perto de 1", () => {
    const fit = fitPlatt([0.6, 0.7], [true, false], { ridge: 5, maxIter: 5 });
    expect(Math.abs(fit.a - 1)).toBeLessThan(2);
  });
});

describe("calibrateProbability", () => {
  it("sem params (n<10) retorna raw", () => {
    const r = calibrateProbability(0.6, undefined, 1, "1X2_HOME");
    expect(r.calibrated).toBeCloseTo(0.6, 3);
    expect(r.calibrationSource).toBe("none");
  });

  it("com params Platt aplica sigmoid(a*logit+b)", () => {
    const params: CalibrationParams = {
      leagueId: 1,
      market: "1X2_HOME",
      a: 1.2,
      b: -0.3,
      brierScore: 0.18,
      sampleSize: 80,
      updatedAt: new Date().toISOString(),
    };
    const r = calibrateProbability(0.7, params, 1, "1X2_HOME");
    expect(r.calibrationSource).toBe("platt");
    expect(r.calibrated).not.toBeCloseTo(0.7, 3);
  });

  it("identidade com a=1 b=0", () => {
    const params: CalibrationParams = {
      leagueId: 1,
      market: "DRAW",
      a: 1,
      b: 0,
      brierScore: 0.2,
      sampleSize: 50,
      updatedAt: new Date().toISOString(),
    };
    const r = calibrateProbability(0.4, params, 1, "DRAW");
    expect(r.calibrated).toBeCloseTo(0.4, 3);
  });
});

describe("isotonic", () => {
  it("monótono e Brier não piora que identidade", () => {
    const probs = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.2, 0.3, 0.8];
    const outs = [false, false, true, false, true, true, false, true, true, false, true, true];
    const pts = fitIsotonic(probs, outs);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].y).toBeGreaterThanOrEqual(pts[i - 1].y - 1e-9);
    }
    expect(pts.length).toBeGreaterThan(0);
  });
});

describe("ECE", () => {
  it("perfeito → 0", () => {
    expect(expectedCalibrationError([0.5, 0.5], [1, 0])).toBeCloseTo(0, 5);
  });
});
