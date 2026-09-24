import { generatePredictions, computePrediction, warmTeamForms } from "./prediction-engine";
import { buildPrediction } from "./ml/pipeline";
import { enrichMatchLogos } from "./team-logos";
import { LEAGUE_IDS } from "./api/thesportsdb";
import { spTodayISO } from "./match-dates";
import { fetchOddsBatch, eventOddsToMatchOdds, type EventOdds } from "./api/odds";
import type { MatchPrediction, FootballEvent, LeagueId, PredictionData } from "./types";
import type { ApiPrediction } from "./api/thesportsdb";

/** Converte a previsão da API para PredictionData. */
function toPd(p: ApiPrediction): PredictionData {
  return {
    xgHome: p.xgHome,
    xgAway: p.xgAway,
    probHome: p.probHome,
    probDraw: p.probDraw,
    probAway: p.probAway,
    probOver25: p.probOver25 ?? 0,
    probBtts: p.probBtts ?? 0,
    probOver15: p.probOver15 ?? null,
    probOver35: p.probOver35 ?? null,
    modelConfidence: p.modelConfidence ?? null,
    mostLikelyScore: p.mostLikelyScore ?? null,
  };
}

function eventToFootballEvent(ev: {
  id: string;
  league: LeagueId;
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

function unavailablePrediction(
  event: FootballEvent,
  leagueMeta: { id: string; name: string },
): MatchPrediction {
  const hShort = event.homeTeam.substring(0, 3).toUpperCase();
  const aShort = event.awayTeam.substring(0, 3).toUpperCase();
  const emptyFair = Object.fromEntries(
    [
      "1X2_HOME",
      "DRAW",
      "1X2_AWAY",
      "OVER_1_5",
      "OVER_2_5",
      "OVER_3_5",
      "UNDER_1_5",
      "UNDER_2_5",
      "UNDER_3_5",
      "BTTS",
      "BTTS_NO",
      "DOUBLE_CHANCE_1X",
      "DOUBLE_CHANCE_X2",
      "DOUBLE_CHANCE_12",
      "HOME_SCORES",
      "AWAY_SCORES",
      "HOME_OVER_0_5",
      "HOME_OVER_1_5",
      "DNB_HOME",
      "DNB_AWAY",
      "AH_HOME_M05",
      "AH_AWAY_P05",
      "AH_HOME_M1",
      "AH_AWAY_P1",
    ].map((k) => [k, 0]),
  ) as MatchPrediction["fairOdds"];
  return {
    id: event.id,
    league: leagueMeta.id as LeagueId,
    leagueLabel: leagueMeta.name,
    kickoff: event.eventDate,
    status: event.status,
    scoreHome: event.homeScore,
    scoreAway: event.awayScore,
    home: { name: event.homeTeam, short: hShort, logo: "⚽", xg: 0, xga: 0 },
    away: { name: event.awayTeam, short: aShort, logo: "⚽", xg: 0, xga: 0 },
    probabilities: { home: 0, draw: 0, away: 0, over15: 0, over25: 0, over35: 0, btts: 0 },
    odds: {
      home: null,
      draw: null,
      away: null,
      over15: null,
      over25: null,
      over35: null,
      under15: null,
      under25: null,
      under35: null,
      btts: null,
      bttsNo: null,
      doubleChance1X: null,
      doubleChanceX2: null,
      doubleChance12: null,
    },
    fairOdds: emptyFair,
    oddsUpdatedAt: new Date().toISOString(),
    oddsAvailable: false,
    suggestedMarket: "1X2_HOME",
    suggestedProbability: 0,
    suggestedOdds: 0,
    suggestedLabel: `Vitória ${hShort}`,
    confidence: "low",
    predictionKind: event.status === "live" ? "live" : "pre",
    predictionStatus: "unavailable",
  };
}

async function snapshotPredictions(preds: MatchPrediction[]): Promise<void> {
  const { storePrediction } = await import("./ml/accuracy-store");
  const jobs = preds.flatMap((p) => {
    if (p.predictionStatus === "unavailable" || p.status !== "scheduled") return [];
    const eventId = Number(p.id);
    const leagueId = p.leagueApiId ?? Number(LEAGUE_IDS[p.league] ?? p.league);
    if (!Number.isFinite(eventId) || !Number.isFinite(leagueId)) return [];
    const rows: Array<{ market: string; probability: number; odds: number }> = [];
    const base = [
      {
        market: "1X2_HOME",
        probability: p.probabilities.home,
        odd: p.odds.home,
        fair: p.fairOdds?.["1X2_HOME"],
      },
      {
        market: "DRAW",
        probability: p.probabilities.draw,
        odd: p.odds.draw,
        fair: p.fairOdds?.["DRAW"],
      },
      {
        market: "1X2_AWAY",
        probability: p.probabilities.away,
        odd: p.odds.away,
        fair: p.fairOdds?.["1X2_AWAY"],
      },
      {
        market: "OVER_2_5",
        probability: p.probabilities.over25,
        odd: p.odds.over25,
        fair: p.fairOdds?.["OVER_2_5"],
      },
      {
        market: "BTTS",
        probability: p.probabilities.btts,
        odd: p.odds.btts,
        fair: p.fairOdds?.["BTTS"],
      },
    ];
    for (const r of base) {
      if (!Number.isFinite(r.probability)) continue;
      rows.push({
        market: r.market,
        probability: r.probability,
        // odds de snapshot: real se houver; senão fair do modelo (métrica técnica, não valor)
        odds: r.odd != null && r.odd > 1 ? r.odd : (r.fair ?? 0) || 1.01,
      });
    }
    return rows.map((r) =>
      storePrediction({
        eventId,
        leagueId,
        market: r.market as never,
        probability: r.probability,
        odds: r.odds,
        confidence: p.confidence,
        modelVersion: p.predictionSource === "api" ? (p.modelVersion ?? "api") : "local",
        outcome: null,
        createdAt: p.oddsUpdatedAt,
        resolvedAt: null,
        oddsAtPick: p.oddsAvailable ? r.odds : null,
        closingOdds: null,
        void: false,
      }),
    );
  });
  await Promise.allSettled(jobs);
}

async function fetchApiPredictionsSafe(from: string, to: string) {
  const { fetchApiPredictions } = await import("./api/thesportsdb");
  return withTimeout(fetchApiPredictions(from, to), 8_000).catch(() => {
    console.log("[data-pipeline] Previsões da API indisponíveis, usando modelo próprio");
    return new Map<string, ApiPrediction>();
  });
}

async function fetchOddsSafe(
  from: string,
  to: string,
  ids: string[],
): Promise<Map<string, EventOdds>> {
  try {
    // 30s: consenso por evento serializa com gap 350ms (apiJson) —
    // ~28 jogos ≈ 10s só de rate limit + latência de rede.
    return await withTimeout(fetchOddsBatch(from, to, ids), 30_000);
  } catch {
    console.log("[data-pipeline] Odds indisponíveis — modo probabilidade");
    return new Map();
  }
}

export interface PipelineResult {
  matches: MatchPrediction[];
  partial: boolean;
  notes: string[];
}

/** Processa em lotes com concorrência controlada (sem slice(0,40)). */
async function processInBatches<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        results[idx] = { status: "fulfilled", value: await fn(items[idx]) };
      } catch (reason) {
        results[idx] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function runPipelineDetailed(dateISO?: string): Promise<PipelineResult> {
  const notes: string[] = [];
  let partial = false;
  console.log(`[data-pipeline] Fetching events for ${dateISO ?? "today"}...`);

  const allEvents = await generatePredictions(dateISO);
  const activeEvents = allEvents.filter((ev) => ev.status !== "finished");
  console.log(
    `[data-pipeline] ${activeEvents.length} active (${allEvents.length - activeEvents.length} finished skipped)`,
  );

  if (activeEvents.length === 0) {
    return { matches: [], partial: false, notes: ["Nenhum jogo ativo."] };
  }

  const events = activeEvents; // sem corte fixo
  const date = dateISO ?? spTodayISO();
  const apiPreds = await fetchApiPredictionsSafe(date, date);
  const oddsMap = await fetchOddsSafe(
    date,
    date,
    events.map((e) => e.id),
  );

  const missing = events.filter((ev) => !apiPreds.has(ev.id));
  if (missing.length > 0) {
    const uniqueLeagueIds = [...new Set(missing.map((ev) => ev.apiLeagueId).filter(Boolean))];
    const { fetchLeaguePastEvents } = await import("./api/thesportsdb");
    await withTimeout(
      Promise.allSettled([
        ...uniqueLeagueIds.slice(0, 8).map((lid) => fetchLeaguePastEvents(lid)),
        warmTeamForms(missing.flatMap((ev) => [ev.homeTeam, ev.awayTeam]).slice(0, 20)),
      ]),
      6_000,
    ).catch(() => console.log("[data-pipeline] warm-up timed out"));
  }

  const results = await processInBatches(events, 4, async (ev) => {
    const fromApi = apiPreds.get(ev.id);
    const footballEvent = eventToFootballEvent(ev);
    const leagueMeta = { id: ev.apiLeagueId, name: ev.leagueLabel };
    const eventOdds = oddsMap.get(ev.id);

    if (fromApi) {
      return buildPrediction(footballEvent, toPd(fromApi), leagueMeta, {
        trustSource: true,
        modelVersion: fromApi.modelVersion,
        marketOdds: eventOdds ?? null,
      });
    }
    try {
      const prediction: PredictionData = await withTimeout(
        computePrediction(ev.homeTeam, ev.awayTeam, ev.league, ev.apiLeagueId),
        5_000,
      );
      return buildPrediction(footballEvent, prediction, leagueMeta, {
        trustSource: false,
        localOnly: true,
        marketOdds: eventOdds ?? null,
      });
    } catch {
      return unavailablePrediction(footballEvent, leagueMeta);
    }
  });

  const succeeded = results.filter(
    (r): r is PromiseFulfilledResult<MatchPrediction> => r.status === "fulfilled",
  );
  const failed = results.length - succeeded.length;
  if (failed > 0) {
    partial = true;
    notes.push(`${failed} jogos falharam no processamento.`);
  }
  if (oddsMap.size === 0 && events.length > 0) {
    partial = true;
    notes.push("Odds indisponíveis — mostrando só probabilidades.");
  }
  const noOdd = events.length - oddsMap.size;
  if (noOdd > 0 && oddsMap.size > 0) {
    notes.push(`${noOdd} jogos sem odd real (sem palpite de valor).`);
  }

  const preds = succeeded
    .map((r) => ({ ...r.value, oddsUpdatedAt: r.value.oddsUpdatedAt ?? new Date().toISOString() }))
    .filter(
      (match) =>
        match.predictionStatus !== "unavailable" &&
        Number.isFinite(match.probabilities.home) &&
        Number.isFinite(match.probabilities.draw) &&
        Number.isFinite(match.probabilities.away) &&
        Number.isFinite(match.probabilities.btts),
    );

  void snapshotPredictions(preds).catch(() => {});
  const enriched = await withTimeout(enrichMatchLogos(preds), 12_000).catch(() => preds);
  return { matches: enriched, partial, notes };
}

export async function fetchMatchesForDate(dateISO?: string): Promise<MatchPrediction[]> {
  try {
    const r = await withTimeout(runPipelineDetailed(dateISO), 45_000);
    return r.matches;
  } catch {
    console.log(`[data-pipeline] Pipeline timed out for ${dateISO ?? "today"}`);
    return [] as MatchPrediction[];
  }
}

export async function fetchMatchesForDateDetailed(dateISO?: string): Promise<PipelineResult> {
  try {
    return await withTimeout(runPipelineDetailed(dateISO), 45_000);
  } catch {
    return {
      matches: [],
      partial: true,
      notes: ["Pipeline esgotou o tempo — lista parcial ou vazia."],
    };
  }
}

export async function fetchTodayMatches(): Promise<MatchPrediction[]> {
  return fetchMatchesForDate();
}

export async function fetchLiveMatches(): Promise<MatchPrediction[]> {
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

  const todaySP = spTodayISO();
  const apiPreds = await fetchApiPredictionsSafe(todaySP, todaySP);
  const oddsMap = await fetchOddsSafe(
    todaySP,
    todaySP,
    live.map((e) => e.id),
  );

  const results = await processInBatches(live, 4, async (ev) => {
    const league = Object.entries(LEAGUE_IDS).find(([, id]) => id === ev.leagueId);
    const leagueId = league ? (league[0] as LeagueId) : ("premier-league" as LeagueId);
    const leagueLabel = ev.leagueName ?? "Liga";
    const fromApi = apiPreds.get(ev.id);
    const footballEvent = {
      id: ev.id,
      league: leagueId,
      leagueLabel,
      homeTeam: ev.homeTeam,
      awayTeam: ev.awayTeam,
      eventDate: ev.kickoff ?? new Date().toISOString(),
      status: "live" as const,
      homeScore: ev.homeScore ?? undefined,
      awayScore: ev.awayScore ?? undefined,
    };
    const leagueMeta = { id: ev.leagueId ?? leagueId, name: leagueLabel };
    const eventOdds = oddsMap.get(ev.id);

    if (fromApi) {
      return {
        ...(await buildPred(footballEvent, toPd(fromApi), leagueMeta, {
          trustSource: true,
          modelVersion: fromApi.modelVersion,
          marketOdds: eventOdds ?? null,
        })),
        minute: ev.minute ?? undefined,
        oddsUpdatedAt: new Date().toISOString(),
      };
    }
    let built: MatchPrediction;
    try {
      const prediction = await withTimeout(
        computePred(ev.homeTeam, ev.awayTeam, leagueId, ev.leagueId ?? undefined),
        5_000,
      );
      built = await buildPred(footballEvent, prediction, leagueMeta, {
        trustSource: false,
        localOnly: true,
        marketOdds: eventOdds ?? null,
      });
    } catch {
      return {
        ...unavailablePrediction(footballEvent, leagueMeta),
        minute: ev.minute ?? undefined,
      };
    }
    return {
      ...built,
      minute: ev.minute ?? undefined,
      oddsUpdatedAt: built.oddsUpdatedAt ?? new Date().toISOString(),
    };
  });

  const preds: MatchPrediction[] = results.flatMap((r) =>
    r.status === "fulfilled" ? [r.value as MatchPrediction] : [],
  );
  const real = preds.filter(
    (match) =>
      match.predictionStatus !== "unavailable" &&
      Number.isFinite(match.probabilities.home) &&
      Number.isFinite(match.probabilities.draw) &&
      Number.isFinite(match.probabilities.away),
  );
  return withTimeout(enrichMatchLogos(real), 12_000).catch(() => real);
}

export async function fetchUpcomingMatches(
  fromISO: string,
  toISO: string,
): Promise<MatchPrediction[]> {
  try {
    const r = await withTimeout(runUpcomingPipeline(fromISO, toISO), 45_000);
    return r.matches;
  } catch {
    console.log(`[data-pipeline] Upcoming pipeline timed out`);
    return [] as MatchPrediction[];
  }
}

async function runUpcomingPipeline(fromISO: string, toISO: string): Promise<PipelineResult> {
  const notes: string[] = [];
  let partial = false;
  const { fetchEventsByDateRange } = await import("./api/thesportsdb");
  const { computePrediction: computePred } = await import("./prediction-engine");
  const { buildPrediction: buildPred } = await import("./ml/pipeline");

  const allEvents = await fetchEventsByDateRange(fromISO, toISO);
  if (allEvents.length === 0)
    return { matches: [], partial: false, notes: ["Sem jogos na janela."] };

  const seen = new Set<string>();
  const uniqueEvents = allEvents.filter((ev) => {
    if (seen.has(ev.idEvent)) return false;
    seen.add(ev.idEvent);
    return true;
  });
  const upcoming = uniqueEvents.filter((ev) => !isFinishedStatus(ev.strStatus));

  const predictionInputs = upcoming.map((ev) => {
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

  const apiPreds = await fetchApiPredictionsSafe(fromISO, toISO);
  const oddsMap = await fetchOddsSafe(
    fromISO,
    toISO,
    predictionInputs.map((e) => e.id),
  );
  const missing = predictionInputs.filter((ev) => !apiPreds.has(ev.id));
  if (missing.length > 0) {
    const uniqueLeagueIds = [...new Set(missing.map((ev) => ev.apiLeagueId).filter(Boolean))];
    const { fetchLeaguePastEvents } = await import("./api/thesportsdb");
    await withTimeout(
      Promise.allSettled(uniqueLeagueIds.slice(0, 8).map((lid) => fetchLeaguePastEvents(lid))),
      6_000,
    ).catch(() => {});
  }

  const results = await processInBatches(predictionInputs, 4, async (ev) => {
    const fromApi = apiPreds.get(ev.id);
    const footballEvent = eventToFootballEvent(ev);
    const leagueMeta = { id: ev.apiLeagueId, name: ev.leagueLabel };
    const eventOdds = oddsMap.get(ev.id);
    if (fromApi) {
      return buildPred(footballEvent, toPd(fromApi), leagueMeta, {
        trustSource: true,
        modelVersion: fromApi.modelVersion,
        marketOdds: eventOdds ?? null,
      });
    }
    try {
      const prediction = await withTimeout(
        computePred(ev.homeTeam, ev.awayTeam, ev.league, ev.apiLeagueId),
        5_000,
      );
      return buildPred(footballEvent, prediction, leagueMeta, {
        trustSource: false,
        localOnly: true,
        marketOdds: eventOdds ?? null,
      });
    } catch {
      return unavailablePrediction(footballEvent, leagueMeta);
    }
  });

  const succeeded = results.filter(
    (r): r is PromiseFulfilledResult<MatchPrediction> => r.status === "fulfilled",
  );
  const failed = results.length - succeeded.length;
  if (failed > 0) {
    partial = true;
    notes.push(`${failed} jogos falharam.`);
  }
  if (oddsMap.size === 0 && predictionInputs.length > 0) {
    partial = true;
    notes.push("Odds indisponíveis — mostrando só probabilidades.");
  }

  const preds = succeeded
    .map((r) => r.value)
    .filter((m) => m.predictionStatus !== "unavailable" && Number.isFinite(m.probabilities.home));

  void snapshotPredictions(preds).catch(() => {});
  const enriched = await withTimeout(enrichMatchLogos(preds), 12_000).catch(() => preds);
  return { matches: enriched, partial, notes };
}

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

export { eventOddsToMatchOdds };
