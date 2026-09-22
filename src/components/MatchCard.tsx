import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shield, Zap, Flame } from "lucide-react";
import type { MatchPrediction } from "@/lib/types";
import { fmtTimeSP } from "@/lib/match-dates";
import { fmtPct, probGroupsFor, probLevel, type ProbRow } from "@/lib/probability-view";
import { teamMonogram } from "@/lib/team-monogram";
import { cn } from "@/lib/utils";

function confidenceConfig(c: MatchPrediction["confidence"]) {
  const map = {
    high: { label: "Alta", icon: Shield, color: "text-confirmed", bg: "bg-confirmed/10" },
    medium: { label: "Média", icon: Zap, color: "text-chart-4", bg: "bg-chart-4/10" },
    low: { label: "Baixa", icon: Flame, color: "text-muted-foreground", bg: "bg-muted" },
  } as const;
  return map[c];
}

function ProbValue({ row }: { row: ProbRow }) {
  return (
    <span
      className={cn(
        "font-display text-sm font-bold tabular-nums",
        row.level === "strong"
          ? "prob-strong"
          : row.level === "moderate"
            ? "prob-moderate"
            : "prob-neutral",
      )}
    >
      {row.pct}
    </span>
  );
}

function ProbabilityBar({ value, level }: { value: number; level: ProbRow["level"] }) {
  const pct = Math.round(value * 100);
  const barColor =
    level === "strong"
      ? "bg-primary"
      : level === "moderate"
        ? "bg-chart-4"
        : "bg-muted-foreground/40";
  return (
    <div className="prob-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("prob-bar-fill", barColor)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function TeamCrest({ name, logo }: { name: string; logo?: string }) {
  const [failed, setFailed] = useState(false);
  const isUrl = !!logo && logo.startsWith("http") && !failed;
  if (isUrl) {
    return (
      <img
        src={logo}
        alt={`Escudo ${name}`}
        loading="lazy"
        className="h-6 w-6 object-contain sm:h-7 sm:w-7"
        onError={() => setFailed(true)}
      />
    );
  }
  const { initials, hue } = teamMonogram(name);
  return (
    <div
      aria-label={`Escudo ${name}`}
      role="img"
      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 font-display text-[9px] font-bold sm:h-7 sm:w-7"
      style={{
        backgroundColor: `hsl(${hue} 55% 22%)`,
        color: `hsl(${hue} 85% 78%)`,
      }}
    >
      {initials}
    </div>
  );
}

// Se o pipeline sugeriu um mercado mais forte para o dia, mostre isso em primeiro plano.
function headlineBadge(match: MatchPrediction) {
  if (match.predictionStatus === "unavailable") return null;
  const hp = match.headlineProbability ?? match.suggestedProbability;
  if (!Number.isFinite(hp) || hp <= 0) return null;
  const label = match.headlineLabel ?? match.suggestedLabel;
  const level = probLevel(hp);
  return { label, pct: fmtPct(hp), level };
}

export function MatchCard({ match, live = false }: { match: MatchPrediction; live?: boolean }) {
  const confidence = confidenceConfig(match.confidence);
  const groups = probGroupsFor(match);
  const isLive = live || match.status === "live";
  const headline = headlineBadge(match);

  return (
    <Link
      to="/match/$matchId"
      params={{ matchId: match.id }}
      className="group card-interactive flex items-center gap-3 rounded border border-border/50 bg-card px-3 py-2.5 sm:px-4 sm:py-3 focus-ring"
    >
      {/* Hora */}
      <div className="w-12 shrink-0 text-center">
        <span className="font-display text-sm font-bold tabular-nums text-muted-foreground">
          {fmtTimeSP(match.kickoff)}
        </span>
      </div>

      {/* Times */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <TeamCrest name={match.home.name} logo={match.home.logo} />
          <span className="truncate text-sm font-medium text-foreground">{match.home.name}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <TeamCrest name={match.away.name} logo={match.away.logo} />
          <span className="truncate text-sm font-medium text-foreground">{match.away.name}</span>
        </div>
      </div>

      {/* Placar ao vivo */}
      {isLive && (
        <div className="flex shrink-0 flex-col items-center rounded bg-live/10 px-2 py-1">
          <span className="font-display text-base font-bold tabular-nums text-live">
            {match.scoreHome ?? "-"}
          </span>
          <span className="text-[10px] text-muted-foreground/40">×</span>
          <span className="font-display text-base font-bold tabular-nums text-live">
            {match.scoreAway ?? "-"}
          </span>
        </div>
      )}

      {/* Probabilidades 1X2 */}
      {match.predictionStatus !== "unavailable" && (
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="flex flex-col items-end gap-1">
            {groups.x12.map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                <span className="hidden sm:block">
                  <ProbabilityBar value={r.p} level={r.level} />
                </span>
                <ProbValue row={r} />
              </div>
            ))}
          </div>
          <div className="flex flex-col items-end gap-1 text-[10px] text-muted-foreground/40">
            <span>C</span>
            <span>E</span>
            <span>F</span>
          </div>
        </div>
      )}

      {/* Linha de palpite diário (quando há um mercado com probabilidade legível) */}
      {headline && (
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-muted-foreground/50">
            Palpite
          </span>
          <span className={cn(
            "font-display text-xs font-bold tabular-nums transition-colors",
            headline.level === "strong"
              ? "text-confirmed"
              : headline.level === "moderate"
                ? "text-chart-4"
                : "text-muted-foreground",
          )}>
            {headline.label}
          </span>
          <span className={cn(
            "font-display text-sm font-bold tabular-nums",
            headline.level === "strong"
              ? "text-confirmed"
              : headline.level === "moderate"
                ? "text-chart-4"
                : "text-muted-foreground",
          )}>
            {headline.pct}
          </span>
        </div>
      )}

      {/* Badge de confiança do modelo */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        {isLive && (
          <span className="flex items-center gap-1 rounded-full border border-live/20 bg-live/10 px-2 py-0.5 text-[10px] font-semibold text-live live-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-live" />
            AO VIVO
          </span>
        )}
        {match.predictionStatus === "unavailable" ? (
          <span className="text-[10px] text-muted-foreground/40">Sem dados</span>
        ) : (
          <span className={cn("flex items-center gap-1 text-[10px] font-medium", confidence.color)}>
            <confidence.icon className="h-3 w-3" />
            {confidence.label}
          </span>
        )}
      </div>
    </Link>
  );
}
