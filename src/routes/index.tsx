import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Suspense, useState, useCallback } from "react";

import { PredictionCard } from "@/components/PredictionCard";
import { listUpcomingPredictions } from "@/lib/predictions.functions";
import { listLeagues } from "@/lib/leagues.functions";

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
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
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
  const { data: predictions, isFetching } = useSuspenseQuery(query);

  const active = predictions.filter(
    (p) => p.event.status === "notstarted" || p.event.status === "inprogress",
  );

  if (active.length === 0) {
    return (
      <div role="status" className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-muted-foreground">Nenhuma previsão disponível no momento.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Tente selecionar outra liga ou volte mais tarde.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <>
      {isFetching && (
        <div className="mb-3 text-right text-xs text-muted-foreground">Atualizando…</div>
      )}
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
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => onSelect(undefined)}
        className={
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap " +
          (selected == null
            ? "bg-primary/15 text-primary"
            : "bg-secondary/50 text-muted-foreground hover:text-foreground")
        }
      >
        Todas
      </button>
      {leagues.map((l) => (
        <button
          key={l.id}
          onClick={() => onSelect(l.id)}
          className={
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap " +
            (selected === l.id
              ? "bg-primary/15 text-primary"
              : "bg-secondary/50 text-muted-foreground hover:text-foreground")
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
        <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
      ))}
    </div>
  );
}
