import type { CalibratedProbability, EnsembleWeights } from "./types";

const DEFAULT_ENSEMBLE: EnsembleWeights = {
  modelWeight: 0.7,
  poissonWeight: 0.3,
  brierScore: 0.25,
  sampleSize: 0,
};

function computeBrierWeight(brierScore: number): number {
  const clamped = Math.max(0.08, Math.min(0.35, brierScore));
  return 1 - (clamped - 0.08) / 0.27;
}

export function getEnsembleWeights(
  stored: EnsembleWeights | undefined,
): EnsembleWeights {
  if (!stored || stored.sampleSize < 20) {
    return DEFAULT_ENSEMBLE;
  }
  const brierWeight = computeBrierWeight(stored.brierScore);
  const mw = 0.4 + 0.5 * brierWeight;
  return {
    modelWeight: +mw.toFixed(3),
    poissonWeight: +(1 - mw).toFixed(3),
    brierScore: stored.brierScore,
    sampleSize: stored.sampleSize,
  };
}

export function ensembleProbability(
  calibrated: CalibratedProbability,
  poissonProbability: number,
  weights: EnsembleWeights,
): {
  probability: number;
  modelContrib: number;
  poissonContrib: number;
} {
  const p =
    weights.modelWeight * calibrated.calibrated +
    weights.poissonWeight * poissonProbability;

  return {
    probability: +Math.max(0.001, Math.min(0.999, p)).toFixed(4),
    modelContrib: +weights.modelWeight.toFixed(3),
    poissonContrib: +weights.poissonWeight.toFixed(3),
  };
}

export function computeEnsembleConfidence(
  calibrated: CalibratedProbability,
  ensProb: number,
  weights: EnsembleWeights,
): "low" | "medium" | "high" {
  if (calibrated.calibrationSource === "none" && weights.sampleSize < 10) {
    return "low";
  }

  const agreement = 1 - Math.abs(calibrated.calibrated - ensProb);
  const confidenceFromAgreement =
    agreement > 0.85 ? "high" as const : agreement > 0.7 ? "medium" as const : "low" as const;

  if (calibrated.confidence === "high" && confidenceFromAgreement === "high") return "high";
  if (calibrated.confidence === "low" && confidenceFromAgreement === "low") return "low";
  return "medium";
}
