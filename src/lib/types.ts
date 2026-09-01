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
}

export interface TeamInfo {
  name: string;
  short: string;
  logo: string;
  xg: number;
  xga: number;
}

export type MarketId = "1X2_HOME" | "1X2_AWAY" | "DRAW" | "OVER_2_5" | "BTTS" | "DOUBLE_CHANCE_1X";

export interface MatchPrediction {
  id: string;
  league: LeagueId;
  leagueLabel: string;
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
    over25: number;
    btts: number;
  };
  odds: {
    home: number;
    draw: number;
    away: number;
    over25: number;
    btts: number;
    doubleChance1X: number;
  };
  suggestedMarket: MarketId;
  suggestedProbability: number;
  suggestedOdds: number;
  suggestedLabel: string;
  confidence: "low" | "medium" | "high";
}

export interface ParlayLeg {
  matchId: string;
  market: MarketId;
  marketLabel: string;
  odds: number;
  probability: number;
}

export interface ParlaySuggestion {
  id: "safe" | "moderate" | "aggressive";
  type: string;
  title: string;
  riskText: "Segura" | "Moderada" | "Ousada";
  explanation: string;
  totalOdds: number;
  totalProbability: number;
  selectionIds: string[];
  legs: ParlayLeg[];
}
