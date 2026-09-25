import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, Layers, CheckCircle2, AlertTriangle, Network } from "lucide-react";
import type { Parlay } from "@/lib/picks/parlays";
import { copyParlayText } from "@/lib/picks/parlays";
import { cn } from "@/lib/utils";
import { EdgeBadge } from "@/components/ui/edge-badge";
import { FairValueBadge } from "@/components/ui/fair-value-badge";
import { KellyGlowCard } from "@/components/ui/kelly-glow-card";

const PROFILE_LABEL: Record<Parlay["profile"], string> = {
  segura: "Segura",
  equilibrada: "Equilibrada",
  ousada: "Ousada",
};

const RISK_CLS: Record<Parlay["risk"], string> = {
  baixo: "badge-confidence-high",
  médio: "badge-confidence-medium",
  alto: "bg-tertiary/10 text-tertiary border-tertiary/30",
};

export function ParlayCard({ parlay }: { parlay: Parlay }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyParlayText(parlay));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível
    }
  };

  return (
    <article className="kelly-glow-card p-space-md space-y-space-md">
      <header className="flex flex-wrap items-center gap-2">
        <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="font-display text-sm font-bold text-foreground">
          Múltipla {PROFILE_LABEL[parlay.profile]}
        </h3>
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", RISK_CLS[parlay.risk])}>
          risco {parlay.risk}
        </span>
        <span className="ml-auto font-display text-lg font-bold tabular-nums text-primary">
          @{parlay.oddTotal.toFixed(2)}
        </span>
      </header>

      {/* Correlation Badge & Alpha */}
      <div className="flex items-center justify-between pb-space-xs">
        <div className="correlation-badge">
          <Network className="h-4 w-4 text-secondary" aria-hidden="true" />
          <span className="font-label-xs text-label-xs text-secondary font-medium">
            {parlay.correlationNote}
          </span>
        </div>
        <EdgeBadge ev={parlay.EV} variant="compact" />
      </div>

      {/* Combo Legs Breakdown */}
      <ol className="space-y-2">
        {parlay.legs.map((leg, i) => (
          <li
            key={`${leg.pick.eventId}-${leg.pick.market}-${i}`}
            className="flex items-center justify-between p-2 rounded-lg bg-surface-base/50"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-full bg-surface-overlay flex items-center justify-center font-label-xs text-label-xs text-muted-foreground font-bold">
                {i + 1}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-foreground font-medium truncate">
                  {leg.pick.selectionLabel}
                </span>
                <span className="font-label-xs text-label-xs text-muted-foreground truncate">
                  {leg.pick.leagueLabel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono font-bold tabular-nums">
              <ProbabilityCell probability={leg.pick.p} level={leg.pick.p > 0.55 ? "strong" : leg.pick.p > 0.35 ? "moderate" : "neutral"} variant="compact" showPercent />
              <span className="text-foreground">@{leg.pick.odd.toFixed(2)}</span>
            </div>
          </li>
        ))}
      </ol>

      {/* Combo Simulation Metrics Footer */}
      <div className="flex items-center justify-between pt-space-xs">
        <div className="flex flex-col">
          <span className="font-label-xs text-label-xs text-muted-foreground">Stake Sugerida</span>
          <span className="font-label-md text-label-md text-foreground font-bold">
            {parlay.stakeUnits}u <span className="font-normal text-muted-foreground text-label-xs">(R$ {parlay.stakeUnits * 100}00)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="font-label-xs text-label-xs text-muted-foreground">Odd Combinada</span>
            <span className="font-label-lg text-label-lg text-secondary font-bold">@{parlay.oddTotal.toFixed(2)}</span>
          </div>
          <button
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary-container transition-all active:scale-95 shadow-sm"
            onClick={onCopy}
            aria-label={copied ? "Copiado" : "Copiar múltipla"}
          >
            {copied ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <ul className="mt-2 space-y-1 border-t border-border-subtle/40 pt-2">
        {parlay.whyThisParlay.map((w, i) => (
          <li key={i} className="text-label-xs text-muted-foreground/60 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/50" aria-hidden="true" />
            {w}
          </li>
        ))}
        <li className="text-label-xs text-muted-foreground/50 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" aria-hidden="true" />
          Pior perna: {parlay.worstLeg.selectionLabel}
        </li>
      </ul>

      {parlay.profile === "ousada" && (
        <p className="mt-2 flex items-start gap-1.5 rounded border border-tertiary/20 bg-tertiary/5 px-2 py-1.5 text-label-xs text-tertiary">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          Risco alto — no máximo 4 pernas. Stake pequena.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded border border-border-subtle bg-surface-base/50 px-2.5 py-1.5 text-label-xs font-medium text-foreground transition-colors hover:bg-surface-base focus-ring"
        >
          {copied ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copiado" : "Copiar"}
        </button>
        <span className="text-label-xs text-muted-foreground/40">
          Estimativa estatística · sem garantia
        </span>
        <Link to="/analytics" className="ml-auto text-label-xs text-primary hover:underline">
          Como medimos
        </Link>
      </div>

      <p className="mt-2 border-t border-border-subtle/40 pt-2 text-[10px] font-medium text-muted-foreground/40">
        +18 · Jogue com responsabilidade
      </p>
    </article>
  );
}