import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { listLeagues } from "@/lib/leagues.functions";
import { getLeagueAccuracy, type AccuracyPick } from "@/lib/accuracy.functions";

export const Route = createFileRoute("/acertividade")({
  head: () => ({
    meta: [
      { title: "Acertividade por Liga · Zagueiro" },
      {
        name: "description",
        content:
          "Backtest das previsões do modelo: taxa de acerto por liga no mercado 1X2, com confiança média e histórico de picks.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { leagueId?: number } => ({
    leagueId: typeof search.leagueId === "number" ? search.leagueId : undefined,
  }),
  loaderDeps: ({ search }) => ({ leagueId: search.leagueId }),
  loader: ({ context, deps }) => {
    context.queryClient.ensureQueryData(accuracyQuery(deps.leagueId));
  },
  component: AccuracyPage,
});

function accuracyQuery(leagueId?: number) {
  return queryOptions({
    queryKey: ["accuracy", { leagueId }],
    queryFn: () => getLeagueAccuracy({ data: { leagueId } }),
    staleTime: 10 * 60_000,
  });
}

function AccuracyPage() {
  const { leagueId } = Route.useSearch();
  const router = useRouter();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 space-y-3">
        <h1 className="text-2xl font-bold">Acertividade por liga</h1>
        <p className="text-sm text-muted-foreground">
          Backtest contra resultados reais — mercado 1X2. Últimas 200 previsões finalizadas.
        </p>
        <Suspense fallback={<div className="clay-sm h-11 animate-pulse rounded-xl" />}>
          <LeagueSelect
            selected={leagueId}
            onSelect={(id) => router.navigate({ to: "/acertividade", search: { leagueId: id } })}
          />
        </Suspense>
      </div>

      <Suspense fallback={<div className="clay h-40 animate-pulse" />}>
        <AccuracyData leagueId={leagueId} />
      </Suspense>

      <Suspense fallback={<div className="clay h-64 animate-pulse" />}>
        <PicksData leagueId={leagueId} />
      </Suspense>
    </main>
  );
}

function LeagueSelect({
  selected,
  onSelect,
}: {
  selected?: number;
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
      value={selected ?? ""}
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

function AccuracyData({ leagueId }: { leagueId?: number }) {
  const { data } = useSuspenseQuery(accuracyQuery(leagueId));
  const rate = data.hit_rate != null ? (data.hit_rate * 100).toFixed(1) : "—";
  const conf = data.avg_confidence != null ? (data.avg_confidence * 100).toFixed(1) : "—";

  const stats = [
    { label: "Picks finalizados", value: String(data.decided) },
    { label: "Acertos", value: String(data.hits) },
    { label: "Taxa de acerto", value: `${rate}%` },
    { label: "Conf. média", value: `${conf}%` },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="clay p-4 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
          <div className="mt-1 text-2xl font-black">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

function PicksData({ leagueId }: { leagueId?: number }) {
  const { data } = useSuspenseQuery(accuracyQuery(leagueId));

  if (data.picks.length === 0) {
    return (
      <div className="clay p-8 text-center">
        <p className="text-muted-foreground">Nenhuma previsão finalizada para este recorte.</p>
      </div>
    );
  }

  return (
    <div className="clay overflow-x-auto">
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
          {data.picks.map((p) => (
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
        {new Date(pick.event_date).toLocaleDateString("pt-BR")}
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
