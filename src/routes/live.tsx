import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";

import { listLiveEvents, type LiveEvent } from "@/lib/live.functions";
import { TeamLogo } from "@/components/TeamLogo";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Jogos ao Vivo · Zagueiro" },
      {
        name: "description",
        content: "Partidas de futebol ao vivo com scores atualizados em tempo real.",
      },
    ],
  }),
  component: LivePage,
});

const liveQuery = queryOptions({
  queryKey: ["events", "live"],
  queryFn: () => listLiveEvents({ data: {} }),
  staleTime: 10_000,
  refetchInterval: 10_000,
});

function LivePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-destructive text-destructive-foreground">
              <span className="font-black">L</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Ao Vivo</h1>
              <p className="text-xs text-muted-foreground">Partidas em andamento</p>
            </div>
          </div>
          <Link
            to="/"
            className="rounded-md bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
          >
            ← Previsões
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Suspense fallback={<LiveSkeleton />}>
          <LiveGrid />
        </Suspense>
      </main>
    </div>
  );
}

function LiveGrid() {
  const { data: events, isFetching, dataUpdatedAt } = useSuspenseQuery(liveQuery);

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR")
    : null;

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <div className="mb-4 text-4xl">⚽</div>
        <h2 className="text-xl font-semibold">Nenhum jogo ao vivo no momento</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Volte mais tarde para ver partidas em andamento.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Ver previsões futuras
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-destructive animate-pulse" />
          {isFetching ? "Atualizando…" : `${events.length} jogo(s) ao vivo`}
        </span>
        {lastUpdate && <span>Atualizado às {lastUpdate}</span>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {events.map((event) => (
          <LiveCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

function LiveCard({ event }: { event: LiveEvent }) {
  const homeScore = event.home_score?.home ?? null;
  const awayScore = event.home_score?.away ?? null;

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: String(event.id) }}
      className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-destructive/50 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive animate-pulse">
          🔴 AO VIVO
        </span>
        <span className="text-muted-foreground">{event.league_name ?? "—"}</span>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo teamId={event.home_team_id} teamName={event.home_team} size={48} />
          <span className="line-clamp-2 text-sm font-medium" title={event.home_team}>
            {event.home_team}
          </span>
        </div>

        <div className="min-w-[4rem] rounded-lg bg-muted px-4 py-2 text-center">
          <span className="text-2xl font-black tabular-nums">
            {homeScore != null ? homeScore : "?"}
          </span>
          <span className="mx-1 text-lg text-muted-foreground">×</span>
          <span className="text-2xl font-black tabular-nums">
            {awayScore != null ? awayScore : "?"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo teamId={event.away_team_id} teamName={event.away_team} size={48} />
          <span className="line-clamp-2 text-sm font-medium" title={event.away_team}>
            {event.away_team}
          </span>
        </div>
      </div>
    </Link>
  );
}

function LiveSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
      ))}
    </div>
  );
}
