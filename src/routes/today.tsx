import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getTodayMatches, getTomorrowMatches, getUpcomingMatchesFn } from "@/lib/matches.functions";
import { MatchCard } from "@/components/MatchCard";
import { BetSlipDesktop, BetSlipMobileFloating } from "@/components/BetSlip";
import { Search, CalendarDays, CalendarClock, TrendingUp } from "lucide-react";
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

type Tab = "today" | "tomorrow" | "upcoming";

function TodayPage() {
  const todayFn = useServerFn(getTodayMatches);
  const tomorrowFn = useServerFn(getTomorrowMatches);
  const upcomingFn = useServerFn(getUpcomingMatchesFn);
  const { data: todayData } = useSuspenseQuery(
    queryOptions({ queryKey: ["today"], queryFn: todayFn }),
  );
  const { data: tomorrowData } = useSuspenseQuery(
    queryOptions({ queryKey: ["tomorrow"], queryFn: tomorrowFn }),
  );
  const { data: upcomingData } = useSuspenseQuery(
    queryOptions({ queryKey: ["upcoming"], queryFn: upcomingFn }),
  );

  const [tab, setTab] = useState<Tab>("today");
  const [q, setQ] = useState("");

  const data = tab === "today" ? todayData : tab === "tomorrow" ? tomorrowData : { date: `${upcomingData.from} → ${upcomingData.to}`, matches: upcomingData.matches };

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

  const tabs = [
    { id: "today" as Tab, label: "Hoje", icon: CalendarDays, date: todayData.date },
    { id: "tomorrow" as Tab, label: "Amanhã", icon: CalendarClock, date: tomorrowData.date },
    { id: "upcoming" as Tab, label: "Próximos", icon: TrendingUp, date: `${upcomingData.from} → ${upcomingData.to}` },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5"
        >
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Palpites
          </h1>
          <p className="mt-1 text-sm text-muted-foreground/60">
            {data.matches.length} partidas com predição — 3 mercados por card.
          </p>
        </motion.header>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-4 inline-flex rounded-xl border border-border/50 bg-card p-1 shadow-sm"
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.04]",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                <span className="ml-1 text-[10px] opacity-50 tabular-nums">{formatDate(t.date)}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="relative mb-4"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/30" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar time ou liga"
            className="w-full rounded-xl border border-border/50 bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all duration-200"
          />
        </motion.div>

        {/* Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid gap-3 sm:grid-cols-2"
          >
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
                Nenhuma partida encontrada.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <BetSlipDesktop />
      <BetSlipMobileFloating />
    </div>
  );
}
