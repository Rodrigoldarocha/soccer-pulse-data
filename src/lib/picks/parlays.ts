// ─── Múltiplas (2/3/4 pernas) ───────────────────────────────────────
// Regras:
// - mesmo jogo → P(A∧B) via matriz de placares (não produto); 2 pernas com whitelist
// - jogos diferentes → produto (sem 0.98 interno; penalidade documentada à parte)
// - máx 1 perna/jogo (exceto whitelist mesmo jogo), máx 2 da mesma liga
// - sem EV positivo → "hoje não há múltipla de valor"
// - MC determinístico (mulberry32 seed do id da combinação)

import type { MatchPrediction, MarketId } from "../types";
import type { Pick } from "./singles";
import { jointProbabilitySameGame, marketsFromMatrix } from "../ml/dixon-coles";
import { loadBankroll, suggestedStakeUnits } from "./bankroll";
import { PICK_CONFIG, type PickConfig } from "./config";
import { mulberry32, hashSeed } from "../rng";

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
  /** true se odd total é produto de odds reais (bookmakers pagam assim). */
  combinedOddsReal: boolean;
  /** fair combinado 1/p — referência. */
  fairCombinedOdds: number;
}

export interface ParlayDayResult {
  profile: ParlayProfile;
  parlays: Parlay[];
  honestMessage?: string;
  /** quase lá (odd/P fora da faixa mas EV>0) */
  nearMissNote?: string;
}

const PROFILE_SPEC: Record<
  ParlayProfile,
  { minOdd: number; maxOdd: number; minP: number; legs: number[] }
> = {
  // Q1: segura 2–3 pernas, odd 1.9–3.2
  segura: { minOdd: 1.9, maxOdd: 3.2, minP: 0.35, legs: [2, 3] },
  equilibrada: { minOdd: 4.0, maxOdd: 8.0, minP: 0.25, legs: [2, 3] },
  ousada: { minOdd: 10.0, maxOdd: 20.0, minP: 0.18, legs: [3, 4] },
};

/** B4 — pares de 2 pernas no MESMO jogo permitidos (correlação via matriz). */
const SAME_GAME_BASE = new Set([
  "1X2_HOME|OVER_2_5",
  "1X2_HOME|BTTS",
  "1X2_HOME|OVER_1_5",
  "1X2_AWAY|OVER_2_5",
  "1X2_AWAY|BTTS",
  "1X2_AWAY|OVER_1_5",
  "DOUBLE_CHANCE_1X|OVER_2_5",
  "DOUBLE_CHANCE_X2|OVER_2_5",
  "DOUBLE_CHANCE_1X|BTTS",
  "DOUBLE_CHANCE_X2|BTTS",
  "OVER_2_5|BTTS",
  "DRAW|UNDER_2_5",
  "DRAW|BTTS_NO",
  "UNDER_2_5|BTTS_NO",
]);

function sameGameAllowed(markets: MarketId[]): boolean {
  if (markets.length !== 2) return false;
  const key = `${markets[0]}|${markets[1]}`;
  const rev = `${markets[1]}|${markets[0]}`;
  return SAME_GAME_BASE.has(key) || SAME_GAME_BASE.has(rev);
}

/** P contradições no mesmo jogo. */
export function isContradictory(a: Pick, b: Pick): boolean {
  if (a.eventId !== b.eventId) return false;
  const pair = new Set([a.market, b.market]);
  const wins: MarketId[] = ["1X2_HOME", "1X2_AWAY"];
  if (a.market === "1X2_HOME" && (b.market === "BTTS_NO" || b.market === "UNDER_1_5")) return true;
  if (b.market === "1X2_HOME" && (a.market === "BTTS_NO" || a.market === "UNDER_1_5")) return true;
  if (a.market === "1X2_AWAY" && (b.market === "BTTS_NO" || b.market === "UNDER_1_5")) return true;
  if (b.market === "1X2_AWAY" && (a.market === "BTTS_NO" || a.market === "UNDER_1_5")) return true;
  if (a.market === "DOUBLE_CHANCE_1X" && b.market === "1X2_AWAY") return true;
  if (b.market === "DOUBLE_CHANCE_1X" && a.market === "1X2_AWAY") return true;
  if (a.market === "DOUBLE_CHANCE_X2" && b.market === "1X2_HOME") return true;
  if (b.market === "DOUBLE_CHANCE_X2" && a.market === "1X2_HOME") return true;
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
 * Mesmo jogo → matriz; diferentes → produto.
 * B4: 2 pernas mesmo jogo só com whitelist; joint real pela matriz.
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
      const derived = marketsFromMatrix(mat);
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

  return {
    p: Math.max(1e-6, Math.min(1, p)),
    usedMatrix,
    note: notes.join("; ") || "independente",
  };
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

  // 1 perna por jogo OU 2 mesmo jogo com whitelist
  const byGame = new Map<string, Pick[]>();
  for (const l of legs) {
    const arr = byGame.get(l.eventId) ?? [];
    arr.push(l);
    byGame.set(l.eventId, arr);
  }
  for (const group of byGame.values()) {
    if (group.length === 1) continue;
    if (group.length === 2 && sameGameAllowed([group[0].market, group[1].market])) {
      if (isContradictory(group[0], group[1])) return null;
      continue;
    }
    return null;
  }
  // máx 2 da mesma liga (conta por jogo único)
  const byLeague = new Map<string, number>();
  for (const [eventId, group] of byGame) {
    const league = group[0].league;
    byLeague.set(league, (byLeague.get(league) ?? 0) + 1);
    void eventId;
  }
  if ([...byLeague.values()].some((c) => c > 2)) return null;
  // sem EV negativo por perna; odd real obrigatória
  if (legs.some((l) => l.EV < 0 || l.confidence === "low" || !(l.odd > 1))) return null;

  const { p, usedMatrix, note } = combinedProbability(legs, matrices);
  const oddTotal = legs.reduce((a, l) => a * l.odd, 1);
  // sem odd combinada real do book: produto de odds reais é o que books pagam
  const combinedOddsReal = legs.every((l) => l.odd > 1);
  if (!combinedOddsReal) return null;
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
    `P total ${(p * 100).toFixed(1)}% · odd ${oddTotal.toFixed(2)} · fair ${(1 / p).toFixed(2)}`,
    `EV +${(EV * 100).toFixed(1)}%`,
    usedMatrix
      ? "Correlação do mesmo jogo via matriz de placares"
      : "Jogos distintos (independentes)",
  ];
  if (profile === "ousada") why.push("Risco alto — no máximo 4 pernas");

  return {
    id: `${profile}-${legs.map((l) => `${l.eventId}:${l.market}`).join("-")}`,
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
    combinedOddsReal,
    fairCombinedOdds: +(1 / p).toFixed(2),
  };
}

/**
 * B3 — Monte Carlo determinístico: seed do id, 1 score/jogo por trial,
 * CDF pré-computado, sem marketsFromMatrix no loop, sem 0.98 interno.
 */
export function monteCarloParlay(
  legs: Pick[],
  matrices: Map<string, number[][]>,
  samples = 20_000,
  seedStr?: string,
): number {
  if (legs.length === 0) return 0;
  const seed = hashSeed(seedStr ?? legs.map((l) => `${l.eventId}:${l.market}`).join("|"));
  const rnd = mulberry32(seed);

  interface GameDist {
    cdf: Array<{ i: number; j: number; c: number }>;
    legs: Array<{ market: MarketId; p: number }>;
    hasMatrix: boolean;
  }
  const games = new Map<string, GameDist>();
  for (const leg of legs) {
    let g = games.get(leg.eventId);
    if (!g) {
      const mat = matrices.get(leg.eventId);
      const cdf: GameDist["cdf"] = [];
      if (mat && mat.length) {
        let acc = 0;
        for (let i = 0; i < mat.length; i++) {
          for (let j = 0; j < (mat[i]?.length ?? 0); j++) {
            acc += mat[i][j];
            cdf.push({ i, j, c: acc });
          }
        }
        // normaliza CDF final p/ r=1
        if (cdf.length) cdf[cdf.length - 1].c = 1;
      }
      g = { cdf, legs: [], hasMatrix: cdf.length > 0 };
      games.set(leg.eventId, g);
    }
    g.legs.push({ market: leg.market, p: leg.p });
  }

  let hits = 0;
  for (let s = 0; s < samples; s++) {
    let all = true;
    for (const g of games.values()) {
      let gameOk = true;
      if (g.hasMatrix) {
        const r = rnd();
        let cell = g.cdf[g.cdf.length - 1];
        for (const c of g.cdf) {
          if (r <= c.c) {
            cell = c;
            break;
          }
        }
        for (const { market } of g.legs) {
          if (!satSimple(market, cell.i, cell.j)) {
            gameOk = false;
            break;
          }
        }
      } else {
        for (const { p } of g.legs) {
          if (rnd() >= p) {
            gameOk = false;
            break;
          }
        }
      }
      if (!gameOk) {
        all = false;
        break;
      }
    }
    if (all) hits++;
  }
  return hits / samples;
}

function satSimple(market: MarketId, i: number, j: number): boolean {
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
    default:
      return true;
  }
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

  // Q1: pool EV >= 0.01; radar ordenado por EV × confiança
  const confW = (c: Pick["confidence"]) => (c === "high" ? 1.3 : c === "medium" ? 1 : 0.5);
  const pool = [
    ...valuePicks,
    ...radarPicks
      .filter((r) => r.EV >= 0.01 && r.confidence !== "low")
      .sort((a, b) => b.EV * confW(b.confidence) - a.EV * confW(a.confidence)),
  ];
  const out = {} as Record<ParlayProfile, ParlayDayResult>;

  for (const profile of ["segura", "equilibrada", "ousada"] as ParlayProfile[]) {
    const { found, nearMiss } = searchBest(pool, profile, matrices, cfg);
    if (found.length === 0) {
      out[profile] = {
        profile,
        parlays: [],
        honestMessage: "Hoje não há múltipla de valor.",
        ...(nearMiss ? { nearMissNote: nearMiss } : {}),
      };
    } else {
      const validated = found
        .map((pl) => {
          const legs = pl.legs.map((l) => l.pick);
          const mc = monteCarloParlay(legs, matrices, 20_000, pl.id);
          // B3: sem 0.98; se |mc−analytic|>0.03 → min(mc, analytic)
          if (Math.abs(mc - pl.pTotal) > 0.03) {
            const p = Math.min(mc, pl.pTotal);
            const EV = p * pl.oddTotal - 1;
            if (EV <= 0) return null;
            return { ...pl, pTotal: p, EV, fairCombinedOdds: +(1 / p).toFixed(2) };
          }
          return pl;
        })
        .filter((x): x is Parlay => x != null);

      out[profile] = validated.length
        ? { profile, parlays: validated.slice(0, cfg.parlaysPerProfile) }
        : {
            profile,
            parlays: [],
            honestMessage: "Hoje não há múltipla de valor.",
            ...(nearMiss ? { nearMissNote: nearMiss } : {}),
          };
    }
  }
  return out;
}

function searchBest(
  pool: Pick[],
  profile: ParlayProfile,
  matrices: Map<string, number[][]>,
  cfg: PickConfig,
): { found: Parlay[]; nearMiss?: string } {
  const spec = PROFILE_SPEC[profile];
  const results: Parlay[] = [];
  let nearMiss: string | undefined;

  // top 20 candidatos (1/jogo melhor EV)
  const byGame = new Map<string, Pick>();
  const sorted = [...pool].sort((a, b) => b.EV - a.EV);
  for (const p of sorted) {
    if (!byGame.has(p.eventId)) byGame.set(p.eventId, p);
  }
  const candidates = [...byGame.values()].sort((a, b) => b.EV - a.EV).slice(0, 20);

  for (const n of spec.legs) {
    const combo: Pick[] = [];
    const walk = (start: number) => {
      if (results.length >= 8) return;
      if (combo.length === n) {
        const pl = buildParlay([...combo], profile, matrices, cfg);
        if (pl) {
          results.push(pl);
        } else {
          // near-miss: EV>0 mas fora de odd/P
          const oddTotal = combo.reduce((a, l) => a * l.odd, 1);
          if (oddTotal > 1 && combo.every((l) => l.EV > 0)) {
            if (oddTotal < spec.minOdd || oddTotal > spec.maxOdd) {
              nearMiss =
                nearMiss ??
                `Quase: combinação EV+ mas odd ${oddTotal.toFixed(2)} fora da faixa ${spec.minOdd}–${spec.maxOdd} do perfil ${profile}.`;
            }
          }
        }
        return;
      }
      for (let i = start; i < candidates.length; i++) {
        const c = candidates[i];
        if (combo.some((x) => x.eventId === c.eventId && x.market !== c.market)) {
          // mesmo jogo: só se 2 pernas e whitelist
          const same = combo.filter((x) => x.eventId === c.eventId);
          if (same.length >= 1) {
            if (same.length + 1 > 2) continue;
            if (!sameGameAllowed([same[0].market, c.market])) continue;
            if (isContradictory(same[0], c)) continue;
          }
        }
        if (combo.some((x) => isContradictory(x, c))) continue;
        // diversificação: não 3+ da mesma liga
        const leagueCount = combo.filter((x) => x.league === c.league).length;
        if (leagueCount >= 2 && n > 2) continue;
        combo.push(c);
        walk(i + 1);
        combo.pop();
      }
    };
    walk(0);
    if (results.length) break;
  }

  // score = EV × min(1, P/P_target)
  results.sort((a, b) => {
    const sa = a.EV * Math.min(1, a.pTotal / Math.max(spec.minP, 0.01));
    const sb = b.EV * Math.min(1, b.pTotal / Math.max(spec.minP, 0.01));
    return sb - sa;
  });
  return { found: results, nearMiss };
}

export function copyParlayText(pl: Parlay): string {
  const lines = [
    `Múltipla ${pl.profile.toUpperCase()} — ${pl.legs.length} pernas`,
    ...pl.legs.map(
      (l, i) =>
        `${i + 1}. ${l.pick.selectionLabel} (${l.pick.market}) @ ${l.pick.odd.toFixed(2)} — p ${(l.pick.p * 100).toFixed(0)}% · ${l.pick.leagueLabel}`,
    ),
    `Odd total: ${pl.oddTotal.toFixed(2)} · fair: ${pl.fairCombinedOdds.toFixed(2)} · P: ${(pl.pTotal * 100).toFixed(1)}% · EV: +${(pl.EV * 100).toFixed(1)}%`,
    `Pior perna: ${pl.worstLeg.selectionLabel}`,
    pl.correlationNote,
    "+18 · Estimativas estatísticas, sem garantia · Jogue com responsabilidade",
  ];
  return lines.join("\n");
}
