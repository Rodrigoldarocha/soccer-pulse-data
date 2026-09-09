import { apiJson } from "./thesportsdb";

// ─── Detalhes por partida (Fase 1) ─────────────────────────────────────
// Todos os fetchers retornam null em qualquer divergência de shape/rede.
// Shapes baseados no OpenAPI público; parsing tolerante a variações.
// Nenhum dado mockado: null vira estado vazio na UI.

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function validEventId(id: string): boolean {
  return /^\d+$/.test(id);
}

// ─── Predição CatBoost da API (Fase 4) ─────────────────────────────────
// PredictionV2 traz probabilidades 0-100. Exibida ao lado do motor local,
// sem substituir: o usuário vê as duas. Null em qualquer divergência.

export interface ApiPrediction {
  home: number;
  draw: number;
  away: number;
  over25: number | null;
  btts: number | null;
  xgHome: number | null;
  xgAway: number | null;
  predicted: string | null;
}

function toUnit(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  const u = n > 1 ? n / 100 : n;
  return u >= 0 && u <= 1 ? u : null;
}

function pickProb(o: unknown, keys: string[]): number | null {
  if (!isObj(o)) return null;
  for (const k of keys) {
    const u = toUnit(o[k]);
    if (u != null) return u;
  }
  return null;
}

/** xG é absoluto (ex: 1.8), não 0-100. */
function toGoals(v: unknown): number | null {
  const n = num(v);
  return n != null && n >= 0 && n <= 10 ? +n.toFixed(2) : null;
}

export async function fetchApiPrediction(eventId: string): Promise<ApiPrediction | null> {
  if (!validEventId(eventId)) return null;
  const data = await apiJson<unknown>(`events/${eventId}/prediction/`, {
    ttlMs: 30 * 60 * 1000,
  }).catch(() => null);
  if (!isObj(data)) return null;
  const markets = isObj(data.markets)
    ? data.markets
    : isObj(data.prediction)
      ? data.prediction
      : null;
  if (!markets) return null;
  const mr = isObj(markets.match_result) ? markets.match_result : null;
  const home = mr ? toUnit(mr.prob_home) : null;
  const draw = mr ? toUnit(mr.prob_draw) : null;
  const away = mr ? toUnit(mr.prob_away) : null;
  if (home == null || draw == null || away == null) return null;
  const xg = isObj(markets.expected_goals) ? markets.expected_goals : null;
  const ou = isObj(markets.over_under) ? markets.over_under : null;
  const btts = isObj(markets.btts) ? markets.btts : null;
  return {
    home,
    draw,
    away,
    over25:
      pickProb(ou, ["over_2_5", "over25", "over_2.5", "o25"]) ??
      (isObj(ou?.lines) ? pickProb(ou.lines, ["over_2_5", "over25"]) : null),
    btts: pickProb(btts, ["prob_yes", "btts_yes", "yes", "probability", "prob"]),
    xgHome: xg ? toGoals(xg.home) : null,
    xgAway: xg ? toGoals(xg.away) : null,
    predicted: mr ? (str(mr.predicted) ?? null) : null,
  };
}

// ─── Ao vivo real (Fase 3) ─────────────────────────────────────────────

export interface LiveEvent {
  id: string;
  leagueId: string | null;
  leagueName: string | null;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  kickoff: string | null;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
}

function toLiveEvent(o: unknown): LiveEvent | null {
  if (!isObj(o)) return null;
  const id = o.id;
  if (typeof id !== "number" && typeof id !== "string") return null;
  const home = str(o.home_team) ?? null;
  const away = str(o.away_team) ?? null;
  if (!home || !away) return null;
  const status = str(o.status) ?? "";
  if (status !== "inprogress" && status !== "penalties") return null;
  const hid = o.home_team_id;
  const aid = o.away_team_id;
  return {
    id: String(id),
    leagueId: o.league_id != null ? String(o.league_id as number) : null,
    leagueName: str(o.league_name) ?? null,
    homeTeam: home,
    awayTeam: away,
    homeTeamId: typeof hid === "number" ? String(hid) : (str(hid) ?? null),
    awayTeamId: typeof aid === "number" ? String(aid) : (str(aid) ?? null),
    kickoff: str(o.event_date) ?? null,
    minute: num(o.current_minute),
    homeScore: num(o.home_score),
    awayScore: num(o.away_score),
  };
}

/** Jogos em andamento com minuto e placar. Null quando sem token/sem live. */
export async function fetchLiveEvents(): Promise<LiveEvent[] | null> {
  const data = await apiJson<unknown>(`events/live/?limit=100`, { ttlMs: 30 * 1000 }).catch(
    () => null,
  );
  if (!data) return null;
  const pool: unknown[] = Array.isArray(data) ? data : arr(isObj(data) ? data.events : []);
  const live = pool.map(toLiveEvent).filter((e): e is LiveEvent => e !== null);
  return live.length > 0 ? live : null;
}

// ─── Cabeçalho do evento ───────────────────────────────────────────────

export interface EventHeader {
  homeName: string;
  awayName: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  leagueName: string | null;
  kickoff: string | null;
  status: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

export async function fetchEventHeader(eventId: string): Promise<EventHeader | null> {
  if (!validEventId(eventId)) return null;
  const data = await apiJson<unknown>(`events/${eventId}/`, { ttlMs: 5 * 60 * 1000 }).catch(
    () => null,
  );
  if (!isObj(data)) return null;
  const homeName = str(data.home_team) ?? null;
  const awayName = str(data.away_team) ?? null;
  if (!homeName || !awayName) return null;
  const hid = data.home_team_id;
  const aid = data.away_team_id;
  return {
    homeName,
    awayName,
    homeTeamId: typeof hid === "number" ? String(hid) : (str(hid) ?? null),
    awayTeamId: typeof aid === "number" ? String(aid) : (str(aid) ?? null),
    leagueName: str(data.league_name) ?? str(data.league) ?? null,
    kickoff: str(data.event_date) ?? null,
    status: str(data.status) ?? null,
    homeScore: num(data.home_score),
    awayScore: num(data.away_score),
  };
}

// ─── Confronto direto + forma ──────────────────────────────────────────

export interface H2HMatch {
  date: string | null;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface H2HData {
  homeWins: number;
  draws: number;
  awayWins: number;
  matches: H2HMatch[];
}

function toH2HMatch(o: unknown): H2HMatch | null {
  if (!isObj(o)) return null;
  const home = str(o.home_team) ?? str(o.homeTeam) ?? str(o.home) ?? str(o.team_home) ?? null;
  const away = str(o.away_team) ?? str(o.awayTeam) ?? str(o.away) ?? str(o.team_away) ?? null;
  if (!home || !away) return null;
  return {
    date: str(o.event_date) ?? str(o.date) ?? str(o.dateEvent) ?? null,
    home,
    away,
    homeScore: num(o.home_score) ?? num(o.intHomeScore) ?? num(o.homeScore) ?? null,
    awayScore: num(o.away_score) ?? num(o.intAwayScore) ?? num(o.awayScore) ?? null,
  };
}

function summarizeH2H(matches: H2HMatch[], homeName: string, awayName: string): H2HData {
  const norm = (s: string) => s.toLowerCase().trim();
  const hn = norm(homeName);
  const an = norm(awayName);
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  for (const m of matches) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const mHomeIsHome = norm(m.home) === hn || norm(m.away) === an;
    const homeGoals = mHomeIsHome ? m.homeScore : m.awayScore;
    const awayGoals = mHomeIsHome ? m.awayScore : m.homeScore;
    if (homeGoals === awayGoals) draws++;
    else if (homeGoals > awayGoals) homeWins++;
    else awayWins++;
  }
  return { homeWins, draws, awayWins, matches };
}

export async function fetchH2H(
  eventId: string,
  homeName: string,
  awayName: string,
): Promise<H2HData | null> {
  if (!validEventId(eventId)) return null;
  const data = await apiJson<unknown>(`events/${eventId}/h2h/`, { ttlMs: 60 * 60 * 1000 }).catch(
    () => null,
  );
  if (!data) return null;
  const pool: unknown[] = Array.isArray(data)
    ? data
    : [
        ...arr(isObj(data) ? data.matches : []),
        ...arr(isObj(data) ? data.recent_matches : []),
        ...arr(isObj(data) ? (isObj(data.h2h) ? data.h2h.matches : []) : []),
        ...arr(isObj(data) ? data.results : []),
        ...arr(isObj(data) ? data.games : []),
      ];
  const matches = pool
    .map(toH2HMatch)
    .filter((m): m is H2HMatch => m !== null)
    .slice(0, 10);
  if (matches.length === 0) return null;
  return summarizeH2H(matches, homeName, awayName);
}

export interface FormEntry extends H2HMatch {
  result: "W" | "D" | "L";
}

export interface TeamForm {
  team: string;
  teamId: string | null;
  wins: number;
  draws: number;
  losses: number;
  last5: FormEntry[];
}

export async function fetchTeamForm(
  teamId: string | null,
  teamName: string,
): Promise<TeamForm | null> {
  if (!teamId || !validEventId(teamId)) return null;
  const data = await apiJson<unknown>(`teams/${teamId}/fixtures/?limit=10`, {
    ttlMs: 30 * 60 * 1000,
  }).catch(() => null);
  if (!data) return null;
  const pool: unknown[] = Array.isArray(data) ? data : arr(isObj(data) ? data.results : []);
  const norm = teamName.toLowerCase().trim();
  const last5: FormEntry[] = [];
  for (const raw of pool) {
    const m = toH2HMatch(raw);
    if (!m || m.homeScore == null || m.awayScore == null) continue;
    if (m.home.toLowerCase().trim() !== norm && m.away.toLowerCase().trim() !== norm) continue;
    const isHome = m.home.toLowerCase().trim() === norm;
    const gf = isHome ? m.homeScore : m.awayScore;
    const ga = isHome ? m.awayScore : m.homeScore;
    last5.push({ ...m, result: gf === ga ? "D" : gf > ga ? "W" : "L" });
    if (last5.length >= 5) break;
  }
  if (last5.length === 0) return null;
  return {
    team: teamName,
    teamId,
    wins: last5.filter((f) => f.result === "W").length,
    draws: last5.filter((f) => f.result === "D").length,
    losses: last5.filter((f) => f.result === "L").length,
    last5,
  };
}

// ─── Escalações ────────────────────────────────────────────────────────

export interface LineupPlayer {
  name: string;
  number: string | null;
  position: string | null;
}

export interface Lineups {
  status: "predicted" | "confirmed" | "unavailable";
  home: LineupPlayer[];
  away: LineupPlayer[];
  homeFormation: string | null;
  awayFormation: string | null;
}

function toLineupPlayer(o: unknown): LineupPlayer | null {
  if (!isObj(o)) return null;
  const name = str(o.name) ?? str(o.player_name) ?? str(o.short_name) ?? null;
  if (!name) return null;
  return {
    name,
    number: str(o.jersey_number) ?? str(o.number) ?? str(o.shirt_number) ?? null,
    position: str(o.position) ?? str(o.pos) ?? null,
  };
}

function parseSide(o: unknown): { players: LineupPlayer[]; formation: string | null } {
  if (!isObj(o)) return { players: [], formation: null };
  const pool: unknown[] = [
    ...arr(o.players),
    ...arr(o.starting_xi),
    ...arr(o.lineup),
    ...arr(o.squad),
  ];
  return {
    players: pool.map(toLineupPlayer).filter((p): p is LineupPlayer => p !== null),
    formation: str(o.formation) ?? null,
  };
}

export async function fetchLineups(eventId: string): Promise<Lineups | null> {
  if (!validEventId(eventId)) return null;
  const data = await apiJson<unknown>(`events/${eventId}/lineups/`, {
    ttlMs: 15 * 60 * 1000,
  }).catch(() => null);
  if (!isObj(data)) return null;
  const rawStatus = str(data.lineup_status) ?? "";
  const status: Lineups["status"] =
    rawStatus === "confirmed"
      ? "confirmed"
      : rawStatus === "predicted"
        ? "predicted"
        : "unavailable";
  const sides = isObj(data.lineups) ? data.lineups : data;
  const homeRaw = isObj(sides)
    ? (sides.home ?? sides.home_team ?? sides.team_home ?? sides[0])
    : null;
  const awayRaw = isObj(sides)
    ? (sides.away ?? sides.away_team ?? sides.team_away ?? sides[1])
    : null;
  const home = parseSide(homeRaw);
  const away = parseSide(awayRaw);
  if (status === "unavailable" || (home.players.length === 0 && away.players.length === 0)) {
    return { status: "unavailable", home: [], away: [], homeFormation: null, awayFormation: null };
  }
  return {
    status,
    home: home.players,
    away: away.players,
    homeFormation: home.formation,
    awayFormation: away.formation,
  };
}

// ─── Estatísticas ──────────────────────────────────────────────────────

export interface StatRow {
  label: string;
  home: string;
  away: string;
}

const STAT_LABELS: Record<string, string> = {
  possession: "Posse de bola",
  shots: "Finalizações",
  shots_on_target: "Finalizações no gol",
  corners: "Escanteios",
  fouls: "Faltas",
  yellow_cards: "Cartões amarelos",
  red_cards: "Cartões vermelhos",
  offsides: "Impedimentos",
  passes: "Passes",
  pass_accuracy: "Precisão de passes",
  expected_goals: "Gols esperados (xG)",
};

function prettyStatLabel(key: string): string {
  const k = key.toLowerCase().replace(/[\s-]+/g, "_");
  return STAT_LABELS[k] ?? key.replace(/_/g, " ");
}

export async function fetchMatchStats(eventId: string): Promise<StatRow[] | null> {
  if (!validEventId(eventId)) return null;
  const data = await apiJson<unknown>(`events/${eventId}/stats/`, { ttlMs: 5 * 60 * 1000 }).catch(
    () => null,
  );
  if (!data) return null;
  // Formato lista: [{name|label|stat, home, away}]
  if (Array.isArray(data)) {
    const rows = data
      .map((r) => {
        if (!isObj(r)) return null;
        const label = str(r.name) ?? str(r.label) ?? str(r.stat) ?? null;
        const home = str(r.home ?? r.home_value) ?? null;
        const away = str(r.away ?? r.away_value) ?? null;
        return label && home != null && away != null
          ? { label: prettyStatLabel(label), home, away }
          : null;
      })
      .filter((r): r is StatRow => r !== null);
    return rows.length > 0 ? rows : null;
  }
  // Formato dicionários: {home: {...}, away: {...}}
  if (isObj(data)) {
    const home = isObj(data.home) ? data.home : isObj(data.home_team) ? data.home_team : null;
    const away = isObj(data.away) ? data.away : isObj(data.away_team) ? data.away_team : null;
    if (!home || !away) return null;
    const rows: StatRow[] = [];
    for (const key of Object.keys(home)) {
      const h = str(home[key]);
      const a = str(away[key]);
      if (h == null || a == null) continue;
      rows.push({ label: prettyStatLabel(key), home: h, away: a });
    }
    return rows.length > 0 ? rows : null;
  }
  return null;
}

// ─── Incidentes ────────────────────────────────────────────────────────

export interface MatchIncident {
  minute: string;
  kind: string;
  team: string | null;
  player: string | null;
}

export async function fetchIncidents(eventId: string): Promise<MatchIncident[] | null> {
  if (!validEventId(eventId)) return null;
  const data = await apiJson<unknown>(`events/${eventId}/incidents/`, {
    ttlMs: 60 * 1000,
  }).catch(() => null);
  if (!data) return null;
  const pool: unknown[] = Array.isArray(data) ? data : arr(isObj(data) ? data.incidents : []);
  const rows = pool
    .map((r) => {
      if (!isObj(r)) return null;
      return {
        minute: str(r.minute ?? r.min ?? r.time) ?? "",
        kind: str(r.type ?? r.event ?? r.kind) ?? "",
        team: str(r.team ?? r.team_name) ?? null,
        player: str(r.player ?? r.player_name) ?? null,
      };
    })
    .filter((r): r is MatchIncident => r !== null && (r.minute !== "" || r.kind !== ""));
  return rows.length > 0 ? rows : null;
}

// ─── Transmissão + estádio/árbitro ─────────────────────────────────────

export interface BroadcastInfo {
  channel: string;
  country: string | null;
}

export async function fetchBroadcasts(eventId: string): Promise<BroadcastInfo[] | null> {
  if (!validEventId(eventId)) return null;
  const data = await apiJson<unknown>(`events/${eventId}/broadcasts/`, {
    ttlMs: 60 * 60 * 1000,
  }).catch(() => null);
  if (!data) return null;
  const pool: unknown[] = Array.isArray(data) ? data : arr(isObj(data) ? data.results : []);
  const rows = pool
    .map((r) => {
      if (!isObj(r)) return null;
      const channel = str(r.channel_name) ?? str(r.channel) ?? null;
      return channel ? { channel, country: str(r.country_code) ?? str(r.country) ?? null } : null;
    })
    .filter((r): r is BroadcastInfo => r !== null);
  if (rows.length === 0) return null;
  // Prioriza Brasil, depois demais.
  return [...rows].sort((a, b) => (a.country === "BR" ? -1 : 0) - (b.country === "BR" ? -1 : 0));
}

export interface VenueMeta {
  venue: string | null;
  city: string | null;
  referee: string | null;
}

function deepPick(o: unknown, keys: string[], depth = 0): string | null {
  if (depth > 3) return null;
  if (!isObj(o)) return Array.isArray(o) ? deepPick(o[0], keys, depth + 1) : null;
  for (const k of Object.keys(o)) {
    if (keys.includes(k.toLowerCase())) {
      const v = str(o[k]);
      if (v) return v;
    }
  }
  for (const k of Object.keys(o)) {
    const v = deepPick(o[k], keys, depth + 1);
    if (v) return v;
  }
  return null;
}

export async function fetchVenueMeta(eventId: string): Promise<VenueMeta | null> {
  if (!validEventId(eventId)) return null;
  const data = await apiJson<unknown>(`events/${eventId}/metadata/`, {
    ttlMs: 6 * 60 * 60 * 1000,
  }).catch(() => null);
  if (!data) return null;
  const venue =
    deepPick(data, ["venue", "stadium", "stadium_name", "arena"]) ??
    (isObj(data) && isObj(data.venue) ? (str(data.venue.name) ?? null) : null);
  const city = deepPick(data, ["city", "venue_city"]);
  const referee =
    deepPick(data, ["referee", "referee_name", "official"]) ??
    (isObj(data) && isObj(data.referee) ? (str(data.referee.name) ?? null) : null);
  if (!venue && !city && !referee) return null;
  return { venue, city, referee };
}
