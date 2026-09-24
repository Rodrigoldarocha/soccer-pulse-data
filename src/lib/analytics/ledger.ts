// ─── Ledger + métricas de performance para /analytics ───────────────

import { createServerFn } from "@tanstack/react-start";
import type { LedgerRow, PerformanceSummary, BaselineRow } from "./types";
import { summarizeLedger, computeBaselines, groupBy, MIN_SAMPLE } from "./performance";

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

function mapRow(d: Record<string, unknown>): LedgerRow {
  return {
    id: Number(d.id),
    pickKind: (d.pick_kind as "single" | "parlay") ?? "single",
    parlayId: (d.parlay_id as string | null) ?? null,
    eventId: Number(d.event_id),
    leagueId: Number(d.league_id),
    market: String(d.market),
    selection: String(d.selection),
    probability: Number(d.probability),
    oddAtPick: Number(d.odd_at_pick),
    closingOdd: d.closing_odd == null ? null : Number(d.closing_odd),
    ev: Number(d.ev),
    edge: Number(d.edge),
    stakeUnits: d.stake_units == null ? null : Number(d.stake_units),
    confidence: String(d.confidence),
    modelVersion: String(d.model_version),
    outcome: d.outcome == null ? null : Boolean(d.outcome),
    void: Boolean(d.void),
    createdAt: String(d.created_at),
    resolvedAt: d.resolved_at == null ? null : String(d.resolved_at),
  };
}

export async function loadLedger(limit = 500): Promise<LedgerRow[]> {
  const client = await getClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from("pick_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(mapRow);
  } catch {
    return [];
  }
}

export async function insertLedger(rows: Array<Record<string, unknown>>): Promise<void> {
  if (!rows.length) return;
  const client = await getClient();
  if (!client) return;
  const { error } = await client.from("pick_ledger").insert(rows);
  if (error && error.code !== "23505") {
    console.error("[ledger] insert:", error.message);
  }
}

export interface AnalyticsPayload {
  summary: PerformanceSummary;
  baselines: BaselineRow[];
  ledger: LedgerRow[];
  byMarket: Array<{ market: string; n: number; hitRate: number; roi: number }>;
  byLeague: Array<{ league: string; n: number; hitRate: number; roi: number }>;
  byOddBand: Array<{ band: string; n: number; hitRate: number; roi: number }>;
  singlesVsParlays: { singles: number; parlays: number; singlesRoi: number; parlaysRoi: number };
  curve: Array<{ i: number; value: number }>;
  minSample: number;
}

export const getPerformance = createServerFn({ method: "GET" }).handler(async () => {
  const ledger = await loadLedger();
  const summary = summarizeLedger(ledger);
  const baselines = computeBaselines(ledger);

  const agg = <T extends string>(keyFn: (r: LedgerRow) => T) => {
    const groups = groupBy(
      ledger.filter((r) => !r.void && r.outcome != null),
      keyFn,
    );
    return [...groups.entries()].map(([k, rows]) => {
      const wins = rows.filter((r) => r.outcome).length;
      const profit = rows.reduce(
        (s, r) => s + (r.outcome ? (r.stakeUnits ?? 1) * (r.oddAtPick - 1) : -(r.stakeUnits ?? 1)),
        0,
      );
      return { key: k, n: rows.length, hitRate: wins / rows.length, roi: profit / rows.length };
    });
  };

  const byMarket = agg((r) => r.market).map((x) => ({
    market: x.key,
    n: x.n,
    hitRate: x.hitRate,
    roi: x.roi,
  }));
  const byLeague = agg((r) => String(r.leagueId)).map((x) => ({
    league: x.key,
    n: x.n,
    hitRate: x.hitRate,
    roi: x.roi,
  }));
  const bandOf = (odd: number) =>
    odd < 1.6 ? "<1.6" : odd < 2.2 ? "1.6–2.2" : odd < 3.2 ? "2.2–3.2" : "≥3.2";
  const byOddBand = agg((r) => bandOf(r.oddAtPick)).map((x) => ({
    band: x.key,
    n: x.n,
    hitRate: x.hitRate,
    roi: x.roi,
  }));

  const singles = ledger.filter((r) => r.pickKind === "single" && !r.void && r.outcome != null);
  const parlays = ledger.filter((r) => r.pickKind === "parlay" && !r.void && r.outcome != null);
  const roiOf = (rows: LedgerRow[]) =>
    rows.length
      ? rows.reduce(
          (s, r) =>
            s + (r.outcome ? (r.stakeUnits ?? 1) * (r.oddAtPick - 1) : -(r.stakeUnits ?? 1)),
          0,
        ) / rows.length
      : 0;

  let acc = 0;
  const curve = ledger
    .filter((r) => !r.void && r.outcome != null)
    .slice()
    .reverse()
    .map((r, i) => {
      acc += r.outcome ? (r.stakeUnits ?? 1) * (r.oddAtPick - 1) : -(r.stakeUnits ?? 1);
      return { i, value: +acc.toFixed(2) };
    });

  return {
    summary,
    baselines,
    ledger,
    byMarket,
    byLeague,
    byOddBand,
    singlesVsParlays: {
      singles: singles.length,
      parlays: parlays.length,
      singlesRoi: roiOf(singles),
      parlaysRoi: roiOf(parlays),
    },
    curve,
    minSample: MIN_SAMPLE,
  } satisfies AnalyticsPayload;
});

/** Export CSV do ledger. */
export const exportLedgerCsv = createServerFn({ method: "GET" }).handler(async () => {
  const ledger = await loadLedger(2000);
  const header = [
    "id",
    "kind",
    "parlay_id",
    "event_id",
    "league_id",
    "market",
    "selection",
    "probability",
    "odd_at_pick",
    "closing_odd",
    "ev",
    "edge",
    "stake_units",
    "confidence",
    "outcome",
    "void",
    "created_at",
    "resolved_at",
  ];
  const lines = [header.join(",")];
  for (const r of ledger) {
    lines.push(
      [
        r.id,
        r.pickKind,
        r.parlayId ?? "",
        r.eventId,
        r.leagueId,
        r.market,
        `"${r.selection.replace(/"/g, '""')}"`,
        r.probability,
        r.oddAtPick,
        r.closingOdd ?? "",
        r.ev,
        r.edge,
        r.stakeUnits ?? "",
        r.confidence,
        r.outcome == null ? "" : String(r.outcome),
        String(r.void),
        r.createdAt,
        r.resolvedAt ?? "",
      ].join(","),
    );
  }
  return lines.join("\n");
});
