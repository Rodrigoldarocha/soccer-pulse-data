// Server functions for live events data from Bzzoiro API.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { BzzoiroApiError } from "./bzzoiro/client.server";

export interface LiveEvent {
  id: number;
  status: string;
  home_team: string;
  away_team: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score?: { home: number | null; away: number | null } | null;
  away_score?: { home: number | null; away: number | null } | null;
  event_date: string;
  league_id: number | null;
  league_name: string | null;
}

const liveInput = z.object({
  leagueId: z.number().int().positive().optional(),
});

export const listLiveEvents = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => liveInput.parse(input ?? {}))
  .handler(async (ctx): Promise<LiveEvent[]> => {
    const request = (ctx as unknown as { request: Request }).request;
    const { data } = ctx;
    const { checkRateLimit, getRateLimitIdentifier } = await import("./rate-limit.server");
    await checkRateLimit(`live:list:${getRateLimitIdentifier(request)}`, {
      max: 60,
      windowMs: 60_000,
    });

    const { bzzoiroCachedFetch } = await import("./bzzoiro/cache.server");

    const params: Record<string, string | number | undefined> = {
      status: "inprogress",
    };
    if (data.leagueId) params.league_id = data.leagueId;

    try {
      const raw = await bzzoiroCachedFetch<unknown>("/api/v2/events/", {
        key: `live:v2:events:${data.leagueId ?? "all"}`,
        ttlSeconds: 30,
        params,
        timeoutMs: 20_000,
        retries: 2,
      });

      // Normalize response (array or paginated wrapper)
      let results: LiveEvent[];
      if (Array.isArray(raw)) {
        results = raw as LiveEvent[];
      } else if (
        raw &&
        typeof raw === "object" &&
        "results" in raw &&
        Array.isArray((raw as { results: unknown }).results)
      ) {
        results = (raw as { results: LiveEvent[] }).results;
      } else {
        console.warn("[bzzoiro] Unexpected /api/v2/events/ shape:", raw);
        results = [];
      }

      return results;
    } catch (error) {
    } catch (error) {
      if (error instanceof BzzoiroApiError) {
        console.error(`[live] API error:`, error.statusCode, error.message, `path:`, error.path);
        if (error.isAuthError()) {
          throw new Error("Credenciais da API inválidas. Contate o suporte.");
        }
      }
      // Upstream instabilidade (timeout/5xx): degrade para lista vazia em vez de tela branca.
      console.error("[live] falha ao carregar eventos ao vivo:", error);
      return [];
    }
  });
