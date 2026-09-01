import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getTodayMatches } from "@/lib/matches.functions";
import { MatchCard } from "@/components/MatchCard";
import { BetSlipDesktop, BetSlipMobileFloating } from "@/components/BetSlip";
import { Search } from "lucide-react";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "Palpites do Dia — PulseLab" },
      { name: "description", content: "Predições de futebol de hoje com odds, probabilidades e 3 mercados por partida." },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const fn = useServerFn(getTodayMatches);
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["today"], queryFn: fn }));
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data.matches;
    return data.matches.filter((m) =>
      [m.home.name, m.away.name, m.leagueLabel].some((t) => t.toLowerCase().includes(s)),
    );
  }, [q, data.matches]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <header className="mb-5">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Palpites do dia
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.matches.length} partidas com predição — 3 mercados por card.
          </p>
        </header>
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar time ou liga"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
          {filtered.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              Nenhuma partida encontrada.
            </p>
          ) : null}
        </div>
      </div>
      <BetSlipDesktop />
      <BetSlipMobileFloating />
    </div>
  );
}
