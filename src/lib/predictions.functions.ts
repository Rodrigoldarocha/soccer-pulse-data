// Server functions that expose Bzzoiro predictions to the client through
// TanStack Start's typed RPC. The token stays server-side.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Prediction } from "./bzzoiro/types";

const upcomingInput = z.object({
  minConfidence: z.number().min(0).max(1).optional(),
  leagueId: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(100).default(30),
});

export const listUpcomingPredictions = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => upcomingInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<Prediction[]> => {
    const { bzzoiroCachedFetch } = await import("./bzzoiro/cache.server");

    const params: Record<string, string | number | undefined> = {
      status: "notstarted",
      limit: data.limit,
      min_confidence: data.minConfidence,
      league_id: data.leagueId,
    };

    const key = `predictions:v2:upcoming:${JSON.stringify(params)}`;
    const results = await bzzoiroCachedFetch<Prediction[]>("/api/v2/predictions/", {
      key,
      ttlSeconds: 5 * 60, // 5 min — model runs periodically upstream
      params,
    });

    // Sort by kickoff ascending so the UI shows the next matches first.
    return [...results].sort(
      (a, b) => a.event.event_date.localeCompare(b.event.event_date),
    );
  });
