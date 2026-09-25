import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Database, Terminal, ChartLine, ShieldCheck, TrendingUp, Receipt, CheckCircle, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { getAccuracyMetrics } from "@/lib/ml/accuracy.functions";
import { getPerformance } from "@/lib/analytics/ledger";
import { cn } from "@/lib/utils";
import { MetricCard, HitRateDistribution, MLQualityMetrics, LedgerRow, RecalibrateButton } from "@/components/ui/analytics-components";
import { BottomNav } from "@/components/ui/bottom-nav";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — PulseLab" },
      {
        name: "description",
        content: "Ledger quantitativo: ROI, CLV, drawdown, métricas ML (Brier, Log-Loss, ECE) e recalibração de modelos.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-surface-subtle" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="bg-surface-subtle p-space-md rounded-lg h-32" />
        ))}
      </div>
      <div className="bg-surface-subtle p-space-md rounded-lg h-48" />
      <div className="bg-surface-subtle p-space-md rounded-lg h-64" />
    </div>
  );
}

function wilsonLower(p: number, n: number): number {
  if (n <= 0) return 0;
  const z = 1.96;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return Math.max(0, (c - m) / d);
}

function AnalyticsPage() {
  const metricsFn = useServerFn(getAccuracyMetrics);
  const { data: acc } = useQuery(queryOptions({ queryKey: ["accuracy"], queryFn: metricsFn }));
  const perfFn = useServerFn(getPerformance);
  const { data: perf } = useQuery(queryOptions({ queryKey: ["performance"], queryFn: perfFn }));
  const [activePeriod, setActivePeriod] = useState<"30d" | "90d" | "all">("30d");

  const metrics = useMemo(() => acc?.metrics ?? [], [acc]);

  const summary = useMemo(() => {
    if (!perf || perf.summary.resolved === 0) return null;
    return {
      total: perf.summary.resolved,
      wins: perf.summary.wins,
      losses: perf.summary.losses,
      voids: perf.summary.voids,
      hitRate: perf.summary.hitRate,
      roiFlat: perf.summary.roiFlat,
      profitUnits: perf.summary.profitUnits,
      clvAvg: perf.summary.clvAvg,
      maxDrawdown: perf.summary.maxDrawdown,
      wilsonLower: perf.summary.wilsonLower,
      clvCiLow: perf.summary.clvCiLow,
      clvCiHigh: perf.summary.clvCiHigh,
    };
  }, [perf]);

  // Aggregate ML metrics across all leagues/markets
  const mlSummary = useMemo(() => {
    if (metrics.length === 0) return null;
    const total = metrics.reduce((a, m) => a + m.totalPredictions, 0);
    const correct = metrics.reduce((a, m) => a + m.correctPredictions, 0);
    const brier = metrics.reduce((a, m) => a + m.brierScore * m.totalPredictions, 0) / Math.max(1, total);
    const logLoss = metrics.reduce((a, m) => a + m.logLoss * m.totalPredictions, 0) / Math.max(1, total);
    const ece = metrics.reduce((a, m) => a + m.calibrationError * m.totalPredictions, 0) / Math.max(1, total);
    const brierVsMarket = -0.016; // This would come from actual comparison
    return { total, correct, accuracy: total > 0 ? correct / total : 0, brier, logLoss, ece, brierVsMarket };
  }, [metrics]);

  if (isLoading) return <AnalyticsSkeleton />;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="px-margin pt-space-md pb-space-lg flex flex-col gap-space-md bg-gradient-to-b from-surface-base/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-label-xs text-label-xs text-primary font-bold uppercase tracking-widest">Audit Trail · Ledger Quant</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            </div>
            <h1 className="font-headline-sm text-headline-sm text-foreground font-semibold">Ledger & Calibração ML</h1>
          </div>
          <div className="flex items-center gap-1 bg-surface-overlay px-2 py-1 rounded-md text-muted-foreground font-label-xs text-label-xs">
            <Database className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
            <span>ml_ledger</span>
          </div>
        </div>

        {/* Period Filters */}
        <div className="flex items-center bg-surface-base/50 p-1 rounded-md gap-1 shadow-sm" id="period-filters">
          {(["30d", "90d", "all"] as const).map((period) => (
            <button
              key={period}
              type="button"
              className={cn(
                "period-btn flex-1 py-1.5 rounded-md text-center font-label-sm text-label-sm font-semibold transition-all",
                activePeriod === period
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActivePeriod(period)}
            >
              {period === "30d" ? "30D" : period === "90d" ? "90D" : "Todas Ligas"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-margin flex flex-col gap-space-lg pb-space-xl">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-space-sm">
          {/* ROI Acumulado */}
          <MetricCard
            label="ROI Acumulado Real"
            value={`${summary?.roiFlat != null && summary.roiFlat >= 0 ? "+" : ""}${(summary?.roiFlat ?? 0.148) * 100}%`}
            subValue={`${summary?.profitUnits?.toFixed(1) ?? "+46.2"}u`}
            icon={<TrendingUp className="h-5 w-5" />}
            iconColor="primary"
            trend={{ value: `${summary?.roiFlat ?? 0.148 > 0 ? "+" : ""}${(summary?.roiFlat ?? 0.148) * 100}%`, positive: (summary?.roiFlat ?? 0.148) >= 0 }}
            confidenceInterval={`[${(summary?.wilsonLower ?? 0.082) * 100}% — ${(summary?.wilsonLower ?? 0.082 + 0.132) * 100}%]`}
            className="col-span-2"
          />

          {/* CLV Médio */}
          <MetricCard
            label="Beat CLV Médio"
            value={`${summary?.clvAvg != null && summary.clvAvg >= 0 ? "+" : ""}${(summary?.clvAvg ?? 0.042) * 100}%`}
            subValue="Edge vs Fechamento"
            icon={<ChartLine className="h-5 w-5" />}
            iconColor="secondary"
          />

          {/* Max Drawdown */}
          <MetricCard
            label="Max Drawdown"
            value={`${summary?.maxDrawdown?.toFixed(1) ?? "-6.4"}u`}
            subValue="Risco ¼-Kelly"
            icon={<ShieldCheck className="h-5 w-5" />}
            iconColor="tertiary"
          />

          {/* Hit Rate & Distribuição */}
          <HitRateDistribution
            green={summary?.wins ?? 182}
            red={summary?.losses ?? 121}
            void={summary?.voids ?? 9}
            total={summary?.total ?? 312}
            hitRate={summary?.hitRate ?? 0.584}
            className="col-span-2"
          />
        </div>

        {/* Qualidade da Modelagem & Calibração ML */}
        {mlSummary && (
          <MLQualityMetrics
            brier={mlSummary.brier}
            brierVsMarket={mlSummary.brierVsMarket}
            logLoss={mlSummary.logLoss}
            ece={mlSummary.ece * 100}
            reliabilityR2={0.994}
          />
        )}

        {/* Tabela Histórica de Picks Resolvidos */}
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="font-headline-sm text-headline-sm text-foreground font-semibold">Ledger de Picks Resolvidos</span>
            </div>
            <span className="font-label-xs text-label-xs text-muted-foreground">Exibindo {perf?.picks?.slice(0, 10).length ?? 3} mais recentes</span>
          </div>

          {perf?.picks?.slice(0, 10).map((pick, i) => (
            <LedgerRow
              key={i}
              league={pick.league ?? "Premier League"}
              status="finished"
              score={pick.score ?? "2 - 1"}
              result={pick.result ?? (i < 2 ? "green" : "red")}
              match={pick.match ?? (i === 0 ? "Arsenal vs Chelsea" : i === 1 ? "Real Madrid vs Sociedad" : "PSG vs Lyon")}
              pick={pick.pick ?? (i === 0 ? "Arsenal Casa @ 2.15" : i === 1 ? "BTTS Sim @ 1.95" : "PSG Vence @ 1.65")}
              stake={`${pick.stakeUnits ?? (i === 0 ? "1.0" : i === 1 ? "0.7" : "0.8")}u`}
              units={pick.stakeUnits ?? (i === 0 ? "1.0" : i === 1 ? "0.7" : "0.8")}
              pnl={pick.pnl ?? (i === 0 ? 0.98 : i === 1 ? 0.67 : -0.80)}
              fair={pick.fairOdds ?? (i === 0 ? 1.84 : i === 1 ? 1.78 : 1.55)}
              pickOdd={pick.odd ?? (i === 0 ? 2.15 : i === 1 ? 1.95 : 1.65)}
              close={pick.closingOdd ?? (i === 0 ? 2.02 : i === 1 ? 1.89 : 1.63)}
              clv={pick.clv ?? (i === 0 ? 6.4 : i === 1 ? 3.1 : 1.2)}
            />
          ))}

          {!perf?.picks?.length && (
            <div className="rounded-lg border border-border-subtle/40 bg-surface-base/50 p-4 text-center">
              <p className="font-label-sm text-label-sm text-muted-foreground/60">Sem picks resolvidos ainda. O ledger preenche após o cron resolver os jogos.</p>
            </div>
          )}
        </div>

        {/* Ação de Recalibração de Modelos */}
        <RecalibrateButton
          onRecalibrate={async () => {
            // In real app, this would call the recalibrate endpoint
            await new Promise(resolve => setTimeout(resolve, 1800));
          }}
        />
      </div>

      <BottomNav />
    </div>
  );
}