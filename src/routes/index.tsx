import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Suspense, useState, useCallback } from "react";

import { PredictionCard } from "@/components/PredictionCard";
import { listUpcomingPredictions } from "@/lib/predictions.functions";
import { listLeagues } from "@/lib/leagues.functions";
import { getRetryDelay, BzzoiroApiError } from "@/lib/bzzoiro/client.server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Previsões ML de Futebol · Zagueiro" },
      {
        name: "description",
        content:
          "Previsões CatBoost para partidas de futebol: 1X2, Over/Under, BTTS e placar mais provável, com nível de confiança do modelo.",
      },
      { property: "og:title", content: "Previsões ML de Futebol · Zagueiro" },
      {
        property: "og:description",
        content:
          "Previsões CatBoost para partidas de futebol com probabilidades 1X2, Over/Under, BTTS e confiança do modelo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    leagueId: search.leagueId as number | undefined,
  }),
  loaderDeps: ({ search }) => ({ leagueId: search.leagueId }),
  loader: ({ context, deps }) => {
    const query = buildQueryOptions(deps.leagueId);
    context.queryClient.ensureQueryData(query);
  },
  component: PredictionsPage,
});

function buildQueryOptions(leagueId?: number) {
  return queryOptions({
    queryKey: ["predictions", "upcoming", { limit: 30, leagueId }],
    queryFn: () => listUpcomingPredictions({ data: { limit: 30, leagueId } }),
    staleTime: 30_000,
    // Polling automático a cada 30s enquanto houver jogos ativos
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 30_000;
      const hasActive = data.some(
        (p) => p.event.status === "notstarted" || p.event.status === "inprogress",
      );
      return hasActive ? 30_000 : false;
    },
    retry: (failureCount, error) => {
      // Não retenta erros de auth
      if (error instanceof BzzoiroApiError && error.isAuthError()) return false;
      // Retenta até 3x em rate limit
      if (error instanceof BzzoiroApiError && error.isRateLimit()) return failureCount < 3;
      // Retenta até 2x em outros erros
      return failureCount < 2;
    },
    retryDelay: (attempt, error) => {
      const delay = getRetryDelay(error);
      if (delay !== undefined) return delay;
      return Math.min(1000 * 2 ** attempt, 30_000);
    },
  });
}

function PredictionsPage() {
  const router = useRouter();
  const { leagueId } = Route.useSearch();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await router.invalidate();
    setRefreshing(false);
  }, [router]);

  const handleLeagueFilter = useCallback(
    (id: number | undefined) => {
      router.navigate({ to: "/", search: { leagueId: id } });
    },
    [router],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="clay-primary grid h-11 w-11 place-items-center">
              <span className="font-black">Z</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Zagueiro</h1>
              <p className="text-xs text-muted-foreground">Previsões de futebol via CatBoost</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/live"
              className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              🔴 Ao Vivo
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Próximas partidas</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Probabilidades 0–100% por mercado. Confiança = probabilidade do resultado mais
                provável.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="clay-primary px-4 py-2 text-xs font-semibold transition active:translate-y-0.5 disabled:opacity-50"
            >
              {refreshing ? "Atualizando…" : "Atualizar"}
            </button>
          </div>

          <LeagueFilterBar selected={leagueId} onSelect={handleLeagueFilter} />
        </div>

        <Suspense fallback={<GridSkeleton />}>
          <PredictionsGrid leagueId={leagueId} />
        </Suspense>
      </main>
    </div>
  );
}

function PredictionsGrid({ leagueId }: { leagueId?: number }) {
  const query = buildQueryOptions(leagueId);
  const { data: predictions, isFetching, dataUpdatedAt } = useSuspenseQuery(query);

  const active = predictions.filter(
    (p) => p.event.status === "notstarted" || p.event.status === "inprogress",
  );

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR")
    : null;

  if (active.length === 0) {
    return (
      <div role="status" className="clay p-10 text-center">
        <p className="text-muted-foreground">Nenhuma previsão disponível no momento.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Tente selecionar outra liga ou volte mais tarde.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="clay-primary mt-4 px-4 py-2 text-sm font-semibold transition active:translate-y-0.5"
        >
          Tentar novamente
        </button>
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
          🟢 {active.filter((p) => p.event.status === "inprogress").length} ao vivo,{" "}
          {active.filter((p) => p.event.status === "notstarted").length} futuras
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((p) => (
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
  const leaguesQuery = queryOptions({
    queryKey: ["leagues", "active"],
    queryFn: () => listLeagues(),
    staleTime: 10 * 60_000,
  });
  const { data: leagues } = useSuspenseQuery(leaguesQuery);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onSelect(undefined)}
        className={
          "px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition active:translate-y-0.5 " +
          (selected == null ? "clay-primary" : "clay-sm text-muted-foreground hover:text-foreground")
        }
      >
        Todas
      </button>
      {leagues.map((l) => (
        <button
          key={l.id}
          onClick={() => onSelect(l.id)}
          className={
            "px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition active:translate-y-0.5 " +
            (selected === l.id ? "clay-primary" : "clay-sm text-muted-foreground hover:text-foreground")
          }
        >
          {l.name}
        </button>
      ))}
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
