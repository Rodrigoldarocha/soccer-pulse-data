// ─── Medição honesta: ROI, drawdown, CLV, Wilson ────────────────────

import type { BaselineRow, LedgerRow, PerformanceSummary } from "./types";

export const MIN_SAMPLE = 30;

/** Wilson lower bound (95%) — reutilizado na UI. */
export function wilsonLower(p: number, n: number): number {
  if (n <= 0) return 0;
  const z = 1.96;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return Math.max(0, (c - m) / d);
}

export function wilsonInterval(p: number, n: number): { lo: number; hi: number } {
  if (n <= 0) return { lo: 0, hi: 1 };
  const z = 1.96;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { lo: Math.max(0, (c - m) / d), hi: Math.min(1, (c + m) / d) };
}

/** Lucro em unidades (flat 1u ou stake Kelly). outcome true = ganhou. */
export function pickProfitUnits(
  odd: number,
  outcome: boolean | null,
  isVoid: boolean,
  stake = 1,
): number {
  if (isVoid || outcome == null) return 0;
  if (outcome) return stake * (odd - 1);
  return -stake;
}

export function maxDrawdown(curve: number[]): number {
  let peak = curve[0] ?? 0;
  let maxDd = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    const dd = peak - v;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

/** CLV = odd_pick / odd_fechamento − 1 (positivo = boa entrada). */
export function clv(oddAtPick: number, closingOdd: number | null): number | null {
  if (closingOdd == null || closingOdd <= 1 || oddAtPick <= 1) return null;
  return oddAtPick / closingOdd - 1;
}

export function summarizeLedger(rows: LedgerRow[]): PerformanceSummary {
  const resolvedRows = rows.filter((r) => !r.void && r.outcome != null);
  const wins = resolvedRows.filter((r) => r.outcome).length;
  const losses = resolvedRows.length - wins;
  const voids = rows.filter((r) => r.void || r.outcome == null).length;
  const n = resolvedRows.length;

  let profit = 0;
  let profitKelly = 0;
  const curve: number[] = [0];
  const clvs: number[] = [];

  for (const r of rows) {
    const stake = r.stakeUnits ?? 1;
    if (!r.void && r.outcome != null) {
      const flat = pickProfitUnits(r.oddAtPick, r.outcome, false, 1);
      const kelly = pickProfitUnits(r.oddAtPick, r.outcome, false, Math.max(0.01, stake));
      profit += flat;
      profitKelly += kelly;
      curve.push(curve[curve.length - 1] + flat);
      const c = clv(r.oddAtPick, r.closingOdd);
      if (c != null) clvs.push(c);
    }
  }

  const hitRate = n > 0 ? wins / n : 0;
  const roiFlat = n > 0 ? profit / n : 0;
  const roiKelly = n > 0 ? profitKelly / Math.max(1, rows.length) : 0;
  const clvAvg = clvs.length > 0 ? clvs.reduce((a, b) => a + b, 0) / clvs.length : null;
  let clvCiLow: number | null = null;
  let clvCiHigh: number | null = null;
  if (clvs.length >= 2) {
    const mean = clvAvg!;
    const sd = Math.sqrt(clvs.reduce((s, x) => s + (x - mean) ** 2, 0) / (clvs.length - 1));
    const se = sd / Math.sqrt(clvs.length);
    clvCiLow = mean - 1.96 * se;
    clvCiHigh = mean + 1.96 * se;
  }

  return {
    resolved: n,
    wins,
    losses,
    voids,
    hitRate,
    roiFlat,
    roiKelly,
    profitUnits: profit,
    maxDrawdown: maxDrawdown(curve),
    clvAvg,
    clvN: clvs.length,
    clvCiLow,
    clvCiHigh,
    wilsonLower: wilsonLower(hitRate, n),
    insufficientSample: n < MIN_SAMPLE,
  };
}

/** Baselines toscos para comparação honesta (flat 1u). */
export function computeBaselines(rows: LedgerRow[]): BaselineRow[] {
  const resolved = rows.filter((r) => !r.void && r.outcome != null);
  const mk = (name: string, pred: (r: LedgerRow) => boolean): BaselineRow => {
    let wins = 0;
    let profit = 0;
    for (const r of resolved) {
      const win = pred(r);
      if (win) {
        wins++;
        profit += r.oddAtPick - 1;
      } else {
        profit -= 1;
      }
    }
    const n = resolved.length;
    return {
      name,
      resolved: n,
      hitRate: n ? wins / n : 0,
      roiFlat: n ? profit / n : 0,
      profitUnits: profit,
    };
  };

  return [
    mk("Sempre favorito (p≥0.5)", (r) => r.probability >= 0.5),
    mk("Sempre Over 2.5", (r) => r.market === "OVER_2_5"),
    mk("Sempre BTTS", (r) => r.market === "BTTS"),
    mk("Aleatória (mesma odd média)", (r) => r.probability >= 0.45),
  ];
}

export function groupBy<T, K extends string>(rows: T[], keyFn: (r: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = keyFn(r);
    const arr = m.get(k) ?? [];
    arr.push(r);
    m.set(k, arr);
  }
  return m;
}
