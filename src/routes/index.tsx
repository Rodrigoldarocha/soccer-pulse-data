import { createFileRoute, useRouter } from "@tanstack/react-router";

import { PredictionsBoard, buildPredictionsQuery } from "@/components/PredictionsBoard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jogos de Hoje · Previsões ML · Zagueiro" },
      {
        name: "description",
        content:
          "Previsões CatBoost para os jogos de hoje: 1X2, Over/Under, BTTS e placar mais provável, com nível de confiança do modelo.",
      },
      { property: "og:title", content: "Jogos de Hoje · Previsões ML · Zagueiro" },
      {
        property: "og:description",
        content: "Probabilidades 1X2, Over/Under e BTTS para as partidas de hoje.",
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
    context.queryClient.ensureQueryData(buildPredictionsQuery(deps.leagueId));
  },
  component: TodayPage,
});

function TodayPage() {
  const router = useRouter();
  const { leagueId } = Route.useSearch();

  return (
    <PredictionsBoard
      title="Jogos de hoje"
      subtitle="Probabilidades 0–100% por mercado. Confiança = probabilidade do resultado mais provável."
      dayFilter="today"
      leagueId={leagueId}
      onLeagueChange={(id) => router.navigate({ to: "/", search: { leagueId: id } })}
    />
  );
}
