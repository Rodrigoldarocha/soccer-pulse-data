import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getEventDetail } from "../lib/events.functions";
import { getEventPolymarket } from "../lib/events.functions";
import { getOddsComparison } from "../lib/odds.functions";
import { getEventLineups } from "../lib/lineups.functions";
import { getEventStats } from "../lib/stats.functions";
import type { EventDetail, OddsComparison, PolymarketData } from "../lib/bzzoiro/types";
import { LineupsDisplay } from "@/components/LineupsDisplay";
import { StatsDisplay } from "@/components/StatsDisplay";

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

function lineupsQuery(eventId: number) {
  return queryOptions({
    queryKey: ["lineups", eventId],
    queryFn: () => getEventLineups({ data: { eventId } }),
    staleTime: 5 * 60_000,
  });
}

function statsQuery(eventId: number) {
  return queryOptions({
    queryKey: ["stats", eventId],
    queryFn: () => getEventStats({ data: { eventId } }),
    staleTime: 2 * 60_000,
  });
}

function polymarketQuery(eventId: number) {
  return queryOptions({
    queryKey: ["polymarket", eventId],
    queryFn: () => getEventPolymarket({ data: { eventId } }),
    staleTime: 10 * 60_000,
  });
}

type TabId = "details" | "lineups" | "stats";

function MatchHeader({ event, leagueName }: { event: EventDetail; leagueName?: string | null }) {
  const statusLabel: Record<string, string> = {
    notstarted: "Não Iniciado",
    inprogress: "Ao Vivo",
    finished: "Encerrado",
    postponed: "Adiado",
    cancelled: "Cancelado",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <p className="mb-1 text-xs text-muted-foreground">
        {event.league_name ?? leagueName ?? "Liga não informada"}
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

        {event.home_score != null || event.away_score != null ? (
          <span className="clay-inset min-w-[4rem] px-3 py-1 text-xl font-black tabular-nums">
            {event.home_score ?? "?"} – {event.away_score ?? "?"}
          </span>
        ) : (
          <span className="clay-inset min-w-[4rem] px-3 py-1 text-xs font-semibold uppercase">
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

      {(event.has_xg || event.previous_leg_event_id != null) && (
        <div className="mt-3 flex items-center justify-center gap-2 text-[10px]">
          {event.has_xg && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              xG disponível
            </span>
          )}
          {event.previous_leg_event_id != null && (
            <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-muted-foreground">
              2ª mão (ida jogada)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const MARKET_LABELS: Record<string, string> = {
  "1x2": "Resultado (1X2)",
  btts: "Ambas Marcam",
  over_under: "Over / Under",
  double_chance: "Dupla Chance",
  handicap: "Handicap",
};

function PolymarketBlock({ data }: { data: PolymarketData | null }) {
  if (!data) return null;
  const entries = Object.entries(data.markets ?? {}).filter(
    ([, outcomes]) => outcomes && Object.keys(outcomes).length > 0,
  );
  if (entries.length === 0) return null;

  const outcomeLabel = (market: string, key: string): string => {
    if (market === "1x2") return key === "home" ? "Casa" : key === "draw" ? "Empate" : "Fora";
    if (market === "btts") return key === "yes" ? "Sim" : "Não";
    if (market === "over_under")
      return key === "over_25" ? "Over 2.5" : key === "under_25" ? "Under 2.5" : key;
    return key.replaceAll("_", " ");
  };

  const marketTitle = (market: string): string => {
    if (market === "1x2") return "Resultado (1X2)";
    if (market === "btts") return "Ambas Marcam";
    if (market === "over_under") return "Over / Under";
    return market.replaceAll("_", " ");
  };

  return (
    <div className="clay p-4">
      <h2 className="mb-3 flex items-center justify-between text-sm font-bold">
        <span>Mercado preditivo (Polymarket)</span>
        {data.updated_at && (
          <span className="text-[10px] font-normal text-muted-foreground">
            {new Date(data.updated_at).toLocaleString("pt-BR")}
          </span>
        )}
      </h2>
      <div className="space-y-3">
        {entries.map(([market, outcomes]) => (
          <div key={market}>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              {marketTitle(market)}
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {Object.entries(outcomes).map(([key, prob]) => (
                <div key={key} className="clay-inset flex items-center justify-between px-3 py-2">
                  <span className="text-xs">{outcomeLabel(market, key)}</span>
                  <span className="font-mono text-sm font-semibold">
                    {prob != null ? `${Math.round(prob * 100)}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OddsTable({ data }: { data: OddsComparison }) {
  const markets = Object.entries(data.markets ?? {}).filter(
    ([, outcomes]) => outcomes && Object.keys(outcomes).length > 0,
  );

  if (markets.length === 0) {
    return (
      <div className="clay p-8 text-center">
        <p className="text-muted-foreground">Nenhuma odd disponível para esta partida.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {markets.map(([market, outcomes]) => (
        <div key={market} className="clay p-4">
          <h2 className="mb-3 text-sm font-bold">
            {MARKET_LABELS[market] ?? market.replaceAll("_", " ")}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {Object.entries(outcomes).map(([key, o]) => (
              <div key={key} className="clay-inset p-3">
                <p className="truncate text-xs text-muted-foreground">
                  {o.outcome_name ?? o.outcome ?? key}
                  {o.line != null ? ` ${o.line}` : ""}
                </p>
                <p className="text-lg font-black tabular-nums">
                  {o.best_odds != null ? o.best_odds.toFixed(2) : "–"}
                </p>
                {o.best_bookmaker_name && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {o.best_bookmaker_name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
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
  const lineups = useSuspenseQuery(lineupsQuery(eventId));
  const stats = useSuspenseQuery(statsQuery(eventId));
  const polymarket = useSuspenseQuery(polymarketQuery(eventId));

  const [tab, setTab] = useState<TabId>("details");

  const tabs: { id: TabId; label: string }[] = [
    { id: "details", label: "📋 Detalhes" },
    { id: "lineups", label: "👥 Escalações" },
    { id: "stats", label: "📊 Estatísticas" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <Link
        to="/"
        className="inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        ← Voltar
      </Link>

      <MatchHeader event={event.data} leagueName={odds.data?.league_name} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors " +
              (tab === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "details" && (
        <>
          <PolymarketBlock data={polymarket.data} />
          <OddsTable data={odds.data} />
        </>
      )}
      {tab === "lineups" && <LineupsDisplay lineups={lineups.data} />}
      {tab === "stats" && <StatsDisplay stats={stats.data} />}
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
