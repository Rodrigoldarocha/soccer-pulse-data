import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getEventDetail } from "../lib/events.functions";
import { getOddsComparison } from "../lib/odds.functions";
import type { EventDetail, OddsComparison } from "../lib/bzzoiro/types";

function eventQuery(eventId: number) {
  return queryOptions({
    queryKey: ["events", "detail", eventId],
    queryFn: () => getEventDetail({ data: { eventId } }),
    staleTime: 2 * 60_000,
  });
}

function oddsQuery(eventId: number) {
  return queryOptions({
    queryKey: ["odds", "comparison", eventId],
    queryFn: () => getOddsComparison({ data: { eventId } }),
    staleTime: 1 * 60_000,
  });
}

function MatchHeader({ event }: { event: EventDetail }) {
  const statusLabel: Record<string, string> = {
    notstarted: "Não Iniciado",
    inprogress: "Ao Vivo",
    finished: "Encerrado",
    postponed: "Adiado",
    cancelled: "Cancelado",
  };

  return (
    <div className="clay p-6 text-center">
      <p className="mb-1 text-xs text-muted-foreground">
        {event.league_name ?? "Liga não informada"}
      </p>
      <p className="text-xs text-muted-foreground">
        {new Date(event.event_date).toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>

      <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-4 sm:gap-8">
        <span className="text-lg font-bold sm:text-2xl">{event.home_team}</span>

        {event.status === "finished" ? (
          <span className="min-w-[4rem] rounded-lg bg-muted px-3 py-1 text-xl font-black tabular-nums">
            {event.home_score?.home ?? "?"} – {event.home_score?.away ?? "?"}
          </span>
        ) : (
          <span className="min-w-[4rem] rounded-lg bg-muted px-3 py-1 text-xs font-semibold uppercase">
            {statusLabel[event.status] ?? event.status}
          </span>
        )}

        <span className="text-lg font-bold sm:text-2xl">{event.away_team}</span>
      </div>

      {(event.venue || event.referee) && (
        <div className="mt-4 space-x-4 text-xs text-muted-foreground">
          {event.venue && <span>🏟️ {event.venue}</span>}
          {event.referee && <span>👨‍⚖️ {event.referee}</span>}
        </div>
      )}
    </div>
  );
}

function OddsTable({ data }: { data: OddsComparison }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">Comparativo de Odds</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="pb-2 pr-4">Casa</th>
              <th className="pb-2 pr-4 text-right tabular-nums">1</th>
              <th className="pb-2 pr-4 text-right tabular-nums">X</th>
              <th className="pb-2 text-right tabular-nums">2</th>
            </tr>
          </thead>
          <tbody>
            {data.bookmakers.map((b) => (
              <tr key={b.bookmaker} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-4 font-medium">{b.bookmaker}</td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {b.odds_home != null ? b.odds_home.toFixed(2) : "–"}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {b.odds_draw != null ? b.odds_draw.toFixed(2) : "–"}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {b.odds_away != null ? b.odds_away.toFixed(2) : "–"}
                </td>
              </tr>
            ))}
            {data.bookmakers.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-muted-foreground">
                  Nenhuma odd disponível
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EventSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="h-48 animate-pulse rounded-2xl bg-card" />
      <div className="h-64 animate-pulse rounded-2xl bg-card" />
    </div>
  );
}

function EventPage({ eventId }: { eventId: number }) {
  const event = useSuspenseQuery(eventQuery(eventId));
  const odds = useSuspenseQuery(oddsQuery(eventId));

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <Link
        to="/"
        className="inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        ← Voltar
      </Link>

      <MatchHeader event={event.data} />

      <OddsTable data={odds.data} />
    </div>
  );
}

export const Route = createFileRoute("/events/$eventId")({
  component: RouteComponent,
  pendingComponent: EventSkeleton,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl p-4 text-center text-sm text-destructive">
      Erro ao carregar partida: {(error as Error).message}
    </div>
  ),
});

function RouteComponent() {
  const { eventId } = Route.useParams();
  const parsed = Number(eventId);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return (
      <div className="mx-auto max-w-3xl p-4 text-center text-sm text-destructive">
        ID de partida inválido
      </div>
    );
  }

  return <EventPage eventId={parsed} />;
}
