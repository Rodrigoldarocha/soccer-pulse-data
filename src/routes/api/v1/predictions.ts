import { createFileRoute } from "@tanstack/react-router";

import type { Prediction } from "@/lib/bzzoiro/types";

export const Route = createFileRoute("/api/v1/predictions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getRequestIP } = await import("@/lib/request-ip");
        const { checkRateLimit } = await import("@/lib/rate-limit.server");
        await checkRateLimit(`api:v1:predictions:${getRequestIP(request)}`, {
          max: 60,
          windowMs: 60_000,
        });

        const { bzzoiroCachedFetch } = await import("@/lib/bzzoiro/cache.server");

        const url = new URL(request.url);
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 60, 1), 200);
        const leagueId = url.searchParams.get("league_id");

        const params: Record<string, string | number | undefined> = {
          status: "upcoming",
          limit,
          league_id: leagueId ? Number(leagueId) : undefined,
        };

        const raw = await bzzoiroCachedFetch<unknown>("/api/v2/predictions/", {
          key: `api:v1:predictions:${limit}:${leagueId ?? "all"}`,
          ttlSeconds: 5 * 60,
          params,
        });

        let predictions: Prediction[];
        if (Array.isArray(raw)) {
          predictions = raw as Prediction[];
        } else if (
          raw &&
          typeof raw === "object" &&
          "results" in raw &&
          Array.isArray((raw as { results: unknown }).results)
        ) {
          predictions = (raw as { results: Prediction[] }).results;
        } else {
          predictions = [];
        }

        const body = predictions
          .sort((a, b) => a.event.event_date.localeCompare(b.event.event_date))
          .map((p) => ({
            event_id: p.event.id,
            event_date: p.event.event_date,
            status: p.event.status,
            league: { id: p.event.league_id, name: p.event.league_name },
            home_team: p.event.home_team,
            away_team: p.event.away_team,
            markets: {
              match_result: {
                home: p.markets.match_result.prob_home,
                draw: p.markets.match_result.prob_draw,
                away: p.markets.match_result.prob_away,
                predicted: p.markets.match_result.predicted,
              },
              over_under: {
                over_1_5: p.markets.over_under.prob_over_15,
                over_2_5: p.markets.over_under.prob_over_25,
                over_3_5: p.markets.over_under.prob_over_35,
              },
              btts: { yes: p.markets.btts.prob_yes },
              expected_goals: p.markets.expected_goals,
              most_likely_score: p.markets.score.most_likely,
            },
            model: { confidence: p.model.confidence, version: p.model.version },
          }));

        return Response.json(
          { count: body.length, predictions: body },
          {
            headers: {
              "cache-control": "public, max-age=300",
              "access-control-allow-origin": "*",
            },
          },
        );
      },
    },
  },
});
