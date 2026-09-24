import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, Layers, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Parlay } from "@/lib/picks/parlays";
import { copyParlayText } from "@/lib/picks/parlays";
import { cn } from "@/lib/utils";

const PROFILE_LABEL: Record<Parlay["profile"], string> = {
  segura: "Segura",
  equilibrada: "Equilibrada",
  ousada: "Ousada",
};

const RISK_CLS: Record<Parlay["risk"], string> = {
  baixo: "bg-confirmed/10 text-confirmed",
  médio: "bg-chart-4/10 text-chart-4",
  alto: "bg-live/10 text-live",
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
    <article className="rounded-lg border border-border/50 bg-card p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-2">
        <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="font-display text-sm font-bold text-foreground">
          Múltipla {PROFILE_LABEL[parlay.profile]}
        </h3>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
            RISK_CLS[parlay.risk],
          )}
        >
          risco {parlay.risk}
        </span>
        <span className="ml-auto font-display text-lg font-bold tabular-nums text-primary">
          {parlay.oddTotal.toFixed(2)}
        </span>
      </header>

      <ol className="mt-3 space-y-1.5">
        {parlay.legs.map((leg, i) => (
          <li
            key={`${leg.pick.eventId}-${leg.pick.market}-${i}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/40 bg-white/[0.02] px-2.5 py-1.5 text-xs"
          >
            <span className="min-w-0 flex-1 truncate text-foreground/80">
              <span className="font-semibold text-primary">{i + 1}.</span> {leg.pick.selectionLabel}
              <span className="text-muted-foreground/50"> · {leg.pick.leagueLabel}</span>
            </span>
            <span className="flex items-center gap-2 font-display font-bold tabular-nums">
              <span className="text-muted-foreground/60">{Math.round(leg.pick.p * 100)}%</span>
              <span className="text-foreground">@{leg.pick.odd.toFixed(2)}</span>
            </span>
          </li>
        ))}
      </ol>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: "P total", value: `${(parlay.pTotal * 100).toFixed(1)}%` },
          { label: "EV", value: `+${(parlay.EV * 100).toFixed(1)}%` },
          { label: "Stake", value: `${parlay.stakeUnits}u` },
        ].map((x) => (
          <div
            key={x.label}
            className="rounded border border-border/40 bg-white/[0.02] px-2 py-1.5 text-center"
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
        {parlay.whyThisParlay.map((w) => (
          <li key={w} className="text-[11px] text-muted-foreground/60">
            · {w}
          </li>
        ))}
        <li className="text-[11px] text-muted-foreground/50">
          · Pior perna: {parlay.worstLeg.selectionLabel}
        </li>
      </ul>

      <p className="mt-2 text-[11px] text-muted-foreground/50">{parlay.correlationNote}</p>

      {parlay.profile === "ousada" && (
        <p className="mt-2 flex items-start gap-1.5 rounded border border-live/20 bg-live/5 px-2 py-1.5 text-[11px] text-live">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          Risco alto — no máximo 4 pernas. Stake pequena.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded border border-border bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.06] focus-ring"
        >
          {copied ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-confirmed" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copiado" : "Copiar"}
        </button>
        <span className="text-[11px] text-muted-foreground/40">
          Estimativa estatística · sem garantia
        </span>
        <Link to="/analytics" className="ml-auto text-[11px] text-primary hover:underline">
          Como medimos
        </Link>
      </div>

      <p className="mt-2 border-t border-border/40 pt-2 text-[10px] font-medium text-muted-foreground/40">
        +18 · Jogue com responsabilidade
      </p>
    </article>
  );
}
