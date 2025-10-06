-- Supabase migration: indexes and stats function for movements module
create extension if not exists pg_trgm;

create index if not exists transactions_category_trgm_idx on public.transactions using gin (category gin_trgm_ops);
create index if not exists transactions_posted_at_idx on public.transactions (posted_at);

create or replace function public.movements_stats(
    p_user_id text,
    p_account_id uuid default null,
    p_statement_id uuid default null,
    p_category text default null,
    p_merchant text default null,
    p_search text default null,
    p_min_amount numeric default null,
    p_max_amount numeric default null,
    p_start_date date default null,
    p_end_date date default null,
    p_type text default null
)
returns table (
    total_count bigint,
    total_amount numeric,
    inflow numeric,
    outflow numeric,
    average_amount numeric
)
language plpgsql
as $$
begin
    return query
    select
        count(*)::bigint as total_count,
        coalesce(sum(coalesce(t.amount, 0)), 0)::numeric as total_amount,
        coalesce(sum(case when coalesce(t.amount, 0) >= 0 then coalesce(t.amount, 0) else 0 end), 0)::numeric as inflow,
        coalesce(sum(case when coalesce(t.amount, 0) < 0 then abs(coalesce(t.amount, 0)) else 0 end), 0)::numeric as outflow,
        coalesce(avg(coalesce(t.amount, 0)), 0)::numeric as average_amount
    from public.transactions t
    join public.statements s on s.id = t.statement_id
    where s.user_id = p_user_id
      and (p_account_id is null or s.account_id = p_account_id)
      and (p_statement_id is null or t.statement_id = p_statement_id)
      and (p_category is null or t.category ilike '%' || p_category || '%')
      and (p_merchant is null or t.merchant ilike '%' || p_merchant || '%')
      and (p_min_amount is null or coalesce(t.amount, 0) >= p_min_amount)
      and (p_max_amount is null or coalesce(t.amount, 0) <= p_max_amount)
      and (p_start_date is null or t.posted_at >= p_start_date)
      and (p_end_date is null or t.posted_at <= p_end_date)
      and (
        p_type is null or
        (p_type = 'inflow' and coalesce(t.amount, 0) >= 0) or
        (p_type = 'outflow' and coalesce(t.amount, 0) < 0)
      )
      and (
        p_search is null or
        t.description ilike '%' || p_search || '%' or
        t.raw_description ilike '%' || p_search || '%' or
        t.normalized_description ilike '%' || p_search || '%' or
        t.merchant ilike '%' || p_search || '%' or
        t.category ilike '%' || p_search || '%'
      );
end;
$$;
