import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";

import { PredictionCard } from "@/components/PredictionCard";
import { buildPredictionsQuery } from "@/components/PredictionsBoard";
import type { Prediction } from "@/lib/bzzoiro/types";

export const Route = createFileRoute("/melhor-aposta")({
  head: () => ({
    meta: [
      { title: "Melhores Apostas de Hoje · Zagueiro" },
      {
        name: "description",
        content:
          "Seleção das melhores apostas de hoje: apenas os jogos com maior confiança do modelo CatBoost em 1X2, Over/Under e BTTS.",
      },
      { property: "og:title", content: "Melhores Apostas de Hoje · Zagueiro" },
      {
        property: "og:description",
        content: "Apenas os palpites de hoje com maior confiança do modelo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(buildPredictionsQuery(undefined, { recommended: true }));
  },
  component: BestBetsPage,
});

const MIN_CONFIDENCE = 0.6;
const MAX_PICKS = 9;

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function BestBetsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Melhores apostas de hoje</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Apenas partidas de hoje com confiança do modelo acima de{" "}
          {Math.round(MIN_CONFIDENCE * 100)}
          %, ordenadas da mais forte para a menos forte.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="clay h-64 animate-pulse" />
            ))}
          </div>
        }
      >
        <BestBetsGrid />
      </Suspense>
    </main>
  );
}

function BestBetsGrid() {
  const { data: predictions } = useSuspenseQuery(
    buildPredictionsQuery(undefined, { recommended: true }),
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const active = predictions.filter(
    (p) => p.event.status === "notstarted" || p.event.status === "inprogress",
  );

  const best: Prediction[] = (mounted ? active.filter((p) => isToday(p.event.event_date)) : active)
    .filter((p) => p.model.confidence >= MIN_CONFIDENCE && p.markets.match_result.predicted != null)
    .sort((a, b) => b.model.confidence - a.model.confidence)
    .slice(0, MAX_PICKS);

  if (best.length === 0) {
    return (
      <div role="status" className="clay p-10 text-center">
        <p className="text-muted-foreground">
          Nenhuma aposta de alta confiança para hoje no momento.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          O modelo só destaca jogos acima de {Math.round(MIN_CONFIDENCE * 100)}% de confiança.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 text-xs text-muted-foreground">
        {best.length} {best.length === 1 ? "seleção" : "seleções"} destacada
        {best.length === 1 ? "" : "s"}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {best.map((p, i) => (
          <div key={p.id} className="relative">
            <span className="clay-primary absolute -left-2 -top-2 z-10 grid h-8 w-8 place-items-center text-xs font-black">
              {i + 1}
            </span>
            <PredictionCard prediction={p} />
          </div>
        ))}
      </div>
    </>
  );
}
