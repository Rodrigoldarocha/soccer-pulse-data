import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { InMemoryCacheStore } from "../lib/bzzoiro/cache-store";
import { bzzoiroCachedFetch, hashKey } from "../lib/bzzoiro/cache.server";

// Mock the HTTP client so we never hit the real API.
vi.mock("../lib/bzzoiro/client.server", () => ({
  bzzoiroFetch: vi.fn(),
  BzzoiroApiError: class extends Error {
    statusCode = 500;
    statusText = "Internal Server Error";
    path = "/mock";
    responseBody = null;
  },
  BzzoiroTokenError: class extends Error {},
  BzzoiroTimeoutError: class extends Error {},
  getRetryDelay: vi.fn(),
  testBzzoiroConnection: vi.fn(),
}));

import type { Mock } from "vitest";
import { bzzoiroFetch } from "../lib/bzzoiro/client.server";
const mockFetch = bzzoiroFetch as unknown as Mock;

const store = new InMemoryCacheStore();

beforeEach(() => {
  store.clear();
  mockFetch.mockReset();
});

describe("bzzoiroCachedFetch", () => {
  it("returns fresh data when cache is empty", async () => {
    mockFetch.mockResolvedValue({ foo: "bar" });

    const result = await bzzoiroCachedFetch("/test/", {
      key: "test:empty",
      ttlSeconds: 60,
      store,
    });

    expect(result).toEqual({ foo: "bar" });
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("serves cached data on second call", async () => {
    mockFetch.mockResolvedValue({ cached: true });

    await bzzoiroCachedFetch("/test2/", { key: "test:hit", ttlSeconds: 60, store });
    mockFetch.mockReset(); // prevent further network calls

    const result = await bzzoiroCachedFetch("/test2/", { key: "test:hit", ttlSeconds: 60, store });

    expect(result).toEqual({ cached: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips expired cache and re-fetches", async () => {
    mockFetch.mockResolvedValueOnce({ expired: true }).mockResolvedValueOnce({ fresh: true });

    // Store with TTL 0 → immediately expired.
    await bzzoiroCachedFetch("/test3/", { key: "test:expired", ttlSeconds: 0, store });
    const result = await bzzoiroCachedFetch("/test3/", {
      key: "test:expired",
      ttlSeconds: 60,
      store,
    });

    expect(result).toEqual({ fresh: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("validates with Zod schema on cache-hit", async () => {
    const schema = z.object({ name: z.string() });
    mockFetch.mockResolvedValue({ name: "valid" });

    // Populate cache.
    await bzzoiroCachedFetch("/test4/", { key: "test:schema", ttlSeconds: 60, store, schema });

    const result = await bzzoiroCachedFetch("/test4/", {
      key: "test:schema",
      ttlSeconds: 60,
      store,
      schema,
    });
    expect(result).toEqual({ name: "valid" });
  });

  it("throws ZodError for invalid shape on fresh fetch", async () => {
    const schema = z.object({ name: z.string() });
    mockFetch.mockResolvedValue({ name: 42 }); // number, not string

    await expect(
      bzzoiroCachedFetch("/test5/", { key: "test:invalid-fresh", ttlSeconds: 60, store, schema }),
    ).rejects.toThrow(z.ZodError);
  });
});

describe("hashKey", () => {
  it("produces stable hex hash for same params", async () => {
    const a = await hashKey("prefix", { foo: 1, bar: "x" });
    const b = await hashKey("prefix", { bar: "x", foo: 1 }); // different order
    expect(a).toBe(b);
  });

  it("different params produce different hash", async () => {
    const a = await hashKey("prefix", { foo: 1 });
    const b = await hashKey("prefix", { foo: 2 });
    expect(a).not.toBe(b);
  });
});
