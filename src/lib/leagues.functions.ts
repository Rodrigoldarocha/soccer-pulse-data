import { createServerFn } from "@tanstack/react-start";
import type { League } from "./bzzoiro/types";

export const listLeagues = createServerFn({ method: "GET" }).handler(
  async (): Promise<League[]> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { checkRateLimit } = await import("./rate-limit.server");
    const { getRequestIP } = await import("./request-ip");
    await checkRateLimit(`leagues:list:${getRequestIP(getRequest())}`, { max: 10, windowMs: 60_000 });

    const { bzzoiroCachedFetch } = await import("./bzzoiro/cache.server");

    const raw = await bzzoiroCachedFetch<unknown>("/api/v2/leagues/", {
      key: "leagues:v2:active",
      ttlSeconds: 10 * 60,
    });

    let leagues: League[];
    if (Array.isArray(raw)) {
      leagues = raw as League[];
    } else if (
      raw &&
      typeof raw === "object" &&
      "results" in raw &&
      Array.isArray((raw as { results: unknown }).results)
    ) {
      leagues = (raw as { results: League[] }).results;
    } else {
      console.warn("[bzzoiro] Unexpected /api/v2/leagues/ shape:", raw);
      leagues = [];
    }

    return leagues.sort((a, b) => a.name.localeCompare(b.name));
  },
);
