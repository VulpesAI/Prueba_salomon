create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create schema if not exists app;
create or replace function app.current_user_id() returns uuid
language sql stable as $$ select current_setting('app.user_id', true)::uuid $$;

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz default now()
);

create table if not exists statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  filename text not null,
  status text not null check (status in ('pending','processing','done','error')),
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  statement_id uuid references statements(id),
  date date not null,
  description text not null,
  category text not null,
  amount numeric not null,
  type text not null check (type in ('income','expense')),
  created_at timestamptz default now()
);

create table if not exists forecast_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  model_type text not null,
  calculated_at timestamptz not null,
  horizon int not null,
  series jsonb not null,
  lower jsonb,
  upper jsonb,
  created_at timestamptz default now()
);

create table if not exists recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  recommendation_id text not null,
  score int not null check (score in (-1,1)),
  client_submission_id text not null,
  created_at timestamptz default now()
);

create index if not exists idx_tx_user_date on transactions(user_id, date);
create index if not exists idx_tx_user_cat  on transactions(user_id, category);

alter table accounts                enable row level security;
alter table statements              enable row level security;
alter table transactions            enable row level security;
alter table forecast_results        enable row level security;
alter table recommendation_feedback enable row level security;

create policy accounts_by_owner on accounts
  for select using (app.current_user_id() = user_id);

create policy statements_by_owner on statements
  for select using (app.current_user_id() = user_id);

create policy tx_by_owner on transactions
  for select using (app.current_user_id() = user_id);

create policy forecast_by_owner on forecast_results
  for select using (app.current_user_id() = user_id);

create policy feedback_by_owner on recommendation_feedback
  for select using (app.current_user_id() = user_id);
