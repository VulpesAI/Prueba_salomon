-- Supabase migration: financial schema for SalomonAI
set check_function_bodies = off;

-- Accounts table
create table if not exists public.accounts (
    id uuid primary key default uuid_generate_v4(),
    user_id text not null,
    external_id text not null,
    name text,
    type text,
    institution text,
    currency text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.accounts
    add constraint accounts_user_external_unique unique (user_id, external_id);

create index if not exists accounts_user_id_idx on public.accounts (user_id);

-- Statements table
create table if not exists public.statements (
    id uuid primary key default uuid_generate_v4(),
    user_id text not null,
    account_id uuid not null references public.accounts(id) on delete cascade,
    storage_path text not null,
    raw_filename text not null,
    mime_type text,
    size bigint,
    status text not null default 'uploaded',
    processing_stage text,
    progress numeric(5,2),
    error_message text,
    period_start date,
    period_end date,
    statement_date date,
    uploaded_at timestamptz not null default now(),
    processed_at timestamptz,
    checksum text,
    content_hash text,
    totals_hash text,
    dedupe_hash text,
    total_debit numeric(18,2) default 0,
    total_credit numeric(18,2) default 0,
    transaction_count integer default 0,
    opening_balance numeric(18,2),
    closing_balance numeric(18,2),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists statements_user_id_idx on public.statements (user_id);
create index if not exists statements_statement_date_idx on public.statements (statement_date);

-- Transactions table
create table if not exists public.transactions (
    id uuid primary key default uuid_generate_v4(),
    statement_id uuid not null references public.statements(id) on delete cascade,
    external_id text not null,
    posted_at date,
    description text,
    raw_description text,
    normalized_description text,
    amount numeric(18,2),
    currency text,
    merchant text,
    category text,
    status text,
    checksum text,
    dedupe_hash text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.transactions
    add constraint transactions_statement_external_unique unique (statement_id, external_id);

create index if not exists transactions_statement_id_idx on public.transactions (statement_id);
create index if not exists transactions_posted_at_idx on public.transactions (posted_at);

-- Classification tables for ML pipeline
create table if not exists public.classification_labels (
    id uuid primary key default uuid_generate_v4(),
    user_id text not null,
    statement_id uuid references public.statements(id) on delete set null,
    transaction_id uuid references public.transactions(id) on delete set null,
    description text not null,
    final_category text,
    previous_category text,
    notes text,
    status text not null default 'PENDING',
    metadata jsonb default '{}'::jsonb,
    movement_id text,
    accepted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists classification_labels_status_idx on public.classification_labels (status);

create table if not exists public.classification_model_metrics (
    id uuid primary key default uuid_generate_v4(),
    model_version varchar(64) not null,
    accuracy double precision,
    macro_f1 double precision,
    artifact_uri text not null,
    metrics jsonb not null,
    created_at timestamptz not null default now()
);
