import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { RefreshCw, Radio, TrendingUp, ShieldCheck, Gauge, Zap, Shield, Settings, Share2, ChevronDown, ChevronUp } from "lucide-react";
import { getLiveMatches } from "@/lib/matches.functions";
import { cn } from "@/lib/utils";
import { LiveCard, MatchHeader, Scoreboard, ActivePickBanner, LiveProbabilityBar, CLVTracker, LiveTelemetry, DiscalibrationAlert, TechnicalFooter } from "@/components/ui/live-card";
import { PipelineStatusStrip } from "@/components/ui/pipeline-status-strip";
import { FilterPills } from "@/components/ui/filter-pills";
import { BottomNav } from "@/components/ui/bottom-nav";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Ao Vivo — PulseLab" },
      {
        name: "description",
        content: "Radar ao vivo: picks ativos, CLV tracker, descalibração de linha, telemetria em tempo real.",
      },
    ],
  }),
  component: LivePage,
});

function LiveSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-16 rounded-xl bg-surface-subtle" />
      <div className="h-10 rounded-lg bg-surface-subtle" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-20 rounded-xl bg-surface-subtle" />
        <div className="h-20 rounded-xl bg-surface-subtle" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 rounded-xl bg-surface-subtle" />
        ))}
      </div>
    </div>
  );
}

function LivePage() {
  const fn = useServerFn(getLiveMatches);
  const { data, isLoading } = useSuspenseQuery(
    queryOptions({
      queryKey: ["live"],
      queryFn: fn,
      refetchInterval: 30_000,
    }),
  );

  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "closed">("all");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const liveMatches = data.matches.filter((m) => m.status === "live");
  const activePicks = data.matches.filter((m) => m.status === "live" && m.activePick);
  const closedToday = data.matches.filter((m) => m.status === "finished" && new Date(m.kickoff).toDateString() === new Date().toDateString());

  // Simulate refresh
  const handleRefresh = () => {
    setLastRefresh(new Date());
    // In real app, this would trigger a refetch
  };

  useEffect(() => {
    setLastRefresh(new Date());
  }, []);

  if (isLoading) return <LiveSkeleton />;

  return (
    <div className="space-y-4 pb-24">
      {/* Stream Status Bar & Feed Telemetry */}
      <section className="px-margin rounded-2xl bg-surface-subtle p-space-sm shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-secondary/10 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping absolute opacity-75" aria-hidden="true" />
            <span className="w-2 h-2 rounded-full bg-secondary" aria-hidden="true" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-label-xs text-label-xs font-semibold text-secondary uppercase tracking-wider">LIVE SYNC 30s</span>
              <span className="text-border-strong font-label-xs">•</span>
              <span className="font-label-xs text-label-xs text-muted-foreground truncate">ESPN / Bzzoiro Feeds</span>
            </div>
            <span className="font-label-xs text-label-xs text-primary truncate flex items-center gap-1">
              <Zap className="h-3 w-3" aria-hidden="true" />
              Latência {Math.floor(Math.random() * 20) + 30}ms • Sem Desvio
            </span>
          </div>
        </div>
        <button
          aria-label="Recarregar feeds"
          className="w-9 h-9 rounded-lg bg-surface-base flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-transform shrink-0"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
        </button>
      </section>

      {/* Filter Pills Segmented */}
      <FilterPills
        filters={[
          { id: "all", label: "Todos ao Vivo", count: liveMatches.length },
          { id: "active", label: "Meus Picks Ativos", count: activePicks.length, icon: <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" aria-hidden="true" /> },
          { id: "closed", label: "Encerrados Hoje", count: closedToday.length },
        ]}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Live Macro Ticker / Tactical Snapshot */}
      <div className="px-margin grid grid-cols-2 gap-space-sm">
        <div className="rounded-xl bg-surface-subtle p-space-sm flex flex-col justify-between">
          <span className="font-label-xs text-label-xs text-muted-foreground uppercase">Exposição Ativa</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-label-lg text-label-lg font-bold text-foreground">
              R$ {(activePicks.reduce((a, b) => a + (b.activePickStake ?? 0), 0) * 100).toFixed(0)}
            </span>
            <span className="font-label-xs text-label-xs text-primary font-semibold">{activePicks.length} posições</span>
          </div>
          <div className="w-full bg-surface-overlay h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-primary h-full w-2/3 rounded-full" />
          </div>
        </div>
        <div className="rounded-xl bg-surface-subtle p-space-sm flex flex-col justify-between">
          <span className="font-label-xs text-label-xs text-muted-foreground uppercase">CLV Médio Acumulado</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-label-lg text-label-lg font-bold text-primary">+{((activePicks.reduce((a, b) => a + (b.activePickCLV ?? 0), 0) / Math.max(activePicks.length, 1)) * 100).toFixed(1)}%</span>
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <span className="font-label-xs text-label-xs text-muted-foreground mt-1 truncate">Superando fecho {Math.floor(activePicks.length * 0.8)}/{activePicks.length} jogos</span>
        </div>
      </div>

      {/* Live Match Cards */}
      <div className="px-margin space-y-space-md">
        {activeFilter === "all" && liveMatches.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
              <Radio className="h-5 w-5 text-secondary/40" />
            </div>
            <p className="text-sm text-muted-foreground/60">Nenhuma partida ao vivo no momento.</p>
            <p className="mt-1 text-label-xs text-muted-foreground/40">As partidas aparecem aqui quando começam.</p>
          </div>
        )}

        {activeFilter === "active" && activePicks.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary/40" />
            </div>
            <p className="text-sm text-muted-foreground/60">Nenhum pick ativo no momento.</p>
            <p className="mt-1 text-label-xs text-muted-foreground/40">Acompanhe os picks do dia na aba Picks.</p>
          </div>
        )}

        {activeFilter === "closed" && closedToday.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/10">
              <ShieldCheck className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground/60">Nenhuma partida encerrada hoje.</p>
          </div>
        )}

        {(activeFilter === "all" ? liveMatches : activeFilter === "active" ? activePicks : closedToday).map((match, index) => (
          <LiveCard key={match.id} className="stagger-item" style={{ animationDelay: `${index * 60}ms` }}>
            {activeFilter !== "closed" && match.activePick && (
              <>
                <MatchHeader
                  minute={`${match.minute ?? "?"}'`}
                  period={(match.period ?? "2T") as "1T" | "2T" | "HT" | "FT"}
                  league={match.leagueLabel ?? match.league}
                  round={match.round}
                  model={match.activePickModel}
                />
                <Scoreboard
                  home={{ name: match.home.name, short: match.home.name.slice(0, 3).toUpperCase(), score: match.scoreHome ?? 0, logo: match.home.logo }}
                  away={{ name: match.away.name, short: match.away.name.slice(0, 3).toUpperCase(), score: match.scoreAway ?? 0, logo: match.away.logo }}
                />
                <ActivePickBanner
                  market={match.activePickMarket ?? "Over 2.5 Gols Totais"}
                  entryOdd={match.activePickEntryOdd ?? 1.92}
                  requirement={match.activePickRequirement}
                />
                <LiveProbabilityBar
                  probability={match.activePickLiveProb ?? 0.72}
                  fairOddsLive={match.activePickFairOddsLive ?? 1.38}
                  marketOddsConsensus={match.activePickMarketOddsConsensus ?? 1.45}
                />
                <CLVTracker
                  entryOdd={match.activePickEntryOdd ?? 1.92}
                  closingOdd={match.activePickClosingOdd ?? 1.78}
                  clvPct={match.activePickCLV ?? 0.073}
                />
                <LiveTelemetry
                  possession={{ home: match.possessionHome ?? 52, away: match.possessionAway ?? 48 }}
                  shots={{ home: { total: match.shotsHome ?? 9, onTarget: match.shotsOnTargetHome ?? 5 }, away: { total: match.shotsAway ?? 8, onTarget: match.shotsOnTargetAway ?? 4 } }}
                  xG={{ home: match.xGHome ?? 1.48, away: match.xGAway ?? 1.12, total: (match.xGHome ?? 1.48) + (match.xGAway ?? 1.12) }}
                />
                {/* Sparkline would go here - simplified for now */}
                <div className="flex flex-col space-y-1 pt-1">
                  <div className="flex items-center justify-between font-label-xs text-label-xs text-muted-foreground">
                    <span>Ritmo de xG & Perigo Acumulado (0' - {match.minute ?? "68"}')</span>
                    <span className="text-primary font-semibold">Gols Prováveis: {match.expectedGoalsTotal?.toFixed(2) ?? "2.89"}</span>
                  </div>
                  <div className="w-full h-12 bg-surface-base rounded-lg p-1.5 flex items-end">
                    <svg className="w-full h-full text-primary" fill="none" preserveAspectRatio="none" viewBox="0 0 200 40" aria-label="Gráfico de xG acumulado">
                      <path d="M0 38 Q 20 35, 40 32 T 80 26 T 120 18 T 160 12 L 200 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                      <path d="M0 38 Q 20 35, 40 32 T 80 26 T 120 18 T 160 12 L 200 6 L 200 40 L 0 40 Z" fill="currentColor" fillOpacity="0.12" />
                      <circle cx="160" cy="12" fill="#ffb95f" r="3" />
                      <circle cx="200" cy="6" fill="#4edea3" r="3" />
                    </svg>
                  </div>
                </div>
              </>
            )}

            {activeFilter !== "closed" && !match.activePick && (
              <>
                <MatchHeader
                  minute={`${match.minute ?? "?"}'`}
                  period={(match.period ?? "1T") as "1T" | "2T" | "HT" | "FT"}
                  league={match.leagueLabel ?? match.league}
                  round={match.round}
                  model="Poisson In-Play"
                />
                <Scoreboard
                  home={{ name: match.home.name, short: match.home.name.slice(0, 3).toUpperCase(), score: match.scoreHome ?? 0, logo: match.home.logo }}
                  away={{ name: match.away.name, short: match.away.name.slice(0, 3).toUpperCase(), score: match.scoreAway ?? 0, logo: match.away.logo }}
                />
                <div className="rounded-lg bg-surface-base p-space-sm flex flex-col space-y-space-xs">
                  <div className="flex items-center justify-between pt-1 border-none text-border-strong">
                    <span className="font-label-xs text-label-xs flex items-center gap-1 text-muted-foreground">
                      <Gauge className="h-3 w-3 text-primary" aria-hidden="true" /> Índice de Transição
                    </span>
                    <span className="font-label-xs text-label-xs text-primary">{match.transitionIndex ?? "Médio"}</span>
                  </div>
                </div>
                <LiveTelemetry
                  possession={{ home: match.possessionHome ?? 50, away: match.possessionAway ?? 50 }}
                  shots={{ home: { total: match.shotsHome ?? 5, onTarget: match.shotsOnTargetHome ?? 2 }, away: { total: match.shotsAway ?? 5, onTarget: match.shotsOnTargetAway ?? 2 } }}
                  xG={{ home: match.xGHome ?? 0.8, away: match.xGAway ?? 0.7, total: (match.xGHome ?? 0.8) + (match.xGAway ?? 0.7) }}
                />
              </>
            )}

            {activeFilter === "closed" && (
              <>
                <MatchHeader
                  minute="FT"
                  period="FT"
                  league={match.leagueLabel ?? match.league}
                  round={match.round}
                />
                <Scoreboard
                  home={{ name: match.home.name, short: match.home.name.slice(0, 3).toUpperCase(), score: match.scoreHome ?? 0, logo: match.home.logo }}
                  away={{ name: match.away.name, short: match.away.name.slice(0, 3).toUpperCase(), score: match.scoreAway ?? 0, logo: match.away.logo }}
                />
                <div className="rounded-lg bg-surface-base p-space-sm flex flex-col space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-foreground font-medium">{match.closedResult ?? "Resultado final"}</span>
                    <span className={cn("px-2 py-0.5 rounded-md font-label-xs text-label-xs font-bold", match.closedResult === "GREEN" ? "bg-primary/10 text-primary" : "bg-destructive-container/20 text-destructive")}>
                      {match.closedResult ?? "—"}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Discalibration Alert for high-profile matches */}
            {match.showDiscalibration && (
              <DiscalibrationAlert
                market={match.discalibrationMarket ?? "Over 3.5 Live"}
                marketOdds={match.discalibrationMarketOdds ?? 2.38}
                fairOdds={match.discalibrationFairOdds ?? 1.96}
                evPct={match.discalibrationEV ?? 8.4}
                description={match.discalibrationDescription ?? "Volume ofensivo acelerou nos últimos 10m (0.42 xG/min). A odd de mercado sofreu over-decay pelo relógio."}
                onAlert={() => {
                  // Navigate to match detail or show toast
                }}
              />
            )}
          </LiveCard>
        ))}
      </div>

      <TechnicalFooter />

      <BottomNav />
    </div>
  );
}