import { generatePredictions, computePrediction } from "./prediction-engine";
import { buildPrediction } from "./ml/pipeline";
import type { MatchPrediction, FootballEvent, PredictionData } from "./types";

// ─── Map prediction engine output to FootballEvent + PredictionData ──

function eventToFootballEvent(ev: {
  id: string;
  league: import("./types").LeagueId;
  leagueLabel: string;
  homeTeam: string;
  awayTeam: string;
  eventDate: string;
  status: "scheduled" | "live" | "finished";
  homeScore?: number;
  awayScore?: number;
}): FootballEvent {
  return {
    id: ev.id,
    league: ev.league,
    leagueLabel: ev.leagueLabel,
    homeTeam: ev.homeTeam,
    awayTeam: ev.awayTeam,
    eventDate: ev.eventDate,
    status: ev.status,
    homeScore: ev.homeScore,
    awayScore: ev.awayScore,
  };
}

// ─── Main pipeline ───────────────────────────────────────────────────

export async function fetchTodayMatches(): Promise<MatchPrediction[]> {
  console.log("[data-pipeline] Fetching today's events from TheSportsDB...");

  // Step 1: Get today's events
  const events = await generatePredictions();
  console.log(`[data-pipeline] Found ${events.length} events in supported leagues`);

  if (events.length === 0) return [];

  // Step 2: For each event, compute prediction
  const results = await Promise.allSettled(
    events.map(async (ev) => {
      const prediction = await computePrediction(ev.homeTeam, ev.awayTeam, ev.league);
      const footballEvent = eventToFootballEvent(ev);
      const predictionData: PredictionData = prediction;
      return buildPrediction(footballEvent, predictionData, { id: ev.league, name: ev.leagueLabel });
    }),
  );

  const succeeded = results.filter(
    (r): r is PromiseFulfilledResult<MatchPrediction> => r.status === "fulfilled",
  );

  console.log(`[data-pipeline] Generated ${succeeded.length} predictions from ${events.length} events`);

  return succeeded.map((r) => r.value);
}

export async function fetchLiveMatches(): Promise<MatchPrediction[]> {
  const all = await fetchTodayMatches();
  return all.filter((m) => m.status === "live");
}
