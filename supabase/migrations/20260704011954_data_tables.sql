create table public.leagues (
  id text primary key,
  code text not null,
  name text not null,
  emblem_url text,
  region text not null default 'global',
  created_at timestamptz not null default now()
);

create table public.teams (
  id integer primary key,
  name text not null,
  short_name text,
  tla text,
  emblem_url text,
  league_id text not null references public.leagues(id),
  strength real not null default 1.0,
  created_at timestamptz not null default now()
);

create table public.matches (
  id integer primary key,
  league_id text not null references public.leagues(id),
  home_team_id integer not null references public.teams(id),
  away_team_id integer not null references public.teams(id),
  kickoff timestamptz not null,
  status text not null default 'scheduled',
  score_home integer,
  score_away integer,
  home_xg real,
  away_xg real,
  home_odds real,
  draw_odds real,
  away_odds real,
  over25_odds real,
  btts_odds real,
  suggested_market text,
  suggested_probability real,
  suggested_odds real,
  confidence text,
  raw_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matches_kickoff_idx on public.matches(kickoff);
create index matches_league_idx on public.matches(league_id);
create index matches_status_idx on public.matches(status);
create index matches_date_idx on public.matches(date(kickoff));

grant all on all tables in schema public to service_role;
alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
