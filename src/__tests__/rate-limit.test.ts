import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../lib/rate-limit.server";

describe("checkRateLimit (in-memory dev mode)", () => {
  it("allows requests under limit", async () => {
    await checkRateLimit("test-key", { max: 5, windowMs: 60_000 });
    await checkRateLimit("test-key", { max: 5, windowMs: 60_000 });
    // No throw = pass
  });

  it("throws when limit exceeded", async () => {
    const id = `exceed-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      await checkRateLimit(id, { max: 3, windowMs: 60_000 });
    }
    await expect(checkRateLimit(id, { max: 3, windowMs: 60_000 })).rejects.toThrow("Too Many Requests");
  });

  it("tracks different keys independently", async () => {
    const a = `key-a-${Date.now()}`;
    const b = `key-b-${Date.now()}`;
    for (let i = 0; i < 5; i++) await checkRateLimit(a, { max: 5, windowMs: 60_000 });
    // b should still be allowed
    await checkRateLimit(b, { max: 5, windowMs: 60_000 });
  });

  it("resets after window expires", async () => {
    const id = `reset-${Date.now()}`;
    await checkRateLimit(id, { max: 1, windowMs: 10 });
    await expect(checkRateLimit(id, { max: 1, windowMs: 10 })).rejects.toThrow("Too Many Requests");
    await new Promise((r) => setTimeout(r, 15));
    await checkRateLimit(id, { max: 1, windowMs: 10 });
  });

  it("uses default options when none provided", async () => {
    const id = `default-${Date.now()}`;
    for (let i = 0; i < 30; i++) {
      await checkRateLimit(id);
    }
    await expect(checkRateLimit(id)).rejects.toThrow("Too Many Requests");
  });
});
