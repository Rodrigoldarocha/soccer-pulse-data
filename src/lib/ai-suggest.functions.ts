import { createServerFn } from "@tanstack/react-start";
import { getRealMatches, marketLabelFor } from "./matches.server";
import type { MatchPrediction, MarketId, ParlayLeg, ParlaySuggestion } from "./types";

function todayISO() {
  const now = new Date(Date.now());
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function buildLegs(matches: MatchPrediction[], picks: { matchId: string; market: MarketId }[]): ParlayLeg[] {
  return picks
    .map((p) => {
      const m = matches.find((x) => x.id === p.matchId);
      if (!m) return null;
      const info = marketLabelFor(m, p.market);
      return {
        matchId: m.id,
        market: p.market,
        marketLabel: info.label,
        odds: info.odds,
        probability: info.probability,
      } satisfies ParlayLeg;
    })
    .filter((x): x is ParlayLeg => x !== null);
}

function totals(legs: ParlayLeg[]) {
  const totalOdds = legs.reduce((a, l) => a * l.odds, 1);
  const totalProbability = legs.reduce((a, l) => a * l.probability, 1);
  return { totalOdds: +totalOdds.toFixed(2), totalProbability: +totalProbability.toFixed(4) };
}

function buildCombos(matches: MatchPrediction[]): ParlaySuggestion[] {
  const sorted = [...matches].sort((a, b) => b.suggestedProbability - a.suggestedProbability);
  const top = sorted.slice(0, 2);
  const mid = sorted.slice(0, 3);
  const wild = [...sorted.slice(0, 3), sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 2]].filter(Boolean);

  const configs: { id: ParlaySuggestion["id"]; title: string; riskText: ParlaySuggestion["riskText"]; explanation: string; items: MatchPrediction[] }[] = [
    {
      id: "safe",
      title: "Dupla Conservadora",
      riskText: "Segura",
      explanation: "Selecionamos os dois mercados com maior probabilidade calculada via xG, priorizando favoritos com defesa sólida.",
      items: top,
    },
    {
      id: "moderate",
      title: "Tripla de Valor",
      riskText: "Moderada",
      explanation: "Três eventos com bom equilíbrio entre probabilidade e retorno, misturando 1X2 e Over 2.5.",
      items: mid,
    },
    {
      id: "aggressive",
      title: "Múltipla Ousada",
      riskText: "Ousada",
      explanation: "Cinco pernas para caçar odds altas — inclui jogos abertos com projeção de gols e um outsider tático.",
      items: wild.slice(0, 5),
    },
  ];

  return configs.map((c) => {
    const legs = buildLegs(matches, c.items.map((m) => ({ matchId: m.id, market: m.suggestedMarket })));
    const { totalOdds, totalProbability } = totals(legs);
    return {
      id: c.id,
      type: c.title,
      title: c.title,
      riskText: c.riskText,
      explanation: c.explanation,
      totalOdds,
      totalProbability,
      selectionIds: legs.map((l) => l.matchId),
      legs,
    } satisfies ParlaySuggestion;
  });
}

export const getAiSuggestions = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const date = todayISO();
    const matches = await getRealMatches(date);
    return { suggestions: buildCombos(matches), matches };
  } catch (error) {
    console.error("[getAiSuggestions]", error);
    return { suggestions: [], matches: [] };
  }
});
