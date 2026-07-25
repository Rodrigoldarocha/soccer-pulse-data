import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { PredictionCard } from "@/components/PredictionCard";
import { listUpcomingPredictions } from "@/lib/predictions.functions";

const upcomingPredictionsQuery = queryOptions({
  queryKey: ["predictions", "upcoming", { limit: 30 }],
  queryFn: () => listUpcomingPredictions({ data: { limit: 30 } }),
  staleTime: 60_000,
});

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
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(upcomingPredictionsQuery),
  component: PredictionsPage,
});

function PredictionsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-black">Z</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Zagueiro</h1>
              <p className="text-xs text-muted-foreground">
                Previsões de futebol via CatBoost
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <span className="rounded-md bg-primary/15 px-3 py-1.5 font-medium text-primary">
              Previsões
            </span>
            <span className="rounded-md px-3 py-1.5 text-muted-foreground">
              Partidas
            </span>
            <span className="rounded-md px-3 py-1.5 text-muted-foreground">
              Jogadores
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h2 className="text-2xl font-bold">Próximas partidas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Probabilidades 0–100% por mercado. Confiança = probabilidade do resultado mais provável.
            </p>
          </div>
        </div>

        <Suspense fallback={<GridSkeleton />}>
          <PredictionsGrid />
        </Suspense>
      </main>
    </div>
  );
}

function PredictionsGrid() {
  const { data: predictions } = useSuspenseQuery(upcomingPredictionsQuery);

  if (predictions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
        Nenhuma previsão disponível no momento.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {predictions.map((p) => (
        <PredictionCard key={p.id} prediction={p} />
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-2xl border border-border bg-card"
        />
      ))}
    </div>
  );
}
