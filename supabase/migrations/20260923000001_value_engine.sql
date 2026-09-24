-- Value engine tables (idempotent)

create table if not exists public.api_cache (
  key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists api_cache_exp_idx on public.api_cache(expires_at);

create table if not exists public.odds_snapshots (
  id bigint generated always as identity primary key,
  event_id integer not null,
  market text not null,
  selection text not null,
  bookmaker text,
  odd real not null,
  is_closing boolean not null default false,
  captured_at timestamptz not null default now()
);
create index if not exists odds_snap_event_idx on public.odds_snapshots(event_id, market);

create table if not exists public.team_ratings (
  league_id integer not null,
  team_id integer not null,
  attack real not null,
  defense real not null,
  games integer not null,
  updated_at timestamptz not null default now(),
  primary key (league_id, team_id)
);

create table if not exists public.pick_ledger (
  id bigint generated always as identity primary key,
  pick_kind text not null check (pick_kind in ('single','parlay')),
  parlay_id uuid,
  event_id integer not null,
  league_id integer not null,
  market text not null,
  selection text not null,
  probability real not null,
  odd_at_pick real not null,
  closing_odd real,
  ev real not null,
  edge real not null,
  stake_units real,
  confidence text not null,
  model_version text not null,
  outcome boolean,
  void boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (
    pick_kind,
    coalesce(parlay_id, '00000000-0000-0000-0000-000000000000'),
    event_id,
    market,
    selection
  )
);
create index if not exists pick_ledger_created_idx on public.pick_ledger(created_at);

create table if not exists public.bankroll_settings (
  id integer primary key default 1 check (id = 1),
  bankroll real not null default 1000,
  daily_exposure_pct real not null default 5,
  stop_loss_daily_pct real not null default 5,
  stop_loss_weekly_pct real not null default 15,
  kelly_fraction real not null default 0.25,
  updated_at timestamptz not null default now()
);

alter table public.ml_predictions add column if not exists odds_at_pick real;
alter table public.ml_predictions add column if not exists closing_odds real;
alter table public.ml_predictions add column if not exists void boolean not null default false;

alter table public.ml_calibration_params add column if not exists ece real;
alter table public.ml_calibration_params add column if not exists method text not null default 'platt';
alter table public.ml_calibration_params add column if not exists isotonic_points jsonb;

grant all on all tables in schema public to service_role;
alter table public.api_cache enable row level security;
alter table public.odds_snapshots enable row level security;
alter table public.team_ratings enable row level security;
alter table public.pick_ledger enable row level security;
alter table public.bankroll_settings enable row level security;

-- Cleanup job (run via pg_cron when available):
-- select cron.schedule('purge-api-cache', '*/30 * * * *', $$delete from public.api_cache where expires_at < now()$$);

-- ─── Agendamento recomendado (Supabase pg_cron + pg_net) ─────────────
-- Substitua SEU_DOMINIO e CRON_SECRET. Sem segredos neste arquivo.
--
-- select cron.schedule('resolve-finished', '*/30 * * * *',
--   $$select net.http_post(
--     url := 'https://SEU_DOMINIO/api/cron/resolve',
--     headers := jsonb_build_object('x-cron-secret', 'CRON_SECRET', 'Content-Type', 'application/json'),
--     body := '{}'::jsonb
--   )$$);
--
-- select cron.schedule('recalibrate-daily', '0 9 * * *',   -- 06:00 SP = 09:00 UTC
--   $$select net.http_post(
--     url := 'https://SEU_DOMINIO/api/cron/recalibrate',
--     headers := jsonb_build_object('x-cron-secret', 'CRON_SECRET', 'Content-Type', 'application/json'),
--     body := '{}'::jsonb
--   )$$);
--
-- select cron.schedule('snapshot-picks', '*/120 * * * *',
--   $$select net.http_post(
--     url := 'https://SEU_DOMINIO/api/cron/snapshot',
--     headers := jsonb_build_object('x-cron-secret', 'CRON_SECRET', 'Content-Type', 'application/json'),
--     body := '{}'::jsonb
--   )$$);
