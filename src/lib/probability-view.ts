import type { MatchPrediction } from "./types";

// ─── Visão de probabilidades (somente leitura) ────────────────────────────
// O prediction engine calcula UM lado dos mercados binários (BTTS = P(SIM),
// OVER_2_5 = P(OVER)) e calibra cada mercado de forma independente.
// Não existe P(NÃO) / P(UNDER) independente no modelo: o outro lado é o
// complemento matemático, P(outro) = 1 - P(um). Por isso o complemento é
// derivado aqui, na camada de visualização — sem tocar no motor.

export type ProbLevel = "strong" | "moderate" | "neutral";

export interface ProbRow {
  label: string;
  /** Probabilidade 0..1 (clampada). */
  p: number;
  /** Texto exibido, ex: "72%". */
  pct: string;
  level: ProbLevel;
}

export interface ProbGroups {
  btts: [ProbRow, ProbRow];
  x12: [ProbRow, ProbRow, ProbRow];
  overUnder: [ProbRow, ProbRow];
}

export function clamp01(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(1, Math.max(0, p));
}

/** Formato único da UI: inteiro + "%" (ex: "72%"). */
export function fmtPct(p: number): string {
  return `${Math.round(clamp01(p) * 100)}%`;
}

/** Hierarquia visual — NÃO é recomendação de aposta. */
export function probLevel(p: number): ProbLevel {
  const c = clamp01(p);
  if (c >= 0.65) return "strong";
  if (c >= 0.5) return "moderate";
  return "neutral";
}

function row(label: string, p: number): ProbRow {
  const c = clamp01(p);
  return { label, p: c, pct: fmtPct(c), level: probLevel(c) };
}

export function probGroupsFor(m: MatchPrediction): ProbGroups {
  const pr = m.probabilities;
  return {
    btts: [row("SIM", pr.btts), row("NÃO", 1 - pr.btts)],
    x12: [row("CASA", pr.home), row("EMPATE", pr.draw), row("FORA", pr.away)],
    overUnder: [row("OVER 2.5", pr.over25), row("UNDER 2.5", 1 - pr.over25)],
  };
}

/** Soma 1X2 — deve dar ≈ 1. Util para invariantes de teste/debug. */
export function x12Sum(m: MatchPrediction): number {
  return m.probabilities.home + m.probabilities.draw + m.probabilities.away;
}
