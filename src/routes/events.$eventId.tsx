import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { getEventDetail } from "../lib/events.functions";
import { getEventPolymarket } from "../lib/events.functions";
import { getOddsComparison } from "../lib/odds.functions";
import { getEventLineups } from "../lib/lineups.functions";
import { getEventStats } from "../lib/stats.functions";
import { getTeamForm, formSummary, type FormEntry } from "../lib/events.functions";
import type { EventDetail, OddsComparison, PolymarketData, HeadToHead } from "../lib/bzzoiro/types";
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
    staleTime: 5 * 60_000,
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

function teamFormQuery(teamId: number) {
  return queryOptions({
    queryKey: ["teams", "form", teamId],
    queryFn: () => getTeamForm({ data: { teamId } }),
    staleTime: 5 * 60_000,
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
          timeZone: "America/Sao_Paulo",
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
  draw_no_bet: "Sem Empate (DNB)",
  correct_score: "Placar Exato",
  half_time: "Intervalo",
  total_goals: "Total de Gols",
};

/** Turns API market keys like `over_under_25` into "Over / Under 2.5". */
function marketLabel(market: string): string {
  if (MARKET_LABELS[market]) return MARKET_LABELS[market];
  const ou = /^over_under_(\d+)$/.exec(market);
  if (ou) {
    const digits = ou[1];
    const line = digits.length > 1 ? `${digits.slice(0, -1)}.${digits.slice(-1)}` : digits;
    return `Over / Under ${line}`;
  }
  return market.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
}

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

  const marketTitle = marketLabel;

  return (
    <div className="clay p-4">
      <h2 className="mb-3 flex items-center justify-between text-sm font-bold">
        <span>Mercado preditivo (Polymarket)</span>
        {data.updated_at && (
          <span className="text-[10px] font-normal text-muted-foreground">
            {new Date(data.updated_at).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}
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
          <h2 className="mb-3 text-sm font-bold">{marketLabel(market)}</h2>

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

const RESULT_STYLE: Record<string, string> = {
  W: "bg-emerald-500/15 text-emerald-600",
  D: "bg-amber-500/15 text-amber-600",
  L: "bg-red-500/15 text-red-600",
};

function FormChips({ form }: { form: FormEntry[] }) {
  return (
    <div className="flex items-center gap-1">
      {form.map((e, i) => (
        <span
          key={i}
          title={`${e.opponent} ${e.score} (${e.home ? "casa" : "fora"})`}
          className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black ${RESULT_STYLE[e.result]}`}
        >
          {e.result}
        </span>
      ))}
      {form.length === 0 && <span className="text-xs text-muted-foreground">Sem histórico</span>}
    </div>
  );
}

function TeamFormColumn({ teamName, teamId }: { teamName: string; teamId: number | null }) {
  const form = useSuspenseQuery(teamFormQuery(teamId as number));

  return (
    <div className="clay-inset px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold" title={teamName}>
          {teamName}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {formSummary(form.data)}
        </span>
      </div>
      <FormChips form={form.data} />
    </div>
  );
}

function FormBlock({ event }: { event: EventDetail }) {
  if (event.home_team_id == null || event.away_team_id == null) return null;

  return (
    <div className="clay p-4">
      <h2 className="mb-3 text-sm font-bold">📈 Forma recente (últimos 5)</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <TeamFormColumn teamName={event.home_team} teamId={event.home_team_id} />
        <TeamFormColumn teamName={event.away_team} teamId={event.away_team_id} />
      </div>
    </div>
  );
}

function H2HBlock({
  h2h,
  homeTeam,
  awayTeam,
}: {
  h2h: HeadToHead | null | undefined;
  homeTeam: string;
  awayTeam: string;
}) {
  if (!h2h || h2h.total_matches == null || h2h.total_matches === 0) return null;

  const pct = (v: number | null | undefined) => (v != null ? `${Math.round(v * 100)}%` : "—");

  const rows: [string, string, string][] = [
    [homeTeam, `${h2h.home_wins ?? "—"} vitórias`, pct(h2h.home_win_rate)],
    ["Empates", `${h2h.draws ?? "—"}`, "—"],
    [awayTeam, `${h2h.away_wins ?? "—"} vitórias`, pct(h2h.away_win_rate)],
  ];

  return (
    <div className="clay p-4">
      <h2 className="mb-3 text-sm font-bold">⚔️ Confronto direto</h2>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="clay-inset px-2 py-2">
          <p className="text-[10px] uppercase text-muted-foreground">Jogos</p>
          <p className="text-lg font-black tabular-nums">{h2h.total_matches}</p>
        </div>
        <div className="clay-inset px-2 py-2">
          <p className="text-[10px] uppercase text-muted-foreground">Gols casa/fora</p>
          <p className="text-lg font-black tabular-nums">
            {h2h.home_goals ?? "—"}–{h2h.away_goals ?? "—"}
          </p>
        </div>
        <div className="clay-inset px-2 py-2">
          <p className="text-[10px] uppercase text-muted-foreground">Média gols</p>
          <p className="text-lg font-black tabular-nums">
            {h2h.avg_total_goals != null ? h2h.avg_total_goals.toFixed(1) : "—"}
          </p>
        </div>
      </div>

      <div className="mb-3 space-y-1.5">
        {rows.map(([label, value, rate]) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold">
              {value} {rate !== "—" && <span className="ml-1 text-muted-foreground">({rate})</span>}
            </span>
          </div>
        ))}
      </div>

      {h2h.recent_matches && h2h.recent_matches.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Últimos confrontos
          </div>
          <div className="space-y-1">
            {h2h.recent_matches.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">
                  {m.home_team} × {m.away_team}
                </span>
                <span className="ml-2 shrink-0 font-mono font-semibold">
                  {m.home_score != null ? `${m.home_score}–${m.away_score}` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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

      <div className="flex justify-center">
        <button
          type="button"
          onClick={async () => {
            const url = new URL(window.location.href);
            const text = `Previsão Zagueiro: ${event.data.home_team} vs ${event.data.away_team}`;
            if (navigator.share) {
              try {
                await navigator.share({ title: text, text, url: url.toString() });
                return;
              } catch {
                // user cancelou ou share indisponível — cai no clipboard
              }
            }
            await navigator.clipboard.writeText(url.toString());
            toast.success("Link copiado");
          }}
          className="clay-sm px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
        >
          🔗 Compartilhar
        </button>
      </div>

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
          <H2HBlock
            h2h={event.data.head_to_head}
            homeTeam={event.data.home_team}
            awayTeam={event.data.away_team}
          />
          <Suspense fallback={<div className="clay h-20 animate-pulse" />}>
            <FormBlock event={event.data} />
          </Suspense>
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
