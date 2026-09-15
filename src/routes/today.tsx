import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getTodayMatches } from "@/lib/matches.functions";
import { fmtDateSP } from "@/lib/match-dates";
import { MatchCard } from "@/components/MatchCard";
import { Search, X } from "lucide-react";
import type { MatchPrediction } from "@/lib/types";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "Hoje — PulseLab" },
      {
        name: "description",
        content: "Probabilidades de futebol para as partidas de hoje: BTTS, 1X2 e Over/Under 2.5.",
      },
    ],
  }),
  component: TodayPage,
});

function filterMatches(matches: MatchPrediction[], q: string) {
  const active = matches.filter((m) => m.status !== "finished");
  const s = q.trim().toLowerCase();
  if (!s) return active;
  return active.filter((m) =>
    [m.home.name, m.away.name, m.leagueLabel].some((t) => t.toLowerCase().includes(s)),
  );
}

function TodayPage() {
  const todayFn = useServerFn(getTodayMatches);
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["today"], queryFn: todayFn }));

  const [q, setQ] = useState("");
  const filtered = useMemo(() => filterMatches(data.matches, q), [q, data.matches]);

  const grouped = useMemo(() => {
    const groups = new Map<string, MatchPrediction[]>();
    for (const m of filtered) {
      const list = groups.get(m.leagueLabel) ?? [];
      list.push(m);
      groups.set(m.leagueLabel, list);
    }
    return groups;
  }, [filtered]);

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Hoje</h1>
        <p className="mt-1 text-sm text-muted-foreground/60">
          {fmtDateSP(data.date)} · {filtered.length} partida{filtered.length !== 1 ? "s" : ""}
        </p>
      </header>

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/30" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar time ou liga"
          aria-label="Buscar partidas por time ou liga"
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-9 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 focus-ring"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-5">
        {Array.from(grouped.entries()).map(([league, matches], gi) => (
          <div key={league} className="stagger-item">
            {gi > 0 && <div className="mb-2 border-t border-border/50" />}
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              {league}
            </p>
            <div className="space-y-1.5">
              {matches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
              <Search className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground/60">
              {q ? `Nenhum resultado para "${q}"` : "Nenhuma partida encontrada para hoje."}
            </p>
            {q && (
              <button
                onClick={() => setQ("")}
                className="mt-2 text-sm text-primary hover:underline focus-ring"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
