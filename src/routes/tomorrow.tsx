import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getTomorrowMatches } from "@/lib/matches.functions";
import { fmtDateSP } from "@/lib/match-dates";
import { MatchCard } from "@/components/MatchCard";
import { Search, CalendarClock } from "lucide-react";
import type { MatchPrediction } from "@/lib/types";

export const Route = createFileRoute("/tomorrow")({
  head: () => ({
    meta: [
      { title: "Amanhã — PulseLab" },
      {
        name: "description",
        content:
          "Probabilidades de futebol para as partidas de amanhã: BTTS, 1X2 e Over/Under 2.5.",
      },
    ],
  }),
  component: TomorrowPage,
});

function filterMatches(matches: MatchPrediction[], q: string) {
  // Defesa contra cache stale: jogo encerrado sai da lista.
  const active = matches.filter((m) => m.status !== "finished");
  const s = q.trim().toLowerCase();
  if (!s) return active;
  return active.filter((m) =>
    [m.home.name, m.away.name, m.leagueLabel].some((t) => t.toLowerCase().includes(s)),
  );
}

function TomorrowPage() {
  const tomorrowFn = useServerFn(getTomorrowMatches);
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["tomorrow"], queryFn: tomorrowFn }));

  const [q, setQ] = useState("");
  const filtered = useMemo(() => filterMatches(data.matches, q), [q, data.matches]);

  return (
    <div>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-5"
      >
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
          <CalendarClock className="h-6 w-6 text-primary" />
          Amanhã
        </h1>
        <p className="mt-1 text-sm text-muted-foreground/60">
          {fmtDateSP(data.date)} — {filtered.length} partida{filtered.length !== 1 ? "s" : ""} ·
          probabilidades do modelo
        </p>
      </motion.header>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/30" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar time ou liga"
          className="w-full rounded-xl border border-border/50 bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
          >
            <MatchCard match={m} />
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground/40">
            Nenhuma partida encontrada para amanhã.
          </p>
        )}
      </div>
    </div>
  );
}
