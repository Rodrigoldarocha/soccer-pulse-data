import type {
  FootballEvent,
  PredictionData,
  MatchPrediction,
  MarketId,
  MarketEdge,
} from "../types";
import { ALL_MARKETS, MARKET_LABELS, type MatchOdds } from "../types";
import { calibrateProbability } from "./calibration";
import { blendEnsemble, ensembleWeightsFromBrier, honestConfidence } from "./ensemble";
import { loadCalibration } from "./accuracy-store";
import type { CalibrationParams } from "./types";
import { marketsFromMatrix, predictMatrix, scoreMatrix, type DerivedMarkets } from "./dixon-coles";
import { emptyMatchOdds, type EventOdds } from "../api/odds";
import { fairOdds as modelFairOdds } from "../picks/value";

/** Odd justa do modelo = 1/p (sem margem). NÃO é odd de mercado. */
export { modelFairOdds as fairOdds };

function inferShort(name: string): string {
  return name.substring(0, 3).toUpperCase();
}

// Mantido exportado p/ UI legada de badges; NÃO usado como confiança final.
const CONFIDENCE_HIGH_MIN = 0.72;
const CONFIDENCE_MEDIUM_MIN = 0.55;

export function confidenceFromProbability(p: number): "low" | "medium" | "high" {
  if (p >= CONFIDENCE_HIGH_MIN) return "high";
  if (p >= CONFIDENCE_MEDIUM_MIN) return "medium";
  return "low";
}

export function isProbableMarket(value: number): boolean {
  return Number.isFinite(value) && value >= 0.45 && value <= 0.92;
}

const STATUS_MAP: Record<string, "scheduled" | "live" | "finished"> = {
  notstarted: "scheduled",
  inprogress: "live",
  finished: "finished",
  postponed: "scheduled",
  cancelled: "scheduled",
  scheduled: "scheduled",
  live: "live",
};

const calCache = new Map<string, CalibrationParams | undefined>();

async function getCalibration(
  leagueId: number,
  market: MarketId,
): Promise<CalibrationParams | undefined> {
  const key = `${leagueId}:${market}`;
  if (!calCache.has(key)) {
    calCache.set(key, await loadCalibration(leagueId, market));
  }
  return calCache.get(key);
}

export interface BuildPredictionOpts {
  /** Mantido p/ compat de testes/pipeline: marca fonte, mas NÃO faz passthrough cru. */
  trustSource?: boolean;
  modelVersion?: string;
  /** Odds reais de mercado (null = sem odd) */
  marketOdds?: EventOdds | MatchOdds | null;
  /** Força o caminho local/DC sem API */
  localOnly?: boolean;
}

function isMatchOddsShape(o: unknown): o is MatchOdds {
  return !!o && typeof o === "object" && "doubleChance1X" in (o as object);
}

function toMatchOdds(o: BuildPredictionOpts["marketOdds"]): MatchOdds {
  if (!o) return emptyMatchOdds();
  if (isMatchOddsShape(o)) return o;
  const eo = o;
  return {
    home: eo.home ?? null,
    draw: eo.draw ?? null,
    away: eo.away ?? null,
    over15: eo.over15 ?? null,
    over25: eo.over25 ?? null,
    over35: eo.over35 ?? null,
    under15: eo.under15 ?? null,
    under25: eo.under25 ?? null,
    under35: eo.under35 ?? null,
    btts: eo.btts ?? null,
    bttsNo: eo.bttsNo ?? null,
    doubleChance1X: eo.doubleChance1X ?? null,
    doubleChanceX2: eo.doubleChanceX2 ?? null,
    doubleChance12: eo.doubleChance12 ?? null,
  };
}

function dmarketsToDerived(m: ReturnType<typeof marketsFromMatrix>): DerivedMarkets {
  return m;
}

function matrixFromPred(pred: PredictionData): ReturnType<typeof scoreMatrix> {
  // Aproxima matriz via Poisson dos xG da API quando disponível
  const lh = Math.max(0.1, pred.xgHome || 1.2);
  const la = Math.max(0.1, pred.xgAway || 1.1);
  return scoreMatrix(lh, la, -0.08);
}

function marketProbFromDerived(d: DerivedMarkets, market: MarketId): number {
  switch (market) {
    case "1X2_HOME":
      return d.home;
    case "DRAW":
      return d.draw;
    case "1X2_AWAY":
      return d.away;
    case "OVER_1_5":
      return d.over15;
    case "OVER_2_5":
      return d.over25;
    case "OVER_3_5":
      return d.over35;
    case "UNDER_1_5":
      return d.under15;
    case "UNDER_2_5":
      return d.under25;
    case "UNDER_3_5":
      return d.under35;
    case "BTTS":
      return d.btts;
    case "BTTS_NO":
      return d.bttsNo;
    case "DOUBLE_CHANCE_1X":
      return d.dc1x;
    case "DOUBLE_CHANCE_X2":
      return d.dcx2;
    case "DOUBLE_CHANCE_12":
      return d.dc12;
    case "HOME_SCORES":
      return d.homeScores;
    case "AWAY_SCORES":
      return d.awayScores;
    case "HOME_OVER_0_5":
      return d.homeOver05;
    case "HOME_OVER_1_5":
      return d.homeOver15;
    case "DNB_HOME":
      return d.dnbHome;
    case "DNB_AWAY":
      return d.dnbAway;
    case "AH_HOME_M05":
      return d.ahHomeM05;
    case "AH_AWAY_P05":
      return d.ahAwayP05;
    case "AH_HOME_M1":
      return d.ahHomeM1;
    case "AH_AWAY_P1":
      return d.ahAwayP1;
    default:
      return 0;
  }
}

function oddForMarket(odds: MatchOdds, market: MarketId): number | null {
  switch (market) {
    case "1X2_HOME":
      return odds.home;
    case "DRAW":
      return odds.draw;
    case "1X2_AWAY":
      return odds.away;
    case "OVER_1_5":
      return odds.over15;
    case "OVER_2_5":
      return odds.over25;
    case "OVER_3_5":
      return odds.over35;
    case "UNDER_1_5":
      return odds.under15;
    case "UNDER_2_5":
      return odds.under25;
    case "UNDER_3_5":
      return odds.under35;
    case "BTTS":
      return odds.btts;
    case "BTTS_NO":
      return odds.bttsNo;
    case "DOUBLE_CHANCE_1X":
      return odds.doubleChance1X;
    case "DOUBLE_CHANCE_X2":
      return odds.doubleChanceX2;
    case "DOUBLE_CHANCE_12":
      return odds.doubleChance12;
    default:
      return null;
  }
}

/**
 * Todo palpite passa por: raw → calibração → ensemble → EV.
 * `trustSource` vira metadado (`sources.api`), não desvio de lógica.
 */
export async function buildPrediction(
  event: FootballEvent,
  pred: PredictionData | undefined,
  leagueMeta: { id: string; name: string },
  opts?: BuildPredictionOpts,
): Promise<MatchPrediction> {
  const hShort = inferShort(event.homeTeam);
  const aShort = inferShort(event.awayTeam);
  const status = STATUS_MAP[event.status] ?? "scheduled";

  if (!pred) {
    throw new Error(`No prediction data for ${event.homeTeam} vs ${event.awayTeam}`);
  }

  const leagueIdNum = parseInt(String(leagueMeta.id).replace(/\D/g, ""), 10) || 0;
  const marketOdds = toMatchOdds(opts?.marketOdds);
  const oddsAvailable = Object.values(marketOdds).some((v) => v != null && v > 1);

  // Score matrix: DC próprio + fallback Poisson dos xG
  const dc = predictMatrix(event.homeTeam, event.awayTeam, undefined, pred.xgHome || 1.3);
  const matrix = matrixFromPred(pred);
  const derivedApi = marketsFromMatrix(matrix);
  const derivedDc = dmarketsToDerived(marketsFromMatrix(dc.matrix));

  // API probs diretas (quando existem) — voto 1
  const apiDirect: Partial<Record<MarketId, number>> = {
    "1X2_HOME": pred.probHome,
    DRAW: pred.probDraw,
    "1X2_AWAY": pred.probAway,
    OVER_2_5: pred.probOver25,
    BTTS: pred.probBtts,
  };
  if (pred.probOver15 != null) apiDirect.OVER_1_5 = pred.probOver15;
  if (pred.probOver35 != null) apiDirect.OVER_3_5 = pred.probOver35;
  apiDirect.DOUBLE_CHANCE_1X = pred.probHome + pred.probDraw;
  apiDirect.DOUBLE_CHANCE_X2 = pred.probDraw + pred.probAway;
  apiDirect.DOUBLE_CHANCE_12 = 1 - pred.probDraw;
  apiDirect.BTTS_NO = 1 - pred.probBtts;
  apiDirect.UNDER_2_5 = 1 - pred.probOver25;

  const calCacheCell = new Map<MarketId, CalibrationParams | undefined>();
  const processed: Array<{
    market: MarketId;
    probability: number;
    odd: number | null;
    fair: number;
    confidence: "low" | "medium" | "high";
    confidenceReason: string;
    delta: number;
    label: string;
    sampleSize: number;
  }> = [];

  for (const market of ALL_MARKETS) {
    const rawApi = apiDirect[market] ?? (derivedApi && marketProbFromDerived(derivedApi, market));
    const pDc = marketProbFromDerived(derivedDc, market);
    const pMatrix = marketProbFromDerived(derivedApi, market);

    const cal = calCacheCell.has(market)
      ? calCacheCell.get(market)
      : await getCalibration(leagueIdNum, market);
    calCacheCell.set(market, cal);

    const useApi = !opts?.localOnly && rawApi != null && Number.isFinite(rawApi);
    // Extreme exato da API (0/1) manda sozinho — não diluir com DC.
    if (useApi && (rawApi === 0 || rawApi === 1)) {
      const oddExtreme = oddForMarket(marketOdds, market);
      const confExtreme = honestConfidence({
        delta: 0,
        sampleSize: cal?.sampleSize ?? 0,
        ece: cal?.ece ?? 1,
        matrixUncertainty: 0,
      });
      processed.push({
        market,
        probability: rawApi,
        odd: oddExtreme,
        fair: modelFairOdds(rawApi),
        confidence: confExtreme.level,
        confidenceReason: confExtreme.reason,
        delta: 0,
        label: marketLabel(market, hShort, aShort),
        sampleSize: cal?.sampleSize ?? 0,
      });
      continue;
    }

    const calApi = useApi ? calibrateProbability(rawApi as number, cal, leagueIdNum, market) : null;

    // mercado devig (só se odd real)
    const odd = oddForMarket(marketOdds, market);
    let marketP: number | null = null;
    if (odd != null && odd > 1) {
      // single-odd: sem lista completa, usa implícita sem margem simples
      marketP = 1 / odd;
    }

    const blend = blendEnsemble(
      {
        api: calApi ? calApi.calibrated : useApi ? (rawApi as number) : null,
        dc: pDc,
        market: marketP,
      },
      ensembleWeightsFromBrier(cal?.brierScore ?? 0.25, cal?.sampleSize ?? 0),
    );

    const probability = blend ? blend.probability : pMatrix || pDc || 0.001;
    const delta = blend?.delta ?? Math.abs((rawApi ?? pDc) - pDc);
    const conf = honestConfidence({
      delta,
      sampleSize: cal?.sampleSize ?? 0,
      ece: cal?.ece ?? 1,
      matrixUncertainty: Math.abs(probability - pDc),
    });

    processed.push({
      market,
      probability,
      odd,
      fair: modelFairOdds(probability),
      confidence: conf.level,
      confidenceReason: conf.reason,
      delta,
      label: marketLabel(market, hShort, aShort),
      sampleSize: cal?.sampleSize ?? 0,
    });
  }

  const byMarket = new Map(processed.map((p) => [p.market, p]));

  // Headline: melhor EV×confiança com odd real; senão maior prob legível
  const withOdd = processed.filter((p) => p.odd != null && p.odd >= 1.3 && p.market !== "DRAW");
  const score = (p: (typeof processed)[number]) => {
    const ev = p.odd != null ? p.probability * p.odd - 1 : -1;
    const confW = p.confidence === "high" ? 1.3 : p.confidence === "medium" ? 1 : 0.5;
    return ev * confW;
  };
  const candidates = (
    withOdd.length
      ? withOdd
      : processed.filter((p) => p.market !== "DRAW" && p.market !== "DOUBLE_CHANCE_1X")
  ).slice();
  candidates.sort((a, b) => score(b) - score(a) || b.probability - a.probability);
  const best = candidates[0] ?? processed[0];

  const headlineCandidates = processed
    .filter(
      (p) =>
        p.market !== "DRAW" && p.market !== "DOUBLE_CHANCE_1X" && isProbableMarket(p.probability),
    )
    .slice();
  headlineCandidates.sort((a, b) => b.probability - a.probability);
  const headline = headlineCandidates[0] ?? best;

  const pHome = byMarket.get("1X2_HOME")!;
  const pDraw = byMarket.get("DRAW")!;
  const pAway = byMarket.get("1X2_AWAY")!;
  const pOver15 = byMarket.get("OVER_1_5")!;
  const pOver25 = byMarket.get("OVER_2_5")!;
  const pOver35 = byMarket.get("OVER_3_5")!;
  const pBtts = byMarket.get("BTTS")!;

  const fairOddsMap = Object.fromEntries(processed.map((p) => [p.market, p.fair])) as Record<
    MarketId,
    number
  >;

  const marketEdges: MarketEdge[] = processed.map((p) => ({
    market: p.market,
    probability: +p.probability.toFixed(4),
    odd: p.odd,
    fairOdds: p.fair,
    fairMarketProb: p.odd != null && p.odd > 1 ? 1 / p.odd : null,
  }));

  const modelsDiverge = processed.some((p) => p.delta > 0.15);
  const confSample = headline.sampleSize;
  const confDelta = headline.delta;

  return {
    id: event.id,
    league: leagueMeta.id as never,
    leagueLabel: leagueMeta.name,
    leagueApiId: leagueIdNum || undefined,
    headlineMarket: headline.market,
    headlineProbability: +headline.probability.toFixed(3),
    headlineOdds: headline.odd ?? headline.fair,
    headlineLabel: headline.label,
    kickoff: event.eventDate,
    status,
    minute: undefined,
    scoreHome: event.homeScore,
    scoreAway: event.awayScore,
    home: {
      name: event.homeTeam,
      short: hShort,
      logo: "⚽",
      xg: +pred.xgHome.toFixed(2),
      xga: +pred.xgAway.toFixed(2),
    },
    away: {
      name: event.awayTeam,
      short: aShort,
      logo: "⚽",
      xg: +pred.xgAway.toFixed(2),
      xga: +pred.xgHome.toFixed(2),
    },
    probabilities: {
      home: +pHome.probability.toFixed(3),
      draw: +pDraw.probability.toFixed(3),
      away: +pAway.probability.toFixed(3),
      over15: +pOver15.probability.toFixed(3),
      over25: +pOver25.probability.toFixed(3),
      over35: +pOver35.probability.toFixed(3),
      btts: +pBtts.probability.toFixed(3),
    },
    odds: marketOdds,
    fairOdds: fairOddsMap,
    markets: marketEdges,
    scoreMatrix: matrix.map((row) => row.map((v) => +v.toFixed(4))),
    oddsUpdatedAt: new Date().toISOString(),
    oddsAvailable,
    suggestedMarket: headline.market,
    suggestedProbability: +headline.probability.toFixed(3),
    suggestedOdds: headline.odd ?? headline.fair,
    suggestedLabel: headline.label,
    confidence: headline.confidence,
    confidenceReason: headline.confidenceReason,
    predictionSource: opts?.trustSource !== false && !opts?.localOnly ? "api" : "local",
    modelVersion: opts?.modelVersion,
    predictionKind: status === "live" ? "live" : "pre",
    sources: {
      api: opts?.trustSource === true,
      dc: true,
      market: oddsAvailable,
    },
    modelsDiverge,
    // silencia unused em confDelta/ConfSample quando só p/ debug
    ...(confSample < 0 ? {} : {}),
    ...(confDelta < 0 ? {} : {}),
  };
}

function marketLabel(market: MarketId, h: string, a: string): string {
  const base = MARKET_LABELS[market] ?? market;
  if (market === "1X2_HOME") return `Vitória ${h}`;
  if (market === "1X2_AWAY") return `Vitória ${a}`;
  if (market === "DOUBLE_CHANCE_1X") return `Dupla chance 1X (${h}/Empate)`;
  return base;
}

export function invalidateCaches(): void {
  calCache.clear();
}
