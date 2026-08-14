import { describe, expect, it } from "vitest";

import { calibrationBuckets, type AccuracyPick } from "../lib/accuracy.functions";

function pick(partial: Partial<AccuracyPick>): AccuracyPick {
  return {
    event_id: 1,
    event_date: "2026-08-01T00:00:00Z",
    home_team: "Home",
    away_team: "Away",
    predicted: "H",
    actual: "H",
    confidence: 0.7,
    hit: true,
    ...partial,
  };
}

describe("calibrationBuckets", () => {
  it("returns all buckets with zero/null stats for empty picks", () => {
    const buckets = calibrationBuckets([]);

    expect(buckets.map((b) => b.bucket)).toEqual(["<50%", "50–60%", "60–70%", "70–80%", "80%+"]);
    for (const b of buckets) {
      expect(b.total).toBe(0);
      expect(b.decided).toBe(0);
      expect(b.hits).toBe(0);
      expect(b.hit_rate).toBeNull();
    }
  });

  it("groups picks into the right confidence bucket", () => {
    const picks = [
      pick({ event_id: 1, confidence: 0.45 }),
      pick({ event_id: 2, confidence: 0.55 }),
      pick({ event_id: 3, confidence: 0.55 }),
      pick({ event_id: 4, confidence: 0.62 }),
      pick({ event_id: 5, confidence: 0.75 }),
      pick({ event_id: 6, confidence: 0.75 }),
      pick({ event_id: 7, confidence: 0.75 }),
      pick({ event_id: 8, confidence: 0.9 }),
    ];

    const buckets = calibrationBuckets(picks);

    expect(buckets.map((b) => b.total)).toEqual([1, 2, 1, 3, 1]);
  });

  it("computes hit_rate per bucket only from decided picks", () => {
    const picks = [
      pick({ event_id: 1, confidence: 0.65, hit: true }),
      pick({ event_id: 2, confidence: 0.65, hit: false }),
      pick({ event_id: 3, confidence: 0.65, hit: null }), // undecided — excluded
      pick({ event_id: 4, confidence: 0.9, hit: true }),
    ];

    const buckets = calibrationBuckets(picks);
    const mid = buckets.find((b) => b.bucket === "60–70%")!;
    const high = buckets.find((b) => b.bucket === "80%+")!;

    expect(mid.total).toBe(3);
    expect(mid.decided).toBe(2);
    expect(mid.hits).toBe(1);
    expect(mid.hit_rate).toBeCloseTo(0.5);
    expect(high.hit_rate).toBe(1);
  });

  it("excludes picks without confidence", () => {
    const buckets = calibrationBuckets([pick({ event_id: 1, confidence: null })]);

    expect(buckets.every((b) => b.total === 0)).toBe(true);
  });
});
