import type { LeagueId } from "./types";
import {
  fetchEventsByDate,
  fetchLeaguePastEvents,
  LEAGUE_IDS,
  type TsdbEvent,
} from "./api/thesportsdb";

// ─── Types ───────────────────────────────────────────────────────────

export interface PredictionInput {
  id: string;
  league: LeagueId;
  leagueLabel: string;
  apiLeagueId: string; // raw idLeague from TheSportsDB API
  homeTeam: string;
  awayTeam: string;
  eventDate: string;
  status: "scheduled" | "live" | "finished";
  homeScore?: number;
  awayScore?: number;
}

export interface TeamStats {
  gamesPlayed: number;
  goalsScored: number;
  goalsConceded: number;
  avgGoalsScored: number; // per game
  avgGoalsConceded: number; // per game
}

export interface PredictionResult {
  xgHome: number;
  xgAway: number;
  probHome: number;
  probDraw: number;
  probAway: number;
  probOver25: number;
  probBtts: number;
}

// ─── Poisson model ───────────────────────────────────────────────────

function poissonPMF(lambda: number, maxK = 6): number[] {
  const out: number[] = [];
  let p = Math.exp(-lambda);
  let f = p;
  out.push(p);
  for (let k = 1; k <= maxK; k++) {
    p = (p * lambda) / k;
    f += p;
    out.push(p);
  }
  return out.map((v) => v / f);
}

function computePoissonProbs(xgH: number, xgA: number) {
  const H = poissonPMF(xgH);
  const A = poissonPMF(xgA);
  let home = 0, draw = 0, away = 0, over25 = 0, btts = 0;
  for (let i = 0; i < H.length; i++) {
    for (let j = 0; j < A.length; j++) {
      const p = H[i] * A[j];
      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
      if (i + j > 2) over25 += p;
      if (i > 0 && j > 0) btts += p;
    }
  }
  return { home, draw, away, over25, btts };
}

// ─── Normalize team name ─────────────────────────────────────────────

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(fc|sc|cf|ac|afc|ssc|us|ud|cd|rc|rcd|real|sv|vfl|tsg|bvb|clube|regatas)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Compute team stats from historical events ───────────────────────

function computeTeamStats(events: TsdbEvent[], teamName: string): TeamStats {
  const norm = normalizeTeamName(teamName);
  let goalsScored = 0;
  let goalsConceded = 0;
  let games = 0;

  for (const ev of events) {
    const homeNorm = normalizeTeamName(ev.strHomeTeam);
    const awayNorm = normalizeTeamName(ev.strAwayTeam);
    const homeScore = parseInt(ev.intHomeScore ?? "0", 10);
    const awayScore = parseInt(ev.intAwayScore ?? "0", 10);

    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue;

    if (homeNorm === norm) {
      goalsScored += homeScore;
      goalsConceded += awayScore;
      games++;
    } else if (awayNorm === norm) {
      goalsScored += awayScore;
      goalsConceded += homeScore;
      games++;
    }
  }

  const gp = Math.max(games, 1);
  return {
    gamesPlayed: games,
    goalsScored,
    goalsConceded,
    avgGoalsScored: goalsScored / gp,
    avgGoalsConceded: goalsConceded / gp,
  };
}

// ─── Compute xG from team stats ──────────────────────────────────────

function computeXg(homeStats: TeamStats, awayStats: TeamStats): { xgHome: number; xgAway: number } {
  // League average goals per game (typical: ~2.6 total, ~1.3 per team)
  const leagueAvg = 1.3;

  // Offensive strength: how many goals above average does this team score?
  const homeOffense = homeStats.avgGoalsScored / leagueAvg;
  const awayOffense = awayStats.avgGoalsScored / leagueAvg;

  // Defensive weakness: how many goals above average does this team concede?
  const homeDefense = homeStats.avgGoalsConceded / leagueAvg;
  const awayDefense = awayStats.avgGoalsConceded / leagueAvg;

  // xG = league_avg * offense_strength * opponent_defense_weakness
  // Home advantage factor: ~1.2x
  const homeAdvantage = 1.2;

  const xgHome = +(leagueAvg * homeOffense * awayDefense * homeAdvantage).toFixed(2);
  const xgAway = +(leagueAvg * awayOffense * homeDefense).toFixed(2);

  return {
    xgHome: Math.max(0.3, Math.min(3.5, xgHome)),
    xgAway: Math.max(0.2, Math.min(3.0, xgAway)),
  };
}

// ─── Cache for league events ─────────────────────────────────────────

const leagueEventsCache = new Map<string, { events: TsdbEvent[]; timestamp: number }>();
const EVENTS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getLeagueEvents(leagueId: string): Promise<TsdbEvent[]> {
  const cached = leagueEventsCache.get(leagueId);
  if (cached && Date.now() - cached.timestamp < EVENTS_CACHE_TTL) {
    return cached.events;
  }

  const events = await fetchLeaguePastEvents(leagueId);
  if (events.length > 0) {
    leagueEventsCache.set(leagueId, { events, timestamp: Date.now() });
  }
  return events;
}

// ─── Main: generate predictions for today's events ───────────────────

export async function generatePredictions(dateISO?: string): Promise<PredictionInput[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = dateISO ?? today.toISOString().slice(0, 10);

  // Fetch today's events from TheSportsDB
  const allEvents = await fetchEventsByDate(dateStr);

  // Include all soccer events — mapped leagues get proper names, others get generic label
  const results: PredictionInput[] = [];

  for (const ev of allEvents) {
    // Find the matching LeagueId if it exists
    const league = Object.entries(LEAGUE_IDS).find(([, id]) => id === ev.idLeague);
    const leagueId = league ? league[0] as LeagueId : "premier-league" as LeagueId;
    const leagueLabel = league
      ? league[1].charAt(0).toUpperCase() + league[1].slice(1).replace(/-/g, " ")
      : ev.strLeague || "Liga";

    // Parse status — handle all API statuses:
    // finished, Match Finished, FT, notstarted, Not Started,
    // 1H, 2H, HT, 1st_half, 2nd_half, halftime, live, in progress
    let status: PredictionInput["status"] = "scheduled";
    const s = ev.strStatus?.toLowerCase() ?? "";
    if (s.includes("finished") || s === "ft" || s === "match finished") {
      status = "finished";
    } else if (
      s === "1h" || s === "2h" || s === "ht" ||
      s.includes("1st_half") || s.includes("2nd_half") ||
      s.includes("halftime") || s.includes("live") ||
      s === "in progress" || s === "inprogress"
    ) {
      status = "live";
    }

    const homeScore = ev.intHomeScore ? parseInt(ev.intHomeScore, 10) : undefined;
    const awayScore = ev.intAwayScore ? parseInt(ev.intAwayScore, 10) : undefined;

    results.push({
      id: ev.idEvent,
      league: leagueId,
      leagueLabel,
      apiLeagueId: ev.idLeague, // pass raw API league ID for historical data fetch
      homeTeam: ev.strHomeTeam,
      awayTeam: ev.strAwayTeam,
      eventDate: `${ev.dateEvent}T${ev.strTime ?? "00:00:00"}`,
      status,
      homeScore: Number.isNaN(homeScore) ? undefined : homeScore,
      awayScore: Number.isNaN(awayScore) ? undefined : awayScore,
    });
  }

  return results;
}

// ─── Main: compute prediction for a single match ─────────────────────

export async function computePrediction(
  homeTeam: string,
  awayTeam: string,
  leagueId: LeagueId,
  apiLeagueId?: string,
): Promise<PredictionResult> {
  // Use the raw API league ID directly for fetching past events
  // Falls back to our mapping if apiLeagueId not provided
  const tsdbLeagueId = apiLeagueId ?? LEAGUE_IDS[leagueId];

  // Get historical events for this league
  const events = tsdbLeagueId ? await getLeagueEvents(tsdbLeagueId) : [];

  // Compute team stats
  const homeStats = computeTeamStats(events, homeTeam);
  const awayStats = computeTeamStats(events, awayTeam);

  // If we have very little data, use league-average defaults
  const hasData = homeStats.gamesPlayed >= 3 && awayStats.gamesPlayed >= 3;

  const effectiveHome: TeamStats = hasData
    ? homeStats
    : { gamesPlayed: 0, goalsScored: 0, goalsConceded: 0, avgGoalsScored: 1.3, avgGoalsConceded: 1.1 };

  const effectiveAway: TeamStats = hasData
    ? awayStats
    : { gamesPlayed: 0, goalsScored: 0, goalsConceded: 0, avgGoalsScored: 1.1, avgGoalsConceded: 1.3 };

  // Compute xG
  const { xgHome, xgAway } = computeXg(effectiveHome, effectiveAway);

  // Run Poisson model
  const probs = computePoissonProbs(xgHome, xgAway);

  return {
    xgHome,
    xgAway,
    probHome: +probs.home.toFixed(4),
    probDraw: +probs.draw.toFixed(4),
    probAway: +probs.away.toFixed(4),
    probOver25: +probs.over25.toFixed(4),
    probBtts: +probs.btts.toFixed(4),
  };
}

export function invalidatePredictionCaches(): void {
  leagueEventsCache.clear();
}
