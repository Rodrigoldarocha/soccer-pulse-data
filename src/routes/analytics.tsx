import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTodayMatches } from "@/lib/matches.functions";
import { getAccuracyMetrics } from "@/lib/ml/accuracy.functions";
import { getPerformance } from "@/lib/analytics/ledger";
import { useMemo } from "react";
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
  LineChart,
  Line,
} from "recharts";

function PendingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-32 rounded bg-white/[0.06]" />
        <div className="mt-1 h-4 w-56 rounded bg-white/[0.04]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-5">
            <div className="h-4 w-32 rounded bg-white/[0.06]" />
            <div className="mt-3 h-64 rounded bg-white/[0.03]" />
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

const COLORS = ["#F2542D", "#3F8F6B", "#5A8FD4", "#D4A843", "#9B6BB0"];

const CONF_LABEL: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };

const MIN_SAMPLE = 30;

function wilsonLower(p: number, n: number): number {
  if (n <= 0) return 0;
  const z = 1.96;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return Math.max(0, (c - m) / d);
}

function AnalyticsPage() {
  const todayFn = useServerFn(getTodayMatches);
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["today"], queryFn: todayFn }));
  const metricsFn = useServerFn(getAccuracyMetrics);
  const { data: acc } = useQuery(queryOptions({ queryKey: ["accuracy"], queryFn: metricsFn }));
  const perfFn = useServerFn(getPerformance);
  const { data: perf } = useQuery(queryOptions({ queryKey: ["performance"], queryFn: perfFn }));

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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Métricas técnicas + ROI/CLV do ledger de palpites — honestidade acima de tudo.
          </p>
        </div>
        <Link to="/picks" className="text-sm text-primary hover:underline">
          Ver palpites de hoje
        </Link>
      </header>

      {/* ROI / Ledger honesto */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Desempenho do ledger (ROI, CLV)</h2>
        {!perf || perf.summary.resolved === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground/40">
            Sem palpites resolvidos ainda. O ledger preenche após o cron resolver os jogos.
          </p>
        ) : (
          <>
            {perf.summary.insufficientSample && (
              <p className="mt-2 rounded border border-chart-4/25 bg-chart-4/5 px-3 py-2 text-xs text-chart-4">
                Amostra insuficiente ({perf.summary.resolved}&lt;{perf.minSample}) — ROI ainda não é
                confiável.
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Acerto", value: `${(perf.summary.hitRate * 100).toFixed(1)}%` },
                {
                  label: "ROI flat",
                  value: `${perf.summary.roiFlat > 0 ? "+" : ""}${(perf.summary.roiFlat * 100).toFixed(1)}%`,
                },
                { label: "Lucro", value: `${perf.summary.profitUnits.toFixed(1)}u` },
                {
                  label: "CLV médio",
                  value:
                    perf.summary.clvAvg != null
                      ? `${perf.summary.clvAvg > 0 ? "+" : ""}${(perf.summary.clvAvg * 100).toFixed(1)}%`
                      : "—",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded border border-border/50 bg-white/[0.02] px-3 py-2 text-center"
                >
                  <div className="font-display text-lg font-bold tabular-nums text-foreground">
                    {s.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground/50">{s.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground/50">
              Wilson lower {(perf.summary.wilsonLower * 100).toFixed(1)}% · drawdown{" "}
              {perf.summary.maxDrawdown.toFixed(1)}u · voids {perf.summary.voids} ·{" "}
              {perf.summary.wins}V / {perf.summary.losses}D
              {perf.summary.clvCiLow != null &&
                ` · CLV IC95 [${(perf.summary.clvCiLow * 100).toFixed(1)}%, ${(perf.summary.clvCiHigh! * 100).toFixed(1)}%]`}
            </p>
            {perf.curve.length > 1 && (
              <div className="mt-4 h-40">
                <ResponsiveContainer>
                  <LineChart data={perf.curve}>
                    <XAxis
                      dataKey="i"
                      stroke="#8A99A8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#8A99A8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#F2542D"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs tabular-nums">
                <thead>
                  <tr className="text-[11px] text-muted-foreground/50">
                    <th className="pb-2 pr-3 font-medium">Baseline</th>
                    <th className="pb-2 pr-3 font-medium">N</th>
                    <th className="pb-2 pr-3 font-medium">Acerto</th>
                    <th className="pb-2 font-medium">ROI flat</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.baselines.map((b) => (
                    <tr key={b.name} className="border-t border-border/30 text-muted-foreground/80">
                      <td className="py-2 pr-3 text-foreground">{b.name}</td>
                      <td className="py-2 pr-3">{b.resolved}</td>
                      <td className="py-2 pr-3">{(b.hitRate * 100).toFixed(1)}%</td>
                      <td className="py-2">{(b.roiFlat * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Jogos de hoje por liga</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byLeague}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  label
                >
                  {byLeague.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Confiança do modelo hoje</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer>
              <BarChart data={byConfidence} barSize={40}>
                <XAxis
                  dataKey="name"
                  stroke="#8A99A8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#8A99A8"
                  fontSize={12}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(30, 42, 52, 0.3)" }}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" fill="#F2542D" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Desempenho histórico por liga e mercado
        </h2>
        <p className="mt-1 text-xs text-muted-foreground/50">
          Brier Score, Log Loss, Calibration Error, acurácia e amostras — recalculados após os
          resultados. Grupos com menos de {MIN_SAMPLE} amostras: amostra insuficiente.
        </p>
        {metrics.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground/40">
            Sem amostras suficientes por enquanto. As métricas aparecem aqui após a resolução das
            predições.
          </p>
        ) : (
          <>
            {summary && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Resolvidas", value: String(summary.total), icon: "📊" },
                  {
                    label: "Taxa de acerto",
                    value: `${(summary.accuracy * 100).toFixed(1)}%`,
                    icon: "🎯",
                  },
                  { label: "Brier médio", value: summary.brier.toFixed(3), icon: "📈" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border border-border/50 bg-white/[0.02] px-4 py-3 text-center transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="font-display text-xl font-bold tabular-nums text-foreground">
                      {s.value}
                    </div>
                    <div className="mt-0.5 text-[11px] font-medium text-muted-foreground/50">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs tabular-nums">
                <thead>
                  <tr className="text-[11px] text-muted-foreground/50">
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
                  {metrics.map((m) => {
                    const half = (m.accuracy - wilsonLower(m.accuracy, m.totalPredictions)) * 100;
                    const thin = m.totalPredictions < MIN_SAMPLE;
                    return (
                      <tr
                        key={`${m.leagueId}:${m.market}`}
                        className="border-t border-border/30 text-muted-foreground/80"
                      >
                        <td className="py-2 pr-3 text-foreground">
                          {m.leagueName || m.leagueId}
                          {thin && (
                            <span className="ml-2 rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground/60">
                              insuficiente
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3">{m.market}</td>
                        <td className="py-2 pr-3">{m.totalPredictions}</td>
                        <td className="py-2 pr-3">
                          {(m.accuracy * 100).toFixed(1)}% ±{half.toFixed(1)}
                        </td>
                        <td className="py-2 pr-3">{m.brierScore.toFixed(3)}</td>
                        <td className="py-2 pr-3">{m.logLoss.toFixed(3)}</td>
                        <td className="py-2">{m.calibrationError.toFixed(3)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
