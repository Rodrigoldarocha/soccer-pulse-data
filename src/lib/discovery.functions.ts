import { createServerFn } from "@tanstack/react-start";
import { getCachedOrGenerate } from "./matches.server";
import { fetchLeaguePage, fetchPlayerPage, fetchTeamPage } from "./api/discovery";

export const getLeaguePage = createServerFn({ method: "GET" })
  .validator((leagueId: string) => ({ leagueId }))
  .handler(async ({ data }) => {
    try {
      return await getCachedOrGenerate(`league:${data.leagueId}`, 60 * 60, () =>
        fetchLeaguePage(data.leagueId),
      );
    } catch (error) {
      console.error("[getLeaguePage]", error);
      return null;
    }
  });

export const getTeamPage = createServerFn({ method: "GET" })
  .validator((teamId: string) => ({ teamId }))
  .handler(async ({ data }) => {
    try {
      return await getCachedOrGenerate(`team:${data.teamId}`, 60 * 60, () =>
        fetchTeamPage(data.teamId),
      );
    } catch (error) {
      console.error("[getTeamPage]", error);
      return null;
    }
  });

export const getPlayerPage = createServerFn({ method: "GET" })
  .validator((playerId: string) => ({ playerId }))
  .handler(async ({ data }) => {
    try {
      return await getCachedOrGenerate(`player:${data.playerId}`, 60 * 60, () =>
        fetchPlayerPage(data.playerId),
      );
    } catch (error) {
      console.error("[getPlayerPage]", error);
      return null;
    }
  });
