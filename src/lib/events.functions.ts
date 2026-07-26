import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { EventDetail } from "./bzzoiro/types";

const eventIdInput = z.object({
  eventId: z.number().int().positive(),
});

export const getEventDetail = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => eventIdInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<EventDetail> => {
    const { checkRateLimit } = await import("./rate-limit.server");
    checkRateLimit("events:detail", { max: 60, windowMs: 60_000 });

    const { bzzoiroCachedFetch } = await import("./bzzoiro/cache.server");

    const raw = await bzzoiroCachedFetch<EventDetail>(`/api/v2/events/${data.eventId}/`, {
      key: `events:v2:detail:${data.eventId}`,
      ttlSeconds: 2 * 60,
      params: { tz: "America/Sao_Paulo" },
    });

    return raw;
  });
