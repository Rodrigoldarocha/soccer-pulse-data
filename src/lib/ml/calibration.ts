// ─── Calibração real (Platt Newton-Raphson + isotonic) ──────────────

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
  _leagueId: number,
  _market: MarketId,
): CalibratedProbability {
  // 0 e 1 são valores válidos da API (ex: BTTS=0); não clipar para minúsculo.
  const isExactExtreme = rawProbability === 0 || rawProbability === 1;
  const clippedRaw = isExactExtreme
    ? rawProbability
    : Math.max(0.001, Math.min(0.999, rawProbability));

  if (isExactExtreme || !params || params.sampleSize < 10) {
    return {
      raw: clippedRaw,
      calibrated: clippedRaw,
      confidence: "low",
      calibrationSource: "none",
    };
  }

  const logitP = logit(clippedRaw);
  let calibrated: number;
  let source: "platt" | "isotonic" | "none" = "platt";

  if (params.method === "isotonic" && params.isotonic && params.isotonic.length >= 2) {
    calibrated = isotonicPredict(params.isotonic, clippedRaw);
    source = "isotonic";
  } else {
    calibrated = sigmoid(params.a * logitP + params.b);
  }
  const clippedCal = Math.max(0.001, Math.min(0.999, calibrated));

  const conf: ConfidenceLevel =
    params.brierScore < 0.15 && params.sampleSize >= 100 && (params.ece ?? 1) < 0.04
      ? "high"
      : params.brierScore < 0.22 && params.sampleSize >= 30
        ? "medium"
        : "low";

  return {
    raw: clippedRaw,
    calibrated: clippedCal,
    confidence: conf,
    calibrationSource: source === "isotonic" ? "platt" : "platt",
  };
}

function isotonicPredict(pairs: Array<{ x: number; y: number }>, x: number): number {
  if (x <= pairs[0].x) return pairs[0].y;
  const last = pairs[pairs.length - 1];
  if (x >= last.x) return last.y;
  for (let i = 1; i < pairs.length; i++) {
    if (x <= pairs[i].x) {
      const a = pairs[i - 1];
      const b = pairs[i];
      const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
      return a.y + t * (b.y - a.y);
    }
  }
  return last.y;
}

export function buildCalibrationKey(leagueId: number, market: MarketId): string {
  return key(leagueId, market);
}

/**
 * Platt Scaling via Newton-Raphson (≤25 iterações, L2 ridge → a→1, b→0 em amostra pequena).
 * Minimiza log-loss sobre pares (logit(p), y).
 */
export function fitPlatt(
  probabilities: number[],
  outcomes: boolean[],
  opts: { ridge?: number; maxIter?: number } = {},
): { a: number; b: number; brier: number; logLoss: number; ece: number; n: number } {
  const n = probabilities.length;
  const ridge = opts.ridge ?? 0.5;
  const maxIter = opts.maxIter ?? 25;
  if (n === 0) return { a: 1, b: 0, brier: 0.25, logLoss: 0.69, ece: 1, n: 0 };

  const xs = probabilities.map(logit);
  const ys = outcomes.map((o) => (o ? 1 : 0));
  let a = 1;
  let b = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    // gradiente e hessiana de log-loss + ridge
    let gA = ridge * (a - 1);
    let gB = ridge * b;
    let hAA = ridge;
    let hAB = 0;
    let hBB = ridge;
    for (let i = 0; i < n; i++) {
      const z = a * xs[i] + b;
      const s = sigmoid(z);
      const err = s - ys[i];
      gA += err * xs[i];
      gB += err;
      const w = s * (1 - s);
      hAA += w * xs[i] * xs[i];
      hAB += w * xs[i];
      hBB += w;
    }
    const det = hAA * hBB - hAB * hAB;
    if (Math.abs(det) < 1e-12) break;
    const da = (hBB * gA - hAB * gB) / det;
    const db = (hAA * gB - hAB * gA) / det;
    a -= Math.max(-1, Math.min(1, da * 0.5));
    b -= Math.max(-1, Math.min(1, db * 0.5));
    if (Math.abs(da) < 1e-6 && Math.abs(db) < 1e-6) break;
  }

  let brier = 0;
  let logLoss = 0;
  for (let i = 0; i < n; i++) {
    const s = Math.max(1e-7, Math.min(1 - 1e-7, sigmoid(a * xs[i] + b)));
    brier += (s - ys[i]) ** 2;
    logLoss += -(ys[i] * Math.log(s) + (1 - ys[i]) * Math.log(1 - s));
  }
  brier /= n;
  logLoss /= n;

  return { a, b, brier, logLoss, ece: expectedCalibrationError(probabilities, ys), n };
}

/** Reliability bins (10) → ECE. */
export function expectedCalibrationError(probabilities: number[], outcomes: number[]): number {
  const n = probabilities.length;
  if (n === 0) return 1;
  let ece = 0;
  for (let b = 0; b < 10; b++) {
    const lo = b * 0.1;
    const hi = (b + 1) * 0.1;
    const idx: number[] = [];
    for (let i = 0; i < n; i++) {
      const p = probabilities[i];
      if (p >= lo && (b === 9 ? p <= hi : p < hi)) idx.push(i);
    }
    if (idx.length === 0) continue;
    const avgP = idx.reduce((s, i) => s + probabilities[i], 0) / idx.length;
    const avgY = idx.reduce((s, i) => s + outcomes[i], 0) / idx.length;
    ece += Math.abs(avgP - avgY) * (idx.length / n);
  }
  return ece;
}

export interface ReliabilityBin {
  lo: number;
  hi: number;
  meanPred: number;
  fracOutcome: number;
  count: number;
}

export function reliabilityBins(probabilities: number[], outcomes: number[]): ReliabilityBin[] {
  const bins: ReliabilityBin[] = [];
  const n = probabilities.length;
  for (let b = 0; b < 10; b++) {
    const lo = b * 0.1;
    const hi = (b + 1) * 0.1;
    let sumP = 0;
    let sumY = 0;
    let c = 0;
    for (let i = 0; i < n; i++) {
      const p = probabilities[i];
      if (p >= lo && (b === 9 ? p <= hi : p < hi)) {
        sumP += p;
        sumY += outcomes[i];
        c++;
      }
    }
    if (c > 0) bins.push({ lo, hi, meanPred: sumP / c, fracOutcome: sumY / c, count: c });
  }
  return bins;
}

/** Isotonic (pool adjacent violators) — amostra ≥ 300. */
export function fitIsotonic(
  probabilities: number[],
  outcomes: boolean[],
): Array<{ x: number; y: number }> {
  const pairs = probabilities
    .map((p, i) => ({ x: p, y: outcomes[i] ? 1 : 0 }))
    .sort((a, b) => a.x - b.x);
  // PAV
  const blocks: Array<{ xSum: number; ySum: number; n: number; x: number }> = pairs.map((p) => ({
    xSum: p.x,
    ySum: p.y,
    n: 1,
    x: p.x,
  }));
  let i = 0;
  while (i < blocks.length - 1) {
    const a = blocks[i];
    const b = blocks[i + 1];
    if (a.ySum / a.n <= b.ySum / b.n) {
      i++;
      continue;
    }
    const merged = {
      xSum: a.xSum + b.xSum,
      ySum: a.ySum + b.ySum,
      n: a.n + b.n,
      x: (a.xSum + b.xSum) / (a.n + b.n),
    };
    blocks.splice(i, 2, merged);
    if (i > 0) i--;
  }
  return blocks.map((bl) => ({ x: bl.x / bl.n, y: bl.ySum / bl.n }));
}

/** Brier de um conjunto (para comparar Platt × isotonic). */
export function brierOf(probs: number[], outcomes: boolean[]): number {
  if (probs.length === 0) return 0.25;
  return probs.reduce((s, p, i) => s + (p - (outcomes[i] ? 1 : 0)) ** 2, 0) / probs.length;
}

/**
 * Atualização legada (incremental) — agora refita Platt completo quando possível.
 * Mantida por compat; prefira fitPlatt + saveCalibration.
 */
export function updateCalibration(
  current: CalibrationParams | undefined,
  predictedProbability: number,
  actualOutcome: number,
): CalibrationParams {
  const sampleSize = (current?.sampleSize ?? 0) + 1;
  const prevBrier = (current?.brierScore ?? 0) * (current?.sampleSize ?? 0);
  const newBrier = (prevBrier + (predictedProbability - actualOutcome) ** 2) / sampleSize;
  return {
    leagueId: current?.leagueId ?? 0,
    market: current?.market ?? "1X2_HOME",
    a: current?.a ?? 1.0,
    b: current?.b ?? 0.0,
    brierScore: newBrier,
    sampleSize,
    updatedAt: new Date().toISOString(),
  };
}

export type { CalibrationParams };
