import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTodayMatches } from "@/lib/matches.functions";
import { getAccuracyMetrics } from "@/lib/ml/accuracy.functions";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

function PendingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-32 rounded-lg bg-white/[0.06]" />
        <div className="mt-1 h-4 w-56 rounded-lg bg-white/[0.04]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card p-5">
            <div className="h-4 w-32 rounded bg-white/[0.06]" />
            <div className="mt-3 h-64 rounded-lg bg-white/[0.03]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — PulseLab" },
      {
        name: "description",
        content:
          "Métricas técnicas do modelo: Brier Score, Log Loss, Calibration Error e acurácia.",
      },
    ],
  }),
  pendingComponent: PendingSkeleton,
  component: AnalyticsPage,
});

const COLORS = ["#22c55e", "#38bdf8", "#fbbf24", "#f43f5e", "#a78bfa"];

const CONF_LABEL: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

function AnalyticsPage() {
  const todayFn = useServerFn(getTodayMatches);
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["today"], queryFn: todayFn }));
  const metricsFn = useServerFn(getAccuracyMetrics);
  const { data: acc } = useQuery(queryOptions({ queryKey: ["accuracy"], queryFn: metricsFn }));

  const byLeague = useMemo(() => {
    const g = new Map<string, number>();
    for (const m of data.matches) g.set(m.leagueLabel, (g.get(m.leagueLabel) ?? 0) + 1);
    return Array.from(g, ([name, value]) => ({ name, value }));
  }, [data.matches]);

  const byConfidence = useMemo(() => {
    const g = new Map<string, number>();
    for (const m of data.matches) g.set(m.confidence, (g.get(m.confidence) ?? 0) + 1);
    return Array.from(g, ([key, value]) => ({ name: CONF_LABEL[key] ?? key, value }));
  }, [data.matches]);

  const metrics = useMemo(() => acc?.metrics ?? [], [acc]);

  const summary = useMemo(() => {
    if (metrics.length === 0) return null;
    const total = metrics.reduce((a, m) => a + m.totalPredictions, 0);
    const correct = metrics.reduce((a, m) => a + m.correctPredictions, 0);
    const brier =
      metrics.reduce((a, m) => a + m.brierScore * m.totalPredictions, 0) / Math.max(1, total);
    return { total, correct, accuracy: total > 0 ? correct / total : 0, brier };
  }, [metrics]);

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground/60">
          Métricas técnicas do modelo — sem lucro, ROI ou apostas.
        </p>
      </motion.header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Jogos de hoje por liga</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byLeague} dataKey="value" nameKey="name" outerRadius={90} label>
                  {byLeague.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Confiança do modelo hoje</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer>
              <BarChart data={byConfidence}>
                <XAxis dataKey="name" stroke="oklch(0.6 0.02 260)" fontSize={12} />
                <YAxis stroke="oklch(0.6 0.02 260)" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "oklch(0.22 0.02 260 / 0.3)" }} />
                <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Desempenho histórico por liga e mercado
        </h2>
        <p className="mt-1 text-xs text-muted-foreground/50">
          Brier Score, Log Loss, Calibration Error, acurácia e amostras — recalculados após os
          resultados.
        </p>
        {metrics.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground/40">
            Sem amostras suficientes por enquanto. As métricas aparecem aqui após a resolução das
            predições.
          </p>
        ) : (
          <>
            {summary && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: "Resolvidas", value: String(summary.total) },
                  { label: "Taxa de acerto", value: `${(summary.accuracy * 100).toFixed(1)}%` },
                  { label: "Brier médio", value: summary.brier.toFixed(3) },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-border/40 bg-white/[0.02] px-3 py-2 text-center"
                  >
                    <div className="font-display text-lg font-bold tabular-nums text-foreground">
                      {s.value}
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs tabular-nums">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground/50">
                    <th className="pb-2 pr-3 font-medium">Liga</th>
                    <th className="pb-2 pr-3 font-medium">Mercado</th>
                    <th className="pb-2 pr-3 font-medium">Amostras</th>
                    <th className="pb-2 pr-3 font-medium">Acurácia</th>
                    <th className="pb-2 pr-3 font-medium">Brier</th>
                    <th className="pb-2 pr-3 font-medium">Log Loss</th>
                    <th className="pb-2 font-medium">Cal. Error</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr
                      key={`${m.leagueId}:${m.market}`}
                      className="border-t border-border/30 text-muted-foreground/80"
                    >
                      <td className="py-2 pr-3 text-foreground">{m.leagueName || m.leagueId}</td>
                      <td className="py-2 pr-3">{m.market}</td>
                      <td className="py-2 pr-3">{m.totalPredictions}</td>
                      <td className="py-2 pr-3">{(m.accuracy * 100).toFixed(1)}%</td>
                      <td className="py-2 pr-3">{m.brierScore.toFixed(3)}</td>
                      <td className="py-2 pr-3">{m.logLoss.toFixed(3)}</td>
                      <td className="py-2">{m.calibrationError.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
