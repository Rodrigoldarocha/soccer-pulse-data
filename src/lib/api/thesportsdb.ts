const BASE = "https://www.thesportsdb.com/api/v1/json/3";

// ─── Logo cache ──────────────────────────────────────────────────────

const logoCache = new Map<string, { badge: string; timestamp: number }>();
const LOGO_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export async function fetchTeamBadge(teamName: string): Promise<string | null> {
  const key = teamName.toLowerCase().trim();
  const cached = logoCache.get(key);
  if (cached && Date.now() - cached.timestamp < LOGO_CACHE_TTL) {
    return cached.badge || null;
  }

  try {
    const query = encodeURIComponent(teamName);
    const res = await fetch(`${BASE}/searchteams.php?t=${query}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { teams?: Array<{ strBadge?: string }> };
    const badge = data.teams?.[0]?.strBadge ?? null;
    logoCache.set(key, { badge: badge ?? "", timestamp: Date.now() });
    return badge;
  } catch {
    return null;
  }
}

export function clearLogoCache(): void {
  logoCache.clear();
}

// ─── Types ───────────────────────────────────────────────────────────

export interface TsdbEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string; // "Not Started", "Match Finished", "1H", "2H", "HT", "FT", etc.
  dateEvent: string;
  strTime: string;
  idLeague: string;
  strLeague: string;
}

export interface TsdbStanding {
  intRank: string;
  idTeam: string;
  strTeam: string;
  strBadge: string;
  intPlayed: string;
  intWin: string;
  intDraw: string;
  intLoss: string;
  intGoalsFor: string;
  intGoalsAgainst: string;
  intGoalDifference: string;
  intPoints: string;
  strForm: string;
}

export interface TsdbStandingResponse {
  table: TsdbStanding[];
}

// ─── League ID mapping ───────────────────────────────────────────────

export const LEAGUE_IDS: Record<string, string> = {
  "premier-league": "4328",
  "la-liga": "4335",
  "serie-a": "4336",
  "bundesliga": "4331",
  "ligue-1": "4334",
  "brasileirao": "4341",
  "champions-league": "4329",
  "europa-league": "4313",
  "eredivisie": "4337",
  "primeira-liga": "4338",
  "championship": "4327",
  "super-lig": "4333",
  "russian-premier-league": "4332",
  "liga-mx": "4339",
  "mls": "4314",
  "liga-argentina": "4342",
  "a-league": "4345",
  "saudi-pro-league": "4347",
  "j-league": "4346",
  "k-league": "4349",
  "chinese-super-league": "4348",
  "super-league-greece": "4344",
  "belgian-pro-league": "4343",
  "swiss-super-league": "4351",
  "scottish-premiership": "4330",
  "austrian-bundesliga": "4352",
  "allsvenskan": "4353",
  "danish-superliga": "4354",
  "norwegian-eliteserien": "4355",
  "brasileirao-serie-b": "4340",
  "serie-b-italy": "4356",
  "la-liga-2": "4357",
  "bundesliga-2": "4358",
  "ligue-2": "4359",
};

export const LEAGUE_NAMES: Record<string, string> = {
  "4328": "Premier League",
  "4335": "La Liga",
  "4336": "Serie A",
  "4331": "Bundesliga",
  "4334": "Ligue 1",
  "4341": "Brasileirão",
  "4329": "Champions League",
  "4313": "Europa League",
};

// ─── Events by date ──────────────────────────────────────────────────

export async function fetchEventsByDate(date: string): Promise<TsdbEvent[]> {
  try {
    const res = await fetch(`${BASE}/eventsday.php?d=${date}&s=Soccer`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: TsdbEvent[] | null };
    return data.events ?? [];
  } catch {
    return [];
  }
}

// ─── League standings ────────────────────────────────────────────────

export async function fetchLeagueStandings(leagueId: string): Promise<TsdbStanding[]> {
  const tsdbId = LEAGUE_IDS[leagueId] ?? leagueId;
  try {
    const res = await fetch(`${BASE}/lookuptable.php?l=${tsdbId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { table?: TsdbStanding[] };
    return data.table ?? [];
  } catch {
    return [];
  }
}

// ─── Past league events (for computing team stats) ───────────────────

export async function fetchLeaguePastEvents(leagueId: string): Promise<TsdbEvent[]> {
  const tsdbId = LEAGUE_IDS[leagueId] ?? leagueId;
  try {
    const res = await fetch(`${BASE}/eventspastleague.php?id=${tsdbId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: TsdbEvent[] };
    return data.events ?? [];
  } catch {
    return [];
  }
}

// ─── Team last results ───────────────────────────────────────────────

export async function fetchTeamLastResults(tsdbTeamId: string): Promise<TsdbEvent[]> {
  try {
    const res = await fetch(`${BASE}/eventslast.php?id=${tsdbTeamId}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: TsdbEvent[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

// ─── Search team by name ─────────────────────────────────────────────

export async function fetchTeamId(teamName: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(teamName);
    const res = await fetch(`${BASE}/searchteams.php?t=${query}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { teams?: Array<{ idTeam: string }> };
    return data.teams?.[0]?.idTeam ?? null;
  } catch {
    return null;
  }
}
