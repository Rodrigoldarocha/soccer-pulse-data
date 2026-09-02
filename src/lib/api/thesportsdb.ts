// ─── Bzzoiro Sports Data API client ──────────────────────────────────
// Replaces the old TheSportsDB client. Keeps the same exported interface
// so consumers (prediction-engine, standings, etc.) don't need changes.

const BASE = "https://sports.bzzoiro.com/api/v2";
const IMG_BASE = "https://sports.bzzoiro.com/img";

function getToken(): string {
  const t =
    (typeof process !== "undefined" && process.env?.BZZOIRO_TOKEN) ||
    "";
  return t;
}

// ─── Shared JSON client (rate-limit aware) ───────────────────────────

const responseCache = new Map<string, { data: unknown; timestamp: number }>();
let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;
const MIN_GAP_MS = 350;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiJson<T>(
  path: string,
  opts: { ttlMs?: number; timeoutMs?: number; retries?: number } = {},
): Promise<T | null> {
  const { ttlMs = 5 * 60 * 1000, timeoutMs = 8000, retries = 3 } = opts;
  const url = path.startsWith("http") ? path : `${BASE}/${path}`;

  const cached = responseCache.get(url);
  if (cached && Date.now() - cached.timestamp < ttlMs) return cached.data as T;

  const token = getToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Token ${token}`;

  const run = async (): Promise<T | null> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const gap = Date.now() - lastCall;
      if (gap < MIN_GAP_MS) await sleep(MIN_GAP_MS - gap);
      lastCall = Date.now();
      try {
        const res = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.status === 429 || res.status >= 500) {
          if (attempt < retries) {
            await sleep(600 * Math.pow(2, attempt));
            continue;
          }
          return null;
        }
        if (!res.ok) return null;
        const text = await res.text();
        if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
          if (attempt < retries) {
            await sleep(600 * Math.pow(2, attempt));
            continue;
          }
          return null;
        }
        const data = JSON.parse(text) as T;
        responseCache.set(url, { data, timestamp: Date.now() });
        return data;
      } catch {
        if (attempt < retries) {
          await sleep(600 * Math.pow(2, attempt));
          continue;
        }
        return null;
      }
    }
    return null;
  };

  const queued = chain.then(run, run) as Promise<T | null>;
  chain = queued.catch(() => undefined);
  return queued;
}

export function clearTsdbCache(): void {
  responseCache.clear();
}

// ─── Logo cache ──────────────────────────────────────────────────────

const logoCache = new Map<string, { badge: string; timestamp: number }>();
const LOGO_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/**
 * Fetch team badge URL. Uses the Bzzoiro Image API (no auth needed).
 * First resolves team_id via search, then builds the image URL.
 */
export async function fetchTeamBadge(teamName: string): Promise<string | null> {
  const key = teamName.toLowerCase().trim();
  const cached = logoCache.get(key);
  if (cached && Date.now() - cached.timestamp < LOGO_CACHE_TTL) {
    return cached.badge || null;
  }

  const teamId = await fetchTeamId(teamName);
  const badge = teamId ? `${IMG_BASE}/team/${teamId}/` : null;
  if (badge) logoCache.set(key, { badge, timestamp: Date.now() });
  return badge;
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
  strTimezone: string; // e.g. "+00:00" or "Z"
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
// Maps our internal slugs → Bzzoiro league IDs.

export const LEAGUE_IDS: Record<string, string> = {
  "premier-league": "1",
  "la-liga": "3",
  "serie-a": "4",
  "bundesliga": "5",
  "ligue-1": "6",
  "brasileirao": "9",
  "champions-league": "7",
  "europa-league": "8",
  "eredivisie": "10",
  "primeira-liga": "2",
  "championship": "12",
  "super-lig": "11",
  "liga-mx": "19",
  "mls": "18",
  "a-league": "70",
  "saudi-pro-league": "17",
  "j-league": "49",
  "k-league": "50",
  "chinese-super-league": "52",
  "super-league-greece": "24",
  "belgian-pro-league": "14",
  "swiss-super-league": "15",
  "scottish-premiership": "13",
  "allsvenskan": "26",
  "danish-superliga": "84",
  "norwegian-eliteserien": "54",
  "brasileirao-serie-b": "34",
  "serie-b-italy": "38",
  "la-liga-2": "38",
  "bundesliga-2": "104",
  "ligue-2": "89",
  "usl-championship": "57",
  "veikkausliiga": "55",
  "npl-queensland": "70",
};

export const LEAGUE_NAMES: Record<string, string> = {
  "1": "Premier League",
  "2": "Liga Portugal",
  "3": "La Liga",
  "4": "Serie A",
  "5": "Bundesliga",
  "6": "Ligue 1",
  "7": "Champions League",
  "8": "Europa League",
  "9": "Brasileirão",
  "10": "Eredivisie",
  "11": "Super Lig",
  "12": "Championship",
  "13": "Scottish Premiership",
  "14": "Belgian Pro League",
  "15": "Swiss Super League",
  "17": "Saudi Pro League",
  "18": "MLS",
  "19": "Liga MX",
  "24": "Super League Greece",
  "26": "Allsvenskan",
  "34": "Brasileirão Serie B",
  "38": "La Liga 2",
  "42": "Coppa Italia",
  "49": "J1 League",
  "50": "K League 1",
  "52": "Chinese Super League",
  "54": "Eliteserien",
  "55": "Veikkausliiga",
  "57": "USL Championship",
  "70": "A-League",
  "84": "Danish Superliga",
  "87": "League One",
  "89": "Ligue 2",
  "91": "National League",
  "92": "League Two",
  "93": "Serie B",
  "94": "EFL Trophy",
  "95": "FA Cup",
  "96": "League Cup",
  "97": "DFB Pokal",
  "98": "Coupe de France",
  "99": "Copa del Rey",
  "100": "Taça de Portugal",
  "101": "FA Trophy",
  "102": "Conference League",
  "103": "Super Lig",
  "104": "Bundesliga 2",
};

// ─── Bzzoiro event → TsdbEvent mapping ───────────────────────────────

interface BzzoiroEvent {
  id: number;
  league_id: number;
  season_id: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  event_date: string;
  status: string;
  current_minute?: number | null;
  period?: string;
}

function mapBzzoiroEvent(ev: BzzoiroEvent): TsdbEvent {
  // Parse event_date "2026-09-01T22:30:00+00:00" → dateEvent + strTime
  const dt = ev.event_date ?? "";
  const datePart = dt.slice(0, 10);
  const timePart = dt.slice(11, 19) || "00:00:00";
  const tzPart = dt.slice(19) || "Z";

  // Map Bzzoiro status to our display status
  // API returns: "finished", "notstarted", "1st_half", "2nd_half", "halftime"
  let strStatus: string;
  const rawStatus = (ev.status ?? "").toLowerCase();
  if (rawStatus === "finished") {
    strStatus = "Match Finished";
  } else if (rawStatus === "notstarted") {
    strStatus = "Not Started";
  } else if (
    rawStatus === "1st_half" ||
    rawStatus === "2nd_half" ||
    rawStatus === "halftime" ||
    rawStatus === "inprogress"
  ) {
    // Live: map period to standard display
    const p = (ev.period ?? "").toUpperCase();
    if (p === "1H" || p === "1T") strStatus = "1H";
    else if (p === "2H" || p === "2T") strStatus = "2H";
    else if (p === "HT") strStatus = "HT";
    else strStatus = "1H"; // default live
  } else {
    strStatus = ev.status;
  }

  const leagueId = String(ev.league_id);
  const leagueName = LEAGUE_NAMES[leagueId] ?? `League ${leagueId}`;

  return {
    idEvent: String(ev.id),
    strEvent: `${ev.home_team} vs ${ev.away_team}`,
    strHomeTeam: ev.home_team,
    strAwayTeam: ev.away_team,
    intHomeScore: ev.home_score != null ? String(ev.home_score) : null,
    intAwayScore: ev.away_score != null ? String(ev.away_score) : null,
    strStatus,
    dateEvent: datePart,
    strTime: timePart,
    strTimezone: tzPart,
    idLeague: leagueId,
    strLeague: leagueName,
  };
}

// ─── Events by date ──────────────────────────────────────────────────

interface BzzoiroPaginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function fetchEventsByDate(date: string): Promise<TsdbEvent[]> {
  return fetchEventsByDateRange(date, date);
}

export async function fetchEventsByDateRange(from: string, to: string): Promise<TsdbEvent[]> {
  const seen = new Set<string>();
  const allEvents: TsdbEvent[] = [];
  let pageUrl: string | null = `events/?date_from=${from}&date_to=${to}&limit=200`;

  // Paginate through all results
  while (pageUrl) {
    const page: BzzoiroPaginated<BzzoiroEvent> | null = await apiJson(pageUrl, {
      ttlMs: 10 * 60 * 1000,
    });
    if (!page?.results) break;
    for (const ev of page.results.map(mapBzzoiroEvent)) {
      if (!seen.has(ev.idEvent)) {
        seen.add(ev.idEvent);
        allEvents.push(ev);
      }
    }
    pageUrl = page.next ? page.next.replace(`${BASE}/`, "") : null;
  }

  return allEvents;
}

// ─── League standings ────────────────────────────────────────────────

interface BzzoiroStandingsResponse {
  league_id: number;
  season: { id: number; name: string; year: number };
  standings: Array<{
    position: number;
    team_id: number;
    team_name: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    gd: number;
    pts: number;
    form: string;
  }>;
}

export async function fetchLeagueStandings(leagueId: string): Promise<TsdbStanding[]> {
  const tsdbId = LEAGUE_IDS[leagueId] ?? leagueId;
  const data = await apiJson<BzzoiroStandingsResponse>(`leagues/${tsdbId}/standings/`, {
    ttlMs: 60 * 60 * 1000,
  });
  if (!data?.standings) return [];

  return data.standings.map((r) => ({
    intRank: String(r.position),
    idTeam: String(r.team_id),
    strTeam: r.team_name,
    strBadge: `${IMG_BASE}/team/${r.team_id}/`,
    intPlayed: String(r.played),
    intWin: String(r.won),
    intDraw: String(r.drawn),
    intLoss: String(r.lost),
    intGoalsFor: String(r.gf),
    intGoalsAgainst: String(r.ga),
    intGoalDifference: String(r.gd),
    intPoints: String(r.pts),
    strForm: r.form ?? "",
  }));
}

// ─── Past league events (for computing team stats) ───────────────────

export async function fetchLeaguePastEvents(leagueId: string): Promise<TsdbEvent[]> {
  const tsdbId = LEAGUE_IDS[leagueId] ?? leagueId;
  const seen = new Set<string>();
  const allEvents: TsdbEvent[] = [];
  let offset = 0;
  const limit = 200;

  // Fetch finished events, paginating through all results
  while (true) {
    const page = await apiJson<BzzoiroPaginated<BzzoiroEvent>>(
      `events/?league_id=${tsdbId}&status=finished&limit=${limit}&offset=${offset}`,
      { ttlMs: 60 * 60 * 1000 },
    );
    if (!page?.results) break;
    for (const ev of page.results.map(mapBzzoiroEvent)) {
      if (!seen.has(ev.idEvent)) {
        seen.add(ev.idEvent);
        allEvents.push(ev);
      }
    }
    if (!page.next || page.results.length < limit) break;
    offset += limit;
  }

  return allEvents;
}

// ─── Team last results ───────────────────────────────────────────────

export async function fetchTeamLastResults(tsdbTeamId: string): Promise<TsdbEvent[]> {
  const seen = new Set<string>();
  const allEvents: TsdbEvent[] = [];
  let offset = 0;
  const limit = 20;

  while (true) {
    const page = await apiJson<BzzoiroPaginated<BzzoiroEvent>>(
      `events/?team_id=${tsdbTeamId}&status=finished&limit=${limit}&offset=${offset}`,
      { ttlMs: 60 * 60 * 1000 },
    );
    if (!page?.results) break;
    for (const ev of page.results.map(mapBzzoiroEvent)) {
      if (!seen.has(ev.idEvent)) {
        seen.add(ev.idEvent);
        allEvents.push(ev);
      }
    }
    if (!page.next || page.results.length < limit) break;
    offset += limit;
  }

  return allEvents;
}

// ─── Search team by name ─────────────────────────────────────────────

export async function fetchTeamId(teamName: string): Promise<string | null> {
  const query = encodeURIComponent(teamName);
  const data = await apiJson<BzzoiroPaginated<{ id: number; name: string }>>(
    `teams/?name=${query}&limit=10`,
    { ttlMs: 24 * 60 * 60 * 1000 },
  );
  if (!data?.results?.length) return null;

  // Try exact match first
  const lower = teamName.toLowerCase();
  const exact = data.results.find((t) => t.name.toLowerCase() === lower);
  return String(exact?.id ?? data.results[0].id);
}
