import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getTodayMatches, getTomorrowMatches } from "@/lib/matches.functions";
import { MatchCard } from "@/components/MatchCard";
import { BetSlipDesktop, BetSlipMobileFloating } from "@/components/BetSlip";
import { Search, CalendarDays, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "Palpites do Dia — PulseLab" },
      { name: "description", content: "Predições de futebol com odds, probabilidades e 3 mercados por partida." },
    ],
  }),
  component: TodayPage,
});

type Tab = "today" | "tomorrow";

function TodayPage() {
  const todayFn = useServerFn(getTodayMatches);
  const tomorrowFn = useServerFn(getTomorrowMatches);
  const { data: todayData } = useSuspenseQuery(
    queryOptions({ queryKey: ["today"], queryFn: todayFn }),
  );
  const { data: tomorrowData } = useSuspenseQuery(
    queryOptions({ queryKey: ["tomorrow"], queryFn: tomorrowFn }),
  );

  const [tab, setTab] = useState<Tab>("today");
  const [q, setQ] = useState("");

  const data = tab === "today" ? todayData : tomorrowData;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data.matches;
    return data.matches.filter((m) =>
      [m.home.name, m.away.name, m.leagueLabel].some((t) => t.toLowerCase().includes(s)),
    );
  }, [q, data.matches]);

  const formatDate = (iso: string) => {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <header className="mb-5">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Palpites
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.matches.length} partidas com predição — 3 mercados por card.
          </p>
        </header>

        {/* Tabs Hoje / Amanhã */}
        <div className="mb-4 inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
          {(
            [
              { id: "today" as Tab, label: "Hoje", icon: CalendarDays, date: todayData.date },
              { id: "tomorrow" as Tab, label: "Amanhã", icon: CalendarClock, date: tomorrowData.date },
            ]
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                <span className="ml-1 text-[10px] opacity-70">{formatDate(t.date)}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar time ou liga"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>

        {/* Match grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="grid gap-3 sm:grid-cols-2"
          >
            {filtered.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
            {filtered.length === 0 ? (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                Nenhuma partida encontrada.
              </p>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
      <BetSlipDesktop />
      <BetSlipMobileFloating />
    </div>
  );
}
