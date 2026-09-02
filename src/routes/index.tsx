import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { getTodayMatches } from "@/lib/matches.functions";
import { getAiSuggestions } from "@/lib/ai-suggest.functions";
import { CalendarDays, Layers3, Radio, LineChart, Sparkles, Target, TrendingUp, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function todayQuery(fn: () => Promise<Awaited<ReturnType<typeof getTodayMatches>>>) {
  return queryOptions({ queryKey: ["today"], queryFn: fn });
}
function aiQuery(fn: () => Promise<Awaited<ReturnType<typeof getAiSuggestions>>>) {
  return queryOptions({ queryKey: ["ai-suggest"], queryFn: fn });
}

function PendingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-10 w-40 rounded-lg bg-white/[0.06]" />
      <div className="h-4 w-64 rounded-lg bg-white/[0.04]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="h-3 w-20 rounded bg-white/[0.06]" />
            <div className="mt-2 h-7 w-12 rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — PulseLab" },
      { name: "description", content: "Visão geral das partidas do dia, predições e sugestões de múltiplas com IA." },
    ],
  }),
  pendingComponent: PendingSkeleton,
  component: Index,
});

function Index() {
  const today = useServerFn(getTodayMatches);
  const ai = useServerFn(getAiSuggestions);
  const { data } = useSuspenseQuery(todayQuery(today));
  const { data: aiData } = useSuspenseQuery(aiQuery(ai));

  const highConf = useMemo(
    () => data.matches.filter((m) => m.confidence === "high").length,
    [data.matches],
  );
  const avgOdds = useMemo(
    () => data.matches.reduce((a, m) => a + m.suggestedOdds, 0) / Math.max(1, data.matches.length),
    [data.matches],
  );

  const stats = [
    { label: "Partidas hoje", value: data.matches.length, icon: CalendarDays, color: "text-primary" },
    { label: "Alta confiança", value: highConf, icon: Target, color: "text-emerald-400" },
    { label: "Odd média", value: avgOdds.toFixed(2), icon: TrendingUp, color: "text-amber-400" },
    { label: "Múltiplas IA", value: aiData.suggestions.length, icon: Sparkles, color: "text-sky-400" },
  ];

  const shortcuts = [
    { to: "/today", label: "Palpites do Dia", desc: "Todas as partidas com predição e 3 mercados", icon: CalendarDays },
    { to: "/multiples", label: "Múltiplas", desc: "Sugestões IA + construtor matemático", icon: Layers3 },
    { to: "/live", label: "Ao Vivo", desc: "Partidas em andamento com placar atualizado", icon: Radio },
    { to: "/analytics", label: "Analytics", desc: "Distribuições, calibração e desempenho", icon: LineChart },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Zap className="h-5 w-5" />
            <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-lg" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Pulse<span className="text-gradient">Lab</span>
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground/70 sm:text-base">
          Predições baseadas em xG, odds recalculadas em tempo real e um construtor
          matemático de múltiplas com sugestões da IA.
        </p>
      </motion.header>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="card-premium p-4"
            >
              <div className="flex items-center justify-between text-muted-foreground/50">
                <span className="text-[11px] font-medium uppercase tracking-wider">{s.label}</span>
                <Icon className={cn("h-4 w-4", s.color)} />
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-foreground tabular-nums">
                {s.value}
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* Shortcuts */}
      <section className="grid gap-3 sm:grid-cols-2">
        {shortcuts.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.to}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                to={c.to}
                className="group card-premium flex items-start gap-4 p-5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary transition-colors duration-300 group-hover:bg-primary/15">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base font-semibold text-foreground">{c.label}</div>
                  <div className="text-sm text-muted-foreground/60">{c.desc}</div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/30 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary/60" />
              </Link>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}
