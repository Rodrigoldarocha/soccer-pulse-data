// Server functions that expose Bzzoiro league standings to the client through
// TanStack Start's typed RPC. The token stays server-side.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { StandingEntry, StandingGroup, StandingsResponse } from "./bzzoiro/types";

// -------- Zod schemas (runtime validation of cached payloads) --------

export const standingsEntrySchema = z.object({
  position: z.number().nullable(),
  team_id: z.number().nullable().optional(),
  team_name: z.string().min(1),
  team_logo: z.string().nullable().optional(),
  played: z.number().nullable().optional(),
  won: z.number().nullable().optional(),
  drawn: z.number().nullable().optional(),
  lost: z.number().nullable().optional(),
  goals_for: z.number().nullable().optional(),
  goals_against: z.number().nullable().optional(),
  goal_diff: z.number().nullable().optional(),
  points: z.number().nullable(),
});

export const standingsResponseSchema = z.object({
  standings: z.array(standingsEntrySchema).nullable().optional(),
  groups: z.record(z.string(), z.array(standingsEntrySchema)).nullable().optional(),
});

// -------- Pure helpers (unit-testable, no server context) --------

/** Saldo de gols efetivo, derivando de GP−GC quando `goal_diff` ausente. */
export function effectiveGoalDiff(entry: StandingEntry): number {
  if (entry.goal_diff != null) return entry.goal_diff;
  return (entry.goals_for ?? 0) - (entry.goals_against ?? 0);
}

/** Ordena por pontos desc; desempate por saldo de gols desc; último por posição asc. */
export function sortEntries(entries: StandingEntry[]): StandingEntry[] {
  return [...entries].sort((a, b) => {
    const pa = a.points ?? 0;
    const pb = b.points ?? 0;
    if (pa !== pb) return pb - pa;
    const gda = effectiveGoalDiff(a);
    const gdb = effectiveGoalDiff(b);
    if (gda !== gdb) return gdb - gda;
    return (a.position ?? 0) - (b.position ?? 0);
  });
}

/**
 * Normaliza a resposta da API:
 * - `standings` (ligas de pontos) → grupo único sem label
 * - `groups` (copas) → um grupo por chave, com label
 * - ambos nulos/ausentes → []
 */
export function normalizeStandings(raw: StandingsResponse | null | undefined): StandingGroup[] {
  if (!raw) return [];
  const groups: StandingGroup[] = [];
  if (Array.isArray(raw.standings) && raw.standings.length > 0) {
    groups.push({ label: null, entries: sortEntries(raw.standings) });
  }
  if (raw.groups && typeof raw.groups === "object") {
    for (const [label, entries] of Object.entries(raw.groups)) {
      if (Array.isArray(entries) && entries.length > 0) {
        groups.push({ label, entries: sortEntries(entries) });
      }
    }
  }
  return groups;
}

// -------- Server function --------

const standingsInput = z.object({
  leagueId: z.number().int().positive(),
});

export const getStandings = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => standingsInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<StandingGroup[]> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { checkRateLimit } = await import("./rate-limit.server");
    const { getRequestIP } = await import("./request-ip");
    await checkRateLimit(`standings:${getRequestIP(getRequest())}`, {
      max: 20,
      windowMs: 60_000,
    });

    const { bzzoiroCachedFetch } = await import("./bzzoiro/cache.server");

    const raw = await bzzoiroCachedFetch<unknown>(`/api/v2/leagues/${data.leagueId}/standings/`, {
      key: `standings:v2:${data.leagueId}`,
      ttlSeconds: 10 * 60,
      schema: standingsResponseSchema,
    });

    return normalizeStandings(raw as StandingsResponse);
  });
