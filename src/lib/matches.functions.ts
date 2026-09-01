import { createServerFn } from "@tanstack/react-start";
import { getRealMatches, getRealLiveMatches, getCachedOrGenerate } from "./matches.server";

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
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
