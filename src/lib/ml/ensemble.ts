// ─── Ensemble 3-vias: API + Dixon-Coles + mercado (devig) ────────────
// Pesos aprendidos por Brier; prior 0.45/0.35/0.20 com n < 30.

import type { CalibratedProbability, EnsembleWeights } from "./types";

export interface EnsembleSources {
  /** Previsão oficial da API (dc-blend/CatBoost) */
  api?: number | null;
  /** Dixon-Coles próprio */
  dc?: number | null;
  /** Probabilidade implícita de mercado devig */
  market?: number | null;
}

export interface EnsembleWeights3 {
  wApi: number;
  wDc: number;
  wMarket: number;
  sampleSize: number;
}

export const DEFAULT_ENSEMBLE3: EnsembleWeights3 = {
  wApi: 0.45,
  wDc: 0.35,
  wMarket: 0.2,
  sampleSize: 0,
};

/** Pesos por Brier do blend (quanto menor Brier, maior o peso do vencedor dominante). */
export function ensembleWeightsFromBrier(brier: number, n: number): EnsembleWeights3 {
  if (n < 30) return { ...DEFAULT_ENSEMBLE3, sampleSize: n };
  const quality = 1 - Math.max(0.08, Math.min(0.35, brier)) / 0.35; // 0..0.77
  const wApi = Math.min(0.7, 0.4 + 0.3 * quality);
  const rest = 1 - wApi;
  const wDc = rest * 0.6;
  const wMarket = rest * 0.4;
  return {
    wApi: +wApi.toFixed(3),
    wDc: +wDc.toFixed(3),
    wMarket: +wMarket.toFixed(3),
    sampleSize: n,
  };
}

export interface EnsembleResult {
  probability: number;
  sources: { api: boolean; dc: boolean; market: boolean };
  /** |p_api − p_dc| quando ambos existem */
  delta: number;
  weights: EnsembleWeights3;
}

export function blendEnsemble(
  src: EnsembleSources,
  weights: EnsembleWeights3 = DEFAULT_ENSEMBLE3,
): EnsembleResult | null {
  const parts: Array<{ p: number; w: number; k: keyof EnsembleSources }> = [];
  if (src.api != null && Number.isFinite(src.api))
    parts.push({ p: src.api, w: weights.wApi, k: "api" });
  if (src.dc != null && Number.isFinite(src.dc)) parts.push({ p: src.dc, w: weights.wDc, k: "dc" });
  if (src.market != null && Number.isFinite(src.market))
    parts.push({ p: src.market, w: weights.wMarket, k: "market" });
  if (parts.length === 0) return null;

  const wSum = parts.reduce((s, x) => s + x.w, 0);
  let p = 0;
  for (const x of parts) p += (x.p * x.w) / wSum;
  p = Math.max(0.001, Math.min(0.999, p));

  const delta = src.api != null && src.dc != null ? Math.abs(src.api - src.dc) : 0;

  return {
    probability: +p.toFixed(4),
    sources: {
      api: src.api != null,
      dc: src.dc != null,
      market: src.market != null,
    },
    delta,
    weights,
  };
}

/**
 * Confiança honesta: concordância + amostra calibrada + ECE + incerteza.
 * Rótulos documentados em confidenceReason.
 */
export function honestConfidence(input: {
  delta: number;
  sampleSize: number;
  ece?: number;
  matrixUncertainty?: number;
}): { level: "low" | "medium" | "high"; reason: string } {
  const { delta, sampleSize, ece = 1, matrixUncertainty = 0 } = input;
  const modelsAgree = delta < 0.07;
  const modelsOk = delta < 0.15;

  if (sampleSize >= 100 && ece < 0.04 && modelsAgree && matrixUncertainty < 0.05) {
    return {
      level: "high",
      reason: `Alta: ${sampleSize} jogos calibrados, erro ${(ece * 100).toFixed(1)}%, modelos concordam (Δ ${(delta * 100).toFixed(1)} p.p.)`,
    };
  }
  if (sampleSize >= 30 && modelsOk) {
    return {
      level: "medium",
      reason: `Média: ${sampleSize} amostras, Δ ${(delta * 100).toFixed(1)} p.p. entre modelos`,
    };
  }
  if (modelsAgree && sampleSize < 30) {
    return {
      level: "medium",
      reason: `Média: modelos concordam (Δ ${(delta * 100).toFixed(1)} p.p.), amostra calibrada ${sampleSize} (<30)`,
    };
  }
  if (!modelsOk) {
    return {
      level: "low",
      reason: `Baixa: modelos divergem (Δ ${(delta * 100).toFixed(1)} p.p.)`,
    };
  }
  return {
    level: "low",
    reason: `Baixa: pouca calibração (${sampleSize} amostras)`,
  };
}

// ─── Compat legado (pipeline antigo 2 vias) ──────────────────────────

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

export function getEnsembleWeights(stored: EnsembleWeights | undefined): EnsembleWeights {
  if (!stored || stored.sampleSize < 20) return DEFAULT_ENSEMBLE;
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
): { probability: number; modelContrib: number; poissonContrib: number } {
  const p =
    weights.modelWeight * calibrated.calibrated + weights.poissonWeight * poissonProbability;
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
  if (calibrated.calibrationSource === "none" && weights.sampleSize < 10) return "low";
  const agreement = 1 - Math.abs(calibrated.calibrated - ensProb);
  const fromAgreement =
    agreement > 0.85 ? ("high" as const) : agreement > 0.7 ? ("medium" as const) : ("low" as const);
  if (calibrated.confidence === "high" && fromAgreement === "high") return "high";
  if (calibrated.confidence === "low" && fromAgreement === "low") return "low";
  return "medium";
}
