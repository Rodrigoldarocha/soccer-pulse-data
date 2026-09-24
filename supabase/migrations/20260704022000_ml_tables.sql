create table public.ml_predictions (
  id bigint generated always as identity primary key,
  event_id integer not null,
  league_id integer not null,
  market text not null,
  probability real not null,
  odds real not null,
  confidence text not null default 'low',
  model_version text not null default 'v1',
  outcome boolean,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(event_id, market)
);

create index ml_predictions_league_idx on public.ml_predictions(league_id);
create index ml_predictions_outcome_idx on public.ml_predictions(outcome);
create index ml_predictions_created_idx on public.ml_predictions(created_at);

create table public.ml_calibration_params (
  league_id integer not null,
  market text not null,
  a real not null default 1.0,
  b real not null default 0.0,
  brier_score real not null default 0.25,
  sample_size integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (league_id, market)
);

create table public.ml_accuracy_metrics (
  league_id integer not null,
  league_name text not null default '',
  market text not null,
  total_predictions integer not null default 0,
  correct_predictions integer not null default 0,
  accuracy real not null default 0,
  brier_score real not null default 0.25,
  log_loss real not null default 0,
  avg_confidence real not null default 0,
  calibration_error real not null default 0,
  updated_at timestamptz not null default now(),
  primary key (league_id, market)
);

grant all on all tables in schema public to service_role;
alter table public.ml_predictions enable row level security;
alter table public.ml_calibration_params enable row level security;
alter table public.ml_accuracy_metrics enable row level security;
