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
    const { checkRateLimit } = await import("./rate-limit.server");
    checkRateLimit("predictions:upcoming", { max: 30, windowMs: 60_000 });

    const { bzzoiroCachedFetch, hashKey } = await import("./bzzoiro/cache.server");

    const params: Record<string, string | number | undefined> = {
      status: "upcoming",
      limit: data.limit,
      min_confidence: data.minConfidence,
      league_id: data.leagueId,
    };

    const key = await hashKey("predictions:v2:upcoming", params as Record<string, unknown>);
    const raw = await bzzoiroCachedFetch<unknown>("/api/v2/predictions/", {
      key,
      ttlSeconds: 5 * 60,
      params,
    });

    // v2/predictions can return either a bare array or a wrapper. Normalize.
    let results: Prediction[];
    if (Array.isArray(raw)) {
      results = raw as Prediction[];
    } else if (
      raw &&
      typeof raw === "object" &&
      "results" in raw &&
      Array.isArray((raw as { results: unknown }).results)
    ) {
      results = (raw as { results: Prediction[] }).results;
    } else if (
      raw &&
      typeof raw === "object" &&
      "predictions" in raw &&
      Array.isArray((raw as { predictions: unknown }).predictions)
    ) {
      results = (raw as { predictions: Prediction[] }).predictions;
    } else {
      console.warn("[bzzoiro] Unexpected /api/v2/predictions/ shape:", raw);
      results = [];
    }

    return [...results].sort((a, b) => a.event.event_date.localeCompare(b.event.event_date));
  });
