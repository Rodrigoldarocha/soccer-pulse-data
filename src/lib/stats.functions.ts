import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { BzzoiroApiError } from "./bzzoiro/client.server";
import type { EventStats } from "./bzzoiro/types";

const eventIdInput = z.object({
  eventId: z.number().int().positive(),
});

export const getEventStats = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => eventIdInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<EventStats | null> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { checkRateLimit, getRateLimitIdentifier } = await import("./rate-limit.server");
    await checkRateLimit(`stats:${getRateLimitIdentifier(getRequest())}`, {
      max: 30,
      windowMs: 60_000,
    });

    const { bzzoiroCachedFetch } = await import("./bzzoiro/cache.server");

    try {
      const raw = await bzzoiroCachedFetch<Record<string, unknown>>(
        `/api/v2/events/${data.eventId}/stats/`,
        {
          key: `stats:v3:${data.eventId}`,
          ttlSeconds: 2 * 60,
          params: {},
        },
      );

      const stats = raw?.["stats"] as EventStats | undefined;
      if (!stats || typeof stats !== "object") return null;

      // Keep only home/away buckets — the payload also carries shotmap/momentum.
      return { home: stats.home ?? {}, away: stats.away ?? {} };
    } catch (error) {
      if (error instanceof BzzoiroApiError) {
        if (error.statusCode === 404) return null;
        if (error.isAuthError())
          throw new Error("Credenciais da API inválidas. Contate o suporte.");
      }
      throw error;
    }
  });
