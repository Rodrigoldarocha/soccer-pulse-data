import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLiveMatches } from "@/lib/matches.functions";
import { MatchCard } from "@/components/MatchCard";
import { Radio } from "lucide-react";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Ao Vivo — PulseLab" },
      { name: "description", content: "Partidas em andamento com placar, xG e mercado sugerido." },
    ],
  }),
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
      <header className="mb-5 flex items-center gap-2">
        <span className="flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
          Ao vivo
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          <Radio className="mr-2 inline h-6 w-6 text-primary" />
          Partidas em andamento
        </h1>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.matches.map((m) => (
          <MatchCard key={m.id} match={m} live />
        ))}
      </div>
    </div>
  );
}
