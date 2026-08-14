import { queryOptions, useQuery } from "@tanstack/react-query";

import { getValueBets } from "@/lib/value-bets.functions";
import { getRetryDelay, BzzoiroApiError } from "@/lib/bzzoiro/errors";
import type { ValueBet, ValueMarket } from "@/lib/bzzoiro/types";

export type MarketFilter = ValueMarket | "all";

export function buildValueBetsQuery() {
  return queryOptions({
    queryKey: ["value-bets", "upcoming"],
    queryFn: () => getValueBets(),
    staleTime: 2 * 60_000,
    retry: (failureCount: number, error: unknown) => {
      if (error instanceof BzzoiroApiError && error.isAuthError()) return false;
      if (error instanceof BzzoiroApiError && error.isRateLimit()) return failureCount < 3;
      return failureCount < 2;
    },
    retryDelay: (attempt: number, error: unknown) => {
      const delay = getRetryDelay(error);
      if (delay !== undefined) return delay;
      return Math.min(1000 * 2 ** attempt, 30_000);
    },
  });
}

const MARKET_LABELS: Record<ValueMarket, string> = {
  "1x2": "Resultado (1X2)",
  over_under_25: "Over/Under 2.5",
  btts: "Ambas marcam (BTTS)",
};

function friendlyError(error: unknown): string {
  if (error instanceof BzzoiroApiError) {
    if (error.isRateLimit()) return "Muitas requisições. Tente novamente em instantes.";
    return error.getUserMessage();
  }
  return "Não foi possível carregar as apostas de valor. Tente novamente.";
}

export function ValueBetsBoard({
  market,
  onMarketChange,
}: {
  market: MarketFilter;
  onMarketChange: (m: MarketFilter) => void;
}) {
  const query = useQuery(buildValueBetsQuery());

  const bets = (query.data ?? []).filter((b) => market === "all" || b.market === market);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Apostas de valor</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Onde o modelo enxerga probabilidade maior que a implícita nas odds das casas. EV ≥ 5%
              (EV = prob × odd − 1).
            </p>
          </div>
        </div>

        <div className="relative max-w-xs">
          <select
            aria-label="Filtrar por mercado"
            value={market}
            onChange={(e) => onMarketChange(e.target.value as MarketFilter)}
            className="clay-sm w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todos os mercados</option>
            <option value="1x2">Resultado (1X2)</option>
            <option value="over_under_25">Over/Under 2.5</option>
            <option value="btts">Ambas marcam (BTTS)</option>
          </select>
        </div>
      </div>

      {query.isPending && <GridSkeleton />}

      {query.isError && (
        <div role="status" className="clay p-10 text-center">
          <p className="font-semibold text-destructive">{friendlyError(query.error)}</p>
          <button
            onClick={() => query.refetch()}
            className="clay-primary mt-4 px-4 py-2 text-xs font-semibold transition active:translate-y-0.5"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {query.isSuccess && bets.length === 0 && (
        <div role="status" className="clay p-10 text-center">
          <p className="text-muted-foreground">Nenhuma aposta com valor hoje no momento.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            O modelo só destaca mercados com EV acima de 5%.
          </p>
        </div>
      )}

      {query.isSuccess && bets.length > 0 && (
        <>
          <div className="mb-3 text-xs text-muted-foreground">
            {bets.length} {bets.length === 1 ? "aposta" : "apostas"} com valor, ordenadas por EV
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bets.map((b) => (
              <ValueBetCard key={`${b.event_id}-${b.market}-${b.outcome}`} bet={b} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function ValueBetCard({ bet }: { bet: ValueBet }) {
  return (
    <article className="clay flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {bet.home_team} <span className="text-muted-foreground">×</span> {bet.away_team}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{bet.league_name}</p>
        </div>
        <span className="clay-primary shrink-0 px-2 py-1 text-xs font-black">+{bet.evPct}% EV</span>
      </div>

      <div className="rounded-lg bg-background/60 p-3 text-xs">
        <p className="font-semibold uppercase tracking-wide text-muted-foreground">
          {MARKET_LABELS[bet.market]}
        </p>
        <p className="mt-1 text-sm font-bold">
          {bet.outcome === "HOME"
            ? bet.home_team
            : bet.outcome === "AWAY"
              ? bet.away_team
              : bet.outcome}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span>
            Prob. modelo:{" "}
            <span className="font-mono font-semibold">{Math.round(bet.prob * 100)}%</span>
          </span>
          <span>
            Odd: <span className="font-mono font-semibold text-primary">{bet.odds.toFixed(2)}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="clay h-40 animate-pulse" />
      ))}
    </div>
  );
}
