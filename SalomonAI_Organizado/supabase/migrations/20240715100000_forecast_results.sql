set check_function_bodies = off;

create extension if not exists "uuid-ossp";

create table if not exists public.forecast_results (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users (id) on delete cascade,
    forecast_type text not null,
    forecast_data jsonb not null,
    calculated_at timestamptz not null default timezone('utc'::text, now()),
    created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists forecast_results_user_type_calculated_idx
    on public.forecast_results (user_id, forecast_type, calculated_at desc);

create index if not exists forecast_results_calculated_idx
    on public.forecast_results (calculated_at desc);
