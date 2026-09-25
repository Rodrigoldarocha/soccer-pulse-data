import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, CircleX, Terminal, ChartLine, ShieldCheck } from "lucide-react";
import { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: ReactNode;
  iconColor?: "primary" | "secondary" | "tertiary" | "destructive";
  trend?: { value: string; positive: boolean };
  confidenceInterval?: string;
  className?: string;
}

export function MetricCard({ label, value, subValue, icon, iconColor = "primary", trend, confidenceInterval, className }: MetricCardProps) {
  const iconColorClasses = {
    primary: "text-primary",
    secondary: "text-secondary",
    tertiary: "text-tertiary",
    destructive: "text-destructive",
  };

  return (
    <div className={cn("bg-surface-subtle p-space-md rounded-lg shadow-md flex flex-col gap-space-xs relative overflow-hidden", className)}>
      {icon && (
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-primary/10 blur-xl pointer-events-none" />
      )}
      <div className="flex items-center justify-between">
        <span className="font-label-xs text-label-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon && <span className={cn("material-symbols-outlined text-[16px]", iconColorClasses[iconColor])}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-headline-lg text-headline-lg font-bold text-foreground">{value}</span>
        {subValue && <span className="font-label-sm text-label-sm text-muted-foreground font-medium">{subValue}</span>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <span className={cn("font-label-xs text-label-xs font-semibold", trend.positive ? "text-primary" : "text-destructive")}>
            {trend.positive ? "+" : ""}{trend.value}
          </span>
          <TrendingUp className={cn("h-3 w-3", trend.positive ? "text-primary" : "text-destructive")} aria-hidden="true" />
        </div>
      )}
      {confidenceInterval && (
        <div className="flex items-center justify-between pt-1">
          <span className="font-label-xs text-label-xs text-muted-foreground">Intervalo Wilson Score:</span>
          <span className="font-label-xs text-label-xs text-primary-fixed-dim bg-surface-base px-1.5 py-0.5 rounded-md">{confidenceInterval}</span>
        </div>
      )}
    </div>
  );
}

interface HitRateDistributionProps {
  green: number;
  red: number;
  void: number;
  total: number;
  hitRate: number;
  className?: string;
}

export function HitRateDistribution({ green, red, void: voidCount, total, hitRate, className }: HitRateDistributionProps) {
  const greenPct = (green / total) * 100;
  const redPct = (red / total) * 100;
  const voidPct = (voidCount / total) * 100;

  return (
    <div className={cn("bg-surface-subtle p-space-md rounded-lg shadow-sm flex flex-col gap-space-sm", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-label-xs text-label-xs text-muted-foreground uppercase">Hit Rate de Mercado</span>
          <span className="font-label-sm text-label-sm text-foreground font-semibold">{hitRate.toFixed(1)}%</span>
        </div>
        <span className="font-label-xs text-label-xs text-muted-foreground">{total} resolvidos</span>
      </div>
      <div className="w-full h-2.5 rounded-md bg-surface-overlay overflow-hidden flex gap-0.5 p-0.5">
        <div className="h-full bg-primary rounded-md transition-all progress-fill-green" style={{ width: `${greenPct}%` }} title={`${green} Greens`} />
        <div className="h-full bg-destructive-container rounded-md transition-all progress-fill-red" style={{ width: `${redPct}%` }} title={`${red} Reds`} />
        <div className="h-full bg-border-strong rounded-md transition-all progress-fill-void" style={{ width: `${voidPct}%` }} title={`${voidCount} Voids`} />
      </div>
      <div className="flex items-center justify-between font-label-xs text-label-xs">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-foreground font-medium">{green} Green</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-destructive-container" />
          <span className="text-muted-foreground">{red} Red</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-border-strong" />
          <span className="text-muted-foreground">{voidCount} Void</span>
        </div>
      </div>
    </div>
  );
}

interface MLQualityMetricsProps {
  brier: number;
  brierVsMarket: number;
  logLoss: number;
  ece: number;
  reliabilityR2: number;
  className?: string;
}

export function MLQualityMetrics({ brier, brierVsMarket, logLoss, ece, reliabilityR2, className }: MLQualityMetricsProps) {
  return (
    <div className={cn("bg-surface-subtle p-space-md rounded-lg shadow-md flex flex-col gap-space-md", className)}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <ChartLine className="h-4 w-4 text-secondary" aria-hidden="true" />
            <span className="font-label-sm text-label-sm text-foreground font-bold">Qualidade & Calibração ML</span>
          </div>
          <span className="font-label-xs text-label-xs text-muted-foreground">Supabase ml_accuracy_metrics (Isotonic/Platt)</span>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary font-label-xs text-label-xs font-medium">ECE {ece.toFixed(1)}%</span>
      </div>
      <div className="grid grid-cols-3 gap-space-xs bg-surface-base p-space-sm rounded-md text-center">
        <div className="flex flex-col items-center">
          <span className="font-label-xs text-label-xs text-muted-foreground uppercase">Brier</span>
          <span className="font-label-md text-label-md text-primary font-bold">{brier.toFixed(3)}</span>
          <span className="font-label-xs text-[9px] text-primary-fixed-dim">{brierVsMarket >= 0 ? "+" : ""}{brierVsMarket.toFixed(3)} vs Mkt</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-label-xs text-label-xs text-muted-foreground uppercase">Log-Loss</span>
          <span className="font-label-md text-label-md text-foreground font-bold">{logLoss.toFixed(3)}</span>
          <span className="font-label-xs text-[9px] text-muted-foreground">Entropy Min</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-label-xs text-label-xs text-muted-foreground uppercase">ECE Error</span>
          <span className="font-label-md text-label-md text-secondary font-bold">{ece.toFixed(1)}%</span>
          <span className="font-label-xs text-[9px] text-secondary-fixed-dim">Tier 1 Edge</span>
        </div>
      </div>
      <div className="bg-surface-base/50 p-space-sm rounded-md flex flex-col gap-2">
        <div className="flex items-center justify-between text-muted-foreground font-label-xs text-[10px]">
          <span>CURVA DE CONFIABILIDADE (PREDICTED vs OBSERVED)</span>
          <span className="text-primary font-medium">R² = {reliabilityR2.toFixed(3)}</span>
        </div>
        <div className="reliability-diagram">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 280 100" role="img" aria-label="Curva de confiabilidade do modelo">
            <line stroke="#1c1f29" strokeDasharray="2,2" strokeWidth="1" x1="20" x2="270" y1="10" y2="10" />
            <line stroke="#1c1f29" strokeDasharray="2,2" strokeWidth="1" x1="20" x2="270" y1="50" y2="50" />
            <line stroke="#1c1f29" strokeWidth="1" x1="20" x2="270" y1="90" y2="90" />
            <line stroke="#1c1f29" strokeWidth="1" x1="20" x2="20" y1="10" y2="90" />
            <line stroke="#3c4a42" strokeDasharray="3,3" strokeWidth="1.5" x1="20" x2="270" y1="90" y2="10" />
            <polygon fill="#10B981" fillOpacity="0.08" points="20,90 55,81 100,67 145,51 190,34 235,21 270,11 270,90" />
            <polyline fill="none" points="20,90 55,81 100,67 145,51 190,34 235,21 270,11" stroke="#10B981" strokeLinecap="round" strokeWidth="2.5" />
            <circle cx="55" cy="81" fill="#0f131c" r="3" stroke="#10B981" strokeWidth="2" />
            <circle cx="100" cy="67" fill="#0f131c" r="3" stroke="#10B981" strokeWidth="2" />
            <circle cx="145" cy="51" fill="#0f131c" r="3" stroke="#10B981" strokeWidth="2" />
            <circle cx="190" cy="34" fill="#0f131c" r="3" stroke="#10B981" strokeWidth="2" />
            <circle cx="235" cy="21" fill="#0f131c" r="3" stroke="#10B981" strokeWidth="2" />
          </svg>
        </div>
        <div className="flex items-center justify-between font-label-xs text-[10px] text-muted-foreground px-1">
          <span>0.0 (Baixa P)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-primary" /> Modelo Calibrado</span>
          <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-border-strong" /> Perfeita</span>
          <span>1.0 (Alta P)</span>
        </div>
      </div>
    </div>
  );
}

interface LedgerRowProps {
  league: string;
  status: "finished" | "live";
  score: string;
  result: "green" | "red" | "void";
  match: string;
  pick: string;
  stake: string;
  units: string;
  pnl: number;
  fair: number;
  pickOdd: number;
  close: number;
  clv: number;
  className?: string;
}

export function LedgerRow({ league, status, score, result, match, pick, stake, units, pnl, fair, pickOdd, close, clv, className }: LedgerRowProps) {
  const resultColors = {
    green: "bg-primary border-l-primary",
    red: "bg-destructive/10 border-l-destructive",
    void: "bg-muted border-l-muted",
  };
  const resultLabels = {
    green: "GREEN",
    red: "RED",
    void: "VOID",
  };
  const resultIcons = {
    green: CheckCircle,
    red: CircleX,
    void: ShieldCheck,
  };

  const Icon = resultIcons[result];

  return (
    <div className={cn("bg-surface-subtle p-space-md rounded-lg shadow-sm flex flex-col gap-2 relative overflow-hidden", resultColors[result], className)}>
      <div className="absolute left-0 top-0 bottom-0 w-1" />
      <div className="flex items-center justify-between pl-1">
        <div className="flex items-center gap-1.5">
          <span className="font-label-xs text-label-xs text-muted-foreground font-medium">{league} · {status === "finished" ? "FT" : "AO VIVO"}</span>
          <span className="font-label-xs text-label-xs text-foreground bg-surface-base px-1.5 py-0.2 rounded-md font-semibold">{score}</span>
        </div>
        <span className={cn("font-label-xs text-label-xs px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5", result === "green" ? "bg-primary/10 text-primary" : result === "red" ? "bg-destructive-container/20 text-destructive" : "bg-muted text-muted-foreground")}>
          <Icon className="h-3 w-3" aria-hidden="true" />
          {resultLabels[result]}
        </span>
      </div>
      <div className="flex items-center justify-between pl-1">
        <div className="flex flex-col">
          <span className="font-body-md text-body-md font-semibold text-foreground">{match}</span>
          <span className="font-label-xs text-label-xs text-muted-foreground">Pick: <strong className="text-foreground font-semibold">{pick}</strong></span>
        </div>
        <div className="flex flex-col items-end">
          <span className={cn("font-label-lg text-label-lg font-bold", pnl >= 0 ? "text-primary" : "text-destructive")}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}u
          </span>
          <span className="font-label-xs text-label-xs text-muted-foreground">{units} apostada</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 bg-surface-base/50 p-2 rounded-md text-center pl-2">
        <div className="flex flex-col">
          <span className="font-label-xs text-[9px] text-muted-foreground uppercase">Fair</span>
          <span className="font-label-sm text-label-sm text-secondary font-medium">{fair.toFixed(2)}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-xs text-[9px] text-muted-foreground uppercase">Pick</span>
          <span className="font-label-sm text-label-sm text-foreground font-bold">{pickOdd.toFixed(2)}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-xs text-[9px] text-muted-foreground uppercase">Close</span>
          <span className="font-label-sm text-label-sm text-muted-foreground">{close.toFixed(2)}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-xs text-[9px] text-muted-foreground uppercase">CLV</span>
          <span className={cn("font-label-sm text-label-sm font-bold", clv >= 0 ? "text-primary" : "text-destructive")}>{clv >= 0 ? "+" : ""}{clv.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

interface RecalibrateButtonProps {
  onRecalibrate: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function RecalibrateButton({ onRecalibrate, disabled = false, className }: RecalibrateButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");

  const handleClick = async () => {
    if (disabled) return;
    setState("loading");
    try {
      await onRecalibrate();
      setState("success");
      setTimeout(() => setState("idle"), 3500);
    } catch {
      setState("idle");
    }
  };

  return (
    <div className={cn("mt-space-sm p-space-md bg-surface-subtle rounded-lg flex flex-col gap-space-sm shadow-lg", className)}>
      <div className="flex items-start gap-space-sm">
        <Terminal className="h-6 w-6 text-primary" aria-hidden="true" />
        <div className="flex flex-col">
          <span className="font-body-md text-body-md text-foreground font-semibold">Pipeline de Re-ajuste Quant</span>
          <span className="font-label-xs text-label-xs text-muted-foreground">Executa cron trigger Platt-Scaling contra novas linhas de fechamento Pinnacle/Betfair.</span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || state === "loading"}
        className={cn("recalibrate-btn", state === "loading" && "loading", state === "success" && "success")}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          {state === "loading" ? "autorenew" : state === "success" ? "check_circle" : "autorenew"}
        </span>
        <span>
          {state === "loading" ? "Calculando Matriz de Brier..." : state === "success" ? "Calibração Concluída" : "Recalibrar Modelos Agora"}
        </span>
      </button>
      <span className="font-label-xs text-label-xs text-center text-muted-foreground">Endpoint: POST /api/cron/recalibrate</span>
    </div>
  );
}