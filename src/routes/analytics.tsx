import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTodayMatches } from "@/lib/matches.functions";
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
} from "recharts";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — PulseLab" },
      { name: "description", content: "Distribuição de confiança, odds e mercados." },
    ],
  }),
  component: AnalyticsPage,
});

const COLORS = ["#22c55e", "#38bdf8", "#fbbf24", "#f43f5e", "#a78bfa"];

function AnalyticsPage() {
  const fn = useServerFn(getTodayMatches);
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["today"], queryFn: fn }));

  const byLeague = useMemo(() => {
    const g = new Map<string, number>();
    for (const m of data.matches) g.set(m.leagueLabel, (g.get(m.leagueLabel) ?? 0) + 1);
    return Array.from(g, ([name, value]) => ({ name, value }));
  }, [data.matches]);

  const byMarket = useMemo(() => {
    const g = new Map<string, number>();
    for (const m of data.matches) g.set(m.suggestedLabel.split(" ")[0], (g.get(m.suggestedLabel.split(" ")[0]) ?? 0) + 1);
    return Array.from(g, ([name, count]) => ({ name, count }));
  }, [data.matches]);

  const oddsBuckets = useMemo(() => {
    const buckets = [
      { name: "1.0–1.5", count: 0 },
      { name: "1.5–2.0", count: 0 },
      { name: "2.0–3.0", count: 0 },
      { name: "3.0–5.0", count: 0 },
      { name: "5.0+", count: 0 },
    ];
    for (const m of data.matches) {
      const o = m.suggestedOdds;
      const i = o < 1.5 ? 0 : o < 2 ? 1 : o < 3 ? 2 : o < 5 ? 3 : 4;
      buckets[i].count++;
    }
    return buckets;
  }, [data.matches]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">Distribuições calculadas a partir dos jogos de hoje.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-elevated p-5">
          <h2 className="font-display text-sm font-semibold text-foreground">Jogos por liga</h2>
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

        <div className="card-elevated p-5">
          <h2 className="font-display text-sm font-semibold text-foreground">Distribuição de odds sugeridas</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer>
              <BarChart data={oddsBuckets}>
                <XAxis dataKey="name" stroke="oklch(0.62 0.02 260)" fontSize={12} />
                <YAxis stroke="oklch(0.62 0.02 260)" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "oklch(0.22 0.02 260 / 0.5)" }} />
                <Bar dataKey="count" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elevated p-5 lg:col-span-2">
          <h2 className="font-display text-sm font-semibold text-foreground">Mercados sugeridos</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer>
              <BarChart data={byMarket}>
                <XAxis dataKey="name" stroke="oklch(0.62 0.02 260)" fontSize={12} />
                <YAxis stroke="oklch(0.62 0.02 260)" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "oklch(0.22 0.02 260 / 0.5)" }} />
                <Bar dataKey="count" fill="#38bdf8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
