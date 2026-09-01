import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { MarketId, ParlayLeg } from "./types";

export interface SlipLeg extends ParlayLeg {
  matchLabel: string;
  leagueLabel: string;
}

interface SlipContextValue {
  legs: SlipLeg[];
  stake: number;
  setStake: (n: number) => void;
  addLeg: (leg: SlipLeg) => void;
  removeLeg: (matchId: string) => void;
  toggleLeg: (leg: SlipLeg) => void;
  clear: () => void;
  loadLegs: (legs: SlipLeg[]) => void;
  hasLeg: (matchId: string, market: MarketId) => boolean;
  totals: { odds: number; probability: number; ret: number; profit: number };
}

const SlipContext = createContext<SlipContextValue | null>(null);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [legs, setLegs] = useState<SlipLeg[]>([]);
  const [stake, setStake] = useState(10);

  const addLeg = useCallback((leg: SlipLeg) => {
    setLegs((prev) => {
      const filtered = prev.filter((l) => l.matchId !== leg.matchId);
      return [...filtered, leg];
    });
  }, []);
  const removeLeg = useCallback((matchId: string) => {
    setLegs((prev) => prev.filter((l) => l.matchId !== matchId));
  }, []);
  const toggleLeg = useCallback((leg: SlipLeg) => {
    setLegs((prev) => {
      const existing = prev.find((l) => l.matchId === leg.matchId && l.market === leg.market);
      if (existing) return prev.filter((l) => !(l.matchId === leg.matchId && l.market === leg.market));
      return [...prev.filter((l) => l.matchId !== leg.matchId), leg];
    });
  }, []);
  const clear = useCallback(() => setLegs([]), []);
  const loadLegs = useCallback((next: SlipLeg[]) => setLegs(next), []);
  const hasLeg = useCallback(
    (matchId: string, market: MarketId) => legs.some((l) => l.matchId === matchId && l.market === market),
    [legs],
  );

  const totals = useMemo(() => {
    const odds = legs.reduce((a, l) => a * l.odds, 1);
    const probability = legs.reduce((a, l) => a * l.probability, 1);
    const ret = odds * stake;
    return {
      odds: legs.length ? +odds.toFixed(2) : 0,
      probability: legs.length ? +probability.toFixed(4) : 0,
      ret: legs.length ? +ret.toFixed(2) : 0,
      profit: legs.length ? +(ret - stake).toFixed(2) : 0,
    };
  }, [legs, stake]);

  return (
    <SlipContext.Provider value={{ legs, stake, setStake, addLeg, removeLeg, toggleLeg, clear, loadLegs, hasLeg, totals }}>
      {children}
    </SlipContext.Provider>
  );
}

export function useBetSlip() {
  const ctx = useContext(SlipContext);
  if (!ctx) throw new Error("useBetSlip must be used within BetSlipProvider");
  return ctx;
}

export function riskLevel(probability: number, legCount: number) {
  if (legCount === 0) return { label: "Adicione seleções", tone: "muted" as const, hint: "Escolha jogos para montar sua múltipla." };
  if (probability >= 0.55) return { label: "Excelente / Baixo Risco", tone: "safe" as const, hint: "Combinação matematicamente sólida." };
  if (probability >= 0.3) return { label: "Bom valor / Risco Moderado", tone: "moderate" as const, hint: "Equilíbrio saudável entre odds e probabilidade." };
  if (probability >= 0.12) return { label: "Alto Risco", tone: "aggressive" as const, hint: "Odds atraentes, mas a chance real é limitada." };
  if (probability >= 0.04) return { label: "Muito Ousada", tone: "danger" as const, hint: "Cada perna adicional multiplica o risco." };
  return { label: "Jackpot Extremo", tone: "extreme" as const, hint: "Considere reduzir o número de pernas para melhorar a chance real." };
}