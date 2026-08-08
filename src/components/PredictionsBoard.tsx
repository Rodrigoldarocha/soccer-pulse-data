import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Suspense, useCallback, useEffect, useState } from "react";

import { PredictionCard } from "@/components/PredictionCard";
import { listUpcomingPredictions } from "@/lib/predictions.functions";
import { listLeagues } from "@/lib/leagues.functions";
import { getRetryDelay, BzzoiroApiError } from "@/lib/bzzoiro/errors";
import type { Prediction } from "@/lib/bzzoiro/types";

export type DayFilter = "today" | "tomorrow" | "later" | "all";

export function buildPredictionsQuery(leagueId?: number, opts: { recommended?: boolean } = {}) {
  return queryOptions({
    queryKey: ["predictions", "upcoming", { limit: 30, leagueId, recommended: opts.recommended }],
    queryFn: () =>
      listUpcomingPredictions({ data: { limit: 30, leagueId, recommended: opts.recommended } }),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 30_000;
      const hasActive = data.some(
        (p) => p.event.status === "notstarted" || p.event.status === "inprogress",
      );
      return hasActive ? 30_000 : false;
    },
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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayOffset(eventDate: string) {
  const today = startOfDay(new Date()).getTime();
  const day = startOfDay(new Date(eventDate)).getTime();
  return Math.round((day - today) / 86_400_000);
}

export function PredictionsBoard({
  title,
  subtitle,
  dayFilter,
  leagueId,
  onLeagueChange,
}: {
  title: string;
  subtitle: string;
  dayFilter: DayFilter;
  leagueId?: number;
  onLeagueChange: (id: number | undefined) => void;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await router.invalidate();
    setRefreshing(false);
  }, [router]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="clay-primary px-4 py-2 text-xs font-semibold transition active:translate-y-0.5 disabled:opacity-50"
          >
            {refreshing ? "Atualizando…" : "Atualizar"}
          </button>
        </div>

        <Suspense fallback={<div className="clay-sm h-11 animate-pulse rounded-xl" />}>
          <LeagueFilterBar selected={leagueId} onSelect={onLeagueChange} />
        </Suspense>
      </div>

      <Suspense fallback={<GridSkeleton />}>
        <PredictionsGrid leagueId={leagueId} dayFilter={dayFilter} />
      </Suspense>
    </main>
  );
}

function PredictionsGrid({ leagueId, dayFilter }: { leagueId?: number; dayFilter: DayFilter }) {
  const {
    data: predictions,
    isFetching,
    dataUpdatedAt,
  } = useSuspenseQuery(buildPredictionsQuery(leagueId));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const active = predictions.filter(
    (p) => p.event.status === "notstarted" || p.event.status === "inprogress",
  );

  // Day bucketing depends on the visitor's timezone, so only apply it after
  // hydration to keep SSR markup stable.
  const visible: Prediction[] =
    !mounted || dayFilter === "all"
      ? active
      : active.filter((p) => {
          const offset = dayOffset(p.event.event_date);
          if (dayFilter === "today") return offset <= 0;
          if (dayFilter === "tomorrow") return offset === 1;
          return offset >= 2;
        });

  const lastUpdate =
    mounted && dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR") : null;

  if (visible.length === 0) {
    return (
      <div role="status" className="clay p-10 text-center">
        <p className="text-muted-foreground">Nenhuma previsão disponível para este período.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Tente selecionar outra liga ou veja outro dia.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isFetching ? (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
              Atualizando…
            </span>
          ) : (
            lastUpdate && `Atualizado às ${lastUpdate}`
          )}
        </span>
        <span>
          🟢 {visible.filter((p) => p.event.status === "inprogress").length} ao vivo,{" "}
          {visible.filter((p) => p.event.status === "notstarted").length} futuras
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <PredictionCard key={p.id} prediction={p} />
        ))}
      </div>
    </>
  );
}

function LeagueFilterBar({
  selected,
  onSelect,
}: {
  selected: number | undefined;
  onSelect: (id: number | undefined) => void;
}) {
  const { data: leagues } = useSuspenseQuery(
    queryOptions({
      queryKey: ["leagues", "active"],
      queryFn: () => listLeagues(),
      staleTime: 10 * 60_000,
    }),
  );

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <select
          aria-label="Filtrar por liga"
          value={selected ?? ""}
          onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : undefined)}
          className="clay-sm w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Todas as ligas</option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
      {selected != null && (
        <button
          onClick={() => onSelect(undefined)}
          className="clay-sm px-3 py-2.5 text-sm font-semibold text-muted-foreground transition active:translate-y-0.5 hover:text-foreground"
          aria-label="Limpar filtro"
        >
          Limpar
        </button>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="clay h-64 animate-pulse" />
      ))}
    </div>
  );
}
