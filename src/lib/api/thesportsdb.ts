const BASE = "https://www.thesportsdb.com/api/v1/json/3";

// ─── Shared JSON client (rate-limit aware) ───────────────────────────
// A chave pública do TheSportsDB é fortemente limitada (HTTP 429).
// Requests são serializados, espaçados, repetidos com backoff e
// memoizados em memória para evitar respostas vazias.

const responseCache = new Map<string, { data: unknown; timestamp: number }>();
let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;
const MIN_GAP_MS = 350;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tsdbJson<T>(
  path: string,
  opts: { ttlMs?: number; timeoutMs?: number; retries?: number } = {},
): Promise<T | null> {
  const { ttlMs = 5 * 60 * 1000, timeoutMs = 8000, retries = 3 } = opts;
  const url = `${BASE}/${path}`;

  const cached = responseCache.get(url);
  if (cached && Date.now() - cached.timestamp < ttlMs) return cached.data as T;

  const run = async (): Promise<T | null> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const gap = Date.now() - lastCall;
      if (gap < MIN_GAP_MS) await sleep(MIN_GAP_MS - gap);
      lastCall = Date.now();
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
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

// TheSportsDB league IDs — these are the ACTUAL IDs returned by the API
// Map is from our internal slug → API idLeague. Used only for league name lookup.
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
  "liga-argentina": "4406",
  "argentina-b": "4616",
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
  "usl-championship": "4684",
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
  const data = await tsdbJson<{ events?: TsdbEvent[] | null }>(
    `eventsday.php?d=${date}&s=Soccer`,
    { ttlMs: 10 * 60 * 1000 },
  );
  return data?.events ?? [];
}

// ─── League standings ────────────────────────────────────────────────

export async function fetchLeagueStandings(leagueId: string): Promise<TsdbStanding[]> {
  const tsdbId = LEAGUE_IDS[leagueId] ?? leagueId;
  const data = await tsdbJson<{ table?: TsdbStanding[] }>(`lookuptable.php?l=${tsdbId}`, {
    ttlMs: 60 * 60 * 1000,
  });
  return data?.table ?? [];
}

// ─── Past league events (for computing team stats) ───────────────────

export async function fetchLeaguePastEvents(leagueId: string): Promise<TsdbEvent[]> {
  const tsdbId = LEAGUE_IDS[leagueId] ?? leagueId;
  const data = await tsdbJson<{ events?: TsdbEvent[] }>(`eventspastleague.php?id=${tsdbId}`, {
    ttlMs: 60 * 60 * 1000,
  });
  return data?.events ?? [];
}

// ─── Team last results ───────────────────────────────────────────────

export async function fetchTeamLastResults(tsdbTeamId: string): Promise<TsdbEvent[]> {
  const data = await tsdbJson<{ results?: TsdbEvent[] }>(`eventslast.php?id=${tsdbTeamId}`, {
    ttlMs: 60 * 60 * 1000,
  });
  return data?.results ?? [];
}

// ─── Search team by name ─────────────────────────────────────────────

export async function fetchTeamId(teamName: string): Promise<string | null> {
  const query = encodeURIComponent(teamName);
  const data = await tsdbJson<{ teams?: Array<{ idTeam: string }> }>(
    `searchteams.php?t=${query}`,
    { ttlMs: 24 * 60 * 60 * 1000 },
  );
  return data?.teams?.[0]?.idTeam ?? null;
}
