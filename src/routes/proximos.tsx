import { createFileRoute, useRouter } from "@tanstack/react-router";

import { PredictionsBoard, buildPredictionsQuery } from "@/components/PredictionsBoard";

export const Route = createFileRoute("/proximos")({
  head: () => ({
    meta: [
      { title: "Próximos Jogos · Previsões ML · Zagueiro" },
      {
        name: "description",
        content:
          "Previsões CatBoost para as próximas partidas de futebol, a partir de depois de amanhã.",
      },
      { property: "og:title", content: "Próximos Jogos · Previsões ML · Zagueiro" },
      {
        property: "og:description",
        content: "Probabilidades 1X2, Over/Under e BTTS para os próximos jogos.",
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
  component: UpcomingPage,
});

function UpcomingPage() {
  const router = useRouter();
  const { leagueId } = Route.useSearch();

  return (
    <PredictionsBoard
      title="Próximos jogos"
      subtitle="Partidas a partir de depois de amanhã."
      dayFilter="later"
      leagueId={leagueId}
      onLeagueChange={(id) => router.navigate({ to: "/proximos", search: { leagueId: id } })}
    />
  );
}
