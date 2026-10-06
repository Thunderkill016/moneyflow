-- upsert_monthly_budget: optional optimistic-concurrency precondition.
--
-- Mirrors migrations 20260923160000_update_money_transaction_expected_updated_at.sql
-- and 20261006160000_update_account_transfer_expected_updated_at.sql for the
-- budget sibling: adds `p_expected_updated_at` — when supplied and the month's
-- budget row for the (user, category, month_start) conflict target already
-- exists with a different `updated_at`, raises `stale_write` instead of
-- overwriting. `null` keeps the previous last-write-wins behavior; a pure
-- insert (no existing row) has nothing to be stale against and proceeds.
--
-- The old 3-argument signature is dropped; named-argument RPC calls with the
-- original three parameters resolve to the new signature via the default.

drop function if exists public.upsert_monthly_budget(uuid, date, bigint);

create function public.upsert_monthly_budget(
  p_category_id uuid,
  p_month_start date,
  p_limit_minor bigint,
  p_expected_updated_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_category_kind public.category_kind;
  v_budget_id uuid;
  v_existing_updated_at timestamptz;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_month_start is null or p_month_start <> date_trunc('month', p_month_start)::date then
    raise exception 'invalid_budget_month';
  end if;
  if p_limit_minor is null or p_limit_minor <= 0 or p_limit_minor > 9007199254740991 then
    raise exception 'invalid_budget_limit';
  end if;

  select kind into v_category_kind
  from public.categories
  where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'expense' then raise exception 'expense_category_required'; end if;

  -- Optimistic concurrency: when a precondition is supplied, lock the existing
  -- row for the conflict target and fail closed before any write if the
  -- caller's version is stale. The row is locked, so the check is race-free;
  -- `is distinct from` also rejects a non-null expectation when the column
  -- were somehow null. No existing row (pure insert path) cannot be stale.
  if p_expected_updated_at is not null then
    select updated_at into v_existing_updated_at
    from public.monthly_budgets
    where user_id = v_user_id and category_id = p_category_id and month_start = p_month_start
    for update;
    if v_existing_updated_at is not null
       and v_existing_updated_at is distinct from p_expected_updated_at then
      raise exception 'stale_write';
    end if;
  end if;

  insert into public.monthly_budgets (user_id, category_id, month_start, limit_minor)
  values (v_user_id, p_category_id, p_month_start, p_limit_minor)
  on conflict (user_id, category_id, month_start)
  do update set limit_minor = excluded.limit_minor, updated_at = now()
  returning id into v_budget_id;
  return v_budget_id;
end;
$$;

revoke all on function public.upsert_monthly_budget(uuid, date, bigint, timestamptz) from public, anon;
grant execute on function public.upsert_monthly_budget(uuid, date, bigint, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- budget_progress: expose updated_at so the client carries the version it
-- read and can hand it back as the write precondition.
-- ---------------------------------------------------------------------------

create or replace view public.budget_progress
with (security_invoker = true)
as
select
  budget.id,
  budget.user_id,
  budget.category_id,
  category.name as category_name,
  category.icon as category_icon,
  category.color as category_color,
  budget.month_start,
  budget.limit_minor,
  coalesce(sum(
    case
      when transaction_record.id is not null and entry.amount_minor < 0
        then -entry.amount_minor
      else 0
    end
  ), 0)::bigint as spent_minor,
  -- NOTE: updated_at must stay last. CREATE OR REPLACE VIEW cannot rename an
  -- existing positional column (was: spent_minor at position 9); appending
  -- keeps positions 1-9 name-stable.
  budget.updated_at
from public.monthly_budgets as budget
join public.categories as category
  on category.id = budget.category_id and category.user_id = budget.user_id
left join public.transaction_entries as entry
  on entry.category_id = budget.category_id and entry.user_id = budget.user_id
left join public.financial_transactions as transaction_record
  on transaction_record.id = entry.transaction_id
  and transaction_record.user_id = entry.user_id
  and transaction_record.kind = 'expense'
  and transaction_record.deleted_at is null
  and transaction_record.occurred_on >= budget.month_start
  and transaction_record.occurred_on < (budget.month_start + interval '1 month')
group by budget.id, budget.user_id, budget.category_id, category.name,
  category.icon, category.color, budget.month_start, budget.limit_minor,
  budget.updated_at;

revoke all on public.budget_progress from anon;
grant select on public.budget_progress to authenticated;
