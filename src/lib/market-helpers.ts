// Helpers puros de mercado — importáveis no client sem puxar server modules (R7).

import type { MatchPrediction, MarketId } from "./types";

export type BettingOption = {
  market: MarketId;
  label: string;
  /** Odd real > 1; null = sem odd real (nunca fabricar — fairOdds é só referência). */
  odds: number | null;
  probability: number;
};

/** 6 mercados núcleo definidos em ML_ARCHITECTURE — sempre exibidos no card. */
export function bettingOptionsFor(match: MatchPrediction): BettingOption[] {
  const p = match.probabilities;
  const o = match.odds;
  const realOdd = (value: number | null | undefined): number | null =>
    value != null && Number.isFinite(value) && value > 1 ? value : null;

  return [
    { market: "1X2_HOME", label: "Vit. casa", odds: realOdd(o.home), probability: p.home },
    { market: "DRAW", label: "Empate", odds: realOdd(o.draw), probability: p.draw },
    { market: "1X2_AWAY", label: "Vit. fora", odds: realOdd(o.away), probability: p.away },
    { market: "OVER_2_5", label: "Over 2.5", odds: realOdd(o.over25), probability: p.over25 },
    { market: "BTTS", label: "BTTS Sim", odds: realOdd(o.btts), probability: p.btts },
    {
      market: "DOUBLE_CHANCE_1X",
      label: "1X Casa",
      odds: realOdd(o.doubleChance1X),
      probability: p.home + p.draw,
    },
  ];
}

export function marketLabelFor(
  match: MatchPrediction,
  market: MarketId,
): { label: string; odds: number | null; probability: number } {
  const p = match.probabilities;
  const o = match.odds;
  switch (market) {
    case "1X2_HOME":
      return { label: `Vitória ${match.home.short}`, odds: o.home, probability: p.home };
    case "1X2_AWAY":
      return { label: `Vitória ${match.away.short}`, odds: o.away, probability: p.away };
    case "DRAW":
      return { label: "Empate", odds: o.draw, probability: p.draw };
    case "OVER_1_5":
      return { label: "Over 1.5 gols", odds: o.over15, probability: p.over15 };
    case "OVER_2_5":
      return { label: "Over 2.5 gols", odds: o.over25, probability: p.over25 };
    case "OVER_3_5":
      return { label: "Over 3.5 gols", odds: o.over35, probability: p.over35 };
    case "UNDER_1_5":
      return { label: "Under 1.5 gols", odds: o.under15, probability: 1 - p.over15 };
    case "UNDER_2_5":
      return { label: "Under 2.5 gols", odds: o.under25, probability: 1 - p.over25 };
    case "UNDER_3_5":
      return { label: "Under 3.5 gols", odds: o.under35, probability: 1 - p.over35 };
    case "BTTS":
      return { label: "BTTS Sim", odds: o.btts, probability: p.btts };
    case "BTTS_NO":
      return { label: "BTTS Não", odds: o.bttsNo, probability: 1 - p.btts };
    case "DOUBLE_CHANCE_1X":
      return {
        label: `Vitória ou empate (${match.home.short}/Empate)`,
        odds: o.doubleChance1X,
        probability: p.home + p.draw,
      };
    case "DOUBLE_CHANCE_X2":
      return {
        label: `Empate ou vitória (${match.away.short})`,
        odds: o.doubleChanceX2,
        probability: p.draw + p.away,
      };
    case "DOUBLE_CHANCE_12":
      return {
        label: `Sem empate (${match.home.short}/${match.away.short})`,
        odds: o.doubleChance12,
        probability: 1 - p.draw,
      };
    default: {
      const edge = match.markets?.find((m) => m.market === market);
      return {
        label: market,
        odds: edge?.odd ?? null,
        probability: edge?.probability ?? 0,
      };
    }
  }
}
