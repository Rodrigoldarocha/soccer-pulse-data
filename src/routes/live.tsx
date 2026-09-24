import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLiveMatches } from "@/lib/matches.functions";
import { MatchCard } from "@/components/MatchCard";
import { RefreshCw, Radio } from "lucide-react";

function PendingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-6 w-20 rounded-full bg-white/[0.06]" />
        <div className="h-7 w-48 rounded bg-white/[0.04]" />
      </div>
      <div className="space-y-1.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded border border-border/50 bg-card px-3 py-2.5"
          >
            <div className="h-5 w-12 rounded bg-white/[0.06]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 rounded bg-white/[0.06]" />
              <div className="h-4 w-28 rounded bg-white/[0.06]" />
            </div>
            <div className="h-5 w-16 rounded bg-white/[0.04]" />
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
      {
        name: "description",
        content: "Partidas em andamento com placar e probabilidades BTTS, 1X2 e Over/Under 2.5.",
      },
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
      refetchInterval: 30_000,
    }),
  );
  const liveMatches = data.matches.filter((m) => m.status === "live");
  return (
    <div>
      <header className="mb-5 flex items-center gap-3">
        <span className="flex items-center gap-2 rounded-full bg-live/10 border border-live/20 px-3 py-1 text-xs font-semibold text-live live-pulse">
          <Radio className="h-3.5 w-3.5" />
          Ao vivo
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Partidas em andamento
        </h1>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
          <RefreshCw className="h-3 w-3 animate-spin" />
          30s
        </span>
      </header>
      <div className="space-y-1.5">
        {liveMatches.map((m, i) => (
          <div key={m.id} className="stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
            <MatchCard match={m} live />
          </div>
        ))}
      </div>
      {liveMatches.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-live/10">
            <Radio className="h-5 w-5 text-live/40" />
          </div>
          <p className="text-sm text-muted-foreground/60">Nenhuma partida ao vivo no momento.</p>
          <p className="mt-1 text-xs text-muted-foreground/40">
            As partidas aparecem aqui quando começam.
          </p>
        </div>
      )}
    </div>
  );
}
