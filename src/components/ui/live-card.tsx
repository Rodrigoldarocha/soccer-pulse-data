import { cn } from "@/lib/utils";
import { Verified, ChartLine, Gauge, AlertTriangle } from "lucide-react";
import { ReactNode } from "react";

interface LiveCardProps {
  children: ReactNode;
  isActivePick?: boolean;
  glow?: boolean;
  className?: string;
}

export function LiveCard({ children, isActivePick, glow, className }: LiveCardProps) {
  return (
    <article className={cn("live-card", glow && "live-glow", className)}>
      {children}
    </article>
  );
}

interface MatchHeaderProps {
  minute: string;
  period: "1T" | "2T" | "HT" | "FT";
  league: string;
  round?: string;
  model?: string;
  className?: string;
}

export function MatchHeader({ minute, period, league, round, model, className }: MatchHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-space-sm">
        <span className={cn("match-badge match-badge-live")}>
          <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-ping" aria-hidden="true" />
          {minute} {period}
        </span>
        <span className="font-label-xs text-label-xs text-muted-foreground">
          {league}{round ? ` · ${round}` : ""}
        </span>
      </div>
      {model && (
        <span className="model-tag model-tag-api">
          {model}
        </span>
      )}
    </div>
  );
}

interface ScoreboardProps {
  home: { name: string; short: string; score: number; logo?: string };
  away: { name: string; short: string; score: number; logo?: string };
  className?: string;
}

export function Scoreboard({ home, away, className }: ScoreboardProps) {
  return (
    <div className={cn("flex flex-col space-y-space-sm", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-surface-overlay flex items-center justify-center text-foreground font-label-md text-label-md font-bold">
            {home.short}
          </div>
          <span className="font-headline-sm text-headline-sm text-foreground">{home.name}</span>
        </div>
        <span className="font-headline-lg text-headline-lg font-bold text-foreground">{home.score}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-surface-overlay flex items-center justify-center text-foreground font-label-md text-label-md font-bold">
            {away.short}
          </div>
          <span className="font-headline-sm text-headline-sm text-foreground">{away.name}</span>
        </div>
        <span className="font-headline-lg text-headline-lg font-bold text-foreground">{away.score}</span>
      </div>
    </div>
  );
}

interface ActivePickBannerProps {
  market: string;
  entryOdd: number;
  requirement?: string;
  className?: string;
}

export function ActivePickBanner({ market, entryOdd, requirement, className }: ActivePickBannerProps) {
  return (
    <div className={cn("rounded-lg bg-surface-base p-space-sm flex flex-col space-y-space-xs", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Verified className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-label-sm text-label-sm font-bold text-foreground">PICK ATIVO</span>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-label-xs text-label-xs font-bold">
          Odd Entrada {entryOdd.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-body-md text-body-md text-foreground font-medium">{market}</span>
        {requirement && (
          <span className="font-label-xs text-label-xs text-muted-foreground">{requirement}</span>
        )}
      </div>
    </div>
  );
}

interface LiveProbabilityBarProps {
  probability: number;
  fairOddsLive: number;
  marketOddsConsensus: number;
  label?: string;
  className?: string;
}

export function LiveProbabilityBar({ probability, fairOddsLive, marketOddsConsensus, label = "P(Vitória do Pick Ao Vivo)", className }: LiveProbabilityBarProps) {
  const pct = Math.round(probability * 100);

  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      <div className="flex items-center justify-between">
        <span className="font-label-xs text-label-xs text-muted-foreground flex items-center gap-1">
          <ChartLine className="h-4 w-4 text-primary" aria-hidden="true" />
          {label}
        </span>
        <span className="font-label-md text-label-md font-bold text-primary">{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-surface-overlay overflow-hidden relative">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between font-label-xs text-label-xs text-muted-foreground pt-0.5">
        <span>Odd Justa Live: {fairOddsLive.toFixed(2)}</span>
        <span>Consenso Mercado: {marketOddsConsensus.toFixed(2)}</span>
      </div>
    </div>
  );
}

interface CLVTrackerProps {
  entryOdd: number;
  closingOdd: number;
  clvPct: number;
  className?: string;
}

export function CLVTracker({ entryOdd, closingOdd, clvPct, className }: CLVTrackerProps) {
  const isPositive = clvPct > 0;

  return (
    <div className={cn("rounded-lg bg-surface-overlay p-space-sm flex items-center justify-between", className)}>
      <div className="flex items-center gap-space-sm">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <ChartLine className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col">
          <span className="font-label-xs text-label-xs text-muted-foreground uppercase">CLV Tracker (Closing Line Value)</span>
          <div className="flex items-center gap-1.5">
            <span className="font-label-sm text-label-sm text-foreground">{entryOdd.toFixed(2)}</span>
            <span className="text-muted-foreground text-label-xs">→</span>
            <span className="font-label-sm text-label-sm text-muted-foreground">Fech. {closingOdd.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className={cn("px-2 py-0.5 rounded-md font-label-sm text-label-sm font-bold flex items-center gap-0.5", isPositive ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive")}>
          {isPositive ? <Gauge className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {isPositive ? "+" : ""}{clvPct.toFixed(1)}%
        </span>
        <span className="font-label-xs text-label-xs text-muted-foreground mt-0.5">
          {isPositive ? "Beat the Line!" : "Below Closing"}
        </span>
      </div>
    </div>
  );
}

interface LiveTelemetryProps {
  possession: { home: number; away: number };
  shots: { home: { total: number; onTarget: number }; away: { total: number; onTarget: number } };
  xG: { home: number; away: number; total: number };
  className?: string;
}

export function LiveTelemetry({ possession, shots, xG, className }: LiveTelemetryProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-space-xs pt-1", className)}>
      <div className="rounded-lg bg-surface-base p-2 flex flex-col items-center justify-center text-center">
        <span className="font-label-xs text-label-xs text-muted-foreground uppercase mb-1">Posse</span>
        <span className="font-label-md text-label-md font-bold text-foreground">
          {possession.home}% <span className="text-muted-foreground font-normal">|</span> {possession.away}%
        </span>
        <div className="w-full h-1 bg-surface-overlay rounded-full mt-1.5 overflow-hidden flex">
          <div className="bg-primary h-full" style={{ width: `${possession.home}%` }} />
          <div className="bg-secondary h-full" style={{ width: `${possession.away}%` }} />
        </div>
      </div>
      <div className="rounded-lg bg-surface-base p-2 flex flex-col items-center justify-center text-center">
        <span className="font-label-xs text-label-xs text-muted-foreground uppercase mb-1">Finaliz. (No Alvo)</span>
        <span className="font-label-md text-label-md font-bold text-foreground">
          {shots.home.total}({shots.home.onTarget}) <span className="text-muted-foreground font-normal">vs</span> {shots.away.total}({shots.away.onTarget})
        </span>
        {shots.home.total + shots.away.total > 15 && (
          <span className="font-label-xs text-label-xs text-primary mt-1">Pressão Alta</span>
        )}
      </div>
      <div className="rounded-lg bg-surface-base p-2 flex flex-col items-center justify-center text-center">
        <span className="font-label-xs text-label-xs text-muted-foreground uppercase mb-1">xG Dinâmico</span>
        <span className="font-label-md text-label-md font-bold text-secondary">
          {xG.home.toFixed(2)} <span className="text-muted-foreground font-normal">|</span> {xG.away.toFixed(2)}
        </span>
        <span className="font-label-xs text-label-xs text-tertiary mt-1">Total: {xG.total.toFixed(2)} xG</span>
      </div>
    </div>
  );
}

interface DiscalibrationAlertProps {
  market: string;
  marketOdds: number;
  fairOdds: number;
  evPct: number;
  description: string;
  onAlert?: () => void;
  className?: string;
}

export function DiscalibrationAlert({ market, marketOdds, fairOdds, evPct, description, onAlert, className }: DiscalibrationAlertProps) {
  return (
    <div className={cn("rounded-lg bg-surface-base p-space-sm flex flex-col space-y-2", className)}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-tertiary shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex flex-col min-w-0">
          <span className="font-label-sm text-label-sm font-bold text-foreground">Linha Descalibrada no {market} Live</span>
          <p className="font-body-sm text-body-sm text-muted-foreground leading-tight">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-space-xs pt-1">
        <div className="rounded-lg bg-surface-overlay p-2 flex flex-col">
          <span className="font-label-xs text-label-xs text-muted-foreground">Odd Mercado</span>
          <span className="font-label-lg text-label-lg font-bold text-foreground">{marketOdds.toFixed(2)}</span>
          <span className="font-label-xs text-label-xs text-muted-foreground">P. Implícita: {(100 / marketOdds).toFixed(1)}%</span>
        </div>
        <div className="rounded-lg bg-surface-overlay p-2 flex flex-col">
          <span className="font-label-xs text-label-xs text-secondary">Fair Value PulseLab</span>
          <span className="font-label-lg text-label-lg font-bold text-secondary">{fairOdds.toFixed(2)}</span>
          <span className="font-label-xs text-label-xs text-primary font-bold">Vantagem: +{evPct.toFixed(1)}% EV</span>
        </div>
      </div>
      {onAlert && (
        <button
          className="w-full mt-1 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-primary-foreground font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-transform shadow-md"
          onClick={onAlert}
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <span>Colocar Alerta / Preparar Entrada</span>
        </button>
      )}
    </div>
  );
}

interface TechnicalFooterProps {
  className?: string;
}

export function TechnicalFooter({ className }: TechnicalFooterProps) {
  return (
    <footer className={cn("rounded-xl bg-surface-base/50 p-space-md flex flex-col space-y-space-xs mt-2 text-center items-center", className)}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
        <span className="font-label-xs text-label-xs font-semibold uppercase tracking-wider text-foreground">Engine Quant Conectado</span>
        <span className="text-muted-foreground">•</span>
        <span className="font-label-xs text-label-xs text-muted-foreground">Socket v2.4</span>
      </div>
      <p className="font-body-sm text-body-sm text-muted-foreground max-w-xs">
        Feeds esportivos com delay controlado ({'<1.2s'}) vs casas asiáticas (Pinnacle/Singbet). CLV apurado em tempo real contra as odds de encerramento do bookmaker de referência.
      </p>
      <div className="flex items-center gap-space-md pt-1 font-label-xs text-label-xs text-muted-foreground">
        <span>Buffer de Resincronização: 30s</span>
        <span>•</span>
        <span>Auditado Brier Score</span>
      </div>
    </footer>
  );
}