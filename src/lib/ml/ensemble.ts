// ─── Ensemble 3-vias: API + Dixon-Coles + mercado (devig) ────────────
// Pesos aprendidos por Brier/log-loss; prior 0.45/0.35/0.20 com n < 30.

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
  const quality = 1 - Math.max(0.08, Math.min(0.35, brier)) / 0.35;
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
 * Q4 — aprende pesos (wApi, wDc, wMarket) por grid que minimiza log-loss
 * sobre amostras resolvidas. n < 30 → prior.
 */
export function fitEnsembleWeights(
  samples: Array<{ api: number | null; dc: number | null; market: number | null; y: 0 | 1 }>,
): EnsembleWeights3 {
  const n = samples.length;
  if (n < 30) return { ...DEFAULT_ENSEMBLE3, sampleSize: n };

  const logLoss = (wa: number, wd: number, wm: number) => {
    let sum = 0;
    let used = 0;
    for (const s of samples) {
      const parts: Array<{ p: number; w: number }> = [];
      if (s.api != null && Number.isFinite(s.api)) parts.push({ p: s.api, w: wa });
      if (s.dc != null && Number.isFinite(s.dc)) parts.push({ p: s.dc, w: wd });
      if (s.market != null && Number.isFinite(s.market)) parts.push({ p: s.market, w: wm });
      if (!parts.length) continue;
      const wSum = parts.reduce((a, x) => a + x.w, 0);
      if (wSum <= 0) continue;
      let p = 0;
      for (const x of parts) p += (x.p * x.w) / wSum;
      p = Math.max(1e-6, Math.min(1 - 1e-6, p));
      sum += -(s.y * Math.log(p) + (1 - s.y) * Math.log(1 - p));
      used++;
    }
    return used > 0 ? sum / used : Infinity;
  };

  let best = {
    wa: DEFAULT_ENSEMBLE3.wApi,
    wd: DEFAULT_ENSEMBLE3.wDc,
    wm: DEFAULT_ENSEMBLE3.wMarket,
    ll: Infinity,
  };
  const step = 0.05;
  for (let wa = 0; wa <= 1.0001; wa += step) {
    for (let wd = 0; wd <= 1.0001 - wa; wd += step) {
      const wm = 1 - wa - wd;
      if (wm < -0.0001) continue;
      const ll = logLoss(wa, wd, Math.max(0, wm));
      if (ll < best.ll) best = { wa, wd, wm: Math.max(0, wm), ll };
    }
  }
  return {
    wApi: +best.wa.toFixed(3),
    wDc: +best.wd.toFixed(3),
    wMarket: +best.wm.toFixed(3),
    sampleSize: n,
  };
}

/**
 * Confiança honesta: concordância + amostra calibrada + ECE + incerteza.
 * Q3: pooling hierárquico — sampleSize pode ser max(liga, global×0.5).
 * Média quando modelos concordam sem exigir 100 de amostra se dcReliable.
 */
export function honestConfidence(input: {
  delta: number;
  sampleSize: number;
  ece?: number;
  matrixUncertainty?: number;
  dcReliable?: boolean;
  modelsAgreeOverride?: boolean;
}): { level: "low" | "medium" | "high"; reason: string } {
  const { delta, sampleSize, ece = 1, matrixUncertainty = 0, dcReliable = false } = input;
  const modelsAgree = input.modelsAgreeOverride ?? delta < 0.07;
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
  if (modelsAgree && (sampleSize < 30 || dcReliable)) {
    const why = dcReliable
      ? `modelos concordam (Δ ${(delta * 100).toFixed(1)} p.p.), DC confiável ≥5 jogos`
      : `modelos concordam (Δ ${(delta * 100).toFixed(1)} p.p.), amostra calibrada ${sampleSize} (<30)`;
    return { level: "medium", reason: `Média: ${why}` };
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
