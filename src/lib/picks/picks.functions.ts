// ─── Server functions de palpites ────────────────────────────────────

import { createServerFn } from "@tanstack/react-start";
import { spTodayISO, spDateISO } from "@/lib/match-dates";
import { fetchMatchesForDate } from "@/lib/data-pipeline";
import { getCachedOrGenerate } from "@/lib/matches.server";
import { buildPicksFromMatches, type DailyPicksResult } from "./singles";
import { buildDailyParlays, type ParlayProfile, type ParlayDayResult } from "./parlays";
import { PICK_CONFIG } from "./config";
import { getOddsMode } from "@/lib/api/odds";

export interface PicksDayPayload {
  date: string;
  singles: DailyPicksResult;
  parlays: Record<ParlayProfile, ParlayDayResult>;
  generatedAt: string;
}

async function generatePicks(date: string): Promise<PicksDayPayload> {
  const matches = await fetchMatchesForDate(date);
  const singles = buildPicksFromMatches(matches, date, PICK_CONFIG);
  const parlays = buildDailyParlays(singles.picks, singles.radar, matches, PICK_CONFIG);
  return {
    date,
    singles,
    parlays,
    generatedAt: new Date().toISOString(),
  };
}

export const getDailyPicks = createServerFn({ method: "GET" })
  .validator((date: string | undefined) => ({ date: date || spTodayISO() }))
  .handler(async ({ data }) => {
    try {
      const payload = await getCachedOrGenerate(`picks:${data.date}`, 60 * 10, () =>
        generatePicks(data.date),
      );
      return payload;
    } catch (err) {
      console.error("[getDailyPicks]", err);
      return {
        date: data.date,
        singles: buildPicksFromMatches([], data.date, PICK_CONFIG, {
          notes: ["Falha ao gerar palpites. Tente novamente."],
        }),
        parlays: {
          segura: { profile: "segura", parlays: [], honestMessage: "Sem dados." },
          equilibrada: { profile: "equilibrada", parlays: [], honestMessage: "Sem dados." },
          ousada: { profile: "ousada", parlays: [], honestMessage: "Sem dados." },
        },
        generatedAt: new Date().toISOString(),
      };
    }
  });

export const getTomorrowPicks = createServerFn({ method: "GET" }).handler(async () => {
  const date = spDateISO(1);
  return generatePicks(date);
});

/** Recalibração admin (mesmo caminho do cron). */
export const recalibrateNow = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const { recomputeAccuracyMetrics } = await import("@/lib/ml/accuracy-store");
    await recomputeAccuracyMetrics();
    const { invalidateCaches } = await import("@/lib/ml/pipeline");
    invalidateCaches();
    return { ok: true as const, oddsMode: getOddsMode() };
  } catch (err) {
    return { ok: false as const, error: String(err) };
  }
});
