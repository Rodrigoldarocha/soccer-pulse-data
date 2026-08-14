import { describe, it, expect, vi, beforeEach } from "vitest";
import { InMemoryCacheStore } from "../lib/bzzoiro/cache-store";
import { bzzoiroCachedFetch } from "../lib/bzzoiro/cache.server";

// Mock the HTTP client so we never hit the real API (same pattern as cache-fallback.test.ts).
vi.mock("../lib/bzzoiro/client.server", () => ({
  bzzoiroFetch: vi.fn(),
  BzzoiroApiError: class extends Error {
    statusCode = 500;
    statusText = "Internal Server Error";
    path = "/mock";
    responseBody = null;
    isRetryable() {
      return this.statusCode === 429 || this.statusCode >= 500;
    }
    isAuthError() {
      return this.statusCode === 401 || this.statusCode === 403;
    }
    isRateLimit() {
      return this.statusCode === 429;
    }
    getUserMessage() {
      return "Erro";
    }
  },
  BzzoiroTokenError: class extends Error {},
  BzzoiroTimeoutError: class extends Error {},
  getRetryDelay: vi.fn(),
  testBzzoiroConnection: vi.fn(),
}));

import type { Mock } from "vitest";
import { bzzoiroFetch } from "../lib/bzzoiro/client.server";
const mockFetch = bzzoiroFetch as unknown as Mock;

import {
  normalizeStandings,
  sortEntries,
  standingsResponseSchema,
} from "../lib/standings.functions";

const store = new InMemoryCacheStore();

beforeEach(() => {
  store.clear();
  mockFetch.mockReset();
});

const flatResponse = {
  standings: [
    { position: 1, team_name: "Arsenal", points: 55, goal_diff: 30 },
    { position: 2, team_name: "Liverpool", points: 55, goal_diff: 28 },
    { position: 3, team_name: "City", points: 52, goal_diff: 25 },
  ],
};

describe("normalizeStandings", () => {
  it("converts flat standings into a single group without label", () => {
    const groups = normalizeStandings(flatResponse);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBeNull();
    expect(groups[0].entries).toHaveLength(3);
  });

  it("converts cup groups map into multiple labeled groups", () => {
    const groups = normalizeStandings({
      groups: {
        "Group A": [{ position: 1, team_name: "Real Madrid", points: 6 }],
        "Group B": [{ position: 1, team_name: "Bayern", points: 4 }],
      },
    });
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.label)).toEqual(["Group A", "Group B"]);
  });

  it("returns empty array when both fields are null/absent", () => {
    expect(normalizeStandings(null)).toEqual([]);
    expect(normalizeStandings({})).toEqual([]);
    expect(normalizeStandings({ standings: null, groups: null })).toEqual([]);
  });

  it("sorts flat standings by points descending", () => {
    const groups = normalizeStandings(flatResponse);
    expect(groups[0].entries.map((e) => e.team_name)).toEqual(["Arsenal", "Liverpool", "City"]);
  });

  it("derives goal_diff from goals_for - goals_against when absent", () => {
    const groups = normalizeStandings({
      standings: [
        { position: 1, team_name: "A", points: 10, goals_for: 20, goals_against: 5 },
        { position: 2, team_name: "B", points: 10, goal_diff: 3 },
      ],
    });
    const entries = groups[0].entries;
    // tie on points (10-10) → goal_diff tiebreak: A has 15, B has 3 → A first
    expect(entries[0].team_name).toBe("A");
    expect(entries[1].team_name).toBe("B");
  });
});

describe("sortEntries", () => {
  it("breaks ties by goal_diff descending, then position ascending", () => {
    const sorted = sortEntries([
      { position: 1, team_name: "C", points: 50, goal_diff: 10 },
      { position: 3, team_name: "A", points: 50, goal_diff: 12 },
      { position: 2, team_name: "B", points: 50, goal_diff: 12 },
    ]);
    expect(sorted.map((e) => e.team_name)).toEqual(["B", "A", "C"]);
  });
});

describe("standingsResponseSchema", () => {
  it("accepts a valid flat response", () => {
    const parsed = standingsResponseSchema.parse(flatResponse);
    expect(parsed.standings).toHaveLength(3);
  });

  it("accepts a valid groups response", () => {
    const parsed = standingsResponseSchema.parse({
      groups: { "Group A": [{ position: 1, team_name: "X", points: 3 }] },
    });
    expect(parsed.groups!["Group A"]).toHaveLength(1);
  });

  it("rejects malformed payload (missing team_name)", () => {
    expect(() =>
      standingsResponseSchema.parse({ standings: [{ position: 1, points: 3 }] }),
    ).toThrow();
  });

  it("rejects non-numeric points", () => {
    expect(() =>
      standingsResponseSchema.parse({
        standings: [{ position: 1, team_name: "X", points: "three" }],
      }),
    ).toThrow();
  });
});

describe("standings cache fallback (stale-if-error)", () => {
  it("serves stale cached standings when API fails", async () => {
    mockFetch.mockResolvedValueOnce({ standings: flatResponse.standings });
    await bzzoiroCachedFetch("/api/v2/leagues/1/standings/", {
      key: "standings:v2:1",
      ttlSeconds: 0,
      store,
      schema: standingsResponseSchema,
    });
    mockFetch.mockReset();
    mockFetch.mockImplementationOnce(() => {
      throw new Error("Network failure");
    });

    const result = await bzzoiroCachedFetch("/api/v2/leagues/1/standings/", {
      key: "standings:v2:1",
      ttlSeconds: 600,
      store,
      schema: standingsResponseSchema,
    });

    expect(result).toEqual({ standings: flatResponse.standings });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws when no cache exists and API fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));
    await expect(
      bzzoiroCachedFetch("/api/v2/leagues/999/standings/", {
        key: "standings:v2:999",
        ttlSeconds: 600,
        store,
        schema: standingsResponseSchema,
      }),
    ).rejects.toThrow("Network failure");
  });
});
