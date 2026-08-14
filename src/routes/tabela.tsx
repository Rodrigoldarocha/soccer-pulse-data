import { createFileRoute, useRouter } from "@tanstack/react-router";

import { StandingsBoard, buildStandingsQuery } from "@/components/StandingsBoard";

export const Route = createFileRoute("/tabela")({
  head: () => ({
    meta: [
      { title: "Tabela de Classificação · Zagueiro" },
      {
        name: "description",
        content: "Standings por liga: posição, jogos, saldo de gols e pontos de cada time.",
      },
      { property: "og:title", content: "Tabela de Classificação · Zagueiro" },
      {
        property: "og:description",
        content: "Classificação atualizada das principais ligas de futebol.",
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
    if (deps.leagueId != null) {
      context.queryClient.ensureQueryData(buildStandingsQuery(deps.leagueId));
    }
  },
  component: StandingsPage,
});

function StandingsPage() {
  const router = useRouter();
  const { leagueId } = Route.useSearch();

  return (
    <StandingsBoard
      leagueId={leagueId}
      onLeagueChange={(id) => router.navigate({ to: "/tabela", search: { leagueId: id } })}
    />
  );
}
