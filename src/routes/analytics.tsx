import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTodayMatches } from "@/lib/matches.functions";
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

  const cards = [
    { title: "Jogos por liga", content: (
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
    )},
    { title: "Distribuição de odds sugeridas", content: (
      <ResponsiveContainer>
        <BarChart data={oddsBuckets}>
          <XAxis dataKey="name" stroke="oklch(0.6 0.02 260)" fontSize={12} />
          <YAxis stroke="oklch(0.6 0.02 260)" fontSize={12} allowDecimals={false} />
          <Tooltip cursor={{ fill: "oklch(0.22 0.02 260 / 0.3)" }} />
          <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )},
    { title: "Mercados sugeridos", span: true, content: (
      <ResponsiveContainer>
        <BarChart data={byMarket}>
          <XAxis dataKey="name" stroke="oklch(0.6 0.02 260)" fontSize={12} />
          <YAxis stroke="oklch(0.6 0.02 260)" fontSize={12} allowDecimals={false} />
          <Tooltip cursor={{ fill: "oklch(0.22 0.02 260 / 0.3)" }} />
          <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )},
  ];

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground/60">Distribuições calculadas a partir dos jogos de hoje.</p>
      </motion.header>

      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className={`card-premium p-5 ${card.span ? "lg:col-span-2" : ""}`}
          >
            <h2 className="font-display text-sm font-semibold text-foreground">{card.title}</h2>
            <div className="mt-3 h-64">{card.content}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
