import { Link } from "@tanstack/react-router";
import { Target, TrendingUp, ShieldAlert, Zap } from "lucide-react";
import type { Pick } from "@/lib/picks/singles";
import { cn } from "@/lib/utils";
import { fmtTimeSP } from "@/lib/match-dates";

const CONF: Record<Pick["confidence"], { label: string; cls: string }> = {
  high: { label: "Alta", cls: "text-confirmed" },
  medium: { label: "Média", cls: "text-chart-4" },
  low: { label: "Baixa", cls: "text-muted-foreground" },
};

const RISK: Record<Pick["risk"], string> = {
  baixo: "bg-confirmed/10 text-confirmed",
  médio: "bg-chart-4/10 text-chart-4",
  alto: "bg-live/10 text-live",
};

export function PickCard({ pick, index }: { pick: Pick; index?: number }) {
  const conf = CONF[pick.confidence];
  return (
    <article className="rounded-lg border border-border/50 bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        {index != null && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-xs font-bold text-primary">
            {index}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
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
            <span className="rounded border border-border/50 bg-white/[0.04] px-1.5 py-0.5 font-display text-xs font-bold tabular-nums text-foreground">
              {pick.odd.toFixed(2)}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="font-display text-lg font-bold tabular-nums text-primary">
            +{(pick.EV * 100).toFixed(1)}%
          </span>
          <span className="text-[11px] text-muted-foreground/50">EV</span>
          <span className={cn("text-[11px] font-medium", conf.cls)}>Conf. {conf.label}</span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
              RISK[pick.risk],
            )}
          >
            {pick.risk}
          </span>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Prob", value: `${Math.round(pick.p * 100)}%` },
          { label: "Fair", value: pick.fairOdds.toFixed(2) },
          { label: "Edge", value: `${(pick.edge * 100).toFixed(1)} p.p.` },
          { label: "Stake", value: pick.stakeUnits > 0 ? `${pick.stakeUnits}u` : "0u" },
        ].map((x) => (
          <div
            key={x.label}
            className="rounded border border-border/40 bg-white/[0.02] px-2 py-1.5"
          >
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
              {x.label}
            </dt>
            <dd className="font-display text-sm font-bold tabular-nums text-foreground">
              {x.value}
            </dd>
          </div>
        ))}
      </dl>

      <ul className="mt-3 space-y-1">
        {pick.reason.map((r) => (
          <li key={r} className="flex items-start gap-1.5 text-xs text-muted-foreground/70">
            <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" aria-hidden="true" />
            {r}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/50">
        {pick.sources.api && (
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" /> API
          </span>
        )}
        {pick.sources.dc && <span>Dixon-Coles</span>}
        {pick.modelsDiverge && (
          <span className="flex items-center gap-1 text-live">
            <ShieldAlert className="h-3 w-3" /> divergência
          </span>
        )}
        <Link
          to="/match/$matchId"
          params={{ matchId: pick.eventId }}
          className="ml-auto text-primary hover:underline"
        >
          Ver jogo
        </Link>
      </div>
    </article>
  );
}
