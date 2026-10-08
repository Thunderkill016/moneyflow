-- Add only the index shape required by the authenticated budget read path.
-- The catalog guard avoids duplicating an equivalent historical index under a
-- different name.

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'monthly_budgets'
      and position('(user_id, month_start' in indexdef) > 0
  ) then
    create index monthly_budgets_user_month_category_idx
      on public.monthly_budgets (user_id, month_start, category_id);
  end if;
end;
$$;
