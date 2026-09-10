import type { MatchPrediction } from "./types";
import type { EspnEvent, EspnTeam } from "./api/espn";
import { normalizeTeamName } from "./prediction-engine";

// ─── Escudos via ESPN (público, sem token) ───────────────────────────────
// O Bzzoiro exige token até para busca de times, então os escudos vêm da ESPN.
// Fonte principal: lista de times por liga (/teams) — cobre jogos futuros.
// Complemento: scoreboards do dia. Sem match → logo vazio (card usa monograma).

/** Apelidos comuns → nome canônico (ambos normalizados antes de comparar). */
export const TEAM_ALIASES: Record<string, string> = {
  "atletico mg": "atletico mineiro",
  "atletico go": "atletico goianiense",
  "atletico pr": "athletico paranaense",
  "athletico pr": "athletico paranaense",
  "atletico madri": "atletico madrid",
  "man utd": "manchester united",
  "man united": "manchester united",
  "man city": "manchester city",
  wolves: "wolverhampton wanderers",
  spurs: "tottenham hotspur",
  psg: "paris saint germain",
  "paris sg": "paris saint germain",
  inter: "internazionale",
  "inter milao": "internazionale",
  "inter de milao": "internazionale",
  "milan": "ac milan",
  juve: "juventus",
  "bayern munique": "bayern munich",
  "bayern de munique": "bayern munich",
  barca: "barcelona",
  "gremio fbpa": "gremio",
  "vasco da gama": "vasco",
  "red bull bragantino": "bragantino",
  "rb bragantino": "bragantino",
  "sao paulo fc": "sao paulo",
  "america mg": "america mineiro",
  betis: "real betis",
  sociedad: "real sociedad",
  "borussia dortmund": "dortmund",
  "borussia monchengladbach": "monchengladbach",
  "sporting cp": "sporting lisbon",
  "sporting lisboa": "sporting lisbon",
  benfica: "sl benfica",
  psv: "psv eindhoven",
};

function canonical(name: string): string {
  // Pontuação (hífen, ponto, barra) separa palavras: "Atlético-MG" → "atletico mg".
  const norm = normalizeTeamName((name ?? "").replace(/[-–_./]+/g, " "));
  const alias = TEAM_ALIASES[norm];
  return alias ? normalizeTeamName(alias.replace(/[-–_./]+/g, " ")) : norm;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

function addKey(map: Map<string, string>, raw: string, logo: string, minLen = 1) {
  const key = canonical(raw);
  if (key && key.length >= minLen && !map.has(key)) map.set(key, logo);
}

export function buildLogoMap(events: EspnEvent[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of events) {
    for (const t of [e.homeTeam, e.awayTeam]) {
      if (!t?.logo) continue;
      addKey(map, t.name, t.logo);
      addKey(map, t.short, t.logo, 3);
    }
  }
  return map;
}

export function buildTeamLogoMap(teams: EspnTeam[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const t of teams) {
    if (!t.logo) continue;
    addKey(map, t.name, t.logo);
    addKey(map, t.short, t.logo, 3);
    if (t.abbrev) addKey(map, t.abbrev, t.logo, 3);
  }
  return map;
}

/** Casa nome exato normalizado, senão contains (maior match primeiro). */
export function findLogo(teamName: string, logos: Map<string, string>): string | null {
  const norm = canonical(teamName);
  if (!norm) return null;
  const exact = logos.get(norm);
  if (exact) return exact;
  let bestKey: string | null = null;
  for (const key of logos.keys()) {
    if (key.length < 3 || norm.length < 3) continue;
    if (key.includes(norm) || norm.includes(key)) {
      if (!bestKey || key.length > bestKey.length) bestKey = key;
    }
  }
  return bestKey ? (logos.get(bestKey) ?? null) : null;
}

/** Puro e testável: aplica logos do mapa nos matches. */
export function applyLogos(
  matches: MatchPrediction[],
  logos: Map<string, string>,
): MatchPrediction[] {
  return matches.map((m) => {
    const home = findLogo(m.home.name, logos);
    const away = findLogo(m.away.name, logos);
    const keep = (current: string | undefined) =>
      current && current.startsWith("http") ? current : "";
    return {
      ...m,
      home: { ...m.home, logo: home ?? keep(m.home.logo) },
      away: { ...m.away, logo: away ?? keep(m.away.logo) },
    };
  });
}

let logoMapCache: { map: Map<string, string>; at: number } | null = null;
const LOGO_MAP_TTL = 6 * 60 * 60 * 1000;

async function getLogoMap(): Promise<Map<string, string>> {
  if (logoMapCache && Date.now() - logoMapCache.at < LOGO_MAP_TTL) return logoMapCache.map;
  const { createEspnClient } = await import("./api/espn");
  const client = createEspnClient();

  const [teams, events] = await Promise.all([
    withTimeout(client.getAllTeams(), 15_000).catch(() => [] as EspnTeam[]),
    withTimeout(client.getAllScoreboards(), 10_000).catch(() => [] as EspnEvent[]),
  ]);

  const map = buildTeamLogoMap(teams);
  // Scoreboards preenchem lacunas sem sobrescrever os escudos oficiais das ligas.
  for (const [key, logo] of buildLogoMap(events)) if (!map.has(key)) map.set(key, logo);

  if (map.size > 0) logoMapCache = { map, at: Date.now() };
  return map;
}

/**
 * Enriquece matches com escudos ESPN. Nunca quebra o pipeline:
 * em qualquer falha retorna os matches originais.
 */
export async function enrichMatchLogos(matches: MatchPrediction[]): Promise<MatchPrediction[]> {
  if (matches.length === 0) return matches;
  try {
    const map = await getLogoMap();
    if (map.size === 0) return matches;
    return applyLogos(matches, map);
  } catch {
    return matches;
  }
}
