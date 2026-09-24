import type { MarketId, MatchOdds } from "../types";

export type LedgerPickKind = "single" | "parlay";

export interface PickLedgerRow {
  id?: number;
  pick_kind: LedgerPickKind;
  parlay_id?: string | null;
  event_id: number;
  league_id: number;
  market: string;
  selection: string;
  probability: number;
  odd_at_pick: number;
  closing_odd?: number | null;
  ev: number;
  edge: number;
  stake_units?: number | null;
  confidence: string;
  model_version: string;
  outcome?: boolean | null;
  void?: boolean;
  created_at?: string;
  resolved_at?: string | null;
}

export interface LedgerRow {
  id: number;
  pickKind: "single" | "parlay";
  parlayId: string | null;
  eventId: number;
  leagueId: number;
  market: string;
  selection: string;
  probability: number;
  oddAtPick: number;
  closingOdd: number | null;
  ev: number;
  edge: number;
  stakeUnits: number | null;
  confidence: string;
  modelVersion: string;
  outcome: boolean | null;
  void: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

export interface PerformanceSummary {
  resolved: number;
  wins: number;
  losses: number;
  voids: number;
  hitRate: number;
  roiFlat: number;
  roiKelly: number;
  profitUnits: number;
  maxDrawdown: number;
  clvAvg: number | null;
  clvN: number;
  clvCiLow: number | null;
  clvCiHigh: number | null;
  wilsonLower: number;
  insufficientSample: boolean;
}

export interface BaselineRow {
  name: string;
  resolved: number;
  hitRate: number;
  roiFlat: number;
  profitUnits: number;
}

// type re-export helpers used by market mapping
export type { MarketId, MatchOdds };
