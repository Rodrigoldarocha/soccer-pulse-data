import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getTodayMatches, getTomorrowMatches, getUpcomingMatchesFn } from "@/lib/matches.functions";
import { MatchCard } from "@/components/MatchCard";
import { BetSlipDesktop, BetSlipMobileFloating } from "@/components/BetSlip";
import { Search, CalendarDays, CalendarClock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchPrediction } from "@/lib/types";

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

function PendingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
            <div className="h-3 w-20 rounded bg-white/[0.06]" />
            <div className="flex justify-between items-center">
              <div className="h-4 w-20 rounded bg-white/[0.06]" />
              <div className="h-4 w-8 rounded bg-white/[0.04]" />
              <div className="h-4 w-20 rounded bg-white/[0.06]" />
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-14 rounded-lg bg-white/[0.03]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

function MatchGrid({ matches }: { matches: MatchPrediction[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {matches.map((m, i) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
        >
          <MatchCard match={m} />
        </motion.div>
      ))}
      {matches.length === 0 && (
        <p className="col-span-full py-12 text-center text-sm text-muted-foreground/40">
          Nenhuma partida encontrada.
        </p>
      )}
    </div>
  );
}

function filterMatches(matches: MatchPrediction[], q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return matches;
  return matches.filter((m) =>
    [m.home.name, m.away.name, m.leagueLabel].some((t) => t.toLowerCase().includes(s)),
  );
}

function TodayPage() {
  // SSR: only fetch today's data
  const todayFn = useServerFn(getTodayMatches);
  const { data: todayData } = useSuspenseQuery(
    queryOptions({ queryKey: ["today"], queryFn: todayFn }),
  );

  const [tab, setTab] = useState<Tab>("today");
  const [q, setQ] = useState("");

  const tabs = [
    { id: "today" as Tab, label: "Hoje", icon: CalendarDays, date: todayData.date },
    { id: "tomorrow" as Tab, label: "Amanhã", icon: CalendarClock },
    { id: "upcoming" as Tab, label: "Próximos", icon: TrendingUp },
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
            Predições com odds, probabilidades e 3 mercados por card.
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
                {t.date && (
                  <span className="ml-1 text-[10px] opacity-50 tabular-nums">{formatDate(t.date)}</span>
                )}
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

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "today" && <TodayTab q={q} data={todayData} />}
            {tab === "tomorrow" && <TomorrowTab q={q} />}
            {tab === "upcoming" && <UpcomingTab q={q} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <BetSlipDesktop />
      <BetSlipMobileFloating />
    </div>
  );
}

function TodayTab({ q, data }: { q: string; data: { date: string; matches: MatchPrediction[] } }) {
  const filtered = useMemo(() => filterMatches(data.matches, q), [q, data.matches]);
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground/60">
        {data.date} — {filtered.length} partida{filtered.length !== 1 ? "s" : ""}
      </p>
      <MatchGrid matches={filtered} />
    </>
  );
}

function TomorrowTab({ q }: { q: string }) {
  const tomorrowFn = useServerFn(getTomorrowMatches);
  const { data, isLoading, isError } = useQuery(
    queryOptions({ queryKey: ["tomorrow"], queryFn: tomorrowFn }),
  );

  if (isLoading) return <PendingSkeleton />;
  if (isError || !data) return <p className="py-8 text-center text-sm text-muted-foreground/40">Erro ao carregar amanhã.</p>;

  const filtered = filterMatches(data.matches, q);
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground/60">
        {data.date} — {filtered.length} partida{filtered.length !== 1 ? "s" : ""}
      </p>
      <MatchGrid matches={filtered} />
    </>
  );
}

function UpcomingTab({ q }: { q: string }) {
  const upcomingFn = useServerFn(getUpcomingMatchesFn);
  const { data, isLoading, isError } = useQuery(
    queryOptions({ queryKey: ["upcoming"], queryFn: upcomingFn }),
  );

  if (isLoading) return <PendingSkeleton />;
  if (isError || !data) return <p className="py-8 text-center text-sm text-muted-foreground/40">Erro ao carregar próximos.</p>;

  const filtered = filterMatches(data.matches, q);
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground/60">
        {data.from} → {data.to} — {filtered.length} partida{filtered.length !== 1 ? "s" : ""}
      </p>
      <MatchGrid matches={filtered} />
    </>
  );
}
