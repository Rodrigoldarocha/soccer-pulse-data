const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

export type EspnEvent = {
  id: string;
  date: string;
  name: string;
  shortName: string;
  league: string;
  leagueName: string;
  status: "scheduled" | "inprogress" | "finished";
  clock: string;
  homeTeam: { id: string; name: string; short: string; logo: string };
  awayTeam: { id: string; name: string; short: string; logo: string };
  homeScore?: number;
  awayScore?: number;
  venue: string;
};

type EspnCompetitor = {
  team: { id: string; displayName: string; shortDisplayName: string; logo: string; abbreviation: string };
  score?: string;
  homeAway: "home" | "away";
  winner?: boolean;
};

const LEAGUE_MAP: Record<string, { slug: string; name: string }> = {
  "fifa.world": { slug: "fifa.world", name: "World Cup" },
  "bra.1": { slug: "bra.1", name: "Brasileirão Série A" },
  "eng.1": { slug: "eng.1", name: "Premier League" },
  "esp.1": { slug: "esp.1", name: "La Liga" },
  "ita.1": { slug: "ita.1", name: "Serie A" },
  "ger.1": { slug: "ger.1", name: "Bundesliga" },
  "fra.1": { slug: "fra.1", name: "Ligue 1" },
  "uefa.champions": { slug: "uefa.champions", name: "Champions League" },
  "uefa.europa": { slug: "uefa.europa", name: "Europa League" },
};

function mapStatus(s: { type: { state: string; completed: boolean; description: string }; displayClock: string }): { status: EspnEvent["status"]; clock: string } {
  if (s.type.completed) return { status: "finished", clock: "FT" };
  if (s.type.state === "pre") return { status: "scheduled", clock: "" };
  return { status: "inprogress", clock: s.displayClock ?? "" };
}

function parseEvent(e: {
  id: string;
  date: string;
  name: string;
  shortName: string;
  status: { type: { state: string; completed: boolean; description: string }; displayClock: string };
  competitions: Array<{
    competitors: EspnCompetitor[];
    venue?: { displayName: string };
  }>;
}, leagueSlug: string, leagueName: string): EspnEvent | null {
  const comp = e.competitions?.[0];
  if (!comp) return null;
  const home = comp.competitors?.find((c) => c.homeAway === "home");
  const away = comp.competitors?.find((c) => c.homeAway === "away");
  if (!home || !away) return null;

  const { status, clock } = mapStatus(e.status);
  return {
    id: e.id,
    date: e.date,
    name: e.name,
    shortName: e.shortName,
    league: leagueSlug,
    leagueName,
    status,
    clock,
    homeTeam: {
      id: home.team.id,
      name: home.team.displayName,
      short: home.team.abbreviation || home.team.shortDisplayName,
      logo: home.team.logo ?? "",
    },
    awayTeam: {
      id: away.team.id,
      name: away.team.displayName,
      short: away.team.abbreviation || away.team.shortDisplayName,
      logo: away.team.logo ?? "",
    },
    homeScore: home.score ? parseInt(home.score) : undefined,
    awayScore: away.score ? parseInt(away.score) : undefined,
    venue: comp.venue?.displayName ?? "",
  };
}

export function createEspnClient() {
  async function fetchLeague(slug: string): Promise<{ events: EspnEvent[]; leagueName: string } | null> {
    try {
      const res = await fetch(`${BASE}/${slug}/scoreboard`, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const data = await res.json() as {
        leagues?: Array<{ name?: string }>;
        events?: Array<{
          id: string; date: string; name: string; shortName: string;
          status: { type: { state: string; completed: boolean; description: string }; displayClock: string };
          competitions: Array<{
            competitors: EspnCompetitor[];
            venue?: { displayName: string };
          }>;
        }>;
      };
      const leagueName = data.leagues?.[0]?.name ?? slug;
      const events = (data.events ?? [])
        .map((e) => parseEvent(e, slug, leagueName))
        .filter((e): e is EspnEvent => e !== null);
      return { events, leagueName };
    } catch {
      return null;
    }
  }

  return {
    async getAllScoreboards(): Promise<EspnEvent[]> {
      const results = await Promise.all(
        Object.keys(LEAGUE_MAP).map((slug) => fetchLeague(slug)),
      );
      return results
        .filter((r): r is { events: EspnEvent[]; leagueName: string } => r !== null)
        .flatMap((r) => r.events);
    },

    async getScoreboard(leagueSlug: string): Promise<EspnEvent[]> {
      const meta = LEAGUE_MAP[leagueSlug];
      if (!meta) return [];
      const r = await fetchLeague(meta.slug);
      return r?.events ?? [];
    },
  };
}

export type EspnClient = ReturnType<typeof createEspnClient>;
