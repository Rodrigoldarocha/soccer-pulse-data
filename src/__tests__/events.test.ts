import { describe, expect, it } from "vitest";

import { computeTeamForm, formSummary } from "../lib/events.functions";
import type { EventDetail } from "../lib/bzzoiro/types";

function fixture(
  partial: Partial<EventDetail> & { id: number; event_date: string; status: EventDetail["status"] },
): EventDetail {
  return {
    home_team: "Time A",
    away_team: "Time B",
    home_team_id: 1,
    away_team_id: 2,
    league_id: 10,
    ...partial,
  } as EventDetail;
}

describe("computeTeamForm", () => {
  it("returns last 5 finished matches in reverse chronological order", () => {
    const fixtures = [
      fixture({
        id: 1,
        event_date: "2026-08-01T18:00:00Z",
        status: "finished",
        home_score: 2,
        away_score: 1,
      }),
      fixture({
        id: 2,
        event_date: "2026-07-25T18:00:00Z",
        status: "finished",
        home_score: 0,
        away_score: 0,
      }),
      fixture({
        id: 3,
        event_date: "2026-07-18T18:00:00Z",
        status: "finished",
        home_score: 1,
        away_score: 3,
      }),
      fixture({
        id: 4,
        event_date: "2026-07-11T18:00:00Z",
        status: "finished",
        home_score: 2,
        away_score: 2,
      }),
      fixture({
        id: 5,
        event_date: "2026-07-04T18:00:00Z",
        status: "finished",
        home_score: 4,
        away_score: 0,
      }),
      fixture({
        id: 6,
        event_date: "2026-06-27T18:00:00Z",
        status: "finished",
        home_score: 0,
        away_score: 1,
      }),
    ];

    const form = computeTeamForm(fixtures, 1);

    expect(form).toHaveLength(5);
    expect(form.map((e) => e.result)).toEqual(["W", "D", "L", "D", "W"]);
    expect(form[0].date).toBe("2026-08-01T18:00:00Z");
    expect(form[0].opponent).toBe("Time B");
    expect(form[0].home).toBe(true);
    expect(form[0].score).toBe("2-1");
  });

  it("computes W/D/L from the away team perspective", () => {
    const fixtures = [
      fixture({
        id: 1,
        event_date: "2026-08-01T18:00:00Z",
        status: "finished",
        home_score: 0,
        away_score: 1,
      }),
    ];

    const form = computeTeamForm(fixtures, 2);

    expect(form).toHaveLength(1);
    expect(form[0].result).toBe("W");
    expect(form[0].home).toBe(false);
    expect(form[0].opponent).toBe("Time A");
  });

  it("ignores not-started and scoreless matches", () => {
    const fixtures = [
      fixture({ id: 1, event_date: "2026-08-05T18:00:00Z", status: "notstarted" }),
      fixture({
        id: 2,
        event_date: "2026-08-01T18:00:00Z",
        status: "finished",
        home_score: 2,
        away_score: 1,
      }),
      fixture({ id: 3, event_date: "2026-07-25T18:00:00Z", status: "finished" }),
    ];

    const form = computeTeamForm(fixtures, 1);

    expect(form).toHaveLength(1);
    expect(form[0].result).toBe("W");
  });

  it("caps at n entries", () => {
    const fixtures = Array.from({ length: 8 }, (_, i) =>
      fixture({
        id: i,
        event_date: `2026-0${i + 1}-01T18:00:00Z`,
        status: "finished",
        home_score: 1,
        away_score: 0,
      }),
    );

    expect(computeTeamForm(fixtures, 1, 3)).toHaveLength(3);
  });

  it("returns empty when no finished matches", () => {
    expect(computeTeamForm([], 1)).toEqual([]);
  });
});

describe("formSummary", () => {
  it("joins results into a compact string", () => {
    const form = computeTeamForm(
      [
        fixture({
          id: 1,
          event_date: "2026-08-01T18:00:00Z",
          status: "finished",
          home_score: 2,
          away_score: 1,
        }),
        fixture({
          id: 2,
          event_date: "2026-07-25T18:00:00Z",
          status: "finished",
          home_score: 0,
          away_score: 1,
        }),
      ],
      1,
    );

    expect(formSummary(form)).toBe("WL");
  });
});
