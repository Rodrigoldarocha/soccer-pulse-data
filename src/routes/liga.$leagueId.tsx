import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { PredictionsBoard } from "@/components/PredictionsBoard";

export const Route = createFileRoute("/liga/$leagueId")({
  head: () => ({
    meta: [
      { title: "Previsões da Liga · Zagueiro" },
      {
        name: "description",
        content:
          "Todas as previsões CatBoost de uma liga: 1X2, Over/Under, BTTS e placar mais provável.",
      },
      { property: "og:title", content: "Previsões da Liga · Zagueiro" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaguePage,
});

function LeaguePage() {
  const { leagueId } = Route.useParams();
  const router = useRouter();
  const parsed = Number(leagueId);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return (
      <div className="mx-auto max-w-6xl p-8 text-center text-sm text-destructive">
        ID de liga inválido
      </div>
    );
  }

  return (
    <>
      <PredictionsBoard
        title="Previsões da liga"
        subtitle="Todas as partidas da liga selecionada, ao vivo e futuras."
        dayFilter="all"
        leagueId={parsed}
        onLeagueChange={(id) => {
          if (id != null) {
            router.navigate({ to: "/liga/$leagueId", params: { leagueId: String(id) } });
          }
        }}
      />
      <div className="mx-auto flex max-w-6xl gap-2 px-4 pb-8 text-xs">
        <Link
          to="/tabela"
          search={{ leagueId: parsed }}
          className="clay-sm px-4 py-2 font-semibold transition hover:text-foreground"
        >
          📋 Tabela
        </Link>
        <Link
          to="/acertividade"
          search={{ leagueId: parsed }}
          className="clay-sm px-4 py-2 font-semibold text-muted-foreground transition hover:text-foreground"
        >
          📊 Acertividade
        </Link>
      </div>
    </>
  );
}
