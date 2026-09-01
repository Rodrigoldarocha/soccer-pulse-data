import { createServerFn } from "@tanstack/react-start";
import { getRealMatches, getRealLiveMatches, getCachedOrGenerate } from "./matches.server";

// Datas ancoradas no fuso de São Paulo para hoje/amanhã coerentes
function spDateISO(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function todayISO() {
  return spDateISO(0);
}

function tomorrowISO() {
  return spDateISO(1);
}

export const getMatchesByDate = createServerFn({ method: "GET" })
  .validator((date: string) => ({ date }))
  .handler(async ({ data }) => {
    try {
      const { date } = data;
      const matches = await getCachedOrGenerate(`matches:${date}`, 60 * 15, () =>
        getRealMatches(date),
      );
      return { date, matches };
    } catch (error) {
      console.error("[getMatchesByDate]", error);
      return { date: data.date, matches: [] };
    }
  });

export const getTodayMatches = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const date = todayISO();
    const matches = await getCachedOrGenerate(`today:${date}`, 60 * 15, () =>
      getRealMatches(date),
    );
    return { date, matches };
  } catch (error) {
    console.error("[getTodayMatches]", error);
    return { date: new Date().toISOString().slice(0, 10), matches: [] };
  }
});

export const getTomorrowMatches = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const date = tomorrowISO();
    const matches = await getCachedOrGenerate(`tomorrow:${date}`, 60 * 15, () =>
      getRealMatches(date),
    );
    return { date, matches };
  } catch (error) {
    console.error("[getTomorrowMatches]", error);
    return { date: tomorrowISO(), matches: [] };
  }
});

export const getLiveMatches = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const date = todayISO();
    const matches = await getCachedOrGenerate(
      `live:${date}:${Math.floor(Date.now() / 60000)}`,
      60,
      () => getRealLiveMatches(date),
    );
    return { date, matches };
  } catch (error) {
    console.error("[getLiveMatches]", error);
    return { date: new Date().toISOString().slice(0, 10), matches: [] };
  }
});
