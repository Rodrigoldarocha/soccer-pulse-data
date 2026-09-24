// ─── Dixon-Coles com decaimento temporal ─────────────────────────────
// Ajuste por liga: attack_i, defense_i, home_advantage, rho.
// w = exp(-ξ · dias), ξ ≈ 0.0065 (meia-vida ~106 dias).
// Matriz de placares 0..8 normalizada; TODOS os mercados saem dela.

export const XI = 0.0065;
export const MAX_GOALS = 8;
export const SCORE_MATRIX_SIZE = MAX_GOALS + 1;

export interface TeamRating {
  teamId: number;
  teamName: string;
  attack: number;
  defense: number;
  games: number;
}

export interface LeagueRatings {
  leagueId: number;
  homeAdvantage: number;
  rho: number;
  leagueAvgGoals: number;
  teams: Map<string, TeamRating>;
  updatedAt: number;
}

export interface FinishedMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  /** Data UTC do jogo */
  date: string;
  homeTeamId?: number | string | null;
  awayTeamId?: number | string | null;
}

export type ScoreMatrix = number[][];

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

function poisson(k: number, lambda: number): number {
  const l = Math.max(1e-6, lambda);
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.exp(-l) * Math.pow(l, k)) / fact;
}

/** Correção Dixon-Coles para placares baixos. */
export function dcTau(i: number, j: number, lambdaH: number, lambdaA: number, rho: number): number {
  if (i === 0 && j === 0) return 1 - lambdaH * lambdaA * rho;
  if (i === 0 && j === 1) return 1 + lambdaH * rho;
  if (i === 1 && j === 0) return 1 + lambdaA * rho;
  if (i === 1 && j === 1) return 1 - rho;
  return 1;
}

/**
 * Matriz de placares P[i][j] i=casa j=fora, normalizada (soma 1).
 */
export function scoreMatrix(lambdaHome: number, lambdaAway: number, rho = -0.08): ScoreMatrix {
  const H = poissonSeries(lambdaHome);
  const A = poissonSeries(lambdaAway);
  const m: ScoreMatrix = Array.from({ length: SCORE_MATRIX_SIZE }, () =>
    Array<number>(SCORE_MATRIX_SIZE).fill(0),
  );
  let total = 0;
  for (let i = 0; i < SCORE_MATRIX_SIZE; i++) {
    for (let j = 0; j < SCORE_MATRIX_SIZE; j++) {
      const p = H[i] * A[j] * dcTau(i, j, lambdaHome, lambdaAway, rho);
      m[i][j] = Math.max(0, p);
      total += m[i][j];
    }
  }
  if (total > 0) {
    for (let i = 0; i < SCORE_MATRIX_SIZE; i++) {
      for (let j = 0; j < SCORE_MATRIX_SIZE; j++) m[i][j] /= total;
    }
  }
  return m;
}

function poissonSeries(lambda: number): number[] {
  const out: number[] = [];
  const l = Math.max(1e-6, lambda);
  let p = Math.exp(-l);
  out.push(p);
  for (let k = 1; k <= MAX_GOALS; k++) {
    p = (p * l) / k;
    out.push(p);
  }
  return out;
}

export function matrixSum(m: ScoreMatrix): number {
  let s = 0;
  for (const row of m) for (const v of row) s += v;
  return s;
}

// ─── Ajuste por liga (gradiente leve, poucas iterações) ──────────────

export interface FitOptions {
  xi?: number;
  iterations?: number;
  /** Prior para shrinkage: média de gols da liga */
  leagueAvg?: number;
}

function normalizeName(n: string): string {
  return n
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function teamKey(id: number | string | null | undefined, name: string): string {
  if (id != null && String(id).length > 0 && String(id) !== "0") return `id:${id}`;
  return `name:${normalizeName(name)}`;
}

/**
 * Ajusta attack/defense por liga com decaimento temporal e shrinkage bayesiano.
 * Indexa por id do time quando disponível; fallback por nome normalizado.
 */
export function fitLeagueRatings(
  leagueId: number,
  matches: FinishedMatch[],
  opts: FitOptions = {},
): LeagueRatings {
  const xi = opts.xi ?? XI;
  const iterations = opts.iterations ?? 40;
  const now = new Date();

  let goalsH = 0;
  let goalsA = 0;
  const weighted: Array<{
    hKey: string;
    aKey: string;
    hName: string;
    aName: string;
    gh: number;
    ga: number;
    w: number;
  }> = [];

  const seen = new Set<string>();
  for (const m of matches) {
    const hName = m.homeTeam || "";
    const aName = m.awayTeam || "";
    if (!hName && !aName) continue;
    const hs = Number(m.homeScore);
    const as = Number(m.awayScore);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;
    const w = Math.exp(-xi * daysBetween(new Date(m.date), now));
    const hKey = teamKey(m.homeTeamId, hName);
    const aKey = teamKey(m.awayTeamId, aName);
    seen.add(hKey);
    seen.add(aKey);
    goalsH += hs * w;
    goalsA += as * w;
    weighted.push({ hKey, aKey, hName, aName, gh: hs, ga: as, w });
  }

  const nMatches = Math.max(1, weighted.length);
  const leagueAvg = opts.leagueAvg ?? Math.max(0.3, (goalsH + goalsA) / (2 * nMatches));
  const teams = new Map<string, TeamRating>();
  const names = [...seen];
  names.forEach((key, i) => {
    const displayName = key.startsWith("name:") ? key.slice(5) : key;
    teams.set(key, {
      teamId: i + 1,
      teamName: displayName,
      attack: 0,
      defense: 0,
      games: 0,
    });
  });

  for (const m of weighted) {
    const th = teams.get(m.hKey);
    const ta = teams.get(m.aKey);
    if (th) th.games++;
    if (ta) ta.games++;
  }

  let homeAdv = Math.log(1.2);
  let rho = -0.08;

  const homeAppear = new Map<string, { gf: number; ga: number; w: number }>();
  const awayAppear = new Map<string, { gf: number; ga: number; w: number }>();
  for (const m of weighted) {
    const h = homeAppear.get(m.hKey) ?? { gf: 0, ga: 0, w: 0 };
    h.gf += m.gh * m.w;
    h.ga += m.ga * m.w;
    h.w += m.w;
    homeAppear.set(m.hKey, h);
    const a = awayAppear.get(m.aKey) ?? { gf: 0, ga: 0, w: 0 };
    a.gf += m.ga * m.w;
    a.ga += m.gh * m.w;
    a.w += m.w;
    awayAppear.set(m.aKey, a);
  }

  for (const [key, t] of teams) {
    const ha = homeAppear.get(key);
    const aa = awayAppear.get(key);
    const games = t.games;
    const shrink = games / (games + 6);
    const obsAttack =
      ((ha ? ha.gf / Math.max(ha.w, 0.5) : 0) + (aa ? aa.gf / Math.max(aa.w, 0.5) : 0)) / 2;
    const obsDefense =
      ((ha ? ha.ga / Math.max(ha.w, 0.5) : 0) + (aa ? aa.ga / Math.max(aa.w, 0.5) : 0)) / 2;
    const att = Math.log(Math.max(0.1, obsAttack || leagueAvg) / leagueAvg);
    const def = Math.log(Math.max(0.1, obsDefense || leagueAvg) / leagueAvg);
    t.attack = shrink * att;
    t.defense = shrink * def;
    teams.set(key, t);
  }

  const totalHomeGoals = weighted.reduce((s, m) => s + m.gh * m.w, 0);
  const totalAwayGoals = weighted.reduce((s, m) => s + m.ga * m.w, 0);
  if (totalAwayGoals > 0)
    homeAdv = Math.log(Math.max(0.5, totalHomeGoals) / Math.max(0.5, totalAwayGoals)) / 2;

  for (let it = 0; it < Math.min(iterations, 15); it++) {
    let grad = 0;
    for (const m of weighted) {
      const lh =
        leagueAvg *
        Math.exp(
          (teams.get(m.hKey)?.attack ?? 0) - (teams.get(m.aKey)?.defense ?? 0) + homeAdv / 2,
        );
      const la =
        leagueAvg *
        Math.exp(
          (teams.get(m.aKey)?.attack ?? 0) - (teams.get(m.hKey)?.defense ?? 0) - homeAdv / 2,
        );
      const i = Math.min(m.gh, MAX_GOALS);
      const j = Math.min(m.ga, MAX_GOALS);
      const tau = dcTau(i, j, lh, la, rho);
      if (tau <= 0.05) continue;
      const dTau =
        i === 0 && j === 0
          ? -lh * la
          : i === 0 && j === 1
            ? lh
            : i === 1 && j === 0
              ? la
              : i === 1 && j === 1
                ? -1
                : 0;
      if (dTau !== 0) grad += (dTau / tau) * m.w;
    }
    rho = Math.max(-0.3, Math.min(0.3, rho + 0.02 * grad * 0.1));
  }

  const attacks = [...teams.values()].map((t) => t.attack);
  const meanAtt = attacks.length ? attacks.reduce((a, b) => a + b, 0) / attacks.length : 0;
  for (const t of teams.values()) t.attack -= meanAtt;

  return {
    leagueId,
    homeAdvantage: homeAdv,
    rho,
    leagueAvgGoals: leagueAvg,
    teams,
    updatedAt: Date.now(),
  };
}

function ratingOf(
  r: LeagueRatings | undefined,
  name: string,
  teamId?: number | string | null,
): TeamRating | undefined {
  if (!r) return undefined;
  if (teamId != null && String(teamId).length > 0 && String(teamId) !== "0") {
    const byId = r.teams.get(`id:${teamId}`);
    if (byId) return byId;
  }
  const n = normalizeName(name);
  return r.teams.get(`name:${n}`) ?? r.teams.get(n) ?? r.teams.get(name);
}

/** Mínimo de jogos por lado para confiar no rating (dcReliable). */
export const DC_RELIABLE_MIN_GAMES = 5;

export function isDcReliable(
  r: LeagueRatings | undefined,
  home: string,
  away: string,
  homeId?: number | string | null,
  awayId?: number | string | null,
): boolean {
  const rh = ratingOf(r, home, homeId);
  const ra = ratingOf(r, away, awayId);
  return !!rh && !!ra && rh.games >= DC_RELIABLE_MIN_GAMES && ra.games >= DC_RELIABLE_MIN_GAMES;
}

/**
 * Lambda esperado casa/fora a partir dos ratings.
 * Sem rating → defaults baseados na média informada.
 */
export function expectedGoals(
  homeTeam: string,
  awayTeam: string,
  ratings: LeagueRatings | undefined,
  fallbackAvg = 1.3,
  homeId?: number | string | null,
  awayId?: number | string | null,
): { lambdaHome: number; lambdaAway: number } {
  const avg = ratings?.leagueAvgGoals ?? fallbackAvg;
  const rh = ratingOf(ratings, homeTeam, homeId);
  const ra = ratingOf(ratings, awayTeam, awayId);
  const ha = ratings?.homeAdvantage ?? Math.log(1.2);
  const attH = rh?.attack ?? 0;
  const defH = rh?.defense ?? 0;
  const attA = ra?.attack ?? 0;
  const defA = ra?.defense ?? 0;
  const shrinkH = rh ? rh.games / (rh.games + 6) : 0;
  const shrinkA = ra ? ra.games / (ra.games + 6) : 0;
  const lambdaHome = avg * Math.exp(ha + shrinkH * attH - shrinkA * defA);
  const lambdaAway = avg * Math.exp(shrinkA * attA - shrinkH * defH - ha * 0.3);
  return {
    lambdaHome: Math.max(0.15, Math.min(6, lambdaHome)),
    lambdaAway: Math.max(0.1, Math.min(6, lambdaAway)),
  };
}

export function predictMatrix(
  homeTeam: string,
  awayTeam: string,
  ratings: LeagueRatings | undefined,
  fallbackAvg = 1.3,
  homeId?: number | string | null,
  awayId?: number | string | null,
): { matrix: ScoreMatrix; lambdaHome: number; lambdaAway: number } {
  const { lambdaHome, lambdaAway } = expectedGoals(
    homeTeam,
    awayTeam,
    ratings,
    fallbackAvg,
    homeId,
    awayId,
  );
  const matrix = scoreMatrix(lambdaHome, lambdaAway, ratings?.rho ?? -0.08);
  return { matrix, lambdaHome, lambdaAway };
}

// ─── Mercados derivados da MESMA matriz ──────────────────────────────

export interface DerivedMarkets {
  home: number;
  draw: number;
  away: number;
  over15: number;
  over25: number;
  over35: number;
  under15: number;
  under25: number;
  under35: number;
  btts: number;
  bttsNo: number;
  dc1x: number;
  dcx2: number;
  dc12: number;
  homeScores: number;
  awayScores: number;
  homeOver05: number;
  homeOver15: number;
  dnbHome: number;
  dnbAway: number;
  ahHomeM05: number;
  ahAwayP05: number;
  ahHomeM1: number;
  ahAwayP1: number;
  exactTop3: Array<{ score: string; p: number }>;
}

export function marketsFromMatrix(m: ScoreMatrix): DerivedMarkets {
  let home = 0;
  let draw = 0;
  let away = 0;
  let over15 = 0;
  let over25 = 0;
  let over35 = 0;
  let btts = 0;
  let homeScores = 0;
  let awayScores = 0;
  let homeOver05 = 0;
  let homeOver15 = 0;
  const cells: Array<{ score: string; p: number }> = [];

  for (let i = 0; i < m.length; i++) {
    for (let j = 0; j < (m[i]?.length ?? 0); j++) {
      const p = m[i][j];
      if (!Number.isFinite(p) || p <= 0) continue;
      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
      const tot = i + j;
      if (tot >= 2) over15 += p;
      if (tot >= 3) over25 += p;
      if (tot >= 4) over35 += p;
      if (i > 0 && j > 0) btts += p;
      if (i > 0) homeScores += p;
      if (j > 0) awayScores += p;
      if (i >= 1) homeOver05 += p;
      if (i >= 2) homeOver15 += p;
      cells.push({ score: `${i}-${j}`, p });
    }
  }
  cells.sort((a, b) => b.p - a.p);
  const total = home + draw + away || 1;
  const norm = (x: number) => x / total;

  home = norm(home);
  draw = norm(draw);
  away = norm(away);
  over15 = norm(over15);
  over25 = norm(over25);
  over35 = norm(over35);
  btts = norm(btts);
  homeScores = norm(homeScores);
  awayScores = norm(awayScores);
  homeOver05 = norm(homeOver05);
  homeOver15 = norm(homeOver15);

  const dc1x = home + draw;
  const dcx2 = draw + away;
  const dc12 = home + away;
  const dnbHome = home + draw > 0 ? home / (home + draw) : 0;
  const dnbAway = draw + away > 0 ? away / (draw + away) : 0;

  const ahHomeM05 = home;
  const ahAwayP05 = draw + away;
  let ahHomeM1w = 0;
  let ahHomeM1p = 0;
  for (let i = 0; i < m.length; i++) {
    for (let j = 0; j < (m[i]?.length ?? 0); j++) {
      const d = i - j;
      if (d > 1) ahHomeM1w += m[i][j];
      else if (d === 1) ahHomeM1p += m[i][j];
    }
  }
  const ahHomeM1 = norm(ahHomeM1w + 0.5 * ahHomeM1p);
  const ahAwayP1 = 1 - ahHomeM1;

  return {
    home,
    draw,
    away,
    over15,
    over25,
    over35,
    under15: 1 - over15,
    under25: 1 - over25,
    under35: 1 - over35,
    btts,
    bttsNo: 1 - btts,
    dc1x,
    dcx2,
    dc12,
    homeScores,
    awayScores,
    homeOver05,
    homeOver15,
    dnbHome,
    dnbAway,
    ahHomeM05: norm(ahHomeM05),
    ahAwayP05: norm(ahAwayP05),
    ahHomeM1,
    ahAwayP1,
    exactTop3: cells.slice(0, 3),
  };
}

/** Probabilidade de push em AH −1 (diferença exatamente 1). */
export function ahPushProbability(m: ScoreMatrix): number {
  let push = 0;
  for (let i = 0; i < m.length; i++) {
    for (let j = 0; j < (m[i]?.length ?? 0); j++) {
      if (i - j === 1) push += m[i][j];
    }
  }
  return push;
}

/**
 * P(A∧B) no MESMO jogo via matriz (não produto ingênuo).
 * `sat` recebe i,j e retorna true se ambos mercados satisfeitos.
 */
export function jointProbabilitySameGame(
  m: ScoreMatrix,
  sat: (i: number, j: number) => boolean,
): number {
  let s = 0;
  for (let i = 0; i < m.length; i++) {
    for (let j = 0; j < (m[i]?.length ?? 0); j++) {
      if (sat(i, j)) s += m[i][j];
    }
  }
  return s;
}

// ─── Persistência (Supabase team_ratings) ────────────────────────────

const fitCache = new Map<number, { ratings: LeagueRatings; ts: number }>();
const FIT_TTL = 6 * 60 * 60 * 1000;

export function invalidateRatingCaches(): void {
  fitCache.clear();
}

export async function getLeagueRatings(
  leagueId: number,
  matches: FinishedMatch[],
  opts?: FitOptions,
): Promise<LeagueRatings> {
  const cached = fitCache.get(leagueId);
  if (cached && Date.now() - cached.ts < FIT_TTL) return cached.ratings;

  if (matches.length === 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("team_ratings")
        .select("team_id, attack, defense, games")
        .eq("league_id", leagueId);
      if (data && data.length > 0) {
        const teams = new Map<string, TeamRating>();
        for (const row of data) {
          teams.set(`id:${row.team_id}`, {
            teamId: row.team_id,
            teamName: String(row.team_id),
            attack: row.attack,
            defense: row.defense,
            games: row.games,
          });
        }
        const ratings: LeagueRatings = {
          leagueId,
          homeAdvantage: Math.log(1.2),
          rho: -0.08,
          leagueAvgGoals: 1.3,
          teams,
          updatedAt: Date.now(),
        };
        fitCache.set(leagueId, { ratings, ts: Date.now() });
        return ratings;
      }
    } catch {
      // segue para fit
    }
  }

  const ratings = fitLeagueRatings(leagueId, matches, opts);
  fitCache.set(leagueId, { ratings, ts: Date.now() });

  if (process.env.SUPABASE_SERVICE_ROLE_KEY && matches.length > 0) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const rows = [...ratings.teams.values()].map((t) => ({
        league_id: leagueId,
        team_id: t.teamId,
        attack: t.attack,
        defense: t.defense,
        games: t.games,
        updated_at: new Date().toISOString(),
      }));
      if (rows.length) {
        await supabaseAdmin.from("team_ratings").upsert(rows, { onConflict: "league_id,team_id" });
      }
    } catch {
      // cache best-effort
    }
  }
  return ratings;
}
