import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { BzzoiroApiError } from "./bzzoiro/client.server";
import type { EventDetail, PolymarketData } from "./bzzoiro/types";

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
