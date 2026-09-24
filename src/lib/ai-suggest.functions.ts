import { createServerFn } from "@tanstack/react-start";
import { spTodayISO } from "@/lib/match-dates";
import { getDailyPicks, type PicksDayPayload } from "@/lib/picks/picks.functions";
import type { MarketId, ParlayLeg, ParlaySuggestion } from "@/lib/types";
import type { ParlayDayResult } from "@/lib/picks/parlays";

/**
 * L1 — substitui motor "IA" legado.
 * Sugestões = perfis reais do motor de múltiplas (parlays), não Π probability.
 * Datas em America/Sao_Paulo (L2).
 */

const PROFILE_UI: Array<{
  id: ParlaySuggestion["id"];
  profile: "segura" | "equilibrada" | "ousada";
  title: string;
  riskText: string;
  explanation: string;
}> = [
  {
    id: "safe",
    profile: "segura",
    title: "Dupla Conservadora",
    riskText: "Segura",
    explanation:
      "2–3 pernas com odd total 1.9–3.2, P mínima 35%, correlação via matriz quando mesmo jogo.",
  },
  {
    id: "moderate",
    profile: "equilibrada",
    title: "Tripla de Valor",
    riskText: "Moderada",
    explanation:
      "2–3 pernas com EV positivo, odd 4–8, diversificação de ligas, validação por Monte Carlo.",
  },
  {
    id: "aggressive",
    profile: "ousada",
    title: "Múltipla Ousada",
    riskText: "Ousada",
    explanation: "3–4 pernas de alto retorno (odd 10–20). Risco alto — no máximo 4 pernas.",
  },
];

function toSuggestions(payload: PicksDayPayload): ParlaySuggestion[] {
  const out: ParlaySuggestion[] = [];
  for (const ui of PROFILE_UI) {
    const day: ParlayDayResult | undefined = payload.parlays?.[ui.profile];
    const pl = day?.parlays?.[0];
    if (!pl) continue;

    const legs: ParlayLeg[] = pl.legs.map((l) => ({
      matchId: l.pick.eventId,
      market: l.pick.market as MarketId,
      marketLabel: l.pick.selectionLabel,
      odds: l.pick.odd > 1 ? l.pick.odd : null,
      probability: l.pick.p,
    }));

    const totalOdds = legs.reduce((a, l) => a * (l.odds ?? 1), 1);

    out.push({
      id: ui.id,
      type: ui.title,
      title: ui.title,
      riskText: ui.riskText,
      explanation: `${ui.explanation} ${day.honestMessage ?? ""}`.trim(),
      totalOdds: +totalOdds.toFixed(2),
      totalProbability: pl.pTotal,
      selectionIds: legs.map((l) => l.matchId),
      legs,
      fairCombinedOdds: pl.fairCombinedOdds,
      combinedOddsReal: pl.combinedOddsReal ? totalOdds : null,
    });
  }
  return out;
}

export const getAiSuggestions = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const payload = (await getDailyPicks({ data: spTodayISO() })) as PicksDayPayload;
    return { suggestions: toSuggestions(payload) };
  } catch (error) {
    console.error("[getAiSuggestions]", error);
    return { suggestions: [] as ParlaySuggestion[] };
  }
});
