export type LeagueId =
  | "premier-league"
  | "la-liga"
  | "serie-a"
  | "bundesliga"
  | "ligue-1"
  | "brasileirao"
  | "champions-league"
  | "europa-league"
  | "world-cup"
  | "brasileirao-serie-b"
  | "j-league"
  | "k-league"
  | "chinese-super-league"
  | "veikkausliiga"
  | "usl-championship"
  | "allsvenskan"
  | "npl-queensland";

// ─── Football event (replaces BzEvent) ───────────────────────────────

export interface FootballEvent {
  id: string;
  league: LeagueId;
  leagueLabel: string;
  homeTeam: string;
  awayTeam: string;
  eventDate: string;
  status: "scheduled" | "live" | "finished";
  homeScore?: number;
  awayScore?: number;
}

// ─── Prediction data (replaces BzPrediction markets) ─────────────────

export interface PredictionData {
  xgHome: number;
  xgAway: number;
  probHome: number;
  probDraw: number;
  probAway: number;
  probOver25: number;
  probBtts: number;
  probOver15?: number | null;
  probOver35?: number | null;
  modelConfidence?: number | null;
  mostLikelyScore?: string | null;
}

export interface TeamInfo {
  name: string;
  short: string;
  logo: string;
  xg: number;
  xga: number;
}

export type MarketId =
  | "1X2_HOME"
  | "1X2_AWAY"
  | "DRAW"
  | "OVER_1_5"
  | "OVER_2_5"
  | "OVER_3_5"
  | "UNDER_1_5"
  | "UNDER_2_5"
  | "UNDER_3_5"
  | "BTTS"
  | "BTTS_NO"
  | "DOUBLE_CHANCE_1X"
  | "DOUBLE_CHANCE_X2"
  | "DOUBLE_CHANCE_12"
  | "HOME_SCORES"
  | "AWAY_SCORES"
  | "HOME_OVER_0_5"
  | "HOME_OVER_1_5"
  | "DNB_HOME"
  | "DNB_AWAY"
  | "AH_HOME_M05"
  | "AH_AWAY_P05"
  | "AH_HOME_M1"
  | "AH_AWAY_P1";

export const ALL_MARKETS: MarketId[] = [
  "1X2_HOME",
  "DRAW",
  "1X2_AWAY",
  "OVER_1_5",
  "OVER_2_5",
  "OVER_3_5",
  "UNDER_1_5",
  "UNDER_2_5",
  "UNDER_3_5",
  "BTTS",
  "BTTS_NO",
  "DOUBLE_CHANCE_1X",
  "DOUBLE_CHANCE_X2",
  "DOUBLE_CHANCE_12",
  "HOME_SCORES",
  "AWAY_SCORES",
  "HOME_OVER_0_5",
  "HOME_OVER_1_5",
  "DNB_HOME",
  "DNB_AWAY",
  "AH_HOME_M05",
  "AH_AWAY_P05",
  "AH_HOME_M1",
  "AH_AWAY_P1",
];

export const MARKET_LABELS: Record<MarketId, string> = {
  "1X2_HOME": "Vitória casa",
  DRAW: "Empate",
  "1X2_AWAY": "Vitória fora",
  OVER_1_5: "Over 1.5 gols",
  OVER_2_5: "Over 2.5 gols",
  OVER_3_5: "Over 3.5 gols",
  UNDER_1_5: "Under 1.5 gols",
  UNDER_2_5: "Under 2.5 gols",
  UNDER_3_5: "Under 3.5 gols",
  BTTS: "Ambas marcam — Sim",
  BTTS_NO: "Ambas marcam — Não",
  DOUBLE_CHANCE_1X: "Dupla chance 1X",
  DOUBLE_CHANCE_X2: "Dupla chance X2",
  DOUBLE_CHANCE_12: "Dupla chance 12",
  HOME_SCORES: "Casa marca",
  AWAY_SCORES: "Fora marca",
  HOME_OVER_0_5: "Casa Over 0.5",
  HOME_OVER_1_5: "Casa Over 1.5",
  DNB_HOME: "Empate anula — Casa",
  DNB_AWAY: "Empate anula — Fora",
  AH_HOME_M05: "Handicap casa −0.5",
  AH_AWAY_P05: "Handicap fora +0.5",
  AH_HOME_M1: "Handicap casa −1",
  AH_AWAY_P1: "Handicap fora +1",
};

/** Odd de mercado real por seleção. `null` = sem odd real (nunca fabricar). */
export interface MatchOdds {
  home: number | null;
  draw: number | null;
  away: number | null;
  over15: number | null;
  over25: number | null;
  over35: number | null;
  under15: number | null;
  under25: number | null;
  under35: number | null;
  btts: number | null;
  bttsNo: number | null;
  doubleChance1X: number | null;
  doubleChanceX2: number | null;
  doubleChance12: number | null;
}

export interface MarketEdge {
  market: MarketId;
  probability: number;
  odd: number | null;
  fairOdds: number;
  fairMarketProb: number | null;
}

export interface MatchPrediction {
  id: string;
  league: LeagueId;
  leagueLabel: string;
  /** ID numérico da liga na API Bzzoiro (chave de calibração). */
  leagueApiId?: number;
  kickoff: string;
  status: "scheduled" | "live" | "finished";
  minute?: number;
  scoreHome?: number;
  scoreAway?: number;
  home: TeamInfo;
  away: TeamInfo;
  probabilities: {
    home: number;
    draw: number;
    away: number;
    over15: number;
    over25: number;
    over35: number;
    btts: number;
  };
  /** Odds de mercado real. Campo 0/nulo = sem odd (nunca derivado de 1/p). */
  odds: MatchOdds;
  /** Odd justa do modelo = 1/p (sem margem). Separada de `odds`. */
  fairOdds: Record<MarketId, number>;
  /** Todos os mercados derivados da mesma matriz de placares. */
  markets?: MarketEdge[];
  /** Matriz de placares compacta 0..8 (soma 1), para correlação/detalhe. */
  scoreMatrix?: number[][];
  oddsUpdatedAt: string;
  oddsAvailable: boolean;
  suggestedMarket: MarketId;
  suggestedProbability: number;
  suggestedOdds: number;
  suggestedLabel: string;
  confidence: "low" | "medium" | "high";
  confidenceReason?: string;
  predictionSource?: "api" | "local";
  modelVersion?: string;
  predictionKind?: "pre" | "live";
  predictionStatus?: "ok" | "unavailable";
  sources?: { api: boolean; dc: boolean; market: boolean };
  modelsDiverge?: boolean;

  headlineMarket?: MarketId;
  headlineProbability?: number;
  headlineOdds?: number;
  headlineLabel?: string;
}
