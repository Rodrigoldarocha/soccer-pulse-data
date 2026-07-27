import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { BzzoiroApiError } from "./bzzoiro/client.server";
import type { EventStats } from "./bzzoiro/types";

const eventIdInput = z.object({
  eventId: z.number().int().positive(),
});

export const getEventStats = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => eventIdInput.parse(input ?? {}))
  .handler(async (ctx): Promise<EventStats | null> => {
    const request = (ctx as unknown as { request: Request }).request;
    const { data } = ctx;
    const { checkRateLimit, getRateLimitIdentifier } = await import("./rate-limit.server");
    await checkRateLimit(`stats:${getRateLimitIdentifier(request)}`, { max: 30, windowMs: 60_000 });

    const { bzzoiroCachedFetch } = await import("./bzzoiro/cache.server");

    try {
      const raw = await bzzoiroCachedFetch<EventStats>(`/api/v2/events/${data.eventId}/stats/`, {
        key: `stats:v2:${data.eventId}`,
        ttlSeconds: 2 * 60,
        params: { tz: "America/Sao_Paulo" },
      });
      return raw;
    } catch (error) {
      if (error instanceof BzzoiroApiError) {
        console.error(`[stats] API error for event ${data.eventId}:`, error.statusCode, error.message);
        if (error.statusCode === 404) return null;
        if (error.isAuthError()) throw new Error("Credenciais da API inválidas. Contate o suporte.");
      }
      throw error;
    }
  });
