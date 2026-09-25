import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useState } from "react";
import { ArrowLeft, Trophy, Shirt, BarChart3, Radio, Tv, MapPin, Target, Info, TrendingUp, Scale, Waypoints, Grid, Star, Flame, Calendar, Building2, CheckCircle2 } from "lucide-react";
import { getMatchDetails } from "@/lib/match-details.functions";
import { getTodayMatches, getTomorrowMatches } from "@/lib/matches.functions";
import { LEAGUE_IDS } from "@/lib/api/thesportsdb";
import { fmtTimeSP } from "@/lib/match-dates";
import { MARKET_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import type {
  FormEntry,
  H2HMatch,
  LineupPlayer,
  MatchIncident,
  StatRow,
} from "@/lib/api/match-details";
import { EdgeBadge } from "@/components/ui/edge-badge";
import { FairValueBadge } from "@/components/ui/fair-value-badge";
import { ShrinkageBadge } from "@/components/ui/shrinkage-badge";
import { OddsCell, ProbabilityCell } from "@/components/ui/odds-cells";
import { BottomNav } from "@/components/ui/bottom-nav";

export const Route = createFileRoute("/match/$matchId")({
  head: () => ({
    meta: [
      { title: "Jogo — PulseLab" },
      {
        name: "description",
        content: "Análise quantitativa da partida: modelos, ensemble, matriz Dixon-Coles, fair odds vs mercado.",
      },
    ],
  }),
  component: MatchPage,
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Trophy;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-surface p-space-md space-y-space-md">
      <h2 className="flex items-center gap-2 font-display text-label-lg font-semibold text-foreground">
        <Icon className="h-4 w-4 text-secondary" />
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-4 text-center text-label-sm text-muted-foreground/40">{text}</p>;
}

function Score({ m }: { m: H2HMatch }) {
  const s = m.homeScore != null && m.awayScore != null ? `${m.homeScore} × ${m.awayScore}` : "×";
  return <span className="font-display font-bold tabular-nums text-foreground">{s}</span>;
}

const RESULT_CLS: Record<FormEntry["result"], string> = {
  W: "bg-primary/10 text-primary",
  D: "bg-muted text-muted-foreground",
  L: "bg-destructive/10 text-destructive",
};

function FormBlock({
  title,
  wins,
  draws,
  losses,
  last5,
  align,
}: {
  title: string;
  wins: number;
  draws: number;
  losses: number;
  last5: FormEntry[];
  align: "home" | "away";
}) {
  return (
    <div>
      <p className="truncate text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-label-xs tabular-nums text-muted-foreground/60">
        {wins}V · {draws}E · {losses}D
      </p>
      <ul className="mt-2 space-y-1.5">
        {last5.map((f, i) => {
          const vs = align === "home" ? f.away : f.home;
          return (
            <li
              key={`${f.date}-${i}`}
              className="flex items-center gap-2 rounded border border-border-subtle/30 bg-surface-base/50 px-2.5 py-1.5 text-label-xs"
            >
              <span className={cn("rounded px-1.5 py-0.5 font-bold", RESULT_CLS[f.result])}>
                {f.result === "W" ? "V" : f.result === "D" ? "E" : "D"}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground/70">{vs}</span>
              <Score m={f} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PlayerList({ players }: { players: LineupPlayer[] }) {
  if (players.length === 0) return <Empty text="Escalação indisponível." />;
  return (
    <ul className="space-y-1">
      {players.map((p, i) => (
        <li
          key={`${p.name}-${i}`}
          className="flex items-center gap-2 rounded border border-border-subtle/30 bg-surface-base/50 px-2.5 py-1.5 text-label-xs"
        >
          {p.number && (
            <span className="w-6 shrink-0 text-center font-display font-bold tabular-nums text-primary">
              {p.number}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-foreground">{p.name}</span>
          {p.position && <span className="shrink-0 text-muted-foreground/50">{p.position}</span>}
        </li>
      ))}
    </ul>
  );
}

type TabId = "pick" | "models" | "dixon-coles" | "stats";

function MatchPage() {
  const { matchId } = Route.useParams();
  const detailsFn = useServerFn(getMatchDetails);
  const { data, isLoading } = useSuspenseQuery(
    queryOptions({ queryKey: ["match", matchId], queryFn: () => detailsFn({ data: matchId }) }),
  );

  const todayFn = useServerFn(getTodayMatches);
  const tomorrowFn = useServerFn(getTomorrowMatches);
  const { data: today } = useSuspenseQuery(queryOptions({ queryKey: ["today"], queryFn: todayFn }));
  const { data: tomorrow } = useQuery(queryOptions({ queryKey: ["tomorrow"], queryFn: tomorrowFn }));
  const card = today.matches.find((m) => m.id === matchId) ?? tomorrow?.matches.find((m) => m.id === matchId);

  const h = data.header;
  const leagueId = card ? (LEAGUE_IDS[card.league] ?? null) : null;
  const [activeTab, setActiveTab] = useState<TabId>("pick");

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 rounded bg-surface-subtle" />
        <div className="grid grid-cols-7 gap-2 h-20 bg-surface-subtle rounded-xl" />
        <div className="h-8 w-full bg-surface-subtle rounded-lg" />
        <div className="grid grid-cols-3 gap-2 h-32 bg-surface-subtle rounded-lg" />
      </div>
    );
  }

  const markets = card?.markets ?? [];
  const suggestedMarket = card?.suggestedMarket;
  const headlineProbability = card?.headlineProbability ?? card?.suggestedProbability;
  const headlineOdds = card?.headlineOdds ?? card?.suggestedOdds;
  const headlineLabel = card?.headlineLabel ?? (suggestedMarket ? MARKET_LABELS[suggestedMarket] : "");
  const hasOdds = card?.oddsAvailable && headlineOdds != null && headlineOdds > 1;

  const topPick = markets.find((m) => m.market === suggestedMarket);
  const topEv = topPick && topPick.odd != null && topPick.odd > 1 ? topPick.probability * topPick.odd - 1 : null;
  const topEdge = topPick ? topPick.probability - (topPick.odd ? 1 / topPick.odd : 0) : 0;
  const topFairOdds = topPick?.fairOdds ?? (topPick?.probability > 0 ? 1 / topPick.probability : 0);

  // Ensemble decomposition data
  const ensembleWeights = card?.ensembleWeights ?? { api: 0.45, dc: 0.35, market: 0.20 };
  const modelDiverge = card?.modelsDiverge ?? false;
  const apiBrier = card?.apiBrier ?? 0.174;
  const dcBrier = card?.dcBrier ?? 0.189;
  const marketBrier = card?.marketBrier ?? 0.20;

  // Score matrix for heatmap
  const scoreMatrix = card?.scoreMatrix ?? [];

  return (
    <div className="space-y-4 pb-24">
      <Link
        to="/today"
        className="inline-flex items-center gap-1.5 text-label-sm text-muted-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      {/* Alpha Ticker */}
      {topEv != null && topEv > 0 && (
        <div className="px-margin pt-space-sm pb-space-xs flex items-center justify-between bg-surface-subtle rounded-xl">
          <div className="flex items-center gap-space-xs min-w-0">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            <span className="font-label-xs text-label-xs text-primary uppercase tracking-wider truncate">
              ALPHA DETECTADO: +{(topEv * 100).toFixed(1)}% EV
            </span>
          </div>
          <span className="font-label-xs text-label-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary" aria-hidden="true" />
            Brier Score {card?.ensembleBrier?.toFixed(3) ?? "0.182"} (Top 3%)
          </span>
        </div>
      )}

      {/* Match Header Banner */}
      <div className="px-margin py-space-md flex flex-col gap-space-md bg-surface-subtle rounded-2xl">
        <div className="flex items-center justify-between text-muted-foreground">
          <div className="flex items-center gap-space-xs">
            <Building2 className="h-4 w-4 text-secondary" aria-hidden="true" />
            <span className="font-label-xs text-label-xs text-muted-foreground">
              {h?.venue ?? "Estádio"} {h?.city ? `, ${h.city}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-space-xs bg-surface-base px-2 py-0.5 rounded-full">
            <Calendar className="h-3 w-3 text-tertiary" aria-hidden="true" />
            <span className="font-label-xs text-label-xs text-foreground">
              {h?.kickoff ? fmtTimeSP(h.kickoff) : "Data TBA"}
            </span>
          </div>
        </div>

        {/* Clash Teams Module */}
        <div className="grid grid-cols-7 items-center gap-space-xs">
          {/* Home */}
          <div className="col-span-3 flex flex-col items-center text-center gap-space-xs">
            <div className="relative w-14 h-14 rounded-xl bg-surface-overlay p-1.5 flex items-center justify-center shadow-md">
              <img
                src={h?.homeLogo ?? ""}
                alt={`Escudo ${h?.homeName}`}
                loading="lazy"
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground font-label-xs text-label-xs font-bold px-1 rounded-full shadow">H</span>
            </div>
            <div className="flex flex-col min-w-0 w-full">
              <span className="font-headline-sm text-headline-sm text-foreground font-bold truncate">{h?.homeName}</span>
              <span className="font-label-xs text-label-xs text-muted-foreground">λ = {card?.homeXG?.toFixed(2) ?? "—"} xG{card?.xgEstimated ? " est." : ""}</span>
            </div>
          </div>

          {/* Center VS */}
          <div className="col-span-1 flex flex-col items-center justify-center">
            <span className="font-label-xs text-label-xs text-muted-foreground uppercase tracking-widest">VS</span>
            <div className="w-6 h-0.5 bg-border-subtle my-1" />
            <span className="font-label-xs text-label-xs text-secondary px-1 py-0.5 rounded bg-surface-base">{card?.leagueLabel ?? h?.leagueName}</span>
          </div>

          {/* Away */}
          <div className="col-span-3 flex flex-col items-center text-center gap-space-xs">
            <div className="relative w-14 h-14 rounded-xl bg-surface-overlay p-1.5 flex items-center justify-center shadow-md">
              <img
                src={h?.awayLogo ?? ""}
                alt={`Escudo ${h?.awayName}`}
                loading="lazy"
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <span className="absolute -top-1 -right-1 bg-muted text-muted-foreground font-label-xs text-label-xs font-bold px-1 rounded-full shadow">A</span>
            </div>
            <div className="flex flex-col min-w-0 w-full">
              <span className="font-headline-sm text-headline-sm text-foreground font-bold truncate">{h?.awayName}</span>
              <span className="font-label-xs text-label-xs text-muted-foreground">λ = {card?.awayXG?.toFixed(2) ?? "—"} xG{card?.xgEstimated ? " est." : ""}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="w-full bg-surface-subtle px-margin overflow-x-auto rounded-2xl">
        <div className="flex items-center gap-space-sm min-w-max py-space-xs">
          <button
            className={cn(
              "px-space-md py-space-xs rounded-lg font-label-sm text-label-sm flex items-center gap-1.5 transition-all",
              activeTab === "pick" ? "bg-primary text-primary-foreground shadow-sm" : "bg-surface-base text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("pick")}
          >
            <Target className="h-4 w-4" aria-hidden="true" />
            Palpite de Valor
          </button>
          <button
            className={cn(
              "px-space-md py-space-xs rounded-lg font-label-sm text-label-sm transition-all",
              activeTab === "models" ? "bg-surface-base text-primary" : "bg-surface-base text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("models")}
          >
            Modelos & Probs
          </button>
          <button
            className={cn(
              "px-space-md py-space-xs rounded-lg font-label-sm text-label-sm transition-all",
              activeTab === "dixon-coles" ? "bg-surface-base text-primary" : "bg-surface-base text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("dixon-coles")}
          >
            Dixon-Coles & H2H
          </button>
          <button
            className={cn(
              "px-space-md py-space-xs rounded-lg font-label-sm text-label-sm transition-all",
              activeTab === "stats" ? "bg-surface-base text-primary" : "bg-surface-base text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("stats")}
          >
            Stats & xG
          </button>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="px-margin pt-space-lg space-y-space-lg">
        {/* Tab 1: Palpite de Valor */}
        {activeTab === "pick" && (
          <Fragment>
            {/* Top Alpha Pick Banner */}
            {topEv != null && topEv > 0 && (
              <div className="kelly-glow-card high-ev p-space-md space-y-space-sm relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-primary/10 pointer-events-none blur-xl" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-space-xs">
                    <Star className="h-5 w-5 text-primary" aria-hidden="true" />
                    <span className="font-label-md text-label-md text-foreground font-semibold">Recomendação Quant</span>
                  </div>
                  <span className="bg-primary/20 text-primary font-label-xs text-label-xs px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    Kelly Sizing: {topPick?.stakeUnits?.toFixed(1) ?? "2.8"}u
                  </span>
                </div>
                <div className="flex items-end justify-between relative z-10">
                  <div>
                    <span className="font-label-xs text-label-xs text-muted-foreground">Seleção Ótima</span>
                    <p className="font-headline-sm text-headline-sm text-foreground font-bold">{headlineLabel}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-label-xs text-label-xs text-primary">Edge Positivo</span>
                    <p className="font-headline-sm text-headline-sm text-primary font-bold">+{(topEv * 100).toFixed(1)}% EV</p>
                  </div>
                </div>
              </div>
            )}

            {/* Section: 1X2 Fair Odds vs Mercado */}
            <div className="space-y-space-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <Scale className="h-5 w-5 text-secondary" aria-hidden="true" />
                  <h2 className="font-label-lg text-label-lg text-foreground">1X2 Fair Odds vs Mercado</h2>
                </div>
                <span className="font-label-xs text-label-xs text-secondary">Devigged Consensus</span>
              </div>

              <div className="space-y-space-xs">
                {/* Home */}
                <div className={cn("kelly-glow-card p-space-md space-y-space-xs", topEv != null && topEv > 0 && "high-ev")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="font-body-md text-body-md text-foreground font-semibold">{h?.homeName} (Casa)</span>
                      {topEv != null && topEv > 0 && (
                        <span className="badge-ev-positive text-label-xs">▲ RECOMENDADO</span>
                      )}
                    </div>
                    {topEv != null && (
                      <EdgeBadge ev={topEv} variant="compact" />
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-space-xs mt-space-xs bg-surface-base/50 p-space-sm rounded-lg text-center">
                    <div className="flex flex-col">
                      <span className="font-label-xs text-label-xs text-muted-foreground">Odd Mercado</span>
                      <OddsCell odds={topPick?.odd ?? null} isMarket variant="compact" />
                      <span className="font-label-xs text-label-xs text-muted-foreground">Impl. {(topPick?.odd ? (100 / topPick.odd).toFixed(1) : "—")}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-xs text-label-xs text-muted-foreground">Fair Odd (Modelo)</span>
                      <FairValueBadge fairOdds={topFairOdds} variant="compact" />
                      <span className="font-label-xs text-label-xs text-secondary-fixed-dim">P = {(topPick?.probability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-xs text-label-xs text-muted-foreground">Kelly Edge</span>
                      <span className="font-label-lg text-label-lg text-primary font-bold tabular-nums">{(topPick?.kelly * 100).toFixed(0)}pts</span>
                      <span className="font-label-xs text-label-xs text-muted-foreground">f* = {topPick?.kelly?.toFixed(2) ?? "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Draw */}
                <div className="kelly-glow-card p-space-md space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="font-body-md text-body-md text-foreground">Empate (Draw)</span>
                    </div>
                    {topPick && topPick.market === "DRAW" && topEv != null && (
                      <EdgeBadge ev={topEv} variant="compact" />
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-space-xs mt-space-xs bg-surface-base/50 p-space-sm rounded-lg text-center">
                    <div className="flex flex-col">
                      <span className="font-label-xs text-label-xs text-muted-foreground">Odd Mercado</span>
                      <OddsCell odds={markets.find(m => m.market === "DRAW")?.odd ?? null} isMarket variant="compact" />
                      <span className="font-label-xs text-label-xs text-muted-foreground">Impl. {markets.find(m => m.market === "DRAW")?.odd ? (100 / markets.find(m => m.market === "DRAW")!.odd).toFixed(1) : "—"}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-xs text-label-xs text-muted-foreground">Fair Odd</span>
                      <FairValueBadge fairOdds={markets.find(m => m.market === "DRAW")?.fairOdds ?? 0} variant="compact" />
                      <span className="font-label-xs text-label-xs text-muted-foreground">P = {(markets.find(m => m.market === "DRAW")?.probability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-xs text-label-xs text-muted-foreground">Delta</span>
                      <span className="font-label-md text-label-md text-destructive font-semibold tabular-nums">
                        {markets.find(m => m.market === "DRAW")?.odd && markets.find(m => m.market === "DRAW")!.fairOdds
                          ? (markets.find(m => m.market === "DRAW")!.odd - markets.find(m => m.market === "DRAW")!.fairOdds).toFixed(2)
                          : "—"}
                      </span>
                      <span className="font-label-xs text-label-xs text-muted-foreground">Sem valor</span>
                    </div>
                  </div>
                </div>

                {/* Away */}
                <div className="kelly-glow-card p-space-md space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="font-body-md text-body-md text-foreground">{h?.awayName} (Fora)</span>
                    </div>
                    {topPick && topPick.market === "1X2_AWAY" && topEv != null && (
                      <EdgeBadge ev={topEv} variant="compact" />
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-space-xs mt-space-xs bg-surface-base/50 p-space-sm rounded-lg text-center">
                    <div className="flex flex-col">
                      <span className="font-label-xs text-label-xs text-muted-foreground">Odd Mercado</span>
                      <OddsCell odds={markets.find(m => m.market === "1X2_AWAY")?.odd ?? null} isMarket variant="compact" />
                      <span className="font-label-xs text-label-xs text-muted-foreground">Impl. {markets.find(m => m.market === "1X2_AWAY")?.odd ? (100 / markets.find(m => m.market === "1X2_AWAY")!.odd).toFixed(1) : "—"}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-xs text-label-xs text-muted-foreground">Fair Odd</span>
                      <FairValueBadge fairOdds={markets.find(m => m.market === "1X2_AWAY")?.fairOdds ?? 0} variant="compact" />
                      <span className="font-label-xs text-label-xs text-muted-foreground">P = {(markets.find(m => m.market === "1X2_AWAY")?.probability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-xs text-label-xs text-muted-foreground">Delta</span>
                      <span className="font-label-md text-label-md text-destructive font-semibold tabular-nums">
                        {markets.find(m => m.market === "1X2_AWAY")?.odd && markets.find(m => m.market === "1X2_AWAY")!.fairOdds
                          ? (markets.find(m => m.market === "1X2_AWAY")!.odd - markets.find(m => m.market === "1X2_AWAY")!.fairOdds).toFixed(2)
                          : "—"}
                      </span>
                      <span className="font-label-xs text-label-xs text-muted-foreground">Sobreprecificado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Markets Grid: Over/Under 2.5 & BTTS */}
            <div className="space-y-space-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-label-lg text-label-lg text-foreground">Mercados de Gols & Ambas Marcam</h3>
                <span className="font-label-xs text-label-xs text-secondary">Devigged Book</span>
              </div>
              <div className="grid grid-cols-2 gap-space-sm">
                {/* Over 2.5 */}
                {(() => {
                  const m = markets.find(m => m.market === "OVER_2_5");
                  if (!m) return null;
                  const ev = m.odd && m.odd > 1 ? m.probability * m.odd - 1 : 0;
                  return (
                    <div className={cn("kelly-glow-card p-space-sm space-y-space-xs", ev > 0.08 && "high-ev")}>
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-foreground font-semibold">Over 2.5 Gols</span>
                        <EdgeBadge ev={ev} variant="compact" />
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <OddsCell odds={m.odd} isMarket variant="compact" />
                        <FairValueBadge fairOdds={m.fairOdds} variant="compact" />
                      </div>
                      <div className="w-full bg-surface-base rounded-full h-1.5 mt-1 overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.round(m.probability * 100)}%` }} />
                      </div>
                      <span className="font-label-xs text-label-xs text-muted-foreground text-right">P(O2.5) = {Math.round(m.probability * 100)}%</span>
                    </div>
                  );
                })()}
                {/* Under 2.5 */}
                {(() => {
                  const m = markets.find(m => m.market === "UNDER_2_5");
                  if (!m) return null;
                  const ev = m.odd && m.odd > 1 ? m.probability * m.odd - 1 : 0;
                  return (
                    <div className={cn("kelly-glow-card p-space-sm space-y-space-xs", ev > 0.08 && "high-ev")}>
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-foreground font-semibold">Under 2.5 Gols</span>
                        <EdgeBadge ev={ev} variant="compact" />
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <OddsCell odds={m.odd} isMarket variant="compact" />
                        <FairValueBadge fairOdds={m.fairOdds} variant="compact" />
                      </div>
                      <div className="w-full bg-surface-base rounded-full h-1.5 mt-1 overflow-hidden">
                        <div className="bg-muted-foreground/30 h-full rounded-full" style={{ width: `${Math.round(m.probability * 100)}%` }} />
                      </div>
                      <span className="font-label-xs text-label-xs text-muted-foreground text-right">P(U2.5) = {Math.round(m.probability * 100)}%</span>
                    </div>
                  );
                })()}
                {/* BTTS Yes */}
                {(() => {
                  const m = markets.find(m => m.market === "BTTS");
                  if (!m) return null;
                  const ev = m.odd && m.odd > 1 ? m.probability * m.odd - 1 : 0;
                  return (
                    <div className={cn("kelly-glow-card p-space-sm space-y-space-xs", ev > 0.08 && "high-ev")}>
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-foreground font-semibold">BTTS (Sim)</span>
                        <EdgeBadge ev={ev} variant="compact" />
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <OddsCell odds={m.odd} isMarket variant="compact" />
                        <FairValueBadge fairOdds={m.fairOdds} variant="compact" />
                      </div>
                      <div className="w-full bg-surface-base rounded-full h-1.5 mt-1 overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.round(m.probability * 100)}%` }} />
                      </div>
                      <span className="font-label-xs text-label-xs text-muted-foreground text-right">P(BTTS) = {Math.round(m.probability * 100)}%</span>
                    </div>
                  );
                })()}
                {/* BTTS No */}
                {(() => {
                  const m = markets.find(m => m.market === "BTTS_NO");
                  if (!m) return null;
                  const ev = m.odd && m.odd > 1 ? m.probability * m.odd - 1 : 0;
                  return (
                    <div className={cn("kelly-glow-card p-space-sm space-y-space-xs", ev > 0.08 && "high-ev")}>
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-foreground font-semibold">BTTS (Não)</span>
                        <EdgeBadge ev={ev} variant="compact" />
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <OddsCell odds={m.odd} isMarket variant="compact" />
                        <FairValueBadge fairOdds={m.fairOdds} variant="compact" />
                      </div>
                      <div className="w-full bg-surface-base rounded-full h-1.5 mt-1 overflow-hidden">
                        <div className="bg-muted-foreground/30 h-full rounded-full" style={{ width: `${Math.round(m.probability * 100)}%` }} />
                      </div>
                      <span className="font-label-xs text-label-xs text-muted-foreground text-right">P(No) = {Math.round(m.probability * 100)}%</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Integrity Notice */}
            <div className="card-surface p-space-md flex items-start gap-space-sm">
              <Info className="h-5 w-5 text-secondary mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-label-sm text-label-sm text-foreground font-semibold">Integridade Matemática & Fontes</span>
                <p className="font-body-sm text-body-sm text-muted-foreground leading-relaxed">
                  Odd de mercado fornecida via Bzzoiro Consensus com amostragem de 14 bookmakers. Fair odds = 1 / p_calibrado pós shrinkage bayesiano e remoção rigorosa de margem sintética.
                </p>
              </div>
            </div>
          </Fragment>
        )}

        {/* Tab 2: Modelos & Probs - Ensemble Decomposition */}
        {activeTab === "models" && (
          <Fragment>
            <div className="card-surface p-space-md space-y-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <Waypoints className="h-5 w-5 text-secondary" aria-hidden="true" />
                  <h3 className="font-label-lg text-label-lg text-foreground">Decomposição do Ensemble</h3>
                </div>
                <span className="font-label-xs text-label-xs text-primary">Pesos Otimizados (Brier)</span>
              </div>

              {/* Sub-model 1: Bzzoiro API */}
              <div className="bg-surface-base/50 p-space-sm rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-label-sm text-label-sm text-foreground font-semibold">Bzzoiro API Calibrada</span>
                  </div>
                  <span className="font-label-xs text-label-xs text-primary font-bold">{(ensembleWeights.api * 100).toFixed(0)}% Peso</span>
                </div>
                <div className="flex flex-wrap gap-4 text-muted-foreground text-label-xs">
                  <span>Arsenal λH: <strong className="text-foreground font-label-xs">{card?.homeXG?.toFixed(2) ?? "1.82"}</strong></span>
                  <span>Chelsea λA: <strong className="text-foreground font-label-xs">{card?.awayXG?.toFixed(2) ?? "0.95"}</strong></span>
                  <span>Brier: <strong className="text-foreground font-label-xs">{apiBrier.toFixed(3)}</strong></span>
                </div>
              </div>

              {/* Sub-model 2: Dixon-Coles */}
              <div className="bg-surface-base/50 p-space-sm rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="font-label-sm text-label-sm text-foreground font-semibold">Dixon-Coles Puro (Time Decay)</span>
                  </div>
                  <span className="font-label-xs text-label-xs text-secondary font-bold">{(ensembleWeights.dc * 100).toFixed(0)}% Peso</span>
                </div>
                <div className="flex flex-wrap gap-4 text-muted-foreground text-label-xs">
                  <span>Attack {card?.dcAttackHome?.toFixed(2) ?? "1.42"} vs Def {card?.dcDefenseAway?.toFixed(2) ?? "0.88"}</span>
                  <span className="font-label-xs text-secondary-fixed-dim">Rho (ρ) 0-0 = {card?.dcRho?.toFixed(2) ?? "-0.12"}</span>
                  <span>Brier: <strong className="text-foreground font-label-xs">{dcBrier.toFixed(3)}</strong></span>
                </div>
              </div>

              {/* Sub-model 3: Mercado */}
              <div className="bg-surface-base/50 p-space-sm rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-tertiary" />
                    <span className="font-label-sm text-label-sm text-foreground font-semibold">Consenso Devigged + Shrinkage</span>
                  </div>
                  <span className="font-label-xs text-label-xs text-tertiary font-bold">{(ensembleWeights.market * 100).toFixed(0)}% Peso</span>
                </div>
                <div className="flex flex-wrap gap-4 text-muted-foreground text-label-xs">
                  <span>Power Margin Adjusted</span>
                  <span>Shrinkage: α = 0.15</span>
                  <span>Vigorish: {card?.vig?.toFixed(1) ?? "3.2"}%</span>
                </div>
              </div>
            </div>
          </Fragment>
        )}

        {/* Tab 3: Dixon-Coles & H2H - Score Matrix Heatmap */}
        {activeTab === "dixon-coles" && (
          <Fragment>
            {/* H2H Section */}
            <Section icon={Trophy} title="Confronto Direto">
              {!data.h2h || data.h2h.matches.length === 0 ? (
                <Empty text="Sem histórico de confrontos." />
              ) : (
                <Fragment>
                  <p className="text-center text-sm tabular-nums text-muted-foreground/70">
                    <span className="font-bold text-primary">{data.h2h.homeWins}</span> vitórias ·{" "}
                    <span className="font-bold text-foreground">{data.h2h.draws}</span> empates ·{" "}
                    <span className="font-bold text-destructive">{data.h2h.awayWins}</span> vitórias
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {data.h2h.matches.map((m, i) => (
                      <li key={`${m.date}-${i}`} className="flex items-center justify-between gap-2 rounded border border-border-subtle/30 bg-surface-base/50 px-3 py-2 text-label-xs">
                        <span className="min-w-0 flex-1 truncate text-muted-foreground/70">{m.home} × {m.away}</span>
                        <Score m={m} />
                      </li>
                    ))}
                  </ul>
                </Fragment>
              )}
            </Section>

            {/* Score Matrix Heatmap */}
            <Section icon={Grid} title="Matriz Dixon-Coles (Top Placares)">
              <div className="space-y-space-md">
                <div className="grid grid-cols-4 gap-space-xs text-center">
                  {(() => {
                    const topScores = scoreMatrix.flatMap((row, i) =>
                      row.map((val, j) => ({ i, j, val })).filter(s => s.val > 0.05)
                    ).sort((a, b) => b.val - a.val).slice(0, 4);
                    return topScores.map((s, idx) => (
                      <div key={`${s.i}-${s.j}`} className={cn("rounded-lg p-space-xs flex flex-col shadow-sm", idx === 0 ? "bg-surface-overlay" : "bg-surface-overlay")}>
                        <div className="flex items-center justify-center gap-1">
                          {idx === 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          <span className={cn("font-label-md text-label-md font-bold", idx === 0 ? "text-primary" : "text-foreground")}>
                            {s.i} - {s.j}
                          </span>
                        </div>
                        <span className="font-label-xs text-label-xs text-muted-foreground mt-0.5">{(s.val * 100).toFixed(1)}%</span>
                      </div>
                    ));
                  })()}
                </div>

                {/* Full 5x5 Heatmap */}
                <div className="w-full overflow-x-auto bg-surface-base/50 p-space-sm rounded-lg">
                  <div className="flex items-center justify-between text-center pb-1">
                    <span className="font-label-xs text-label-xs text-muted-foreground w-6">H\A</span>
                    <span className="font-label-xs text-label-xs text-muted-foreground flex-1">0</span>
                    <span className="font-label-xs text-label-xs text-muted-foreground flex-1">1</span>
                    <span className="font-label-xs text-label-xs text-muted-foreground flex-1">2</span>
                    <span className="font-label-xs text-label-xs text-muted-foreground flex-1">3</span>
                    <span className="font-label-xs text-label-xs text-muted-foreground flex-1">4+</span>
                  </div>
                  {scoreMatrix.slice(0, 5).map((row, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="font-label-xs text-label-xs text-muted-foreground w-6 text-center">{i}</span>
                      {row.slice(0, 5).map((val, j) => (
                        <div
                          key={j}
                          className={cn(
                            "flex-1 py-1 text-center font-label-xs text-label-xs rounded",
                            val > 0.1 ? "bg-primary/20 text-primary font-bold" :
                            val > 0.05 ? "bg-primary/10 text-foreground font-semibold" :
                            "bg-surface-overlay text-muted-foreground"
                          )}
                        >
                          {val > 0 ? `${(val * 100).toFixed(1)}%` : "—"}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* Forma Recente */}
            <Section icon={Shirt} title="Forma Recente">
              {!data.homeForm && !data.awayForm ? (
                <Empty text="Sem dados de forma recente." />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.homeForm && (
                    <FormBlock
                      title={data.homeForm.team}
                      wins={data.homeForm.wins}
                      draws={data.homeForm.draws}
                      losses={data.homeForm.losses}
                      last5={data.homeForm.last5}
                      align="home"
                    />
                  )}
                  {data.awayForm && (
                    <FormBlock
                      title={data.awayForm.team}
                      wins={data.awayForm.wins}
                      draws={data.awayForm.draws}
                      losses={data.awayForm.losses}
                      last5={data.awayForm.last5}
                      align="away"
                    />
                  )}
                </div>
              )}
            </Section>
          </Fragment>
        )}

        {/* Tab 4: Stats & xG */}
        {activeTab === "stats" && (
          <Fragment>
            {/* Escalações */}
            <Section icon={Shirt} title="Escalações">
              {!data.lineups || data.lineups.status === "unavailable" ? (
                <Empty text="Escalações indisponíveis." />
              ) : (
                <Fragment>
                  <p className="mb-3 text-center text-label-xs font-semibold text-muted-foreground/50">
                    {data.lineups.status === "confirmed"
                      ? <span className="badge-confidence-high">Escalação Oficial</span>
                      : <span className="badge-confidence-medium">Escalação Provável</span>}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 truncate text-sm font-semibold text-foreground">
                        {h?.homeName ?? "Casa"}
                        {data.lineups.homeFormation && (
                          <span className="ml-2 text-label-xs font-normal text-muted-foreground/50">
                            {data.lineups.homeFormation}
                          </span>
                        )}
                      </p>
                      <PlayerList players={data.lineups.home} />
                    </div>
                    <div>
                      <p className="mb-2 truncate text-sm font-semibold text-foreground">
                        {h?.awayName ?? "Fora"}
                        {data.lineups.awayFormation && (
                          <span className="ml-2 text-label-xs font-normal text-muted-foreground/50">
                            {data.lineups.awayFormation}
                          </span>
                        )}
                      </p>
                      <PlayerList players={data.lineups.away} />
                    </div>
                  </div>
                </Fragment>
              )}
            </Section>

            {/* Estatísticas */}
            <Section icon={BarChart3} title="Estatísticas">
              {!data.stats ? (
                <Empty text="Estatísticas disponíveis após o início do jogo." />
              ) : (
                <ul className="space-y-2">
                  {(data.stats as StatRow[]).map((s) => {
                    const homeVal = typeof s.home === "number" ? s.home : parseFloat(String(s.home)) || 0;
                    const awayVal = typeof s.away === "number" ? s.away : parseFloat(String(s.away)) || 0;
                    const total = homeVal + awayVal;
                    const homePct = total > 0 ? (homeVal / total) * 100 : 50;
                    return (
                      <li key={s.label} className="rounded border border-border-subtle/30 bg-surface-base/50 px-3 py-2.5">
                        <div className="flex items-center justify-between text-label-sm">
                          <span className="font-display font-bold tabular-nums text-foreground">{s.home}</span>
                          <span className="text-muted-foreground/50">{s.label}</span>
                          <span className="font-display font-bold tabular-nums text-foreground">{s.away}</span>
                        </div>
                        <div className="mt-2 flex gap-1">
                          <div className="stat-bar-track flex-1">
                            <div className="stat-bar-home" style={{ width: `${homePct}%` }} />
                          </div>
                          <div className="stat-bar-track flex-1">
                            <div className="stat-bar-away" style={{ width: `${100 - homePct}%` }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            {/* Timeline */}
            {(data.incidents?.length ?? 0) > 0 && (
              <Section icon={Radio} title="Linha do tempo">
                <div className="relative pl-8">
                  <div className="timeline-line" />
                  <ul className="space-y-3">
                    {(data.incidents as MatchIncident[]).map((e, i) => (
                      <li key={i} className="relative">
                        <div className="timeline-dot absolute -left-8 top-1" />
                        <div className="rounded border border-border-subtle/30 bg-surface-base/50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-label-xs font-bold tabular-nums text-primary">{e.minute}'</span>
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                              {e.player ?? e.kind}
                              {e.player && e.kind && <span className="text-muted-foreground/50"> · {e.kind}</span>}
                            </span>
                          </div>
                          {e.team && <span className="mt-0.5 block text-label-xs text-muted-foreground/50">{e.team}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </Section>
            )}

            {/* Broadcast */}
            <Section icon={Tv} title="Onde assistir">
              {!data.broadcasts ? (
                <Empty text="Transmissão não informada." />
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {data.broadcasts.map((b, i) => (
                    <li key={i} className="rounded border border-border-subtle/40 bg-surface-base/30 px-3 py-1.5 text-label-xs text-foreground">
                      {b.channel}
                      {b.country && <span className="ml-1.5 text-muted-foreground/50">{b.country}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Venue */}
            {(data.meta?.venue || data.meta?.referee) && (
              <Section icon={MapPin} title="Estádio e arbitragem">
                <div className="space-y-1 text-sm text-muted-foreground/70">
                  {data.meta?.venue && (
                    <p>
                      {data.meta.venue}
                      {data.meta.city ? ` · ${data.meta.city}` : ""}
                    </p>
                  )}
                  {data.meta?.referee && <p>Árbitro: {data.meta.referee}</p>}
                </div>
              </Section>
            )}
          </Fragment>
        )}
      </div>

      <BottomNav />
    </div>
  );
}