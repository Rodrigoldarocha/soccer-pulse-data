import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { BzzoiroApiError } from "./bzzoiro/client.server";
import type { Lineups } from "./bzzoiro/types";

const eventIdInput = z.object({
  eventId: z.number().int().positive(),
});

export const getEventLineups = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => eventIdInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<Lineups | null> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { checkRateLimit, getRateLimitIdentifier } = await import("./rate-limit.server");
    await checkRateLimit(`lineups:${getRateLimitIdentifier(getRequest())}`, {
      max: 30,
      windowMs: 60_000,
    });

    const { bzzoiroCachedFetch } = await import("./bzzoiro/cache.server");

    try {
      const raw = await bzzoiroCachedFetch<Record<string, unknown>>(
        `/api/v2/events/${data.eventId}/lineups/`,
        {
          key: `lineups:v3:${data.eventId}`,
          ttlSeconds: 5 * 60,
          params: {},
        },
      );

      // API returns { event_id, lineup_status, lineups: { home, away } }.
      const inner = (raw?.["lineups"] ?? raw) as Lineups | null | undefined;
      if (!inner || typeof inner !== "object") return null;

      return {
        lineup_status: (raw?.["lineup_status"] as string | undefined) ?? null,
        home: inner.home ?? null,
        away: inner.away ?? null,
      };
    } catch (error) {
      if (error instanceof BzzoiroApiError) {
        if (error.statusCode === 404) return null;
        if (error.isAuthError()) throw new Error("Credenciais da API inválidas. Contate o suporte.");
      }
      throw error;
    }
  });
