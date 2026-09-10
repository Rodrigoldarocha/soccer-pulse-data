import { generatePredictions, computePrediction, warmTeamForms } from "./prediction-engine";
import { buildPrediction } from "./ml/pipeline";
import { enrichMatchLogos } from "./team-logos";
import { LEAGUE_IDS } from "./api/thesportsdb";
import type { MatchPrediction, FootballEvent, PredictionData, LeagueId } from "./types";

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

// ─── Timeout helper ─────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

// ─── Fallback (modelo médio de liga) ────────────────────────────────

const FALLBACK_PREDICTION: PredictionData = {
  xgHome: 1.56,
  xgAway: 1.1,
  probHome: 0.4408,
  probDraw: 0.2506,
  probAway: 0.3086,
  probOver25: 0.4901,
  probBtts: 0.5137,
};

// ─── Main pipeline ───────────────────────────────────────────────────

export async function fetchMatchesForDate(dateISO?: string): Promise<MatchPrediction[]> {
  // Hard timeout: entire pipeline must finish within 25 seconds
  return withTimeout(runPipeline(dateISO), 40_000).catch(() => {
    console.log(`[data-pipeline] Pipeline timed out for ${dateISO ?? "today"}`);
    return [] as MatchPrediction[];
  });
}

async function runPipeline(dateISO?: string): Promise<MatchPrediction[]> {
  console.log(`[data-pipeline] Fetching events for ${dateISO ?? "today"}...`);

  // Step 1: Get events for the requested date
  const allEvents = await generatePredictions(dateISO);
  console.log(`[data-pipeline] Found ${allEvents.length} events total`);

  // Step 2: Skip finished events — no point predicting completed games
  const activeEvents = allEvents.filter((ev) => ev.status !== "finished");
  console.log(
    `[data-pipeline] ${activeEvents.length} active events (skipped ${allEvents.length - activeEvents.length} finished)`,
  );

  if (activeEvents.length === 0) return [];

  // Step 3: Limit for SSR performance
  const events = activeEvents.slice(0, 40);

  // Step 4: Pre-warm league events cache — fetch all unique leagues in one batch
  const uniqueLeagueIds = [...new Set(events.map((ev) => ev.apiLeagueId).filter(Boolean))];
  console.log(`[data-pipeline] Pre-warming cache for ${uniqueLeagueIds.length} leagues...`);

  const { fetchLeaguePastEvents } = await import("./api/thesportsdb");

  // Warm cache with a tight timeout — 8 seconds max (ligas + forma dos times)
  const teamNames = events.flatMap((ev) => [ev.homeTeam, ev.awayTeam]);
  await withTimeout(
    Promise.allSettled([
      ...uniqueLeagueIds.map((lid) => fetchLeaguePastEvents(lid)),
      warmTeamForms(teamNames),
    ]),
    8_000,
  ).catch(() => console.log("[data-pipeline] Cache warm-up timed out, using defaults"));

  // Step 5: Compute predictions for each event (league cache is now warm).
  // Nunca deixar uma previsão lenta derrubar o pipeline: cai no modelo médio.
  const results = await Promise.allSettled(
    events.map(async (ev) => {
      const prediction = await withTimeout(
        computePrediction(ev.homeTeam, ev.awayTeam, ev.league, ev.apiLeagueId),
        6_000,
      ).catch(() => FALLBACK_PREDICTION);
      const footballEvent = eventToFootballEvent(ev);
      const predictionData: PredictionData = prediction;
      return buildPrediction(footballEvent, predictionData, {
        id: ev.apiLeagueId,
        name: ev.leagueLabel,
      });
    }),
  );

  const succeeded = results.filter(
    (r): r is PromiseFulfilledResult<MatchPrediction> => r.status === "fulfilled",
  );

  console.log(
    `[data-pipeline] Generated ${succeeded.length} predictions from ${events.length} events`,
  );

  const preds = succeeded.map((r) => ({
    ...r.value,
    oddsUpdatedAt: r.value.oddsUpdatedAt ?? new Date().toISOString(),
  }));

  // Escudos (ESPN, sem token). Nunca quebra o pipeline.
  return withTimeout(enrichMatchLogos(preds), 12_000).catch(() => preds);
}

export async function fetchTodayMatches(): Promise<MatchPrediction[]> {
  return fetchMatchesForDate();
}

export async function fetchLiveMatches(): Promise<MatchPrediction[]> {
  // Ao vivo real primeiro; cai para o filtro por data em qualquer falha.
  const real = await withTimeout(fetchLiveMatchesReal(), 30_000).catch(
    () => [] as MatchPrediction[],
  );
  if (real.length > 0) return real;
  const all = await fetchMatchesForDate();
  return all.filter((m: MatchPrediction) => m.status === "live");
}

async function fetchLiveMatchesReal(): Promise<MatchPrediction[]> {
  const { fetchLiveEvents } = await import("./api/match-details");
  const { computePrediction: computePred } = await import("./prediction-engine");
  const { buildPrediction: buildPred } = await import("./ml/pipeline");

  const live = await fetchLiveEvents();
  if (!live || live.length === 0) return [];

  const results = await Promise.allSettled(
    live.slice(0, 20).map(async (ev) => {
      const league = Object.entries(LEAGUE_IDS).find(([, id]) => id === ev.leagueId);
      const leagueId = league ? (league[0] as LeagueId) : ("premier-league" as LeagueId);
      const leagueLabel = ev.leagueName ?? "Liga";
      const prediction = await withTimeout(
        computePred(ev.homeTeam, ev.awayTeam, leagueId, ev.leagueId ?? undefined),
        6_000,
      ).catch(() => FALLBACK_PREDICTION);
      const built = await buildPred(
        {
          id: ev.id,
          league: leagueId,
          leagueLabel,
          homeTeam: ev.homeTeam,
          awayTeam: ev.awayTeam,
          eventDate: ev.kickoff ?? new Date().toISOString(),
          status: "live",
          homeScore: ev.homeScore ?? undefined,
          awayScore: ev.awayScore ?? undefined,
        },
        prediction,
        { id: ev.leagueId ?? leagueId, name: leagueLabel },
      );
      return {
        ...built,
        minute: ev.minute ?? undefined,
        oddsUpdatedAt: built.oddsUpdatedAt ?? new Date().toISOString(),
      };
    }),
  );

  const preds: MatchPrediction[] = results.flatMap((r) =>
    r.status === "fulfilled" ? [r.value as MatchPrediction] : [],
  );
  return withTimeout(enrichMatchLogos(preds), 12_000).catch(() => preds);
}

export async function fetchUpcomingMatches(
  fromISO: string,
  toISO: string,
): Promise<MatchPrediction[]> {
  return withTimeout(runUpcomingPipeline(fromISO, toISO), 40_000).catch(() => {
    console.log(`[data-pipeline] Upcoming pipeline timed out`);
    return [] as MatchPrediction[];
  });
}

async function runUpcomingPipeline(fromISO: string, toISO: string): Promise<MatchPrediction[]> {
  console.log(`[data-pipeline] Fetching upcoming events from ${fromISO} to ${toISO}...`);
  const { fetchEventsByDateRange } = await import("./api/thesportsdb");
  const { computePrediction: computePred } = await import("./prediction-engine");
  const { buildPrediction: buildPred } = await import("./ml/pipeline");

  // Fetch events for the entire date range
  const allEvents = await fetchEventsByDateRange(fromISO, toISO);
  console.log(`[data-pipeline] Found ${allEvents.length} upcoming events`);

  if (allEvents.length === 0) return [];

  // Deduplicate by idEvent
  const seen = new Set<string>();
  const uniqueEvents = allEvents.filter((ev) => {
    if (seen.has(ev.idEvent)) return false;
    seen.add(ev.idEvent);
    return true;
  });

  // Filter out already-finished events (todas as variantes: Finished, FT, AET, Full Time)
  const upcoming = uniqueEvents.filter((ev) => !isFinishedStatus(ev.strStatus));

  // Limit for SSR performance
  const limited = upcoming.slice(0, 40);

  // Map TsdbEvent to PredictionInput-compatible format
  const predictionInputs = limited.map((ev) => {
    const league = Object.entries(LEAGUE_IDS).find(([, id]) => id === ev.idLeague);
    const leagueId = league ? (league[0] as LeagueId) : ("premier-league" as LeagueId);
    const leagueLabel = league
      ? league[1].charAt(0).toUpperCase() + league[1].slice(1).replace(/-/g, " ")
      : ev.strLeague || "Liga";

    const status: "scheduled" | "live" | "finished" = isFinishedStatus(ev.strStatus)
      ? "finished"
      : ev.strStatus.includes("1H") || ev.strStatus.includes("2H") || ev.strStatus.includes("HT")
        ? "live"
        : "scheduled";

    const homeScore = ev.intHomeScore ? parseInt(ev.intHomeScore, 10) : undefined;
    const awayScore = ev.intAwayScore ? parseInt(ev.intAwayScore, 10) : undefined;

    return {
      id: ev.idEvent,
      league: leagueId,
      leagueLabel,
      apiLeagueId: ev.idLeague,
      homeTeam: ev.strHomeTeam,
      awayTeam: ev.strAwayTeam,
      eventDate: `${ev.dateEvent}T${ev.strTime ?? "00:00:00"}${ev.strTimezone ?? "Z"}`,
      status,
      homeScore: Number.isNaN(homeScore) ? undefined : homeScore,
      awayScore: Number.isNaN(awayScore) ? undefined : awayScore,
    };
  });

  // Pre-warm league cache with tight timeout
  const uniqueLeagueIds = [
    ...new Set(predictionInputs.map((ev) => ev.apiLeagueId).filter(Boolean)),
  ];
  const { fetchLeaguePastEvents } = await import("./api/thesportsdb");
  await withTimeout(
    Promise.allSettled(uniqueLeagueIds.map((lid) => fetchLeaguePastEvents(lid))),
    8_000,
  ).catch(() => {});

  const results = await Promise.allSettled(
    predictionInputs.map(async (ev) => {
      const prediction = await withTimeout(
        computePred(ev.homeTeam, ev.awayTeam, ev.league, ev.apiLeagueId),
        6_000,
      ).catch(() => FALLBACK_PREDICTION);
      const footballEvent = eventToFootballEvent(ev);
      return buildPred(footballEvent, prediction, { id: ev.apiLeagueId, name: ev.leagueLabel });
    }),
  );

  const succeeded = results.filter(
    (r): r is PromiseFulfilledResult<MatchPrediction> => r.status === "fulfilled",
  );

  const preds = succeeded.map((r) => r.value);

  // Escudos (ESPN, sem token). Nunca quebra o pipeline.
  return withTimeout(enrichMatchLogos(preds), 12_000).catch(() => preds);
}

// ─── Status helpers ────────────────────────────────────────────────────

/** Detecta jogo encerrado em qualquer variante da API (Finished, FT, AET, Full Time...). */
export function isFinishedStatus(s: string | null | undefined): boolean {
  const v = (s ?? "").toLowerCase().trim();
  return (
    v.includes("finished") ||
    v === "ft" ||
    v === "aet" ||
    v === "pen" ||
    v.includes("full time") ||
    v.includes("fulltime")
  );
}
