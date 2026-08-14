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

export interface HeadToHeadRecentMatch {
  event_date?: string | null;
  home_team?: string | null;
  away_team?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  league_name?: string | null;
}

export interface HeadToHead {
  total_matches?: number | null;
  home_wins?: number | null;
  draws?: number | null;
  away_wins?: number | null;
  home_goals?: number | null;
  away_goals?: number | null;
  avg_total_goals?: number | null;
  home_win_rate?: number | null; // 0-1
  away_win_rate?: number | null; // 0-1
  recent_matches?: HeadToHeadRecentMatch[] | null;
}

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
  has_xg?: boolean | null;
  previous_leg_event_id?: number | null;
  head_to_head?: HeadToHead | null;
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

// -------- Polymarket (v2) --------

export interface PolymarketData {
  event_id: number;
  markets?: Record<string, Record<string, number | null>> | null;
  liquidity?: { volume_24hr?: number | null; open_interest?: number | null } | null;
  pricing?: {
    best_bid?: number | null;
    best_ask?: number | null;
    change_1d?: number | null;
  } | null;
  updated_at?: string | null;
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

// -------- Standings (v2) --------

export interface StandingEntry {
  position: number | null;
  team_id?: number | null;
  team_name: string;
  team_logo?: string | null;
  played?: number | null;
  won?: number | null;
  drawn?: number | null;
  lost?: number | null;
  goals_for?: number | null;
  goals_against?: number | null;
  goal_diff?: number | null;
  points: number | null;
}

export interface StandingsResponse {
  standings?: StandingEntry[] | null;
  groups?: Record<string, StandingEntry[]> | null;
}

export interface StandingGroup {
  label: string | null;
  entries: StandingEntry[];
}

// -------- Odds Best (v2) --------

export interface OddsBestOutcome {
  outcome: string;
  best_odds: number | null;
  best_bookmaker_name?: string | null;
}

export interface OddsBestEntry {
  event_id: number;
  home_team?: string | null;
  away_team?: string | null;
  outcomes?: OddsBestOutcome[] | null;
}

// -------- Value Bets --------

export type ValueMarket = "1x2" | "over_under_25" | "btts";

export interface ValueBet {
  event_id: number;
  event_date: string;
  home_team: string;
  away_team: string;
  league_name?: string | null;
  market: ValueMarket;
  outcome: string;
  prob: number; // 0-1
  odds: number;
  ev: number; // decimal, ex: 0.12
  evPct: number; // ex: 12
}

// -------- Common list wrappers --------

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
