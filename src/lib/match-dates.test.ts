import { describe, expect, it } from "vitest";
import { getMatchDateBucket, spDateISO, spTodayISO, spTomorrowISO } from "./match-dates";

// Referência: 2026-09-09 12:00 em São Paulo (UTC-3) = 15:00Z.
const NOW = new Date("2026-09-09T15:00:00.000Z");

describe("spDateISO", () => {
  it("hoje = 2026-09-09 em America/Sao_Paulo", () => {
    expect(spTodayISO(NOW)).toBe("2026-09-09");
  });

  it("amanhã = 2026-09-10 em America/Sao_Paulo", () => {
    expect(spTomorrowISO(NOW)).toBe("2026-09-10");
    expect(spDateISO(1, NOW)).toBe("2026-09-10");
  });
});

describe("getMatchDateBucket", () => {
  it("partidas do dia caem em today", () => {
    expect(getMatchDateBucket("2026-09-09T10:00:00-03:00", NOW)).toBe("today");
    expect(getMatchDateBucket("2026-09-09T21:30:00-03:00", NOW)).toBe("today");
  });

  it("partidas do dia seguinte caem em tomorrow", () => {
    expect(getMatchDateBucket("2026-09-10T10:00:00-03:00", NOW)).toBe("tomorrow");
    expect(getMatchDateBucket("2026-09-10T21:30:00-03:00", NOW)).toBe("tomorrow");
  });

  it("dias distantes caem em other", () => {
    expect(getMatchDateBucket("2026-09-08T21:00:00-03:00", NOW)).toBe("other");
    expect(getMatchDateBucket("2026-09-11T16:00:00-03:00", NOW)).toBe("other");
  });

  it("virada de dia 23:59 -> 00:00", () => {
    expect(getMatchDateBucket("2026-09-09T23:59:00-03:00", NOW)).toBe("today");
    expect(getMatchDateBucket("2026-09-10T00:00:30-03:00", NOW)).toBe("tomorrow");
  });

  it("madrugada 03:00 pertence ao próprio dia", () => {
    expect(getMatchDateBucket("2026-09-09T03:00:00-03:00", NOW)).toBe("today");
    expect(getMatchDateBucket("2026-09-10T03:00:00-03:00", NOW)).toBe("tomorrow");
  });

  it("não usa UTC direto: 02:30Z = 23:30 de SP do dia anterior", () => {
    // Em UTC seria 2026-09-10 (tomorrow), mas em SP ainda é hoje.
    expect(getMatchDateBucket("2026-09-10T02:30:00.000Z", NOW)).toBe("today");
  });

  it("ISO inválido cai em other", () => {
    expect(getMatchDateBucket("não-data", NOW)).toBe("other");
  });
});
