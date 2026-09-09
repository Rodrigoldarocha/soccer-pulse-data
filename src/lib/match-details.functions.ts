import { createServerFn } from "@tanstack/react-start";
import { getCachedOrGenerate } from "./matches.server";
import {
  fetchApiPrediction,
  fetchBroadcasts,
  fetchEventHeader,
  fetchH2H,
  fetchIncidents,
  fetchLineups,
  fetchMatchStats,
  fetchTeamForm,
  fetchVenueMeta,
} from "./api/match-details";

export const getMatchDetails = createServerFn({ method: "GET" })
  .validator((matchId: string) => ({ matchId }))
  .handler(async ({ data }) => {
    const { matchId } = data;
    if (!/^\d+$/.test(matchId))
      return {
        matchId,
        header: null,
        h2h: null,
        homeForm: null,
        awayForm: null,
        lineups: null,
        stats: null,
        incidents: null,
        broadcasts: null,
        meta: null,
        apiPrediction: null,
      };
    try {
      return await getCachedOrGenerate(`match:${matchId}`, 5 * 60, async () => {
        const header = await fetchEventHeader(matchId).catch(() => null);
        const homeName = header?.homeName ?? "";
        const awayName = header?.awayName ?? "";
        const [
          h2h,
          homeForm,
          awayForm,
          lineups,
          stats,
          incidents,
          broadcasts,
          meta,
          apiPrediction,
        ] = await Promise.all([
          homeName && awayName
            ? fetchH2H(matchId, homeName, awayName).catch(() => null)
            : Promise.resolve(null),
          header
            ? fetchTeamForm(header.homeTeamId, homeName).catch(() => null)
            : Promise.resolve(null),
          header
            ? fetchTeamForm(header.awayTeamId, awayName).catch(() => null)
            : Promise.resolve(null),
          fetchLineups(matchId).catch(() => null),
          fetchMatchStats(matchId).catch(() => null),
          fetchIncidents(matchId).catch(() => null),
          fetchBroadcasts(matchId).catch(() => null),
          fetchVenueMeta(matchId).catch(() => null),
          fetchApiPrediction(matchId).catch(() => null),
        ]);
        return {
          matchId,
          header,
          h2h,
          homeForm,
          awayForm,
          lineups,
          stats,
          incidents,
          broadcasts,
          meta,
          apiPrediction,
        };
      });
    } catch (error) {
      console.error("[getMatchDetails]", error);
      return {
        matchId,
        header: null,
        h2h: null,
        homeForm: null,
        awayForm: null,
        lineups: null,
        stats: null,
        incidents: null,
        broadcasts: null,
        meta: null,
        apiPrediction: null,
      };
    }
  });
