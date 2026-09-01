import type { MarketId } from "../types";

export interface CalibrationParams {
  leagueId: number;
  market: MarketId;
  a: number;
  b: number;
  brierScore: number;
  sampleSize: number;
  updatedAt: string;
}

export interface AccuracyMetrics {
  leagueId: number;
  leagueName: string;
  market: MarketId;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  brierScore: number;
  logLoss: number;
  avgConfidence: number;
  calibrationError: number;
  updatedAt: string;
}

export interface MlPredictionRecord {
  eventId: number;
  leagueId: number;
  market: MarketId;
  probability: number;
  odds: number;
  confidence: "low" | "medium" | "high";
  modelVersion: string;
  outcome: boolean | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface EnsembleWeights {
  modelWeight: number;
  poissonWeight: number;
  brierScore: number;
  sampleSize: number;
}

export type ConfidenceLevel = "low" | "medium" | "high";

export interface CalibratedProbability {
  raw: number;
  calibrated: number;
  confidence: ConfidenceLevel;
  calibrationSource: "platt" | "none";
}
