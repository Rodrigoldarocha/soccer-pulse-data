import { motion } from "framer-motion";
import { Check, Plus, TrendingUp, Flame, Shield, Zap } from "lucide-react";
import type { MatchPrediction, MarketId } from "@/lib/types";
import { useBetSlip } from "@/lib/bet-slip";
import { cn } from "@/lib/utils";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function confidenceConfig(c: MatchPrediction["confidence"]) {
  const map = {
    high: { label: "Alta", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    medium: { label: "Média", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
    low: { label: "Baixa", icon: Flame, color: "text-rose-400", bg: "bg-rose-500/10" },
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

function getMarkets(match: MatchPrediction): MarketOption[] {
  return [
    {
      id: "1X2_HOME",
      label: `Vitória ${match.home.short}`,
      shortLabel: match.home.short,
      odds: match.odds.home,
      probability: match.probabilities.home,
    },
    {
      id: "DRAW",
      label: "Empate",
      shortLabel: "EMP",
      odds: match.odds.draw,
      probability: match.probabilities.draw,
    },
    {
      id: "1X2_AWAY",
      label: `Vitória ${match.away.short}`,
      shortLabel: match.away.short,
      odds: match.odds.away,
      probability: match.probabilities.away,
    },
    {
      id: "OVER_2_5",
      label: "Mais de 2.5 gols",
      shortLabel: "O2.5",
      odds: match.odds.over25,
      probability: match.probabilities.over25,
    },
    {
      id: "BTTS",
      label: "Ambas marcam",
      shortLabel: "BTTS",
      odds: match.odds.btts,
      probability: match.probabilities.btts,
    },
  ];
}

function MarketButton({
  market,
  selected,
  onSelect,
  isRecommended,
}: {
  market: MarketOption;
  selected: boolean;
  onSelect: () => void;
  isRecommended?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 text-center transition-all duration-200",
        selected
          ? "bg-primary/20 text-primary ring-1 ring-primary/40 shadow-sm shadow-primary/10"
          : isRecommended
          ? "bg-primary/8 text-primary/80 ring-1 ring-primary/15 hover:bg-primary/15"
          : "bg-white/5 text-muted-foreground hover:bg-white/8 hover:text-foreground",
      )}
    >
      {isRecommended && !selected && (
        <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
      )}
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
        {market.shortLabel}
      </span>
      <span className="font-display text-sm font-bold tabular-nums">
        {market.odds.toFixed(2)}
      </span>
      <span className={cn(
        "text-[10px] font-semibold",
        market.probability >= 0.5 ? "text-emerald-400" : market.probability >= 0.35 ? "text-amber-400" : "text-muted-foreground",
      )}>
        {(market.probability * 100).toFixed(0)}%
      </span>
    </button>
  );
}

export function MatchCard({ match, live = false }: { match: MatchPrediction; live?: boolean }) {
  const { addLeg, removeLeg, hasLeg } = useBetSlip();
  const confidence = confidenceConfig(match.confidence);
  const ConfidenceIcon = confidence.icon;
  const markets = getMarkets(match);

  const isMarketSelected = (marketId: MarketId) =>
    hasLeg(match.id, marketId);

  const handleMarketSelect = (market: MarketOption) => {
    if (isMarketSelected(market.id)) {
      removeLeg(match.id);
    } else {
      addLeg({
        matchId: match.id,
        market: market.id,
        marketLabel: market.label,
        odds: market.odds,
        probability: market.probability,
        matchLabel: `${match.home.name} × ${match.away.name}`,
        leagueLabel: match.leagueLabel,
      });
    }
  };

  const anySelected = markets.some((m) => isMarketSelected(m.id));

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className={cn(
        "card-elevated group p-4",
        anySelected && "ring-1 ring-primary/20 border-primary/30",
      )}
    >
      {/* Header: league + time */}
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{match.leagueLabel}</span>
        <div className="flex items-center gap-2">
          <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5", confidence.bg)}>
            <ConfidenceIcon className={cn("h-3 w-3", confidence.color)} />
            <span className={cn("text-[10px] font-semibold", confidence.color)}>
              {confidence.label}
            </span>
          </span>
          <span>
            {live ? (
              <span className="inline-flex items-center gap-1 text-rose-400">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                {match.minute}&apos;
              </span>
            ) : (
              fmtTime(match.kickoff)
            )}
          </span>
        </div>
      </div>

      {/* Teams + score */}
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="text-right">
          <div className="text-2xl leading-none">{match.home.logo}</div>
          <div className="mt-1.5 font-display text-sm font-semibold text-foreground truncate">
            {match.home.name}
          </div>
          <div className="text-[10px] text-muted-foreground">xG {match.home.xg}</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          {live ? (
            <div className="rounded-xl bg-foreground/10 px-3 py-1.5 font-display text-lg font-bold text-foreground tabular-nums">
              {match.scoreHome}–{match.scoreAway}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="h-px w-4 bg-border" />
              <span className="text-[11px] font-semibold text-muted-foreground">vs</span>
              <div className="h-px w-4 bg-border" />
            </div>
          )}
        </div>
        <div className="text-left">
          <div className="text-2xl leading-none">{match.away.logo}</div>
          <div className="mt-1.5 font-display text-sm font-semibold text-foreground truncate">
            {match.away.name}
          </div>
          <div className="text-[10px] text-muted-foreground">xG {match.away.xg}</div>
        </div>
      </div>

      {/* 3 Markets Grid */}
      <div className="mt-4 rounded-xl bg-white/3 p-1">
        {/* 1X2 row */}
        <div className="mb-1">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            1X2
          </div>
          <div className="grid grid-cols-3 gap-1">
            {markets.slice(0, 3).map((m) => (
              <MarketButton
                key={m.id}
                market={m}
                selected={isMarketSelected(m.id)}
                onSelect={() => handleMarketSelect(m)}
                isRecommended={m.id === match.suggestedMarket}
              />
            ))}
          </div>
        </div>

        {/* Over 2.5 + BTTS row */}
        <div className="grid grid-cols-2 gap-1">
          {markets.slice(3).map((m) => (
            <MarketButton
              key={m.id}
              market={m}
              selected={isMarketSelected(m.id)}
              onSelect={() => handleMarketSelect(m)}
              isRecommended={m.id === match.suggestedMarket}
            />
          ))}
        </div>
      </div>

      {/* Add all recommended */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {markets.filter((m) => isMarketSelected(m.id)).length} selecionado{markets.filter((m) => isMarketSelected(m.id)).length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => {
            const rec = markets.find((m) => m.id === match.suggestedMarket);
            if (rec) handleMarketSelect(rec);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95",
            isMarketSelected(match.suggestedMarket)
              ? "bg-primary text-primary-foreground"
              : "bg-white/8 text-foreground hover:bg-white/12",
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
