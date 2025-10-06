set check_function_bodies = off;

create table if not exists public.conversation_logs (
    id uuid primary key default uuid_generate_v4(),
    session_id text not null,
    event_type text not null,
    user_query text,
    detected_intent text,
    intent_confidence double precision,
    response_text text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists conversation_logs_session_created_idx
    on public.conversation_logs (session_id, created_at desc);
