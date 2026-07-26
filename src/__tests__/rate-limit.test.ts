import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../lib/rate-limit.server";

describe("checkRateLimit", () => {
  it("allows requests under limit", () => {
    expect(() => checkRateLimit("test-key", { max: 5, windowMs: 60_000 })).not.toThrow();
    expect(() => checkRateLimit("test-key", { max: 5, windowMs: 60_000 })).not.toThrow();
  });

  it("throws when limit exceeded", () => {
    const id = `exceed-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(id, { max: 3, windowMs: 60_000 });
    }
    expect(() => checkRateLimit(id, { max: 3, windowMs: 60_000 })).toThrow("Too Many Requests");
  });

  it("tracks different keys independently", () => {
    const a = `key-a-${Date.now()}`;
    const b = `key-b-${Date.now()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(a, { max: 5, windowMs: 60_000 });
    expect(() => checkRateLimit(b, { max: 5, windowMs: 60_000 })).not.toThrow();
  });

  it("resets after window expires", async () => {
    const id = `reset-${Date.now()}`;
    checkRateLimit(id, { max: 1, windowMs: 10 });
    expect(() => checkRateLimit(id, { max: 1, windowMs: 10 })).toThrow("Too Many Requests");
    await new Promise((r) => setTimeout(r, 15));
    expect(() => checkRateLimit(id, { max: 1, windowMs: 10 })).not.toThrow();
  });
});
