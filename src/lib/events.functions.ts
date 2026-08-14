import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { BzzoiroApiError } from "./bzzoiro/client.server";
import type { EventDetail, PolymarketData } from "./bzzoiro/types";

// -------- Team form (pure) --------

export type TeamFormResult = "W" | "D" | "L";

export interface FormEntry {
  result: TeamFormResult;
  date: string;
  opponent: string;
  home: boolean;
  score: string;
}

/**
 * Derives the last `n` finished results for a team from its fixtures list.
 * Pure — no I/O, unit-tested.
 */
export function computeTeamForm(fixtures: EventDetail[], teamId: number, n = 5): FormEntry[] {
  const finished = fixtures.filter(
    (f) => f.status === "finished" && f.home_score != null && f.away_score != null,
  );

  return finished
    .sort((a, b) => b.event_date.localeCompare(a.event_date))
    .slice(0, n)
    .map((f) => {
      const home = f.home_team_id === teamId;
      const scored = home ? f.home_score! : f.away_score!;
      const conceded = home ? f.away_score! : f.home_score!;
      const result: TeamFormResult = scored > conceded ? "W" : scored < conceded ? "L" : "D";
      return {
        result,
        date: f.event_date,
        opponent: home ? f.away_team : f.home_team,
        home,
        score: `${scored}-${conceded}`,
      };
    });
}

export function formSummary(entries: FormEntry[]): string {
  return entries.map((e) => e.result).join("");
}

const eventIdInput = z.object({
  eventId: z.number().int().positive(),
});

export const getEventDetail = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => eventIdInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<EventDetail> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { checkRateLimit } = await import("./rate-limit.server");
    const { getRequestIP } = await import("./request-ip");
    await checkRateLimit(`events:detail:${getRequestIP(getRequest())}`, {
      max: 60,
      windowMs: 60_000,
    });

    const { bzzoiroCachedFetch } = await import("./bzzoiro/cache.server");

    const raw = await bzzoiroCachedFetch<EventDetail>(`/api/v2/events/${data.eventId}/`, {
      key: `events:v2:detail:${data.eventId}`,
      ttlSeconds: 2 * 60,
      params: {},
    });

    return raw;
  });

export const getEventPolymarket = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => eventIdInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<PolymarketData | null> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { checkRateLimit } = await import("./rate-limit.server");
    const { getRequestIP } = await import("./request-ip");
    await checkRateLimit(`events:polymarket:${getRequestIP(getRequest())}`, {
      max: 60,
      windowMs: 60_000,
    });

    const { bzzoiroCachedFetch } = await import("./bzzoiro/cache.server");

    try {
      return await bzzoiroCachedFetch<PolymarketData>(
        `/api/v2/events/${data.eventId}/polymarket/`,
        {
          key: `polymarket:v2:${data.eventId}`,
          ttlSeconds: 10 * 60,
          params: {},
          timeoutMs: 20_000,
          retries: 2,
        },
      );
    } catch (error) {
      if (error instanceof BzzoiroApiError && error.statusCode === 404) return null;
      throw error;
    }
  });

const teamIdInput = z.object({
  teamId: z.number().int().positive(),
});

export const getTeamForm = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => teamIdInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<FormEntry[]> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { checkRateLimit } = await import("./rate-limit.server");
    const { getRequestIP } = await import("./request-ip");
    await checkRateLimit(`teams:form:${getRequestIP(getRequest())}`, {
      max: 60,
      windowMs: 60_000,
    });

    const { bzzoiroCachedFetch } = await import("./bzzoiro/cache.server");

    const now = new Date();
    const yearAgo = new Date(now.getTime() - 365 * 86_400_000);

    const fixtures = await bzzoiroCachedFetch<EventDetail[]>(
      `/api/v2/teams/${data.teamId}/fixtures/`,
      {
        key: `teams:v2:fixtures:${data.teamId}`,
        ttlSeconds: 5 * 60,
        params: {
          status: "finished",
          date_from: yearAgo.toISOString(),
          date_to: now.toISOString(),
          limit: 5,
        },
      },
    );

    return computeTeamForm(Array.isArray(fixtures) ? fixtures : [], data.teamId);
  });
