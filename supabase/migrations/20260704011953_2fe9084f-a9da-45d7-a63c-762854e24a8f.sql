create table public.api_cache (
  key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
grant all on public.api_cache to service_role;
alter table public.api_cache enable row level security;
create index api_cache_expires_at_idx on public.api_cache(expires_at);