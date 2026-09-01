import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Sparkles, Layers3, ArrowRight } from "lucide-react";
import { getAiSuggestions } from "@/lib/ai-suggest.functions";
import { getTodayMatches } from "@/lib/matches.functions";
import { MatchCard } from "@/components/MatchCard";
import { BetSlipDesktop, BetSlipMobileFloating } from "@/components/BetSlip";
import { useBetSlip, type SlipLeg } from "@/lib/bet-slip";
import type { ParlaySuggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/multiples")({
  head: () => ({
    meta: [
      { title: "Múltiplas Inteligentes — PulseLab" },
      { name: "description", content: "Sugestões de parlays geradas por IA e construtor matemático de múltiplas." },
    ],
  }),
  component: MultiplesPage,
});

function riskChipCls(id: ParlaySuggestion["id"]) {
  return id === "safe"
    ? "bg-emerald-500/15 text-emerald-400"
    : id === "moderate"
    ? "bg-sky-500/15 text-sky-400"
    : "bg-rose-500/15 text-rose-400";
}

function SuggestionCard({ s, matches }: { s: ParlaySuggestion; matches: { id: string; home: { name: string; short: string }; away: { name: string; short: string }; leagueLabel: string }[] }) {
  const { loadLegs } = useBetSlip();

  const use = () => {
    const legs: SlipLeg[] = s.legs.map((l) => {
      const m = matches.find((x) => x.id === l.matchId);
      return {
        ...l,
        matchLabel: m ? `${m.home.name} × ${m.away.name}` : l.matchId,
        leagueLabel: m?.leagueLabel ?? "",
      };
    });
    loadLegs(legs);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated flex flex-col p-5"
    >
      <div className="flex items-center justify-between">
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", riskChipCls(s.id))}>
          {s.riskText}
        </span>
        <div className="text-right">
          <div className="font-display text-xl font-bold text-foreground tabular-nums">{s.totalOdds.toFixed(2)}</div>
          <div className="text-[10px] font-medium text-muted-foreground">{(s.totalProbability * 100).toFixed(1)}% real</div>
        </div>
      </div>
      <h3 className="mt-2 font-display text-base font-semibold text-foreground">{s.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.explanation}</p>

      <ul className="mt-3 space-y-2">
        {s.legs.map((l) => {
          const m = matches.find((x) => x.id === l.matchId);
          return (
            <li key={`${l.matchId}-${l.market}`} className="rounded-xl bg-white/5 px-3 py-2 text-xs">
              <div className="font-medium text-foreground">
                {m ? `${m.home.short} × ${m.away.short}` : l.matchId}
                <span className="ml-2 text-muted-foreground">{m?.leagueLabel}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-muted-foreground">
                <span>{l.marketLabel}</span>
                <span className="font-display font-semibold text-foreground tabular-nums">{l.odds.toFixed(2)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        onClick={use}
        className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 active:scale-95 glow-green"
      >
        Usar no construtor <ArrowRight className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

function MultiplesPage() {
  const ai = useServerFn(getAiSuggestions);
  const today = useServerFn(getTodayMatches);
  const { data: aiData } = useSuspenseQuery(queryOptions({ queryKey: ["ai-suggest"], queryFn: ai }));
  const { data: todayData } = useSuspenseQuery(queryOptions({ queryKey: ["today"], queryFn: today }));

  const [tab, setTab] = useState<"ai" | "builder">("ai");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return todayData.matches;
    return todayData.matches.filter((m) =>
      [m.home.name, m.away.name, m.leagueLabel].some((t) => t.toLowerCase().includes(s)),
    );
  }, [q, todayData.matches]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <header className="mb-4">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Múltiplas inteligentes
          </h1>
          <p className="text-sm text-muted-foreground">
            Combine sugestões de IA com um construtor matemático — todas as odds e probabilidades
            são recalculadas no servidor.
          </p>
        </header>

        <div className="mb-5 inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
          {(
            [
              { id: "ai", label: "Sugestões da IA", icon: Sparkles },
              { id: "builder", label: "Criar múltipla", icon: Layers3 },
            ] as const
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
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab === "ai" ? (
            <motion.section
              key="ai"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="grid gap-4 lg:grid-cols-1 xl:grid-cols-1"
            >
              {aiData.suggestions.map((s) => (
                <SuggestionCard key={s.id} s={s} matches={aiData.matches} />
              ))}
            </motion.section>
          ) : (
            <motion.section
              key="builder"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
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
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <BetSlipDesktop />
      <BetSlipMobileFloating />
    </div>
  );
}
