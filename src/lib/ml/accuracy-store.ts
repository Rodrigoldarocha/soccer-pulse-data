import type { MarketId } from "../types";
import type { CalibrationParams, AccuracyMetrics, MlPredictionRecord } from "./types";

// Cast to any for tables that may not exist in the Supabase schema yet.
// All functions are wrapped in try/catch so missing tables degrade gracefully.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

function getClient(): Promise<AnyClient> | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);
}

const TABLE_PREDICTIONS = "ml_predictions";
const TABLE_CALIBRATION = "ml_calibration_params";
const TABLE_ACCURACY = "ml_accuracy_metrics";

export async function storePrediction(record: MlPredictionRecord): Promise<void> {
  try {
    const client = await getClient();
    if (!client) return;
    await client.from(TABLE_PREDICTIONS).upsert(
      {
        event_id: record.eventId,
        league_id: record.leagueId,
        market: record.market,
        probability: record.probability,
        odds: record.odds,
        confidence: record.confidence,
        model_version: record.modelVersion,
        outcome: record.outcome,
        created_at: record.createdAt,
        resolved_at: record.resolvedAt,
      },
      { onConflict: "event_id, market" },
    );
  } catch (err) {
    console.error("[ML AccuracyStore] Failed to store prediction:", err);
  }
}

export async function resolvePrediction(eventId: number, market: MarketId, actualOutcome: boolean): Promise<void> {
  try {
    const client = await getClient();
    if (!client) return;
    const now = new Date().toISOString();
    await client
      .from(TABLE_PREDICTIONS)
      .update({ outcome: actualOutcome, resolved_at: now })
      .eq("event_id", eventId)
      .eq("market", market);
  } catch (err) {
    console.error("[ML AccuracyStore] Failed to resolve prediction:", err);
  }
}

export async function loadCalibration(leagueId: number, market: MarketId): Promise<CalibrationParams | undefined> {
  try {
    const client = await getClient();
    if (!client) return undefined;
    const { data } = await client
      .from(TABLE_CALIBRATION)
      .select("*")
      .eq("league_id", leagueId)
      .eq("market", market)
      .maybeSingle();
    if (!data) return undefined;
    return {
      leagueId: data.league_id,
      market: data.market,
      a: data.a,
      b: data.b,
      brierScore: data.brier_score,
      sampleSize: data.sample_size,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.error("[ML AccuracyStore] Failed to load calibration:", err);
    return undefined;
  }
}

export async function saveCalibration(params: CalibrationParams): Promise<void> {
  try {
    const client = await getClient();
    if (!client) return;
    await client.from(TABLE_CALIBRATION).upsert(
      {
        league_id: params.leagueId,
        market: params.market,
        a: params.a,
        b: params.b,
        brier_score: params.brierScore,
        sample_size: params.sampleSize,
        updated_at: params.updatedAt,
      },
      { onConflict: "league_id, market" },
    );
  } catch (err) {
    console.error("[ML AccuracyStore] Failed to save calibration:", err);
  }
}

export async function loadAccuracyMetrics(): Promise<AccuracyMetrics[]> {
  try {
    const client = await getClient();
    if (!client) return [];
    const { data } = await client
      .from(TABLE_ACCURACY)
      .select("*")
      .order("accuracy", { ascending: false });
    if (!data) return [];
    return data.map((d: any) => ({
      leagueId: d.league_id,
      leagueName: d.league_name,
      market: d.market,
      totalPredictions: d.total_predictions,
      correctPredictions: d.correct_predictions,
      accuracy: d.accuracy,
      brierScore: d.brier_score,
      logLoss: d.log_loss,
      avgConfidence: d.avg_confidence,
      calibrationError: d.calibration_error,
      updatedAt: d.updated_at,
    }));
  } catch (err) {
    console.error("[ML AccuracyStore] Failed to load metrics:", err);
    return [];
  }
}

export async function recomputeAccuracyMetrics(): Promise<void> {
  try {
    const client = await getClient();
    if (!client) return;
    const { data } = await client
      .from(TABLE_PREDICTIONS)
      .select("league_id, market, probability, outcome, confidence")
      .not("outcome", "is", null);

    if (!data || data.length === 0) return;

    const groups = new Map<string, { probabilities: number[]; outcomes: boolean[]; confidences: string[] }>();
    for (const row of data as any[]) {
      const k = `${row.league_id}:${row.market}`;
      if (!groups.has(k)) groups.set(k, { probabilities: [], outcomes: [], confidences: [] });
      const g = groups.get(k)!;
      g.probabilities.push(row.probability);
      g.outcomes.push(row.outcome);
      g.confidences.push(row.confidence);
    }

    for (const [k, g] of groups) {
      const [leagueIdStr, market] = k.split(":");
      const leagueId = Number(leagueIdStr);
      const n = g.outcomes.length;
      const correct = g.outcomes.filter((o, i) => o === (g.probabilities[i] >= 0.5)).length;
      const accuracy = correct / n;
      const brierScore = g.probabilities.reduce((sum, p, i) => sum + (p - (g.outcomes[i] ? 1 : 0)) ** 2, 0) / n;
      const logLoss =
        g.probabilities.reduce((sum, p, i) => {
          const q = Math.max(1e-7, Math.min(1 - 1e-7, p));
          const y = g.outcomes[i] ? 1 : 0;
          return sum + (y * Math.log(q) + (1 - y) * Math.log(1 - q));
        }, 0) /
        -n;
      const avgConfidence = g.probabilities.reduce((sum, p) => sum + p, 0) / n;
      const binSize = 0.1;
      let calibrationError = 0;
      for (let b = 0; b < 10; b++) {
        const binLo = b * binSize;
        const binHi = (b + 1) * binSize;
        const inBin = g.probabilities.map((p, i) => ({ p, o: g.outcomes[i] })).filter((x) => x.p >= binLo && x.p < binHi);
        if (inBin.length > 0) {
          const avgPred = inBin.reduce((s, x) => s + x.p, 0) / inBin.length;
          const actualFrac = inBin.filter((x) => x.o).length / inBin.length;
          calibrationError += Math.abs(avgPred - actualFrac) * (inBin.length / n);
        }
      }

      const leagueName = String(leagueId);
      await client.from(TABLE_ACCURACY).upsert(
        {
          league_id: leagueId,
          league_name: leagueName,
          market,
          total_predictions: n,
          correct_predictions: correct,
          accuracy: +accuracy.toFixed(4),
          brier_score: +brierScore.toFixed(4),
          log_loss: +logLoss.toFixed(4),
          avg_confidence: +avgConfidence.toFixed(4),
          calibration_error: +calibrationError.toFixed(4),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "league_id, market" },
      );
    }
  } catch (err) {
    console.error("[ML AccuracyStore] Failed to recompute metrics:", err);
  }
}
