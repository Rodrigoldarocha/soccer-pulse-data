-- Value bets snapshot + settlement for ROI backtest.
-- Snapshot é idempotente (UNIQUE event_id, market, outcome) e o settlement
-- atualiza status em lote quando o evento termina.

CREATE TABLE IF NOT EXISTS public.value_bets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id integer NOT NULL,
  market text NOT NULL,
  outcome text NOT NULL,
  prob numeric NOT NULL,
  odds numeric NOT NULL,
  ev numeric NOT NULL,
  event_date timestamptz NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  league_name text,
  status text NOT NULL DEFAULT 'pending',
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, market, outcome)
);

GRANT ALL ON public.value_bets TO service_role;

ALTER TABLE public.value_bets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_value_bets_status ON public.value_bets (status);
CREATE INDEX IF NOT EXISTS idx_value_bets_event_date ON public.value_bets (event_date);