import type { MarketId } from "../types";
import type { CalibrationParams, AccuracyMetrics, MlPredictionRecord } from "./types";

// Cast for tables that may not exist yet. All functions try/catch → graceful degrade.
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
    const { data: existing } = await client
      .from(TABLE_PREDICTIONS)
      .select("event_id")
      .eq("event_id", record.eventId)
      .eq("market", record.market)
      .maybeSingle();
    if (existing) return;
    await client.from(TABLE_PREDICTIONS).insert({
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
      odds_at_pick: record.oddsAtPick ?? record.odds,
      closing_odds: record.closingOdds ?? null,
      void: record.void ?? false,
    });
  } catch (err) {
    console.error("[ML AccuracyStore] Failed to store prediction:", err);
  }
}

/** Marca void (adiado/cancelado) sem contaminar outcome. */
export async function voidPrediction(eventId: number, market: MarketId): Promise<void> {
  try {
    const client = await getClient();
    if (!client) return;
    await client
      .from(TABLE_PREDICTIONS)
      .update({ void: true, resolved_at: new Date().toISOString() })
      .eq("event_id", eventId)
      .eq("market", market);
  } catch (err) {
    console.error("[ML AccuracyStore] Failed to void prediction:", err);
  }
}

export async function resolvePrediction(
  eventId: number,
  market: MarketId,
  actualOutcome: boolean,
  isFinal: boolean,
): Promise<void> {
  if (!isFinal) return;
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

export async function loadCalibration(
  leagueId: number,
  market: MarketId,
): Promise<CalibrationParams | undefined> {
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
      ece: typeof data.ece === "number" ? data.ece : undefined,
      method: data.method === "isotonic" ? "isotonic" : "platt",
      isotonic: Array.isArray(data.isotonic_points)
        ? (data.isotonic_points as Array<{ x: number; y: number }>)
        : undefined,
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
        ece: params.ece ?? null,
        method: params.method ?? "platt",
        isotonic_points: params.isotonic ?? null,
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
    return data.map((d: Record<string, unknown>) => ({
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

/**
 * Recalcula métricas E AJUSTA calibração (Platt/isotonic) por célula.
 * Pooling hierárquico: liga → mercado global (league_id 0) → identidade.
 */
export async function recomputeAccuracyMetrics(): Promise<void> {
  try {
    const client = await getClient();
    if (!client) return;
    const { data } = await client
      .from(TABLE_PREDICTIONS)
      .select("league_id, market, probability, outcome, confidence, void")
      .not("outcome", "is", null);

    if (!data || data.length === 0) return;

    const { fitPlatt, fitIsotonic, brierOf, expectedCalibrationError } =
      await import("./calibration");

    interface Group {
      probabilities: number[];
      outcomes: boolean[];
      confidences: string[];
      leagueId: number;
      market: string;
    }
    const groups = new Map<string, Group>();
    const byMarket = new Map<string, Group>();
    const global = new Map<string, Group>();

    for (const row of data as Array<{
      league_id: number;
      market: string;
      probability: number;
      outcome: boolean;
      confidence: string;
      void?: boolean;
    }>) {
      if (row.void) continue;
      const k = `${row.league_id}:${row.market}`;
      const mk = `0:${row.market}`;
      const gk = `0:ALL`;
      for (const key of [k, mk, gk]) {
        const target = key === k ? groups : key === mk ? byMarket : global;
        if (!target.has(key)) {
          target.set(key, {
            probabilities: [],
            outcomes: [],
            confidences: [],
            leagueId: key.startsWith("0:") ? 0 : row.league_id,
            market: key.endsWith(":ALL") ? row.market : row.market,
          });
        }
        const g = target.get(key)!;
        g.probabilities.push(row.probability);
        g.outcomes.push(!!row.outcome);
        g.confidences.push(row.confidence);
      }
    }

    for (const [k, g] of groups) {
      const [leagueIdStr, market] = k.split(":");
      const leagueId = Number(leagueIdStr);
      const n = g.outcomes.length;
      const correct = g.outcomes.filter((o, i) => o === g.probabilities[i] >= 0.5).length;
      const accuracy = correct / n;
      const brierScore =
        g.probabilities.reduce((sum, p, i) => sum + (p - (g.outcomes[i] ? 1 : 0)) ** 2, 0) / n;
      const logLoss =
        g.probabilities.reduce((sum, p, i) => {
          const q = Math.max(1e-7, Math.min(1 - 1e-7, p));
          const y = g.outcomes[i] ? 1 : 0;
          return sum + (y * Math.log(q) + (1 - y) * Math.log(1 - q));
        }, 0) / -n;
      const avgConfidence = g.probabilities.reduce((sum, p) => sum + p, 0) / n;
      const ece = expectedCalibrationError(
        g.probabilities,
        g.outcomes.map((o) => (o ? 1 : 0)),
      );

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
          calibration_error: +ece.toFixed(4),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "league_id, market" },
      );

      // ── Calibração de verdade ──
      if (n >= 30) {
        const platt = fitPlatt(g.probabilities, g.outcomes);
        let method: "platt" | "isotonic" = "platt";
        let a = platt.a;
        let b = platt.b;
        let brier = platt.brier;
        let iso: Array<{ x: number; y: number }> | undefined;

        if (n >= 300) {
          const points = fitIsotonic(g.probabilities, g.outcomes);
          const isoPreds = g.probabilities.map((p) => {
            // usa pts para predição
            let y = points[0]?.y ?? p;
            for (let i = 0; i < points.length; i++) {
              if (p <= points[i].x) {
                y = points[i].y;
                break;
              }
              y = points[i].y;
            }
            return y;
          });
          const isoBrier = brierOf(isoPreds, g.outcomes);
          if (isoBrier < brier) {
            method = "isotonic";
            brier = isoBrier;
            iso = points;
            a = 1;
            b = 0;
          }
        }

        await saveCalibration({
          leagueId,
          market: market as never,
          a,
          b,
          brierScore: brier,
          sampleSize: n,
          updatedAt: new Date().toISOString(),
          ece,
          method,
          isotonic: iso,
        });
      } else {
        // pooling hierárquico: calibração global do mercado
        const pooled = byMarket.get(`0:${market}`);
        if (pooled && pooled.probabilities.length >= 30) {
          const platt = fitPlatt(pooled.probabilities, pooled.outcomes);
          await saveCalibration({
            leagueId,
            market: market as never,
            a: platt.a,
            b: platt.b,
            brierScore: platt.brier,
            sampleSize: pooled.probabilities.length,
            updatedAt: new Date().toISOString(),
            ece: platt.ece,
            method: "platt",
          });
        }
      }
    }

    // invalidate caches de pipeline
    try {
      const { invalidateCaches } = await import("./pipeline");
      invalidateCaches();
    } catch {
      // circular ok
    }
  } catch (err) {
    console.error("[ML AccuracyStore] Failed to recompute metrics:", err);
  }
}
