import type { MatchPrediction } from "./types";
import type { EspnEvent } from "./api/espn";
import { normalizeTeamName } from "./prediction-engine";

// ─── Escudos via ESPN (público, sem token) ───────────────────────────────
// O Bzzoiro exige token até para busca de times, então os escudos vêm do
// scoreboard ESPN, casados pelo nome normalizado. Sem match → mantém "⚽".

const FALLBACK_CREST = "⚽";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

export function buildLogoMap(events: EspnEvent[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of events) {
    for (const t of [e.homeTeam, e.awayTeam]) {
      if (!t?.logo) continue;
      const key = normalizeTeamName(t.name);
      if (key && !map.has(key)) map.set(key, t.logo);
      const shortKey = normalizeTeamName(t.short);
      if (shortKey && shortKey.length >= 3 && !map.has(shortKey)) map.set(shortKey, t.logo);
    }
  }
  return map;
}

/** Casa nome exato normalizado, senão contains (maior match primeiro). */
export function findLogo(teamName: string, logos: Map<string, string>): string | null {
  const norm = normalizeTeamName(teamName);
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
  return matches.map((m) => ({
    ...m,
    home: { ...m.home, logo: findLogo(m.home.name, logos) ?? m.home.logo ?? FALLBACK_CREST },
    away: { ...m.away, logo: findLogo(m.away.name, logos) ?? m.away.logo ?? FALLBACK_CREST },
  }));
}

let logoMapCache: { map: Map<string, string>; at: number } | null = null;
const LOGO_MAP_TTL = 30 * 60 * 1000;

async function getLogoMap(): Promise<Map<string, string>> {
  if (logoMapCache && Date.now() - logoMapCache.at < LOGO_MAP_TTL) return logoMapCache.map;
  const { createEspnClient } = await import("./api/espn");
  const events = await withTimeout(createEspnClient().getAllScoreboards(), 12_000).catch(
    () => [] as EspnEvent[],
  );
  const map = buildLogoMap(events);
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
