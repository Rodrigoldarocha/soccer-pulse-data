// TypeScript types for the Bzzoiro Sports Data API (football / v2).
// Derived from https://sports.bzzoiro.com/api/schema/ — safe to import from
// both server and client code (no runtime side-effects).

export type MatchStatus =
  | "notstarted"
  | "inprogress"
  | "finished"
  | "postponed"
  | "cancelled"
  | (string & {});

// -------- Predictions (v2) --------

export interface PredictionEventEmbed {
  id: number;
  event_date: string; // ISO 8601 Z
  status: MatchStatus;
  home_team_id: number | null;
  home_team: string;
  away_team_id: number | null;
  away_team: string;
  league_id: number | null;
  league_name: string | null;
}

export interface MatchResultMarket {
  // Probabilities are 0-100 (percent), can be null.
  prob_home: number | null;
  prob_draw: number | null;
  prob_away: number | null;
  predicted: "H" | "D" | "A" | null;
}

export interface OverUnderMarket {
  prob_over_15: number | null;
  prob_over_25: number | null;
  prob_over_35: number | null;
}

export interface BttsMarket {
  prob_yes: number | null;
}

export interface ExpectedGoalsMarket {
  home: number | null;
  away: number | null;
}

export interface ScoreMarket {
  most_likely: string | null;
}

export interface DnbMarket {
  prob_home: number | null;
}

export interface PredictionMarkets {
  match_result: MatchResultMarket;
  expected_goals: ExpectedGoalsMarket;
  over_under: OverUnderMarket;
  btts: BttsMarket;
  score: ScoreMarket;
  draw_no_bet: DnbMarket;
  corners: unknown | null;
}

export interface PredictionModel {
  // 0-1 probability of the most likely 1X2 outcome.
  confidence: number;
  version: string;
}

export interface Prediction {
  id: number;
  created_at: string;
  event: PredictionEventEmbed;
  markets: PredictionMarkets;
  model: PredictionModel;
  recommendations: unknown;
}

// -------- Common list wrappers --------

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
