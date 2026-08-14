import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { getStandings } from "@/lib/standings.functions";
import { listLeagues } from "@/lib/leagues.functions";
import { getRetryDelay, BzzoiroApiError } from "@/lib/bzzoiro/errors";
import type { StandingEntry, StandingGroup } from "@/lib/bzzoiro/types";

export function buildStandingsQuery(leagueId: number) {
  return queryOptions({
    queryKey: ["standings", leagueId],
    queryFn: () => getStandings({ data: { leagueId } }),
    staleTime: 10 * 60_000,
    retry: (failureCount: number, error: unknown) => {
      if (error instanceof BzzoiroApiError && error.isAuthError()) return false;
      if (error instanceof BzzoiroApiError && error.isRateLimit()) return failureCount < 3;
      return failureCount < 2;
    },
    retryDelay: (attempt: number, error: unknown) => {
      const delay = getRetryDelay(error);
      if (delay !== undefined) return delay;
      return Math.min(1000 * 2 ** attempt, 30_000);
    },
  });
}

/** Últimas 3 posições quando há 12+ times (zona de rebaixamento conservadora). */
export function getRelegationZoneIndices(entries: StandingEntry[]): Set<number> {
  if (entries.length < 12) return new Set();
  return new Set([entries.length - 3, entries.length - 2, entries.length - 1]);
}

function friendlyError(error: unknown): string {
  if (error instanceof BzzoiroApiError) {
    if (error.isRateLimit()) return "Muitas requisições. Tente novamente em instantes.";
    return error.getUserMessage();
  }
  return "Não foi possível carregar a classificação. Tente novamente.";
}

export function StandingsBoard({
  leagueId,
  onLeagueChange,
}: {
  leagueId?: number;
  onLeagueChange: (id: number | undefined) => void;
}) {
  const { data: leagues, isLoading: leaguesLoading } = useQuery(
    queryOptions({
      queryKey: ["leagues", "active"],
      queryFn: () => listLeagues(),
      staleTime: 10 * 60_000,
    }),
  );

  const effectiveLeagueId = leagueId ?? leagues?.[0]?.id;

  const standingsQuery = useQuery({
    ...buildStandingsQuery(effectiveLeagueId ?? 0),
    enabled: effectiveLeagueId != null,
  });

  const leagueExists = useMemo(() => {
    if (leagueId == null || !leagues) return true;
    return leagues.some((l) => l.id === leagueId);
  }, [leagueId, leagues]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Tabela de classificação</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Standings por liga com previsões do modelo CatBoost.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <select
              aria-label="Selecionar liga"
              value={effectiveLeagueId ?? ""}
              onChange={(e) => onLeagueChange(e.target.value ? Number(e.target.value) : undefined)}
              className="clay-sm w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={leaguesLoading}
            >
              {leagues?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {leagueId != null && !leagueExists && (
        <div role="status" className="clay p-10 text-center">
          <p className="text-muted-foreground">Liga não encontrada.</p>
          <p className="mt-2 text-xs text-muted-foreground">Selecione outra liga na lista acima.</p>
        </div>
      )}

      {leagueExists && (
        <StandingsBody queryState={standingsQuery} effectiveLeagueId={effectiveLeagueId} />
      )}
    </main>
  );
}

function StandingsBody({
  queryState,
  effectiveLeagueId,
}: {
  queryState: ReturnType<typeof useQuery<StandingGroup[]>>;
  effectiveLeagueId: number | undefined;
}) {
  const { isPending, isError, data, error, refetch, isFetching } = queryState;

  if (isPending || effectiveLeagueId == null) return <TableSkeleton />;

  if (isError) {
    return (
      <div role="status" className="clay p-10 text-center">
        <p className="font-semibold text-destructive">{friendlyError(error)}</p>
        <button
          onClick={() => refetch()}
          className="clay-primary mt-4 px-4 py-2 text-xs font-semibold transition active:translate-y-0.5"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div role="status" className="clay p-10 text-center">
        <p className="text-muted-foreground">
          Nenhuma classificação disponível para esta liga no momento.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Tente outra liga ou volte mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isFetching && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
          Atualizando…
        </p>
      )}
      {data.map((group, gi) => (
        <StandingsTable key={gi} group={group} />
      ))}
    </div>
  );
}

function StandingsTable({ group }: { group: StandingGroup }) {
  const relegation = getRelegationZoneIndices(group.entries);
  return (
    <section className="clay overflow-hidden">
      {group.label && (
        <header className="border-b border-border/60 px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {group.label}
        </header>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Time</th>
            <th className="px-2 py-2 text-center">J</th>
            <th className="px-2 py-2 text-center">V</th>
            <th className="px-2 py-2 text-center">E</th>
            <th className="px-2 py-2 text-center">D</th>
            <th className="hidden px-2 py-2 text-center sm:table-cell">GP</th>
            <th className="hidden px-2 py-2 text-center sm:table-cell">GC</th>
            <th className="px-2 py-2 text-center">SG</th>
            <th className="px-3 py-2 text-center font-bold">PTS</th>
          </tr>
        </thead>
        <tbody>
          {group.entries.map((entry, i) => {
            const inRelegation = relegation.has(i);
            return (
              <tr
                key={entry.team_id ?? `${entry.team_name}-${i}`}
                className={
                  inRelegation
                    ? "border-b border-border/40 bg-red-500/10"
                    : "border-b border-border/40 hover:bg-accent/40"
                }
              >
                <td className="px-3 py-2 text-muted-foreground">{entry.position ?? i + 1}</td>
                <td className="px-3 py-2 font-semibold">
                  <span className="flex items-center gap-2">
                    {entry.team_logo ? (
                      <img
                        src={entry.team_logo}
                        alt=""
                        className="h-5 w-5 rounded-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[10px] font-black text-muted-foreground">
                        {entry.team_name.charAt(0)}
                      </span>
                    )}
                    {entry.team_name}
                  </span>
                </td>
                <td className="px-2 py-2 text-center">{entry.played ?? "–"}</td>
                <td className="px-2 py-2 text-center">{entry.won ?? "–"}</td>
                <td className="px-2 py-2 text-center">{entry.drawn ?? "–"}</td>
                <td className="px-2 py-2 text-center">{entry.lost ?? "–"}</td>
                <td className="hidden px-2 py-2 text-center sm:table-cell">
                  {entry.goals_for ?? "–"}
                </td>
                <td className="hidden px-2 py-2 text-center sm:table-cell">
                  {entry.goals_against ?? "–"}
                </td>
                <td className="px-2 py-2 text-center">
                  {entry.goal_diff != null && entry.goal_diff > 0
                    ? `+${entry.goal_diff}`
                    : (entry.goal_diff ?? "–")}
                </td>
                <td className="px-3 py-2 text-center font-bold">{entry.points ?? "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="clay h-72 animate-pulse" />
      ))}
    </div>
  );
}
