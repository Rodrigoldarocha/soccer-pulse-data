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
  // Corners schema varies / can be null; keep loose but serializable.
  corners: Record<string, number | string | null> | null;
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
  recommendations: Record<string, boolean | number | string | null>;
}

// -------- Leagues (v2) --------

export interface League {
  id: number;
  name: string;
  country: string;
  logo?: string | null;
}

// -------- Events (v2) --------

export interface EventDetail {
  id: number;
  event_date: string;
  status: MatchStatus;
  home_team: string;
  away_team: string;
  home_team_id: number | null;
  away_team_id: number | null;
  league_id: number | null;
  league_name?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  round_name?: string | null;
  current_minute?: number | null;
  venue?: string | null;
  venue_id?: number | null;
  referee?: string | null;
}

// -------- Odds Comparison (v2) --------

export interface OddsBookmakerQuote {
  decimal_odds: number | null;
  movement?: string | null;
  updated_at?: string | null;
}

export interface OddsOutcome {
  outcome: string;
  outcome_name?: string | null;
  line?: number | null;
  best_odds: number | null;
  best_bookmaker_name?: string | null;
  best_bookmaker_slug?: string | null;
  bookmakers?: Record<string, OddsBookmakerQuote>;
}

export interface OddsComparison {
  event_id: number;
  home_team: string;
  away_team: string;
  league_name?: string | null;
  bookmakers_count?: number;
  total_odds?: number;
  markets?: Record<string, Record<string, OddsOutcome>> | null;
}

// -------- Lineups (v2) --------

export interface LineupPlayer {
  id: number;
  name: string;
  short_name?: string | null;
  position: string; // G, D, M, F
  jersey_number: number | null;
  captain?: boolean;
}

export interface LineupTeam {
  team_id: number;
  team_name: string;
  formation: string | null;
  players: LineupPlayer[] | null;
}

export interface Lineups {
  lineup_status?: string | null;
  home: LineupTeam | null;
  away: LineupTeam | null;
}

// -------- Event Stats (v2) --------

export type StatValue =
  | number
  | null
  | { value?: number | null; total?: number | null; pct?: number | null; actual?: number | null };

export interface EventStats {
  home: Record<string, StatValue>;
  away: Record<string, StatValue>;
}

// -------- Common list wrappers --------

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
