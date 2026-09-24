// ─── Resolvedor de resultados (fecha o loop ML) ──────────────────────
// Busca ml_predictions com outcome IS NULL, consulta eventos finished,
// calcula outcome por mercado a partir do placar e grava em lote.

import type { MarketId } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

async function getClient(): Promise<AnyClient> | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  } catch {
    return null;
  }
}

export interface ScoreOutcomeInput {
  market: MarketId;
  homeScore: number;
  awayScore: number;
}

/** Outcome boolean de cada mercado a partir do placar final (90'). */
export function outcomeForMarket(input: ScoreOutcomeInput): boolean | null {
  const { market, homeScore: h, awayScore: a } = input;
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null;
  const tot = h + a;
  switch (market) {
    case "1X2_HOME":
      return h > a;
    case "DRAW":
      return h === a;
    case "1X2_AWAY":
      return a > h;
    case "OVER_1_5":
      return tot >= 2;
    case "OVER_2_5":
      return tot >= 3;
    case "OVER_3_5":
      return tot >= 4;
    case "UNDER_1_5":
      return tot < 2;
    case "UNDER_2_5":
      return tot < 3;
    case "UNDER_3_5":
      return tot < 4;
    case "BTTS":
      return h > 0 && a > 0;
    case "BTTS_NO":
      return !(h > 0 && a > 0);
    case "DOUBLE_CHANCE_1X":
      return h >= a;
    case "DOUBLE_CHANCE_X2":
      return a >= h;
    case "DOUBLE_CHANCE_12":
      return h !== a;
    case "HOME_SCORES":
      return h > 0;
    case "AWAY_SCORES":
      return a > 0;
    case "HOME_OVER_0_5":
      return h >= 1;
    case "HOME_OVER_1_5":
      return h >= 2;
    case "DNB_HOME":
      return h > a;
    case "DNB_AWAY":
      return a > h;
    case "AH_HOME_M05":
      return h > a;
    case "AH_AWAY_P05":
      return a >= h;
    case "AH_HOME_M1":
      return h - a > 1;
    case "AH_AWAY_P1":
      // a − h + 1 > 0 ganha; === 0 push (tratado como void na camada superior)
      return a - h + 1 > 0;
    default:
      return null;
  }
}

/** AH +1 fora: fora vence ou empata por ≤1 (handicap +1 cobre derrota por 1). */
export function outcomeAhAwayP1(h: number, a: number): boolean {
  // stake devolvida se a − h + 1 === 0 → tratamos empate AH como void (false aqui? usamos true se não perde)
  const diff = a - h + 1;
  return diff > 0; // diff===0 é push → resolvido como void na camada superior
}

export interface ResolveResult {
  scanned: number;
  resolved: number;
  voided: number;
  errors: number;
}

interface UnresolvedRow {
  event_id: number;
  market: string;
}

interface ApiEvent {
  id: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
  period?: string;
}

/**
 * Job idempotente: resolve pending de eventos finished na janela.
 * Batch upsert, sem N+1.
 */
export async function resolveFinishedEvents(
  opts: {
    daysBack?: number;
    dateFrom?: string;
    dateTo?: string;
  } = {},
): Promise<ResolveResult> {
  const client = await getClient();
  const result: ResolveResult = { scanned: 0, resolved: 0, voided: 0, errors: 0 };
  if (!client) return result;

  try {
    const { data, error } = await client
      .from("ml_predictions")
      .select("event_id, market, created_at")
      .is("outcome", null)
      .eq("void", false)
      .lt("created_at", new Date().toISOString())
      .limit(2000);
    if (error || !data?.length) return result;
    const rows = data as UnresolvedRow[];
    result.scanned = rows.length;

    const from =
      opts.dateFrom ??
      new Date(Date.now() - (opts.daysBack ?? 14) * 86_400_000).toISOString().slice(0, 10);
    const to = opts.dateTo ?? new Date().toISOString().slice(0, 10);

    const eventIds = [...new Set(rows.map((r) => r.event_id))];
    const scores = new Map<number, { h: number; a: number; status: string; period?: string }>();

    // busca eventos em lotes
    for (let i = 0; i < eventIds.length; i += 50) {
      const chunk = eventIds.slice(i, i + 50);
      const res = await import("./api/thesportsdb").then((m) =>
        m.apiJson<ApiEvent[] | { results: ApiEvent[] }>(
          `events/?date_from=${from}&date_to=${to}&status=finished&limit=200`,
          { ttlMs: 5 * 60 * 1000 },
        ),
      );
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        for (const ev of list) {
          if (chunk.includes(ev.id) && ev.home_score != null && ev.away_score != null) {
            scores.set(ev.id, {
              h: ev.home_score,
              a: ev.away_score,
              status: ev.status,
              period: ev.period,
            });
          }
        }
      }
    }

    // fallback: busca por id individual só para os que faltam (limitado)
    const stillMissing = eventIds.filter((id) => !scores.has(id)).slice(0, 30);
    for (const id of stillMissing) {
      const res = await import("./api/thesportsdb").then((m) =>
        m.apiJson<{
          home_score: number | null;
          away_score: number | null;
          status: string;
          period?: string;
        }>(`events/${id}/`, { ttlMs: 10 * 60 * 1000 }),
      );
      if (res.success && res.data && res.data.home_score != null && res.data.away_score != null) {
        scores.set(id, {
          h: res.data.home_score,
          a: res.data.away_score,
          status: res.data.status,
          period: res.data.period,
        });
      }
    }

    const now = new Date().toISOString();
    const updates: Array<{
      event_id: number;
      market: string;
      outcome: boolean | null;
      void: boolean;
      resolved_at: string | null;
    }> = [];

    for (const row of rows) {
      const sc = scores.get(row.event_id);
      if (!sc) continue;

      const status = (sc.status ?? "").toLowerCase();
      if (status === "postponed" || status === "cancelled") {
        updates.push({
          event_id: row.event_id,
          market: row.market,
          outcome: null,
          void: true,
          resolved_at: now,
        });
        result.voided++;
        continue;
      }
      if (status !== "finished" && !status.includes("finished") && status !== "ft") continue;

      // prorrogação/pênaltis: sem placar 90' separado → void para não contaminar
      if (
        status.includes("aet") ||
        status.includes("pen") ||
        (sc.period && /ET|PEN/i.test(sc.period))
      ) {
        updates.push({
          event_id: row.event_id,
          market: row.market,
          outcome: null,
          void: true,
          resolved_at: now,
        });
        result.voided++;
        continue;
      }

      const outcome = outcomeForMarket({
        market: row.market as MarketId,
        homeScore: sc.h,
        awayScore: sc.a,
      });
      if (outcome == null) continue;
      updates.push({
        event_id: row.event_id,
        market: row.market,
        outcome,
        void: false,
        resolved_at: now,
      });
      result.resolved++;
    }

    if (updates.length) {
      // resolvePrediction explícito + upsert em lote
      const { resolvePrediction } = await import("./accuracy-store");
      await Promise.allSettled(
        updates.map((u) =>
          resolvePrediction(
            u.event_id,
            u.market as MarketId,
            u.outcome ?? false,
            (!u.void && u.outcome != null) || u.void,
          ),
        ),
      );
      // voids
      for (const u of updates.filter((x) => x.void)) {
        try {
          await client
            .from("ml_predictions")
            .update({ void: true, resolved_at: u.resolved_at })
            .eq("event_id", u.event_id)
            .eq("market", u.market);
        } catch {
          result.errors++;
        }
      }
    }
  } catch (err) {
    console.error("[resolver]", err);
    result.errors++;
  }
  return result;
}
