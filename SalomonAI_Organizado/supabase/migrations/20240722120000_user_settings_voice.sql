create table if not exists public.user_settings (
    user_id uuid primary key,
    voice_id text not null,
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_user_settings_voice on public.user_settings (voice_id);
