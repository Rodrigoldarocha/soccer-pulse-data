import { memo } from "react";
import { motion } from "framer-motion";
import { Shield, Zap, Flame } from "lucide-react";
import type { MatchPrediction } from "@/lib/types";
import { fmtTimeSP } from "@/lib/match-dates";
import { probGroupsFor, type ProbLevel, type ProbRow } from "@/lib/probability-view";
import { cn } from "@/lib/utils";

function confidenceConfig(c: MatchPrediction["confidence"]) {
  const map = {
    high: { label: "Alta", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    medium: { label: "Média", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
    low: { label: "Baixa", icon: Flame, color: "text-rose-400", bg: "bg-rose-500/10" },
  } as const;
  return map[c];
}

const LEVEL_BAR: Record<ProbLevel, string> = {
  strong: "bg-emerald-500/70",
  moderate: "bg-amber-500/60",
  neutral: "bg-white/10",
};

const LEVEL_PCT: Record<ProbLevel, string> = {
  strong: "text-emerald-400",
  moderate: "text-amber-400",
  neutral: "text-muted-foreground/70",
};

const ProbLine = memo(function ProbLine({ row }: { row: ProbRow }) {
  const width = `${Math.round(row.p * 100)}%`;
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/40 bg-white/[0.02] px-3 py-2">
      <div
        aria-hidden
        className={cn("absolute inset-y-0 left-0 opacity-20", LEVEL_BAR[row.level])}
        style={{ width }}
      />
      <div className="relative flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {row.label}
        </span>
        <span
          className={cn(
            "font-display text-xl font-bold tabular-nums tracking-tight",
            LEVEL_PCT[row.level],
          )}
        >
          {row.pct}
        </span>
      </div>
    </div>
  );
});

function ProbGroup({ title, rows }: { title: string; rows: ProbRow[] }) {
  return (
    <section aria-label={title}>
      <h3 className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
        {title}
      </h3>
      <div className="grid gap-1.5">
        {rows.map((r) => (
          <ProbLine key={r.label} row={r} />
        ))}
      </div>
    </section>
  );
}

export function MatchCard({ match, live = false }: { match: MatchPrediction; live?: boolean }) {
  const confidence = confidenceConfig(match.confidence);
  const ConfidenceIcon = confidence.icon;
  const groups = probGroupsFor(match);
  const isLive = live || match.status === "live";

  return (
    <motion.article
      layout
      transition={{ duration: 0.2 }}
      className="card-premium group w-full overflow-hidden"
    >
      {/* Header: liga + horário */}
      <div className="flex items-center justify-between gap-2 border-b border-border/30 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
            {match.leagueLabel}
          </p>
          <p className="mt-0.5 tabular-nums text-[11px] text-muted-foreground/40">
            {fmtTimeSP(match.kickoff)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
              AO VIVO
            </span>
          )}
          <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5", confidence.bg)}>
            <ConfidenceIcon className={cn("h-3 w-3", confidence.color)} />
            <span className={cn("text-[10px] font-semibold", confidence.color)}>
              {confidence.label}
            </span>
          </span>
        </div>
      </div>

      {/* Confronto */}
      <div className="mx-3 my-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:mx-4 sm:my-4 sm:gap-3">
        <div className="text-right">
          <div className="text-2xl leading-none sm:text-3xl">{match.home.logo}</div>
          <div className="mt-1 truncate font-display text-sm font-semibold text-foreground sm:text-base">
            {match.home.name}
          </div>
        </div>
        <div className="flex flex-col items-center">
          {isLive ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-center sm:px-3 sm:py-1.5">
              <div className="font-display text-lg font-bold tabular-nums text-rose-400 sm:text-xl">
                {match.scoreHome ?? "-"}
              </div>
              <div className="mt-0.5 text-[9px] text-muted-foreground/50 sm:text-[10px]">×</div>
              <div className="font-display text-lg font-bold tabular-nums text-rose-400 sm:text-xl">
                {match.scoreAway ?? "-"}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="h-px w-3 bg-border/60 sm:w-5" />
              <span className="text-[10px] font-semibold text-muted-foreground/40 sm:text-[11px]">
                ×
              </span>
              <div className="h-px w-3 bg-border/60 sm:w-5" />
            </div>
          )}
        </div>
        <div className="text-left">
          <div className="text-2xl leading-none sm:text-3xl">{match.away.logo}</div>
          <div className="mt-1 truncate font-display text-sm font-semibold text-foreground sm:text-base">
            {match.away.name}
          </div>
        </div>
      </div>

      {/* Probabilidades */}
      <div className="space-y-2.5 px-3 pb-3 sm:px-4 sm:pb-4">
        <ProbGroup title="BTTS" rows={[...groups.btts]} />
        <ProbGroup title="1X2" rows={[...groups.x12]} />
        <ProbGroup title="Over / Under 2.5" rows={[...groups.overUnder]} />
      </div>

      {/* Footer: confiança do modelo */}
      <div className="flex items-center justify-center border-t border-border/30 px-3 py-2.5 sm:px-4">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40 sm:text-[11px]">
          Confiança do modelo:{" "}
          <span className={cn("font-semibold", confidence.color)}>{confidence.label}</span>
        </span>
      </div>
    </motion.article>
  );
}
