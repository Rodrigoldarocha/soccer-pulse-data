import { createServerFn } from "@tanstack/react-start";
import { fetchLeagueStandings, type TsdbStanding, LEAGUE_NAMES } from "./api/thesportsdb";

export interface LeagueStandings {
  league: string;
  leagueName: string;
  season: string;
  matchday: number;
  standings: StandingEntry[];
}

export interface StandingEntry {
  position: number;
  team: { id: string; name: string; shortName: string; crest: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string;
}

function mapStandings(leagueId: string, rows: TsdbStanding[]): LeagueStandings | null {
  if (rows.length === 0) return null;

  const leagueName = LEAGUE_NAMES[leagueId] ?? leagueId;

  return {
    league: leagueId,
    leagueName,
    season: new Date().getFullYear().toString(),
    matchday: 0,
    standings: rows.map((r) => ({
      position: parseInt(r.intRank, 10) || 0,
      team: {
        id: r.idTeam,
        name: r.strTeam,
        shortName: r.strTeam.substring(0, 3).toUpperCase(),
        crest: r.strBadge ?? "",
      },
      playedGames: parseInt(r.intPlayed, 10) || 0,
      won: parseInt(r.intWin, 10) || 0,
      draw: parseInt(r.intDraw, 10) || 0,
      lost: parseInt(r.intLoss, 10) || 0,
      points: parseInt(r.intPoints, 10) || 0,
      goalsFor: parseInt(r.intGoalsFor, 10) || 0,
      goalsAgainst: parseInt(r.intGoalsAgainst, 10) || 0,
      goalDifference: parseInt(r.intGoalDifference, 10) || 0,
      form: r.strForm ?? "",
    })),
  };
}

export const getStandings = createServerFn({ method: "GET" })
  .validator((leagueId: string) => leagueId)
  .handler(async ({ data: leagueId }): Promise<LeagueStandings | null> => {
    const rows = await fetchLeagueStandings(leagueId);
    return mapStandings(leagueId, rows);
  });

const ALL_LEAGUES = ["premier-league", "la-liga", "serie-a", "bundesliga", "ligue-1", "brasileirao", "champions-league", "europa-league"];

export const getStandingsForAll = createServerFn({ method: "GET" }).handler(async (): Promise<LeagueStandings[]> => {
  const results = await Promise.allSettled(
    ALL_LEAGUES.map(async (id) => {
      const rows = await fetchLeagueStandings(id);
      return mapStandings(id, rows);
    }),
  );
  return results
    .filter((r): r is PromiseFulfilledResult<LeagueStandings> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);
});
