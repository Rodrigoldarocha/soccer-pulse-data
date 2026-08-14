import { describe, expect, it } from "vitest";

import { highValueBetsToNotify } from "../lib/push.functions";
import type { ValueBetRow } from "../lib/value-bets.functions";

function row(partial: Partial<ValueBetRow>): ValueBetRow {
  return {
    id: 1,
    event_id: 1,
    market: "1x2",
    outcome: "HOME",
    prob: 0.6,
    odds: 2.0,
    ev: 0.2,
    event_date: "2026-08-01T19:00:00Z",
    home_team: "Home",
    away_team: "Away",
    league_name: null,
    status: "pending",
    settled_at: null,
    notified_at: null,
    created_at: "2026-07-30T00:00:00Z",
    updated_at: "2026-07-30T00:00:00Z",
    ...partial,
  };
}

describe("highValueBetsToNotify", () => {
  it("includes pending bets with ev >= threshold and not notified", () => {
    const rows = [
      row({ id: 1, ev: 0.2 }),
      row({ id: 2, ev: 0.3 }),
      row({ id: 3, ev: 0.1 }), // abaixo do teto
      row({ id: 4, ev: 0.25, notified_at: "2026-08-01T00:00:00Z" }), // já avisado
      row({ id: 5, ev: 0.25, status: "won" }), // liquidado
    ];

    expect(highValueBetsToNotify(rows).map((r) => r.id)).toEqual([1, 2]);
  });

  it("respects a custom threshold", () => {
    const rows = [row({ id: 1, ev: 0.1 }), row({ id: 2, ev: 0.3 })];
    expect(highValueBetsToNotify(rows, 0.25).map((r) => r.id)).toEqual([2]);
  });

  it("returns [] when nothing qualifies", () => {
    expect(highValueBetsToNotify([])).toEqual([]);
  });
});
