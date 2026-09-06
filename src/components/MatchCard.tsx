import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, Plus, Shield, Zap, Flame, Clock, RefreshCw } from "lucide-react";
import type { MatchPrediction, MarketId } from "@/lib/types";
import { useBetSlip } from "@/lib/bet-slip";
import { cn } from "@/lib/utils";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtLiveAgo(iso: string) {
  const d = new Date(iso);
  const diff = Math.max(0, Date.now() - d.getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `há ${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `há ${m}min`;
  return `há ${Math.floor(m / 60)}h`;
}

function liveStatusText(minute: number | undefined) {
  if (minute === undefined) return "—";
  return `${minute}'`;
}

function liveLabel(isLive: boolean) {
  return isLive ? "AO VIVO" : "PRÓXIMO";
}

type LiveStatus = "live" | "scheduled" | "finished";

function matchStatusLabel(status: string): string {
  if (status === "live") return "AO VIVO";
  if (status === "finished") return "ENCERRADO";
  return "AGENDADO";
}

function confidenceConfig(c: MatchPrediction["confidence"]) {
  const map = {
    high: { label: "Alta", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10", glow: "shadow-emerald-500/10" },
    medium: { label: "Média", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10", glow: "shadow-amber-500/10" },
    low: { label: "Baixa", icon: Flame, color: "text-rose-400", bg: "bg-rose-500/10", glow: "shadow-rose-500/10" },
  } as const;
  return map[c];
}

interface MarketOption {
  id: MarketId;
  label: string;
  shortLabel: string;
  odds: number;
  probability: number;
}

interface MarketGroup {
  title: string;
  key: string;
  options: MarketOption[];
}

function getMarkets(match: MatchPrediction): MarketGroup[] {
  const p = match.odds;
  const pr = match.probabilities;
  return [
    {
      title: "1X2",
      key: "1x2",
      options: [
        { id: "1X2_HOME", label: `Vitória ${match.home.short}`, shortLabel: match.home.short, odds: p.home, probability: pr.home },
        { id: "DRAW", label: "Empate", shortLabel: "EMP", odds: p.draw, probability: pr.draw },
        { id: "1X2_AWAY", label: `Vitória ${match.away.short}`, shortLabel: match.away.short, odds: p.away, probability: pr.away },
      ],
    },
    {
      title: "BTTS",
      key: "btts",
      options: [
        { id: "BTTS", label: "Ambas marcam", shortLabel: "SIM", odds: p.btts, probability: pr.btts },
      ],
    },
    {
      title: "O/U 2.5",
      key: "ou25",
      options: [
        { id: "OVER_2_5", label: "Mais de 2.5 gols", shortLabel: "OVER", odds: p.over25, probability: pr.over25 },
      ],
    },
  ];
}

interface MarketButtonProps {
  option: MarketOption;
  selected: boolean;
  onSelect: () => void;
  isRecommended?: boolean;
  isLive?: boolean;
  updatedAgo: string;
}

const MarketButton = memo(function MarketButton({
  option,
  selected,
  onSelect,
  isRecommended,
  isLive,
  updatedAgo,
}: MarketButtonProps) {
  const best = option.probability >= 0.5 ? "text-emerald-400" : option.probability >= 0.35 ? "text-amber-400" : "text-muted-foreground/50";
  const pulse = isLive ? "animate-pulse" : "";

  return (
    <div className={cn(
      "relative rounded-xl border p-2.5 transition-all duration-300",
      selected && "border-primary/40 bg-primary/10",
      isRecommended && !selected && "border-primary/20 bg-primary/[0.04]",
      !selected && "border-border/40 bg-white/[0.02]",
    )}>
      {isRecommended && !selected && (
        <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
      )}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {option.shortLabel}
        </span>
        {updatedAgo && (
          <span className={cn(
            "flex items-center gap-1 text-[10px] text-muted-foreground/40",
            pulse && "text-rose-400",
          )}>
            <Clock className="h-3 w-3" />
            {updatedAgo}
          </span>
        )}
      </div>
      <div className="font-display text-xl font-bold tabular-nums tracking-tight">
        {option.odds.toFixed(2)}
      </div>
      <div className={cn(
        "mt-1 text-[11px] font-semibold tabular-nums",
        best,
      )}>
        {(option.probability * 100).toFixed(1)}%
      </div>
      <button
        onClick={onSelect}
        className={cn(
          "mt-2 w-full rounded-lg py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 active:scale-[0.96]",
          selected ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground/60 hover:bg-white/10 hover:text-foreground",
        )}
      >
        {selected ? "Selecionado" : "Adicionar"}
      </button>
    </div>
  );
});export function MatchCard({ match, live = false }: { match: MatchPrediction; live?: boolean }) {
  const { addLeg, removeLeg, hasLeg } = useBetSlip();
  const confidence = confidenceConfig(match.confidence);
  const ConfidenceIcon = confidence.icon;
  const marketGroups = getMarkets(match);
  const updatedAgo = live ? fmtLiveAgo(match.oddsUpdatedAt) : "";

  const isMarketSelected = useCallback(
    (marketId: MarketId) => hasLeg(match.id, marketId),
    [hasLeg, match.id],
  );

  const handleMarketSelect = useCallback(
    (option: MarketOption) => {
      if (isMarketSelected(option.id)) {
        removeLeg(match.id);
      } else {
        addLeg({
          matchId: match.id,
          market: option.id,
          marketLabel: option.label,
          odds: option.odds,
          probability: option.probability,
          matchLabel: `${match.home.name} × ${match.away.name}`,
          leagueLabel: match.leagueLabel,
        });
      }
    },
    [isMarketSelected, removeLeg, addLeg, match],
  );

  const selectedCount = marketGroups.reduce(
    (acc, g) => acc + g.options.filter((o) => isMarketSelected(o.id)).length,
    0,
  );

  const bestOption = marketGroups.flatMap((g) => g.options).find((o) => o.id === match.suggestedMarket);

  return (
    <motion.div
      layout
      whileHover={{ y: live ? 0 : -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "card-premium group overflow-hidden w-full",
        selectedCount > 0 && "ring-1 ring-primary/20 border-primary/30",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
        <div className="truncate">
          <span className="block truncate">{match.leagueLabel}</span>
          <span className="block text-[11px] text-muted-foreground/40 mt-0.5 leading-tight">
            {match.home.name} × {match.away.name}
          </span>
          <span className="block text-[11px] text-muted-foreground/30 mt-0.5">
            {fmtTime(match.kickoff)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {live && (
            <span className="flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-rose-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
              {liveLabel(live)}
            </span>
          )}
          <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5", confidence.bg)}>
            <ConfidenceIcon className={cn("h-3 w-3", confidence.color)} />
            <span className={cn("text-[10px] font-semibold", confidence.color)}>
              {confidence.label}
            </span>
          </span>
          <span className="tabular-nums text-muted-foreground/60">
            {live ? (
              <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500 inline-block" />
                {liveStatusText(match.minute)}
              </span>            ) : (
              <span className="tabular-nums">{fmtTime(match.kickoff)}</span>
            )}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="mx-3 my-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:mx-4 sm:my-4 sm:gap-3">
        <div className="text-right">
          <div className="text-2xl sm:text-3xl leading-none">{match.home.logo}</div>
          <div className="mt-1 font-display text-sm sm:text-base font-semibold text-foreground truncate">
            {match.home.name}
          </div>          <div className="mt-1 sm:mt-2 text-[10px] sm:text-[11px] tabular-nums text-muted-foreground/40">
            xG {match.home.xg}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          {live ? (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-2 py-1 sm:px-3 sm:py-1.5 text-center">
              <div className="font-display text-lg sm:text-xl font-bold text-rose-400 tabular-nums">
                {match.scoreHome ?? "-"}
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground/50 mt-0.5">×</div>
              <div className="font-display text-lg sm:text-xl font-bold text-rose-400 tabular-nums">
                {match.scoreAway ?? "-"}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="h-px w-3 sm:w-5 bg-border/60" />
              <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground/40">vs</span>
              <div className="h-px w-3 sm:w-5 bg-border/60" />
            </div>
          )}
        </div>
        <div className="text-left">
          <div className="text-2xl sm:text-3xl leading-none">{match.away.logo}</div>
          <div className="mt-1 font-display text-sm sm:text-base font-semibold text-foreground truncate">
            {match.away.name}
          </div>          <div className="mt-1 sm:mt-2 text-[10px] sm:text-[11px] tabular-nums text-muted-foreground/40">
            xG {match.away.xg}
          </div>
        </div>
      </div>

      {/* Markets */}
      <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-2">
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
          <span>Mercados principais</span>
          {live && updatedAgo && (
            <span className="flex items-center gap-1 text-rose-400/80">
              <RefreshCw className="h-3 w-3 animate-spin" />
              {updatedAgo}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {marketGroups.map((group) => (
            <div key={group.key} className="space-y-1.5">
              <div className="px-1 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                {group.title}
              </div>
              <div className="grid grid-cols-1 gap-1">
                {group.options.map((option) => (
                  <MarketButton
                    key={option.id}
                    option={option}
                    selected={isMarketSelected(option.id)}
                    onSelect={() => handleMarketSelect(option)}
                    isRecommended={option.id === match.suggestedMarket}
                    isLive={live}
                    updatedAgo={updatedAgo}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/30 px-3 py-3 sm:px-4 sm:py-3">          <span className="text-[10px] sm:text-[11px] text-muted-foreground/50 tabular-nums">
            {selectedCount} selecionado{selectedCount !== 1 ? "s" : ""}
          </span>
        <button
          onClick={() => {
            if (bestOption) handleMarketSelect(bestOption);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 active:scale-[0.96]",
            isMarketSelected(match.suggestedMarket)
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "bg-white/[0.06] text-foreground/80 hover:bg-white/[0.1]",
          )}
        >
          {isMarketSelected(match.suggestedMarket) ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Selecionado
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Sugerido
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
