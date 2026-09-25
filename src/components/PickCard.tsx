import { Link } from "@tanstack/react-router";
import { Target, TrendingUp, ShieldAlert, Zap, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Pick } from "@/lib/picks/singles";
import { cn } from "@/lib/utils";
import { fmtTimeSP } from "@/lib/match-dates";
import { EdgeBadge } from "@/components/ui/edge-badge";
import { FairValueBadge } from "@/components/ui/fair-value-badge";
import { ShrinkageBadge } from "@/components/ui/shrinkage-badge";
import { OddsCell, ProbabilityCell } from "@/components/ui/odds-cells";
import { KellyGlowCard } from "@/components/ui/kelly-glow-card";

const CONF: Record<Pick["confidence"], { label: string; cls: string }> = {
  high: { label: "Alta", cls: "badge-confidence-high" },
  medium: { label: "Média", cls: "badge-confidence-medium" },
  low: { label: "Baixa", cls: "badge-confidence-low" },
};

const RISK: Record<Pick["risk"], string> = {
  baixo: "badge-confidence-high",
  médio: "badge-confidence-medium",
  alto: "bg-tertiary/10 text-tertiary border-tertiary/30",
};

export function PickCard({ pick, index }: { pick: Pick; index?: number }) {
  const conf = CONF[pick.confidence];
  const isHighEv = pick.EV > 0.08;

  return (
    <article className="kelly-glow-card p-space-md space-y-space-md">
      <div className="flex flex-wrap items-start gap-3">
        {index != null && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-xs font-bold text-primary">
            {index}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-label-xs font-semibold uppercase tracking-wider text-muted-foreground/50">
            {pick.leagueLabel} · {fmtTimeSP(pick.kickoff)}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {pick.homeTeam} × {pick.awayTeam}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <Target className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="font-display text-sm font-bold text-foreground">
              {pick.selectionLabel}
            </span>
            <OddsCell odds={pick.odd} isMarket={true} variant="default" />
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <EdgeBadge ev={pick.EV} variant="large" />
          <span className={cn("text-label-xs font-medium", conf.cls)}>
            Conf. {conf.label}
          </span>
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", RISK[pick.risk])}>
            {pick.risk}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-4 gap-2">
        {[
          { label: "Prob", value: pick.p, type: "prob" as const, level: pick.p > 0.55 ? "strong" as const : pick.p > 0.35 ? "moderate" as const : "neutral" as const },
          { label: "Fair", value: pick.fairOdds, type: "odds" as const, isFair: true },
          { label: "Edge", value: `${(pick.edge * 100).toFixed(1)}pp`, type: "text" as const },
          { label: "Stake", value: pick.stakeUnits > 0 ? `${pick.stakeUnits}u` : "0u", type: "text" as const },
        ].map((x) => (
          <div key={x.label} className="rounded-lg border border-border-subtle/40 bg-surface-base/50 px-2 py-1.5">
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground/50">{x.label}</dt>
            <dd className="font-display text-sm font-bold tabular-nums text-foreground">
              {x.type === "prob" ? (
                <ProbabilityCell probability={x.value as number} level={x.level as "strong" | "moderate" | "neutral"} variant="compact" />
              ) : x.type === "odds" ? (
                <FairValueBadge fairOdds={x.value as number} variant="compact" />
              ) : (
                <span className="font-mono tabular-nums">{x.value}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <ul className="space-y-1">
        {pick.reason.map((r) => (
          <li key={r} className="flex items-start gap-1.5 text-label-xs text-muted-foreground/70">
            <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" aria-hidden="true" />
            {r}
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-label-xs text-muted-foreground/50">
        {pick.sources.api && (
          <span className="model-tag model-tag-api flex items-center gap-1">
            <Zap className="h-3 w-3" />
            API
          </span>
        )}
        {pick.sources.dc && <span className="model-tag model-tag-dc">Dixon-Coles</span>}
        {pick.sources.market && <span className="model-tag model-tag-market">Mercado</span>}
        {pick.modelsDiverge && (
          <span className="model-delta-badge model-delta-diverge flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            divergência modelos
          </span>
        )}
        <Link
          to="/match/$matchId"
          params={{ matchId: pick.eventId }}
          className="ml-auto text-primary hover:underline font-label-xs"
        >
          Ver jogo
        </Link>
      </div>
    </article>
  );
}