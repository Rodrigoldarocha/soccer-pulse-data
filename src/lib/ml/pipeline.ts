import type { FootballEvent, PredictionData, MatchPrediction, MarketId } from "../types";
import { calibrateProbability } from "./calibration";
import { getEnsembleWeights, ensembleProbability, computeEnsembleConfidence } from "./ensemble";
import { loadCalibration } from "./accuracy-store";
import type { CalibrationParams, EnsembleWeights } from "./types";

function marginOdds(p: number, margin = 0.06) {
  const raw = 1 / Math.max(0.02, Math.min(0.98, p));
  return Math.max(1.02, +(raw * (1 - margin)).toFixed(2));
}

function inferShort(name: string): string {
  return name.substring(0, 3).toUpperCase();
}

const STATUS_MAP: Record<string, "scheduled" | "live" | "finished"> = {
  notstarted: "scheduled",
  inprogress: "live",
  finished: "finished",
  postponed: "scheduled",
  cancelled: "finished",
  scheduled: "scheduled",
  live: "live",
};

// ─── Cache for calibration ───────────────────────────────────────────

const calCache = new Map<string, CalibrationParams | undefined>();

async function getCalibration(leagueId: number, market: MarketId): Promise<CalibrationParams | undefined> {
  const key = `${leagueId}:${market}`;
  if (!calCache.has(key)) {
    calCache.set(key, await loadCalibration(leagueId, market));
  }
  return calCache.get(key);
}

// ─── Build prediction from FootballEvent + PredictionData ─────────────

export async function buildPrediction(
  event: FootballEvent,
  pred: PredictionData | undefined,
  leagueMeta: { id: string; name: string },
): Promise<MatchPrediction> {
  const hShort = inferShort(event.homeTeam);
  const aShort = inferShort(event.awayTeam);
  const status = STATUS_MAP[event.status] ?? "scheduled";

  if (pred) {
    const allMarkets: { market: MarketId; raw: number; label: (h: string, a: string) => string }[] = [
      { market: "1X2_HOME", raw: pred.probHome, label: () => `Vitória ${hShort}` },
      { market: "DRAW", raw: pred.probDraw, label: () => "Empate" },
      { market: "1X2_AWAY", raw: pred.probAway, label: () => `Vitória ${aShort}` },
      { market: "OVER_2_5", raw: pred.probOver25, label: () => "Over 2.5 gols" },
      { market: "BTTS", raw: pred.probBtts, label: () => "Ambas marcam" },
      { market: "DOUBLE_CHANCE_1X", raw: pred.probHome + pred.probDraw, label: () => `Dupla chance 1X (${hShort}/Empate)` },
    ];

    // Use Poisson probability directly (ensemble weights from calibration)
    const leagueIdNum = parseInt(leagueMeta.id.replace(/\D/g, ""), 10) || 0;

    const processed = await Promise.all(
      allMarkets.map(async (mc) => {
        const cal = await getCalibration(leagueIdNum, mc.market);
        const calResult = calibrateProbability(mc.raw, cal, leagueIdNum, mc.market);

        // Simple weighted blend: calibrated model probability
        const probs = computePoissonProbs(pred.xgHome, pred.xgAway);
        let poissonProb = 0;
        switch (mc.market) {
          case "1X2_HOME": poissonProb = probs.home; break;
          case "DRAW": poissonProb = probs.draw; break;
          case "1X2_AWAY": poissonProb = probs.away; break;
          case "OVER_2_5": poissonProb = probs.over25; break;
          case "BTTS": poissonProb = probs.btts; break;
          case "DOUBLE_CHANCE_1X": poissonProb = probs.home + probs.draw; break;
        }

        const weights = getEnsembleWeights(undefined); // default 70/30
        const ensemble = ensembleProbability(calResult, poissonProb, weights);
        const confidence = computeEnsembleConfidence(calResult, ensemble.probability, weights);
        const o = marginOdds(ensemble.probability);

        return {
          market: mc.market,
          probability: ensemble.probability,
          odds: o,
          confidence,
          label: mc.label(hShort, aShort),
        };
      }),
    );

    const candidates = processed.filter((p) => p.market !== "DRAW");
    candidates.sort((a, b) => b.probability - a.probability);
    const best = candidates[0];

    const pHome = processed.find((p) => p.market === "1X2_HOME")!;
    const pDraw = processed.find((p) => p.market === "DRAW")!;
    const pAway = processed.find((p) => p.market === "1X2_AWAY")!;
    const pOver25 = processed.find((p) => p.market === "OVER_2_5")!;
    const pBtts = processed.find((p) => p.market === "BTTS")!;
    const pDc1x = processed.find((p) => p.market === "DOUBLE_CHANCE_1X")!;

    return {
      id: event.id,
      league: leagueMeta.id as any,
      leagueLabel: leagueMeta.name,
      kickoff: event.eventDate,
      status,
      minute: undefined,
      scoreHome: event.homeScore,
      scoreAway: event.awayScore,
      home: { name: event.homeTeam, short: hShort, logo: "⚽", xg: +pred.xgHome.toFixed(2), xga: +pred.xgAway.toFixed(2) },
      away: { name: event.awayTeam, short: aShort, logo: "⚽", xg: +pred.xgAway.toFixed(2), xga: +pred.xgHome.toFixed(2) },
      probabilities: {
        home: +pHome.probability.toFixed(3),
        draw: +pDraw.probability.toFixed(3),
        away: +pAway.probability.toFixed(3),
        over25: +pOver25.probability.toFixed(3),
        btts: +pBtts.probability.toFixed(3),
      },
      odds: {
        home: pHome.odds,
        draw: pDraw.odds,
        away: pAway.odds,
        over25: pOver25.odds,
        btts: pBtts.odds,
        doubleChance1X: pDc1x.odds,
      },
      suggestedMarket: best.market,
      suggestedProbability: +best.probability.toFixed(3),
      suggestedOdds: best.odds,
      suggestedLabel: best.label,
      confidence: best.confidence,
    };
  }

  throw new Error(`No prediction data for ${event.homeTeam} vs ${event.awayTeam}`);
}

// ─── Poisson helper (for ensemble blending) ──────────────────────────

function poissonPMF(lambda: number, maxK = 6): number[] {
  const out: number[] = [];
  let p = Math.exp(-lambda);
  let f = p;
  out.push(p);
  for (let k = 1; k <= maxK; k++) {
    p = (p * lambda) / k;
    f += p;
    out.push(p);
  }
  return out.map((v) => v / f);
}

function computePoissonProbs(xgH: number, xgA: number) {
  const H = poissonPMF(xgH);
  const A = poissonPMF(xgA);
  let home = 0, draw = 0, away = 0, over25 = 0, btts = 0;
  for (let i = 0; i < H.length; i++) {
    for (let j = 0; j < A.length; j++) {
      const p = H[i] * A[j];
      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
      if (i + j > 2) over25 += p;
      if (i > 0 && j > 0) btts += p;
    }
  }
  return { home, draw, away, over25, btts };
}

export function invalidateCaches(): void {
  calCache.clear();
}
