import { createFileRoute, useRouter } from "@tanstack/react-router";

import { PredictionsBoard, buildPredictionsQuery } from "@/components/PredictionsBoard";

export const Route = createFileRoute("/amanha")({
  head: () => ({
    meta: [
      { title: "Jogos de Amanhã · Previsões ML · Zagueiro" },
      {
        name: "description",
        content:
          "Previsões CatBoost para os jogos de amanhã: 1X2, Over/Under, BTTS e placar mais provável.",
      },
      { property: "og:title", content: "Jogos de Amanhã · Previsões ML · Zagueiro" },
      {
        property: "og:description",
        content: "Probabilidades 1X2, Over/Under e BTTS para as partidas de amanhã.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { leagueId?: number } => ({
    leagueId: typeof search.leagueId === "number" ? search.leagueId : undefined,
  }),
  loaderDeps: ({ search }) => ({ leagueId: search.leagueId }),
  loader: ({ context, deps }) => {
    context.queryClient.ensureQueryData(
      buildPredictionsQuery(deps.leagueId, { dayFilter: "tomorrow" }),
    );
  },
  component: TomorrowPage,
});

function TomorrowPage() {
  const router = useRouter();
  const { leagueId } = Route.useSearch();

  return (
    <PredictionsBoard
      title="Jogos de amanhã"
      subtitle="Previsões do modelo para as partidas do próximo dia."
      dayFilter="tomorrow"
      leagueId={leagueId}
      onLeagueChange={(id) => router.navigate({ to: "/amanha", search: { leagueId: id } })}
    />
  );
}
