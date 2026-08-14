import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";

import {
  ValueBetsBoard,
  buildValueBetsQuery,
  type MarketFilter,
} from "@/components/ValueBetsBoard";
import { getValueBetsBacktest, type RoiStats, type ValueBetRow } from "@/lib/value-bets.functions";
import { getPushConfig, registerPushSubscription, type PushConfig } from "@/lib/push.functions";

function roiQuery() {
  return queryOptions({
    queryKey: ["value-bets", "roi"],
    queryFn: () => getValueBetsBacktest(),
    staleTime: 5 * 60_000,
  });
}

function PushToggle() {
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["push", "config"],
      queryFn: () => getPushConfig(),
      staleTime: 10 * 60_000,
    }),
  );
  const config: PushConfig = data;
  const [state, setState] = useState<"idle" | "working" | "done" | "unsupported">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!config.enabled) return null;

  const activate = async () => {
    setError(null);
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      setState("unsupported");
      return;
    }
    try {
      setState("working");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("idle");
        setError("Permissão negada no navegador.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: config.publicKey as string,
      });
      await registerPushSubscription({
        data: {
          endpoint: subscription.endpoint,
          p256dh: btoa(
            String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh") as ArrayBuffer)),
          ),
          auth: btoa(
            String.fromCharCode(...new Uint8Array(subscription.getKey("auth") as ArrayBuffer)),
          ),
        },
      });
      setState("done");
    } catch (err) {
      setState("idle");
      setError((err as Error).message ?? "Falha ao ativar notificações.");
    }
  };

  return (
    <div className="flex items-center gap-2 text-[10px]">
      {state === "done" ? (
        <span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">
          🔔 Notificações ativas
        </span>
      ) : (
        <button
          type="button"
          onClick={activate}
          disabled={state === "working"}
          className="clay-sm px-3 py-1.5 font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        >
          {state === "working" ? "Ativando…" : "🔔 Ativar notificações"}
        </button>
      )}
      {error && <span className="text-destructive">{error}</span>}
    </div>
  );
}

function RoiSection() {
  const { data } = useSuspenseQuery(roiQuery());
  const s: RoiStats = data.stats;
  const rate = s.hit_rate != null ? (s.hit_rate * 100).toFixed(1) : "—";
  const roi = s.roi != null ? `${s.roi >= 0 ? "+" : ""}${(s.roi * 100).toFixed(1)}%` : "—";
  const profit = s.profit.toFixed(2);
  const profitColor = s.profit >= 0 ? "text-primary" : "text-destructive";

  const cards = [
    { label: "Bets registradas", value: String(s.total) },
    { label: "Liquidados", value: String(s.settled) },
    { label: "Acertos", value: String(s.won) },
    { label: "Hit rate", value: `${rate}%` },
    { label: "ROI", value: roi },
    { label: "Lucro (unid.)", value: profit, valueClass: profitColor },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold">📊 Backtest de value bets</h2>
        <PushToggle />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="clay p-4 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {c.label}
            </div>
            <div
              className={`mt-1 text-2xl font-black tabular-nums ${
                c.valueClass === "text-primary" || c.valueClass === "text-destructive"
                  ? c.valueClass
                  : ""
              }`}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>
      {data.recent.length > 0 && (
        <div className="mt-3 clay overflow-x-auto">
          <div className="border-b border-border px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            Últimos liquidados
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Partida</th>
                <th className="px-4 py-2">Mercado</th>
                <th className="px-4 py-2">Odd</th>
                <th className="px-4 py-2">EV</th>
                <th className="px-4 py-2">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((r: ValueBetRow) => (
                <tr key={r.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2 font-medium">
                    {r.home_team} × {r.away_team}
                  </td>
                  <td className="px-4 py-2">
                    {r.market} · {r.outcome}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{r.odds.toFixed(2)}</td>
                  <td className="px-4 py-2 tabular-nums">{(r.ev * 100).toFixed(1)}%</td>
                  <td
                    className={`px-4 py-2 font-black ${
                      r.status === "won" ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {r.status === "won" ? "✓" : "✗"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/valor")({
  head: () => ({
    meta: [
      { title: "Apostas de Valor · Zagueiro" },
      {
        name: "description",
        content:
          "Apostas com valor esperado positivo: probabilidades do modelo CatBoost contra as melhores odds das casas.",
      },
      { property: "og:title", content: "Apostas de Valor · Zagueiro" },
      {
        property: "og:description",
        content: "Onde o modelo encontra probabilidade maior que a implícita nas odds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { market?: MarketFilter } => ({
    market:
      typeof search.market === "string" &&
      ["all", "1x2", "over_under_25", "btts"].includes(search.market)
        ? (search.market as MarketFilter)
        : undefined,
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(buildValueBetsQuery());
    context.queryClient.ensureQueryData(roiQuery());
  },
  component: ValueBetsPage,
});

function ValueBetsPage() {
  const router = useRouter();
  const { market } = Route.useSearch();

  return (
    <>
      <Suspense fallback={<div className="clay mx-auto mt-8 h-24 max-w-6xl animate-pulse px-4" />}>
        <RoiSection />
      </Suspense>
      <ValueBetsBoard
        market={market ?? "all"}
        onMarketChange={(m) => router.navigate({ to: "/valor", search: { market: m } })}
      />
    </>
  );
}
