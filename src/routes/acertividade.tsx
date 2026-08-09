import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { listLeagues } from "@/lib/leagues.functions";
import {
  getLeagueAccuracy,
  type AccuracyMarket,
  type AccuracyPick,
  type MarketSummary,
} from "@/lib/accuracy.functions";

export const Route = createFileRoute("/acertividade")({
  head: () => ({
    meta: [
      { title: "Acertividade por Liga · Zagueiro" },
      {
        name: "description",
        content:
          "Backtest das previsões do modelo: taxa de acerto por mercado (1X2, BTTS, Over/Under 2.5) e por liga, com confiança média e histórico de picks.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { leagueId?: number; market?: AccuracyMarket } => ({
    leagueId: typeof search.leagueId === "number" ? search.leagueId : undefined,
    market:
      search.market === "btts" || search.market === "over25" || search.market === "1x2"
        ? search.market
        : undefined,
  }),
  loaderDeps: ({ search }) => ({ leagueId: search.leagueId, market: search.market }),
  loader: ({ context, deps }) => {
    context.queryClient.ensureQueryData(accuracyQuery(deps.leagueId, deps.market));
  },
  component: AccuracyPage,
});

const MARKETS: { id: AccuracyMarket; label: string }[] = [
  { id: "1x2", label: "1X2" },
  { id: "btts", label: "BTTS" },
  { id: "over25", label: "O/U 2.5" },
];

function accuracyQuery(leagueId?: number, market?: AccuracyMarket) {
  return queryOptions({
    queryKey: ["accuracy", { leagueId, market }],
    queryFn: () => getLeagueAccuracy({ data: { leagueId, market } }),
    staleTime: 10 * 60_000,
  });
}

function AccuracyPage() {
  const { leagueId, market } = Route.useSearch();
  const router = useRouter();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 space-y-3">
        <h1 className="text-2xl font-bold">Acertividade por liga</h1>
        <p className="text-sm text-muted-foreground">
          Backtest contra resultados reais — selecione o mercado. Últimas 200 previsões finalizadas.
        </p>
        <div className="flex flex-wrap gap-2">
          <Suspense fallback={<div className="clay-sm h-11 w-40 animate-pulse rounded-xl" />}>
            <LeagueSelect
              leagueId={leagueId}
              onSelect={(id) =>
                router.navigate({ to: "/acertividade", search: { leagueId: id, market } })
              }
            />
          </Suspense>
          <div className="clay-sm flex rounded-xl p-1" role="tablist" aria-label="Mercado">
            {MARKETS.map((m) => {
              const active = (market ?? "1x2") === m.id;
              return (
                <button
                  key={m.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() =>
                    router.navigate({ to: "/acertividade", search: { leagueId, market: m.id } })
                  }
                  className={
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
                    (active ? "clay-primary" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="clay h-40 animate-pulse" />}>
        <AccuracyData leagueId={leagueId} market={market} />
      </Suspense>

      <Suspense fallback={<div className="clay h-64 animate-pulse" />}>
        <PicksData leagueId={leagueId} market={market} />
      </Suspense>
    </main>
  );
}

function LeagueSelect({
  leagueId,
  onSelect,
}: {
  leagueId?: number;
  onSelect: (id: number | undefined) => void;
}) {
  const { data: leagues } = useSuspenseQuery(
    queryOptions({
      queryKey: ["leagues", "active", "accuracy"],
      queryFn: () => listLeagues(),
      staleTime: 10 * 60_000,
    }),
  );

  return (
    <select
      aria-label="Filtrar por liga"
      className="clay-sm w-full max-w-xs rounded-xl px-4 py-2.5 text-sm font-semibold"
      value={leagueId ?? ""}
      onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : undefined)}
    >
      <option value="">Todas as ligas</option>
      {leagues.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </select>
  );
}

function AccuracyData({ leagueId, market }: { leagueId?: number; market?: AccuracyMarket }) {
  const { data } = useSuspenseQuery(accuracyQuery(leagueId, market));
  const s: MarketSummary = data.markets[market ?? "1x2"];
  const rate = s.hit_rate != null ? (s.hit_rate * 100).toFixed(1) : "—";
  const conf = s.avg_confidence != null ? (s.avg_confidence * 100).toFixed(1) : "—";

  const stats = [
    { label: "Picks decididos", value: String(s.decided) },
    { label: "Acertos", value: String(s.hits) },
    { label: "Taxa de acerto", value: `${rate}%` },
    { label: "Conf. média", value: `${conf}%` },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((st) => (
        <div key={st.label} className="clay p-4 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {st.label}
          </div>
          <div className="mt-1 text-2xl font-black">{st.value}</div>
        </div>
      ))}
    </div>
  );
}

function PicksData({ leagueId, market }: { leagueId?: number; market?: AccuracyMarket }) {
  const { data } = useSuspenseQuery(accuracyQuery(leagueId, market));
  const picks = data.markets[market ?? "1x2"].picks;

  if (picks.length === 0) {
    return (
      <div className="clay p-8 text-center">
        <p className="text-muted-foreground">Nenhuma previsão finalizada para este recorte.</p>
      </div>
    );
  }

  const marketLabel = MARKETS.find((m) => m.id === (market ?? "1x2"))?.label ?? "1X2";

  return (
    <div className="clay overflow-x-auto">
      <div className="border-b border-border px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        Histórico — mercado {marketLabel}
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2">Data</th>
            <th className="px-4 py-2">Partida</th>
            <th className="px-4 py-2">Pick</th>
            <th className="px-4 py-2">Resultado</th>
            <th className="px-4 py-2">Conf.</th>
            <th className="px-4 py-2">Acerto</th>
          </tr>
        </thead>
        <tbody>
          {picks.map((p) => (
            <PickRow key={p.event_id + p.event_date} pick={p} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PickRow({ pick }: { pick: AccuracyPick }) {
  const hitLabel = pick.hit == null ? "—" : pick.hit ? "✓" : "✗";
  const hitColor = pick.hit == null ? "" : pick.hit ? "text-primary" : "text-destructive";
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="px-4 py-2 tabular-nums text-muted-foreground">
        {new Date(pick.event_date).toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        })}
      </td>
      <td className="px-4 py-2 font-medium">
        {pick.home_team} × {pick.away_team}
      </td>
      <td className="px-4 py-2">{pick.predicted ?? "—"}</td>
      <td className="px-4 py-2">{pick.actual ?? "—"}</td>
      <td className="px-4 py-2 tabular-nums">
        {pick.confidence != null ? `${Math.round(pick.confidence * 100)}%` : "—"}
      </td>
      <td className={`px-4 py-2 font-black ${hitColor}`}>{hitLabel}</td>
    </tr>
  );
}
