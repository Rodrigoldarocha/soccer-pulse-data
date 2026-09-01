import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTodayMatches } from "@/lib/matches.functions";
import { getAiSuggestions } from "@/lib/ai-suggest.functions";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Layers3, Radio, LineChart, Sparkles, Target, TrendingUp, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function todayQuery(fn: () => Promise<Awaited<ReturnType<typeof getTodayMatches>>>) {
  return queryOptions({ queryKey: ["today"], queryFn: fn });
}
function aiQuery(fn: () => Promise<Awaited<ReturnType<typeof getAiSuggestions>>>) {
  return queryOptions({ queryKey: ["ai-suggest"], queryFn: fn });
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — PulseLab" },
      { name: "description", content: "Visão geral das partidas do dia, predições e sugestões de múltiplas com IA." },
    ],
  }),
  component: Index,
});

function Index() {
  const today = useServerFn(getTodayMatches);
  const ai = useServerFn(getAiSuggestions);
  const { data } = useSuspenseQuery(todayQuery(today));
  const { data: aiData } = useSuspenseQuery(aiQuery(ai));

  const highConf = data.matches.filter((m) => m.confidence === "high").length;
  const avgOdds =
    data.matches.reduce((a, m) => a + m.suggestedOdds, 0) / Math.max(1, data.matches.length);

  const stats = [
    { label: "Partidas hoje", value: data.matches.length, icon: CalendarDays, color: "text-primary" },
    { label: "Alta confiança", value: highConf, icon: Target, color: "text-emerald-400" },
    { label: "Odd média", value: avgOdds.toFixed(2), icon: TrendingUp, color: "text-amber-400" },
    { label: "Múltiplas IA", value: aiData.suggestions.length, icon: Sparkles, color: "text-sky-400" },
  ];

  return (
    <div className="space-y-8">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Pulse<span className="text-primary">Lab</span>
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Predições baseadas em xG, odds recalculadas em tempo real e um construtor
          matemático de múltiplas com sugestões da IA.
        </p>
      </motion.header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-elevated p-4"
            >
              <div className="flex items-center justify-between text-muted-foreground/60">
                <span className="text-[11px] font-medium uppercase tracking-wide">{s.label}</span>
                <Icon className={cn("h-4 w-4", s.color)} />
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-foreground tabular-nums">{s.value}</div>
            </motion.div>
          );
        })}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {[
          { to: "/today", label: "Palpites do Dia", desc: "Todas as partidas com predição e 3 mercados", icon: CalendarDays },
          { to: "/multiples", label: "Múltiplas", desc: "Sugestões IA + construtor matemático", icon: Layers3 },
          { to: "/live", label: "Ao Vivo", desc: "Partidas em andamento com placar atualizado", icon: Radio },
          { to: "/analytics", label: "Analytics", desc: "Distribuições, calibração e desempenho", icon: LineChart },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.to}
              to={c.to}
              className="group card-elevated flex items-start gap-4 p-5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-base font-semibold text-foreground">{c.label}</div>
                <div className="text-sm text-muted-foreground">{c.desc}</div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}


