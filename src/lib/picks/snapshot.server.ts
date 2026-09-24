// Snapshot imutável de palpites + ledger (primeira gravação vence).

import { fetchMatchesForDate } from "@/lib/data-pipeline";
import { buildPicksFromMatches, type DailyPicksResult } from "./singles";
import { buildDailyParlays, type ParlayDayResult, type ParlayProfile } from "./parlays";
import { PICK_CONFIG } from "./config";

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

export interface SnapshotResult extends DailyPicksResult {
  parlays: Record<ParlayProfile, ParlayDayResult>;
}

export async function generatePicksSnapshot(date: string): Promise<SnapshotResult> {
  const matches = await fetchMatchesForDate(date);
  const singles = buildPicksFromMatches(matches, date, PICK_CONFIG);
  const parlays = buildDailyParlays(singles.picks, singles.radar, matches, PICK_CONFIG);
  await persistLedger(singles, parlays, matches);
  await captureOddsSnapshots(matches);
  return { ...singles, parlays };
}

async function persistLedger(
  singles: DailyPicksResult,
  parlays: Record<ParlayProfile, ParlayDayResult>,
  matches: unknown[],
): Promise<void> {
  const client = await getClient();
  if (!client) return;
  const rows: Array<Record<string, unknown>> = [];
  const leagueId = (s: { league: string; eventId: string }) => {
    const m = matches.find((x) => (x as { id?: string }).id === s.eventId) as
      { leagueApiId?: number } | undefined;
    return m?.leagueApiId ?? 0;
  };

  for (const p of singles.picks) {
    rows.push({
      pick_kind: "single",
      parlay_id: null,
      event_id: Number(p.eventId),
      league_id: leagueId(p),
      market: p.market,
      selection: p.selectionLabel,
      probability: p.p,
      odd_at_pick: p.odd,
      closing_odd: null,
      ev: p.EV,
      edge: p.edge,
      stake_units: p.stakeUnits,
      confidence: p.confidence,
      model_version: p.sources.api ? "api+dc" : "dc",
      outcome: null,
      void: false,
    });
  }

  for (const profile of Object.keys(parlays) as ParlayProfile[]) {
    const pl = parlays[profile].parlays[0];
    if (!pl) continue;
    const parlayId = pl.id;
    for (const leg of pl.legs) {
      const p = leg.pick;
      rows.push({
        pick_kind: "parlay",
        parlay_id: parlayId,
        event_id: Number(p.eventId),
        league_id: leagueId(p),
        market: p.market,
        selection: p.selectionLabel,
        probability: p.p,
        odd_at_pick: p.odd,
        closing_odd: null,
        ev: pl.EV,
        edge: p.edge,
        stake_units: pl.stakeUnits / pl.legs.length,
        confidence: p.confidence,
        model_version: "parlay",
        outcome: null,
        void: false,
      });
    }
  }

  if (!rows.length) return;
  try {
    await client
      .from("pick_ledger")
      .upsert(rows, { onConflict: "event_id,market,selection,pick_kind" });
  } catch {
    try {
      await client.from("pick_ledger").insert(rows);
    } catch {
      // silencioso
    }
  }
}

async function captureOddsSnapshots(
  matches: Array<{ id: string; markets?: Array<{ market: string; odd: number | null }> }>,
): Promise<void> {
  const client = await getClient();
  if (!client) return;
  const rows: Array<Record<string, unknown>> = [];
  for (const m of matches) {
    const eventId = Number(m.id);
    if (!Number.isFinite(eventId)) continue;
    for (const mk of m.markets ?? []) {
      if (mk.odd == null) continue;
      rows.push({
        event_id: eventId,
        market: mk.market,
        selection: mk.market,
        bookmaker: "consensus",
        odd: mk.odd,
        is_closing: false,
      });
    }
  }
  if (!rows.length) return;
  try {
    await client.from("odds_snapshots").insert(rows);
  } catch {
    // silencioso
  }
}
