export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      api_cache: {
        Row: {
          created_at: string;
          expires_at: string;
          key: string;
          payload: Json;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          key: string;
          payload: Json;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          key?: string;
          payload?: Json;
        };
        Relationships: [];
      };
      bankroll_settings: {
        Row: {
          bankroll: number;
          daily_exposure_pct: number;
          id: number;
          kelly_fraction: number;
          stop_loss_daily_pct: number;
          stop_loss_weekly_pct: number;
          updated_at: string;
        };
        Insert: {
          bankroll?: number;
          daily_exposure_pct?: number;
          id?: number;
          kelly_fraction?: number;
          stop_loss_daily_pct?: number;
          stop_loss_weekly_pct?: number;
          updated_at?: string;
        };
        Update: {
          bankroll?: number;
          daily_exposure_pct?: number;
          id?: number;
          kelly_fraction?: number;
          stop_loss_daily_pct?: number;
          stop_loss_weekly_pct?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      bzzoiro_cache: {
        Row: {
          cache_key: string;
          expires_at: string;
          fetched_at: string;
          payload: Json;
        };
        Insert: {
          cache_key: string;
          expires_at: string;
          fetched_at?: string;
          payload: Json;
        };
        Update: {
          cache_key?: string;
          expires_at?: string;
          fetched_at?: string;
          payload?: Json;
        };
        Relationships: [];
      };
      ml_accuracy_metrics: {
        Row: {
          accuracy: number;
          avg_confidence: number;
          brier_score: number;
          calibration_error: number;
          correct_predictions: number;
          league_id: number;
          league_name: string;
          log_loss: number;
          market: string;
          total_predictions: number;
          updated_at: string;
        };
        Insert: {
          accuracy?: number;
          avg_confidence?: number;
          brier_score?: number;
          calibration_error?: number;
          correct_predictions?: number;
          league_id: number;
          league_name?: string;
          log_loss?: number;
          market: string;
          total_predictions?: number;
          updated_at?: string;
        };
        Update: {
          accuracy?: number;
          avg_confidence?: number;
          brier_score?: number;
          calibration_error?: number;
          correct_predictions?: number;
          league_id?: number;
          league_name?: string;
          log_loss?: number;
          market?: string;
          total_predictions?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      ml_calibration_params: {
        Row: {
          a: number;
          b: number;
          brier_score: number;
          ece: number | null;
          isotonic_points: Json | null;
          league_id: number;
          market: string;
          method: string;
          sample_size: number;
          updated_at: string;
        };
        Insert: {
          a?: number;
          b?: number;
          brier_score?: number;
          ece?: number | null;
          isotonic_points?: Json | null;
          league_id: number;
          market: string;
          method?: string;
          sample_size?: number;
          updated_at?: string;
        };
        Update: {
          a?: number;
          b?: number;
          brier_score?: number;
          ece?: number | null;
          isotonic_points?: Json | null;
          league_id?: number;
          market?: string;
          method?: string;
          sample_size?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      ml_predictions: {
        Row: {
          closing_odds: number | null;
          confidence: string;
          created_at: string;
          event_id: number;
          id: number;
          league_id: number;
          market: string;
          model_version: string;
          odds: number;
          odds_at_pick: number | null;
          outcome: boolean | null;
          probability: number;
          resolved_at: string | null;
          void: boolean;
        };
        Insert: {
          closing_odds?: number | null;
          confidence?: string;
          created_at?: string;
          event_id: number;
          id?: number;
          league_id: number;
          market: string;
          model_version?: string;
          odds: number;
          odds_at_pick?: number | null;
          outcome?: boolean | null;
          probability: number;
          resolved_at?: string | null;
          void?: boolean;
        };
        Update: {
          closing_odds?: number | null;
          confidence?: string;
          created_at?: string;
          event_id?: number;
          id?: number;
          league_id?: number;
          market?: string;
          model_version?: string;
          odds?: number;
          odds_at_pick?: number | null;
          outcome?: boolean | null;
          probability?: number;
          resolved_at?: string | null;
          void?: boolean;
        };
        Relationships: [];
      };
      odds_snapshots: {
        Row: {
          bookmaker: string | null;
          captured_at: string;
          event_id: number;
          id: number;
          is_closing: boolean;
          market: string;
          odd: number;
          selection: string;
        };
        Insert: {
          bookmaker?: string | null;
          captured_at?: string;
          event_id: number;
          id?: number;
          is_closing?: boolean;
          market: string;
          odd: number;
          selection: string;
        };
        Update: {
          bookmaker?: string | null;
          captured_at?: string;
          event_id?: number;
          id?: number;
          is_closing?: boolean;
          market?: string;
          odd?: number;
          selection?: string;
        };
        Relationships: [];
      };
      pick_ledger: {
        Row: {
          closing_odd: number | null;
          confidence: string;
          created_at: string;
          edge: number;
          ev: number;
          event_id: number;
          id: number;
          league_id: number;
          market: string;
          model_version: string;
          odd_at_pick: number;
          outcome: boolean | null;
          parlay_id: string | null;
          pick_kind: string;
          probability: number;
          resolved_at: string | null;
          selection: string;
          stake_units: number | null;
          void: boolean;
        };
        Insert: {
          closing_odd?: number | null;
          confidence: string;
          created_at?: string;
          edge: number;
          ev: number;
          event_id: number;
          id?: number;
          league_id: number;
          market: string;
          model_version: string;
          odd_at_pick: number;
          outcome?: boolean | null;
          parlay_id?: string | null;
          pick_kind: string;
          probability: number;
          resolved_at?: string | null;
          selection: string;
          stake_units?: number | null;
          void?: boolean;
        };
        Update: {
          closing_odd?: number | null;
          confidence?: string;
          created_at?: string;
          edge?: number;
          ev?: number;
          event_id?: number;
          id?: number;
          league_id?: number;
          market?: string;
          model_version?: string;
          odd_at_pick?: number;
          outcome?: boolean | null;
          parlay_id?: string | null;
          pick_kind?: string;
          probability?: number;
          resolved_at?: string | null;
          selection?: string;
          stake_units?: number | null;
          void?: boolean;
        };
        Relationships: [];
      };
      team_ratings: {
        Row: {
          attack: number;
          defense: number;
          games: number;
          league_id: number;
          team_id: number;
          updated_at: string;
        };
        Insert: {
          attack: number;
          defense: number;
          games: number;
          league_id: number;
          team_id: number;
          updated_at?: string;
        };
        Update: {
          attack?: number;
          defense?: number;
          games?: number;
          league_id?: number;
          team_id?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: number;
          last_seen_at: string;
          p256dh: string;
          user_agent: string | null;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: never;
          last_seen_at?: string;
          p256dh: string;
          user_agent?: string | null;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: never;
          last_seen_at?: string;
          p256dh?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          count: number;
          created_at: string;
          identifier: string;
          updated_at: string;
          window_start: string;
        };
        Insert: {
          count?: number;
          created_at?: string;
          identifier: string;
          updated_at?: string;
          window_start?: string;
        };
        Update: {
          count?: number;
          created_at?: string;
          identifier?: string;
          updated_at?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      value_bets: {
        Row: {
          away_team: string;
          created_at: string;
          ev: number;
          event_date: string;
          event_id: number;
          home_team: string;
          id: number;
          league_name: string | null;
          market: string;
          notified_at: string | null;
          odds: number;
          outcome: string;
          prob: number;
          settled_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          away_team: string;
          created_at?: string;
          ev: number;
          event_date: string;
          event_id: number;
          home_team: string;
          id?: never;
          league_name?: string | null;
          market: string;
          notified_at?: string | null;
          odds: number;
          outcome: string;
          prob: number;
          settled_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          away_team?: string;
          created_at?: string;
          ev?: number;
          event_date?: string;
          event_id?: number;
          home_team?: string;
          id?: never;
          league_name?: string | null;
          market?: string;
          notified_at?: string | null;
          odds?: number;
          outcome?: string;
          prob?: number;
          settled_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_rate_limit: {
        Args: {
          p_identifier: string;
          p_max: number;
          p_window_ms: number;
          p_window_start: string;
        };
        Returns: {
          current_count: number;
          exceeded: boolean;
        }[];
      };
      purge_expired_cache: { Args: never; Returns: number };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
