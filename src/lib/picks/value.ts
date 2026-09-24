// ─── EV / edge / Kelly / devig ───────────────────────────────────────
// palpite de valor = p calibrada > prob implícita da odd real.
// Sem odd real → sem palpite (nunca usar 1/p como odd de mercado).

import { PICK_CONFIG, type PickConfig } from "./config";

export interface ValueInput {
  /** Probabilidade final calibrada (0..1) */
  p: number;
  /** Odd de mercado real (>1). null = sem odd */
  odd: number | null;
  /** Odds de todas as seleções do mesmo mercado 2/3-vias (para devig) */
  marketOdds?: number[];
  confidence?: "low" | "medium" | "high";
  /** |p_api − p_dc| para detectar divergência */
  modelDelta?: number;
  /** Q6: probabilidade de push em AH (stake devolvida) */
  pushProb?: number;
}

export interface ValueMetrics {
  impliedP: number;
  fairMarketP: number;
  edge: number;
  ev: number;
  kelly: number;
  quarterKelly: number;
  isValue: boolean;
  reasons: string[];
  risk: "baixo" | "médio" | "alto";
  skipReason?: string;
}

/** Odd justa do modelo (sem margem). NÃO é odd de mercado. */
export function fairOdds(p: number): number {
  const c = Math.max(0.01, Math.min(0.99, p));
  return +(1 / c).toFixed(2);
}

/** @deprecated renomeado — usava margem fake. Agora só 1/p. */
export const marginOdds = fairOdds;

/** Devig proporcional: remove overround, normaliza para soma 1. */
export function devigProportional(odds: number[]): number[] {
  const implied = odds.map((o) => (o > 1 ? 1 / o : 0));
  const s = implied.reduce((a, b) => a + b, 0);
  if (s <= 0) return implied.map(() => 0);
  return implied.map((x) => x / s);
}

/** Devig potência (Shin-ish) para 2 vias quando há vigorose alto. */
export function devigPower(odds: number[], iterations = 20): number[] {
  const implied = odds.map((o) => (o > 1 ? 1 / o : 0));
  const s = implied.reduce((a, b) => a + b, 0);
  if (s <= 1.0001) return devigProportional(odds);
  let z = 1;
  for (let i = 0; i < iterations; i++) {
    const sum = implied.reduce((acc, p) => acc + Math.pow(p, 1 / (1 + z)), 0);
    z = Math.max(0.01, Math.min(1, z + (1 - sum) * 0.1));
  }
  const raw = implied.map((p) => Math.pow(p, 1 / (1 + z)));
  const t = raw.reduce((a, b) => a + b, 0);
  return raw.map((x) => x / t);
}

/** Probabilidade justa de mercado (devig) para a odd alvo. */
export function fairMarketProbability(odd: number, marketOdds?: number[]): number {
  if (!odd || odd <= 1) return 0;
  if (marketOdds && marketOdds.filter((o) => o > 1).length >= 2) {
    const list = marketOdds.filter((o) => o > 1);
    const idx = list.indexOf(odd);
    const probs = list.length >= 3 ? devigProportional(list) : devigPower(list);
    if (idx >= 0 && probs[idx] != null) return probs[idx];
    return 1 / odd;
  }
  return 1 / odd;
}

export function kellyFraction(p: number, odd: number, fraction = 0.25): number {
  if (!odd || odd <= 1 || p <= 0) return 0;
  const full = (p * odd - 1) / (odd - 1);
  if (full <= 0) return 0;
  return Math.max(0, full * fraction);
}

export function evaluateValue(input: ValueInput, cfg: PickConfig = PICK_CONFIG): ValueMetrics {
  const { p, odd, marketOdds, confidence = "low", modelDelta = 0, pushProb } = input;
  const reasons: string[] = [];

  if (odd == null || !Number.isFinite(odd) || odd <= 1) {
    return {
      impliedP: 0,
      fairMarketP: 0,
      edge: 0,
      ev: 0,
      kelly: 0,
      quarterKelly: 0,
      isValue: false,
      reasons: [],
      risk: "alto",
      skipReason: "sem_odd",
    };
  }

  const impliedP = 1 / odd;
  const fairMarketP = fairMarketProbability(odd, marketOdds);
  const edge = p - fairMarketP;
  // Q6: EV com push — pWin*(o−1) − pLose; push devolve stake (não é loss)
  let ev: number;
  if (pushProb != null && pushProb > 0 && pushProb < 1) {
    const pLose = Math.max(0, 1 - p - pushProb);
    ev = p * (odd - 1) - pLose;
  } else {
    ev = p * odd - 1;
  }
  const kelly = kellyFraction(p, odd, 1);
  const quarterKelly = kellyFraction(p, odd, cfg.kellyFraction);

  if (modelDelta > cfg.maxModelDelta) {
    return {
      impliedP,
      fairMarketP,
      edge,
      ev,
      kelly,
      quarterKelly,
      isValue: false,
      reasons: ["Modelos divergem"],
      risk: "alto",
      skipReason: "modelos_divergem",
    };
  }
  if (odd < cfg.minOddTrap) {
    return {
      impliedP,
      fairMarketP,
      edge,
      ev,
      kelly,
      quarterKelly,
      isValue: false,
      reasons: ["Odd baixa demais"],
      risk: "médio",
      skipReason: "odd_baixa",
    };
  }
  if (odd < cfg.minOdd || odd > cfg.maxOdd) {
    return {
      impliedP,
      fairMarketP,
      edge,
      ev,
      kelly,
      quarterKelly,
      isValue: false,
      reasons: [],
      risk: "médio",
      skipReason: "fora_faixa_odd",
    };
  }

  const isValue =
    ev >= cfg.minEv &&
    edge >= cfg.minEdge &&
    p >= cfg.minProb &&
    confidence !== "low" &&
    modelDelta <= cfg.maxModelDelta;

  if (ev > 0) reasons.push(`EV +${(ev * 100).toFixed(1)}%`);
  if (edge > 0) reasons.push(`Edge +${(edge * 100).toFixed(1)} p.p. vs mercado`);
  if (confidence !== "low") reasons.push("Confiança média+");

  const risk: ValueMetrics["risk"] =
    odd >= 3.5 || p < 0.35 ? "alto" : odd >= 2.4 ? "médio" : "baixo";

  return {
    impliedP,
    fairMarketP,
    edge,
    ev,
    kelly,
    quarterKelly,
    isValue,
    reasons,
    risk,
    skipReason: isValue ? undefined : ev < cfg.minEv ? "ev_baixo" : "filtro",
  };
}
