import type { CalibrationParams, CalibratedProbability, ConfidenceLevel } from "./types";
import type { MarketId } from "../types";

function key(leagueId: number, market: MarketId): string {
  return `${leagueId}:${market}`;
}

function logit(p: number): number {
  const clipped = Math.max(1e-7, Math.min(1 - 1e-7, p));
  return Math.log(clipped / (1 - clipped));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-700, Math.min(700, x))));
}

export function calibrateProbability(
  rawProbability: number,
  params: CalibrationParams | undefined,
  leagueId: number,
  market: MarketId,
): CalibratedProbability {
  const clippedRaw = Math.max(0.001, Math.min(0.999, rawProbability));

  if (!params || params.sampleSize < 10) {
    return { raw: clippedRaw, calibrated: clippedRaw, confidence: "low", calibrationSource: "none" };
  }

  const logitP = logit(clippedRaw);
  const calibrated = sigmoid(params.a * logitP + params.b);
  const clippedCal = Math.max(0.001, Math.min(0.999, calibrated));

  const brierThreshold = 0.15;
  const conf: ConfidenceLevel =
    params.brierScore < brierThreshold && params.sampleSize > 50
      ? "high"
      : params.brierScore < 0.22 && params.sampleSize > 20
        ? "medium"
        : "low";

  return { raw: clippedRaw, calibrated: clippedCal, confidence: conf, calibrationSource: "platt" };
}

export function buildCalibrationKey(leagueId: number, market: MarketId): string {
  return key(leagueId, market);
}

export function updateCalibration(
  current: CalibrationParams | undefined,
  predictedProbability: number,
  actualOutcome: number,
): CalibrationParams {
  const sampleSize = (current?.sampleSize ?? 0) + 1;
  const prevBrier = (current?.brierScore ?? 0) * (current?.sampleSize ?? 0);
  const newBrier = (prevBrier + (predictedProbability - actualOutcome) ** 2) / sampleSize;
  const a = current?.a ?? 1.0;
  const b = current?.b ?? 0.0;

  return {
    leagueId: current?.leagueId ?? 0,
    market: current?.market ?? "1X2_HOME",
    a,
    b,
    brierScore: newBrier,
    sampleSize,
    updatedAt: new Date().toISOString(),
  };
}
