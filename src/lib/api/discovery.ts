import { apiJson, LEAGUE_IDS, LEAGUE_NAMES, fetchLeagueStandings } from "./thesportsdb";

// ─── Descoberta: liga / time / jogador (Fase 5) ─────────────────────────
// Parsing tolerante; null em qualquer divergência. Nenhum mock.

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

export function resolveLeagueId(slugOrId: string): string | null {
  if (/^\d+$/.test(slugOrId)) return slugOrId;
  return LEAGUE_IDS[slugOrId] ?? null;
}

// ─── Liga ──────────────────────────────────────────────────────────────

export interface StandingRow {
  position: number;
  teamId: string | null;
  team: string;
  crest: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: string | null;
}

export interface ScorerRow {
  playerId: string | null;
  player: string;
  team: string | null;
  goals: number;
}

export interface LeaguePage {
  leagueId: string;
  leagueName: string;
  standings: StandingRow[];
  scorers: ScorerRow[];
}

function toScorer(o: unknown): ScorerRow | null {
  if (!isObj(o)) return null;
  const player = str(o.player ?? o.player_name ?? o.name) ?? null;
  const goals =
    num(o.goals) ??
    num(o.value) ??
    num(o.total) ??
    (typeof o.goals === "string" ? parseInt(o.goals, 10) : null);
  if (!player || goals == null || Number.isNaN(goals)) return null;
  const pid = o.player_id ?? o.id;
  return {
    playerId: typeof pid === "number" ? String(pid) : (str(pid) ?? null),
    player,
    team: str(o.team ?? o.team_name) ?? null,
    goals,
  };
}

export async function fetchLeaguePage(slugOrId: string): Promise<LeaguePage | null> {
  const leagueId = resolveLeagueId(slugOrId);
  if (!leagueId) return null;
  const [standingsRaw, scorersResult] = await Promise.all([
    fetchLeagueStandings(leagueId).catch(() => []),
    apiJson<unknown>(`leagues/${leagueId}/top/goals/?limit=10`, {
      ttlMs: 6 * 60 * 60 * 1000,
    }),
  ]);
  if (standingsRaw.length === 0) return null;
  const standings: StandingRow[] = standingsRaw.map((r) => ({
    position: parseInt(r.intRank, 10) || 0,
    teamId: r.idTeam || null,
    team: r.strTeam,
    crest: r.strBadge || null,
    played: parseInt(r.intPlayed, 10) || 0,
    won: parseInt(r.intWin, 10) || 0,
    drawn: parseInt(r.intDraw, 10) || 0,
    lost: parseInt(r.intLoss, 10) || 0,
    goalsFor: parseInt(r.intGoalsFor, 10) || 0,
    goalsAgainst: parseInt(r.intGoalsAgainst, 10) || 0,
    points: parseInt(r.intPoints, 10) || 0,
    form: r.strForm || null,
  }));
  let scorers: ScorerRow[] = [];
  if (scorersResult.success && scorersResult.data) {
    const pool: unknown[] = Array.isArray(scorersResult.data)
      ? scorersResult.data
      : [
          ...arr(isObj(scorersResult.data) ? scorersResult.data.leaders : []),
          ...arr(isObj(scorersResult.data) ? scorersResult.data.entries : []),
          ...arr(isObj(scorersResult.data) ? scorersResult.data.results : []),
        ];
    scorers = pool
      .map(toScorer)
      .filter((s): s is ScorerRow => s !== null)
      .slice(0, 10);
  }
  return {
    leagueId,
    leagueName: LEAGUE_NAMES[leagueId] ?? `Liga ${leagueId}`,
    standings,
    scorers,
  };
}

// ─── Time ──────────────────────────────────────────────────────────────

export interface SquadMember {
  playerId: string | null;
  name: string;
  position: string | null;
  number: string | null;
  availability: string | null;
}

export interface TeamFixture {
  date: string | null;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  finished: boolean;
}

export interface TeamPage {
  teamId: string;
  name: string;
  shortName: string | null;
  country: string | null;
  elo: number | null;
  squad: SquadMember[];
  recent: TeamFixture[];
  upcoming: TeamFixture[];
}

function toFixture(o: unknown): TeamFixture | null {
  if (!isObj(o)) return null;
  const home = str(o.home_team) ?? null;
  const away = str(o.away_team) ?? null;
  if (!home || !away) return null;
  const status = (str(o.status) ?? "").toLowerCase();
  return {
    date: str(o.event_date) ?? null,
    home,
    away,
    homeScore: num(o.home_score),
    awayScore: num(o.away_score),
    finished: status === "finished",
  };
}

export async function fetchTeamPage(teamId: string): Promise<TeamPage | null> {
  if (!/^\d+$/.test(teamId)) return null;
  const [detailResult, squadRaw, fixturesRaw] = await Promise.all([
    apiJson<unknown>(`teams/${teamId}/`, { ttlMs: 24 * 60 * 60 * 1000 }),
    apiJson<unknown>(`teams/${teamId}/squad/`, { ttlMs: 24 * 60 * 60 * 1000 }),
    apiJson<unknown>(`teams/${teamId}/fixtures/?limit=15`, { ttlMs: 30 * 60 * 1000 }),
  ]);
  if (!detailResult.success || !isObj(detailResult.data)) return null;
  const name = str(detailResult.data.name) ?? null;
  if (!name) return null;
  const squadPool: unknown[] =
    squadRaw.success && isObj(squadRaw.data) ? arr(squadRaw.data.players) : [];
  const squad: SquadMember[] = squadPool
    .map((p) => {
      if (!isObj(p)) return null;
      const n = str(p.name) ?? null;
      if (!n) return null;
      const pid = p.id;
      return {
        playerId: typeof pid === "number" ? String(pid) : (str(pid) ?? null),
        name: n,
        position: str(p.position) ?? null,
        number: str(p.jersey_number) ?? null,
        availability: str(p.availability) ?? null,
      };
    })
    .filter((p): p is SquadMember => p !== null);
  const fixPool: unknown[] =
    fixturesRaw.success && Array.isArray(fixturesRaw.data)
      ? fixturesRaw.data
      : fixturesRaw.success && isObj(fixturesRaw.data)
        ? arr(fixturesRaw.data.results)
        : [];
  const fixtures = fixPool
    .map(toFixture)
    .filter((f): f is TeamFixture => f !== null)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  return {
    teamId,
    name,
    shortName: str(detailResult.data.short_name) ?? null,
    country: str(detailResult.data.country) ?? null,
    elo: num(detailResult.data.elo_rating),
    squad,
    recent: fixtures
      .filter((f) => f.finished)
      .slice(-5)
      .reverse(),
    upcoming: fixtures.filter((f) => !f.finished).slice(0, 5),
  };
}

// ─── Jogador ───────────────────────────────────────────────────────────

export interface PlayerStat {
  label: string;
  value: string;
}

export interface PlayerTransfer {
  date: string | null;
  from: string | null;
  to: string | null;
}

export interface PlayerPage {
  playerId: string;
  name: string;
  position: string | null;
  specificPosition: string | null;
  age: number | null;
  height: string | null;
  foot: string | null;
  nationality: string | null;
  team: string | null;
  teamId: string | null;
  stats: PlayerStat[];
  transfers: PlayerTransfer[];
}

export async function fetchPlayerPage(playerId: string): Promise<PlayerPage | null> {
  if (!/^\d+$/.test(playerId)) return null;
  const [detail, statsRaw, transfersRaw] = await Promise.all([
    apiJson<unknown>(`players/${playerId}/`, { ttlMs: 24 * 60 * 60 * 1000 }),
    apiJson<unknown>(`players/${playerId}/stats/`, { ttlMs: 6 * 60 * 60 * 1000 }),
    apiJson<unknown>(`players/${playerId}/transfers/`, { ttlMs: 24 * 60 * 60 * 1000 }),
  ]);
  if (!detail.success || !isObj(detail.data)) return null;
  const name = str(detail.data.name) ?? null;
  if (!name) return null;
  let age: number | null = null;
  const dob = str(detail.data.date_of_birth);
  if (dob) {
    const d = new Date(dob);
    if (!Number.isNaN(d.getTime())) {
      age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
    }
  }
  const stats: PlayerStat[] = [];
  const statPool: unknown[] =
    statsRaw.success && isObj(statsRaw.data)
      ? [...arr(statsRaw.data.stats), ...arr(statsRaw.data.results)]
      : [];
  for (const s of statPool.slice(0, 12)) {
    if (!isObj(s)) continue;
    const label = str(s.label ?? s.name ?? s.stat) ?? null;
    const value = str(s.value ?? s.goals ?? s.total) ?? null;
    if (label && value) stats.push({ label, value });
  }
  const transferPool: unknown[] =
    transfersRaw.success && Array.isArray(transfersRaw.data)
      ? transfersRaw.data
      : transfersRaw.success && isObj(transfersRaw.data)
        ? arr(transfersRaw.data.results)
        : [];
  const transfers: PlayerTransfer[] = transferPool
    .map((t) => {
      if (!isObj(t)) return null;
      return {
        date: str(t.date) ?? null,
        from: str(t.from_team ?? t.from) ?? null,
        to: str(t.to_team ?? t.to) ?? null,
      };
    })
    .filter((t): t is PlayerTransfer => t !== null)
    .slice(0, 8);
  const tid = detail.data.current_team_id;
  return {
    playerId,
    name,
    position: str(detail.data.position) ?? null,
    specificPosition: str(detail.data.specific_position) ?? null,
    age,
    height: str(detail.data.height_cm) ?? null,
    foot: str(detail.data.preferred_foot) ?? null,
    nationality: str(detail.data.nationality) ?? null,
    team:
      str(detail.data.current_team) ??
      (isObj(detail.data.current_team) ? (str(detail.data.current_team.name) ?? null) : null),
    teamId: typeof tid === "number" ? String(tid) : (str(tid) ?? null),
    stats,
    transfers,
  };
}
