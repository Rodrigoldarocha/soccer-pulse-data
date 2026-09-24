// ─── Múltiplas (2/3/4 pernas) ───────────────────────────────────────
// Regras:
// - mesmo jogo → P(A∧B) via matriz de placares (não produto)
// - jogos diferentes → produto × 0.98 por perna extra
// - máx 1 perna/jogo, máx 2 da mesma liga
// - sem EV positivo → "hoje não há múltipla de valor"

import type { MatchPrediction, MarketId } from "../types";
import type { Pick } from "./singles";
import { jointProbabilitySameGame, marketsFromMatrix } from "../ml/dixon-coles";
import { loadBankroll, suggestedStakeUnits } from "./bankroll";
import { PICK_CONFIG, type PickConfig } from "./config";

export type ParlayProfile = "segura" | "equilibrada" | "ousada";

export interface ParlayLeg {
  pick: Pick;
  matrixJoint?: number;
}

export interface Parlay {
  id: string;
  profile: ParlayProfile;
  legs: ParlayLeg[];
  pTotal: number;
  oddTotal: number;
  EV: number;
  kellyStake: number;
  stakeUnits: number;
  worstLeg: Pick;
  correlationNote: string;
  whyThisParlay: string[];
  risk: "baixo" | "médio" | "alto";
}

export interface ParlayDayResult {
  profile: ParlayProfile;
  parlays: Parlay[];
  honestMessage?: string;
}

const PROFILE_SPEC: Record<
  ParlayProfile,
  { minOdd: number; maxOdd: number; minP: number; legs: number[] }
> = {
  segura: { minOdd: 2.0, maxOdd: 3.0, minP: 0.35, legs: [2] },
  equilibrada: { minOdd: 4.0, maxOdd: 8.0, minP: 0.25, legs: [2, 3] },
  ousada: { minOdd: 10.0, maxOdd: 20.0, minP: 0.18, legs: [3, 4] },
};

/** P contradições no mesmo jogo. */
export function isContradictory(a: Pick, b: Pick): boolean {
  if (a.eventId !== b.eventId) return false;
  const pair = new Set([a.market, b.market]);
  const wins: MarketId[] = ["1X2_HOME", "1X2_AWAY"];
  // Casa vence + Under 0.5-ish
  if (a.market === "1X2_HOME" && (b.market === "BTTS_NO" || b.market === "UNDER_1_5")) return true;
  if (b.market === "1X2_HOME" && (a.market === "BTTS_NO" || a.market === "UNDER_1_5")) return true;
  if (a.market === "1X2_AWAY" && (b.market === "BTTS_NO" || b.market === "UNDER_1_5")) return true;
  if (b.market === "1X2_AWAY" && (a.market === "BTTS_NO" || a.market === "UNDER_1_5")) return true;
  // 1X + Casa vence (redundante OK, mas 1X + Away é contraditória)
  if (a.market === "DOUBLE_CHANCE_1X" && b.market === "1X2_AWAY") return true;
  if (b.market === "DOUBLE_CHANCE_1X" && a.market === "1X2_AWAY") return true;
  if (a.market === "DOUBLE_CHANCE_X2" && b.market === "1X2_HOME") return true;
  if (b.market === "DOUBLE_CHANCE_X2" && a.market === "1X2_HOME") return true;
  // Over/Under opostos
  if (
    (a.market.startsWith("OVER_") &&
      b.market.startsWith("UNDER_") &&
      a.market.slice(5) === b.market.slice(6)) ||
    (b.market.startsWith("OVER_") &&
      a.market.startsWith("UNDER_") &&
      b.market.slice(5) === a.market.slice(6))
  ) {
    return true;
  }
  if (a.market === "BTTS" && b.market === "BTTS_NO") return true;
  if (
    wins.includes(a.market) &&
    wins.includes(b.market) &&
    a.market !== b.market &&
    !pair.has("DRAW")
  ) {
    // dois 1X2 opostos
    if (
      (a.market === "1X2_HOME" && b.market === "1X2_AWAY") ||
      (a.market === "1X2_AWAY" && b.market === "1X2_HOME")
    )
      return true;
  }
  return false;
}

/**
 * Probabilidade da combinação.
 * Mesmo jogo → matriz; diferentes → produto × 0.98^(n-1).
 */
export function combinedProbability(
  legs: Pick[],
  matrices: Map<string, number[][]>,
): { p: number; usedMatrix: boolean; note: string } {
  const byGame = new Map<string, Pick[]>();
  for (const l of legs) {
    const arr = byGame.get(l.eventId) ?? [];
    arr.push(l);
    byGame.set(l.eventId, arr);
  }

  let p = 1;
  let usedMatrix = false;
  const notes: string[] = [];

  for (const [, group] of byGame) {
    if (group.length === 1) {
      p *= group[0].p;
      continue;
    }
    const mat = matrices.get(group[0].eventId);
    if (mat && mat.length) {
      usedMatrix = true;
      const markets = group.map((g) => g.market);
      const home = group[0].homeTeam;
      // sat: todos os mercados do grupo satisfeitos no placar (i,j)
      const derived = marketsFromMatrix(mat);
      // aproxima: produto ponderado pela matriz só quando 2 mercados mapeáveis
      let joint = 0;
      for (let i = 0; i < mat.length; i++) {
        for (let j = 0; j < (mat[i]?.length ?? 0); j++) {
          const ok = markets.every((mk) => cellSatisfies(mk, i, j, derived, group));
          if (ok) joint += mat[i][j];
        }
      }
      p *= Math.max(joint, 1e-6);
      notes.push(`${home}: correlação via matriz (não produto)`);
    } else {
      let gp = 1;
      for (const g of group) gp *= g.p;
      p *= gp;
      notes.push("usou produto (sem matriz)");
    }
  }

  const n = legs.length;
  if (n > 1) p *= Math.pow(0.98, n - 1);
  return { p, usedMatrix, note: notes.join("; ") || "independente" };
}

function cellSatisfies(
  market: MarketId,
  i: number,
  j: number,
  _derived: ReturnType<typeof marketsFromMatrix>,
  _legs: Pick[],
): boolean {
  switch (market) {
    case "1X2_HOME":
      return i > j;
    case "1X2_AWAY":
      return i < j;
    case "DRAW":
      return i === j;
    case "OVER_1_5":
      return i + j >= 2;
    case "OVER_2_5":
      return i + j >= 3;
    case "OVER_3_5":
      return i + j >= 4;
    case "UNDER_1_5":
      return i + j < 2;
    case "UNDER_2_5":
      return i + j < 3;
    case "UNDER_3_5":
      return i + j < 4;
    case "BTTS":
      return i > 0 && j > 0;
    case "BTTS_NO":
      return !(i > 0 && j > 0);
    case "DOUBLE_CHANCE_1X":
      return i >= j;
    case "DOUBLE_CHANCE_X2":
      return j >= i;
    case "DOUBLE_CHANCE_12":
      return i !== j;
    case "HOME_SCORES":
    case "HOME_OVER_0_5":
      return i >= 1;
    case "HOME_OVER_1_5":
      return i >= 2;
    case "AWAY_SCORES":
      return j >= 1;
    case "DNB_HOME":
      return i > j;
    case "DNB_AWAY":
      return j > i;
    case "AH_HOME_M05":
      return i > j;
    case "AH_AWAY_P05":
      return j >= i;
    case "AH_HOME_M1":
      return i - j > 1;
    case "AH_AWAY_P1":
      return j - i + 1 > 0;
    default:
      return false;
  }
}

export function buildParlay(
  legs: Pick[],
  profile: ParlayProfile,
  matrices: Map<string, number[][]>,
  cfg: PickConfig = PICK_CONFIG,
): Parlay | null {
  if (legs.length < 2) return null;
  const spec = PROFILE_SPEC[profile];
  if (!spec.legs.includes(legs.length)) return null;

  // 1 perna por jogo
  const games = new Set(legs.map((l) => l.eventId));
  if (games.size !== legs.length) return null;
  // máx 2 da mesma liga
  const byLeague = new Map<string, number>();
  for (const l of legs) byLeague.set(l.league, (byLeague.get(l.league) ?? 0) + 1);
  if ([...byLeague.values()].some((c) => c > 2)) return null;
  // sem EV negativo por perna
  if (legs.some((l) => l.EV < 0 || l.confidence === "low")) return null;
  // contradições (mesmo jogo já bloqueado por 1/jogo)

  const { p, usedMatrix, note } = combinedProbability(legs, matrices);
  const oddTotal = legs.reduce((a, l) => a * l.odd, 1);
  if (oddTotal < spec.minOdd || oddTotal > spec.maxOdd) return null;
  if (p < spec.minP) return null;

  const EV = p * oddTotal - 1;
  if (EV <= 0) return null;

  const worst = legs.reduce((a, b) => (a.p <= b.p ? a : b));
  const bank = loadBankroll();
  const kelly = (p * oddTotal - 1) / (oddTotal - 1);
  const frac = profile === "ousada" ? 0.25 : cfg.kellyFraction;
  const stakePct = Math.max(0, Math.min(kelly * frac, profile === "ousada" ? 0.01 : 0.02));
  const stakeUnits = suggestedStakeUnits(stakePct, bank);

  const why: string[] = [
    `P total ${(p * 100).toFixed(1)}% · odd ${oddTotal.toFixed(2)}`,
    `EV +${(EV * 100).toFixed(1)}%`,
    usedMatrix
      ? "Correlação do mesmo jogo via matriz de placares"
      : "Jogos distintos (independentes ×0.98)",
  ];
  if (profile === "ousada") why.push("Risco alto — no máximo 4 pernas");

  return {
    id: `${profile}-${legs.map((l) => l.eventId).join("-")}`,
    profile,
    legs: legs.map((l) => ({ pick: l })),
    pTotal: p,
    oddTotal: +oddTotal.toFixed(2),
    EV,
    kellyStake: +(stakePct * 100).toFixed(2),
    stakeUnits,
    worstLeg: worst,
    correlationNote: note,
    whyThisParlay: why,
    risk: profile === "ousada" ? "alto" : profile === "equilibrada" ? "médio" : "baixo",
  };
}

/**
 * Monte Carlo com amostragem de placares (20k) para validar P_total.
 */
export function monteCarloParlay(
  legs: Pick[],
  matrices: Map<string, number[][]>,
  samples = 20_000,
): number {
  if (legs.length === 0) return 0;
  let hits = 0;
  for (let s = 0; s < samples; s++) {
    let all = true;
    const seenGames = new Set<string>();
    let sameGameOk: boolean | null = null;
    for (const leg of legs) {
      const mat = matrices.get(leg.eventId);
      let ok: boolean;
      if (mat && mat.length) {
        const { i, j } = sampleScore(mat);
        if (seenGames.has(leg.eventId)) {
          // já amostrou — reavalia no MESMO placar seria ideal; simplificação: usa p do leg
          ok = Math.random() < leg.p;
        } else {
          ok = cellSatisfies(leg.market, i, j, marketsFromMatrix(mat), [leg]);
          sameGameOk = ok;
        }
        seenGames.add(leg.eventId);
      } else {
        ok = Math.random() < leg.p;
      }
      if (!ok) {
        all = false;
        break;
      }
      void sameGameOk;
    }
    if (all) hits++;
  }
  return hits / samples;
}

function sampleScore(mat: number[][]): { i: number; j: number } {
  let r = Math.random();
  for (let i = 0; i < mat.length; i++) {
    for (let j = 0; j < (mat[i]?.length ?? 0); j++) {
      r -= mat[i][j];
      if (r <= 0) return { i, j };
    }
  }
  return { i: 0, j: 0 };
}

export function buildDailyParlays(
  valuePicks: Pick[],
  radarPicks: Pick[],
  matches: MatchPrediction[],
  cfg: PickConfig = PICK_CONFIG,
): Record<ParlayProfile, ParlayDayResult> {
  const matrices = new Map<string, number[][]>();
  for (const m of matches) {
    if (m.scoreMatrix) matrices.set(m.id, m.scoreMatrix);
  }

  const pool = [...valuePicks, ...radarPicks.filter((r) => r.EV >= 0 && r.confidence !== "low")];
  const out = {} as Record<ParlayProfile, ParlayDayResult>;

  for (const profile of ["segura", "equilibrada", "ousada"] as ParlayProfile[]) {
    const found = searchBest(pool, profile, matrices, cfg);
    if (found.length === 0) {
      out[profile] = {
        profile,
        parlays: [],
        honestMessage: "Hoje não há múltipla de valor.",
      };
    } else {
      // valida MC
      const validated = found
        .map((pl) => {
          const legs = pl.legs.map((l) => l.pick);
          const mc = monteCarloParlay(legs, matrices, 20_000);
          if (Math.abs(mc - pl.pTotal) > 0.03) {
            const oddTotal = pl.oddTotal;
            const EV = mc * oddTotal - 1;
            if (EV <= 0) return null;
            return { ...pl, pTotal: mc, EV };
          }
          return pl;
        })
        .filter((x): x is Parlay => x != null);

      out[profile] = validated.length
        ? { profile, parlays: validated.slice(0, cfg.parlaysPerProfile) }
        : { profile, parlays: [], honestMessage: "Hoje não há múltipla de valor." };
    }
  }
  return out;
}

function searchBest(
  pool: Pick[],
  profile: ParlayProfile,
  matrices: Map<string, number[][]>,
  cfg: PickConfig,
): Parlay[] {
  const spec = PROFILE_SPEC[profile];
  const results: Parlay[] = [];
  // limita busca: top EV por jogo (1 candidato/jogo)
  const byGame = new Map<string, Pick>();
  const sorted = [...pool].sort((a, b) => b.EV - a.EV);
  for (const p of sorted) {
    if (!byGame.has(p.eventId)) byGame.set(p.eventId, p);
  }
  const candidates = [...byGame.values()].sort((a, b) => b.EV - a.EV).slice(0, 12);

  for (const n of spec.legs) {
    const combo: Pick[] = [];
    const walk = (start: number) => {
      if (results.length >= 5) return;
      if (combo.length === n) {
        const pl = buildParlay([...combo], profile, matrices, cfg);
        if (pl) results.push(pl);
        return;
      }
      for (let i = start; i < candidates.length; i++) {
        const c = candidates[i];
        if (combo.some((x) => x.eventId === c.eventId)) continue;
        if (combo.some((x) => isContradictory(x, c))) continue;
        combo.push(c);
        walk(i + 1);
        combo.pop();
      }
    };
    walk(0);
    if (results.length) break;
  }

  results.sort((a, b) => b.EV - a.EV);
  return results;
}

export function copyParlayText(pl: Parlay): string {
  const lines = [
    `Múltipla ${pl.profile.toUpperCase()} — ${pl.legs.length} pernas`,
    ...pl.legs.map(
      (l, i) =>
        `${i + 1}. ${l.pick.selectionLabel} (${l.pick.market}) @ ${l.pick.odd.toFixed(2)} — p ${(l.pick.p * 100).toFixed(0)}% · ${l.pick.leagueLabel}`,
    ),
    `Odd total: ${pl.oddTotal.toFixed(2)} · P: ${(pl.pTotal * 100).toFixed(1)}% · EV: +${(pl.EV * 100).toFixed(1)}%`,
    `Pior perna: ${pl.worstLeg.selectionLabel}`,
    pl.correlationNote,
    "+18 · Estimativas estatísticas, sem garantia · Jogue com responsabilidade",
  ];
  return lines.join("\n");
}
