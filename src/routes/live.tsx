import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLiveMatches } from "@/lib/matches.functions";
import { MatchCard } from "@/components/MatchCard";
import { Radio } from "lucide-react";
import { motion } from "framer-motion";

function PendingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-6 w-20 rounded-full bg-white/[0.06]" />
        <div className="h-7 w-48 rounded-lg bg-white/[0.04]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
            <div className="h-3 w-20 rounded bg-white/[0.06]" />
            <div className="flex justify-between items-center">
              <div className="h-4 w-20 rounded bg-white/[0.06]" />
              <div className="h-6 w-16 rounded-lg bg-white/[0.04]" />
              <div className="h-4 w-20 rounded bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Ao Vivo — PulseLab" },
      { name: "description", content: "Partidas em andamento com placar, xG e mercado sugerido." },
    ],
  }),
  pendingComponent: PendingSkeleton,
  component: LivePage,
});

function LivePage() {
  const fn = useServerFn(getLiveMatches);
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["live"],
      queryFn: fn,
      refetchInterval: 60_000,
    }),
  );
  return (
    <div>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-5 flex items-center gap-3"
      >
        <span className="flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
          Ao vivo
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          <Radio className="mr-2 inline h-6 w-6 text-primary" />
          Partidas em andamento
        </h1>
      </motion.header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.matches.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
          >
            <MatchCard match={m} live />
          </motion.div>
        ))}
      </div>
      {data.matches.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground/40">
          Nenhuma partida ao vivo no momento.
        </p>
      )}
    </div>
  );
}
