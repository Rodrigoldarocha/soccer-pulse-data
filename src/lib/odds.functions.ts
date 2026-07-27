import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { OddsComparison } from "./bzzoiro/types";

const eventIdInput = z.object({
  eventId: z.number().int().positive(),
});

export const getOddsComparison = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => eventIdInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<OddsComparison> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { checkRateLimit } = await import("./rate-limit.server");
    const { getRequestIP } = await import("./request-ip");
    checkRateLimit(`odds:comparison:${getRequestIP(getRequest())}`, { max: 60, windowMs: 60_000 });

    const { bzzoiroCachedFetch } = await import("./bzzoiro/cache.server");

    const raw = await bzzoiroCachedFetch<OddsComparison>(
      `/api/v2/events/${data.eventId}/odds/comparison/`,
      {
        key: `odds:v2:comparison:${data.eventId}`,
        ttlSeconds: 1 * 60,
        params: {},
      },
    );

    return raw;
  });
