-- D12: non-monthly budget periods (RESEARCH_TOP_FINANCE_APPS.md §10 —
-- Money Lover 6.5, ADAPT verdict). A `period_kind` on monthly_budgets
-- lets one category budget repeat per ISO week instead of only per
-- calendar month: weekly allowance budgeting ("tiền tiêu tuần") is a
-- normal VN cadence, and Tết-length custom windows are already served
-- by event_budgets (D2) so only recurring non-monthly periods are new.
--
-- The scope is deliberately {monthly, weekly}: those are the cadences
-- the mobile client writes and renders. Quarterly/yearly are NOT
-- admitted yet — a check value no client can produce would be dead
-- contract, and adding them later is a small follow-up migration.
--
-- `month_start` stays the column name: it is now the PERIOD anchor
-- (first day of the month for monthly rows, the Monday for weekly
-- rows). Renaming would churn the RPC/view contract every client
-- already speaks; the per-kind anchor rules below keep the value
-- honest instead.
--
-- Weekly anchors are Mondays — the Vietnamese civil week starts Monday,
-- the same convention the commitment month grid renders.

alter table public.monthly_budgets
  add column period_kind text not null default 'monthly';

alter table public.monthly_budgets
  add constraint monthly_budgets_period_kind_check
  check (period_kind in ('monthly', 'weekly'));

-- The month-start-only check is replaced by a per-period anchor rule.
-- Existing rows are all monthly and already satisfy the monthly clause.
alter table public.monthly_budgets
  drop constraint if exists monthly_budgets_month_start_check;
alter table public.monthly_budgets
  add constraint monthly_budgets_period_start_check check (
    (
      period_kind = 'monthly'
      and month_start = date_trunc('month', month_start)::date
    )
    or (
      period_kind = 'weekly'
      and extract(isodow from month_start) = 1
    )
  );

-- One budget per (category, period kind, anchor): a weekly AND a
-- monthly limit on the same category may coexist — they measure
-- different windows, and the weekly row's Monday can legitimately fall
-- on the 1st of a month.
alter table public.monthly_budgets
  drop constraint if exists monthly_budgets_user_id_category_id_month_start_key;
alter table public.monthly_budgets
  add constraint monthly_budgets_user_category_period_start_key
  unique (user_id, category_id, period_kind, month_start);

-- upsert_monthly_budget gains p_period_kind (trailing default keeps
-- named-argument callers on the old shape resolving to this signature);
-- the previous 4-argument signature is dropped exactly like the
-- 3→4-argument migration did.
drop function if exists public.upsert_monthly_budget(uuid, date, bigint, timestamptz);

create function public.upsert_monthly_budget(
  p_category_id uuid,
  p_month_start date,
  p_limit_minor bigint,
  p_expected_updated_at timestamptz default null,
  p_period_kind text default 'monthly'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_category_kind public.category_kind;
  v_category_archived boolean;
  v_budget_id uuid;
  v_existing_updated_at timestamptz;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_period_kind is null or p_period_kind not in ('monthly', 'weekly') then
    raise exception 'invalid_budget_period';
  end if;
  if p_month_start is null then raise exception 'invalid_budget_month'; end if;
  if p_period_kind = 'monthly'
     and p_month_start <> date_trunc('month', p_month_start)::date then
    raise exception 'invalid_budget_month';
  end if;
  if p_period_kind = 'weekly'
     and extract(isodow from p_month_start) <> 1 then
    raise exception 'invalid_budget_week';
  end if;
  if p_limit_minor is null or p_limit_minor <= 0 or p_limit_minor > 9007199254740991 then
    raise exception 'invalid_budget_limit';
  end if;

  select kind, is_archived into v_category_kind, v_category_archived from public.categories where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'expense' then raise exception 'expense_category_required'; end if;
  if v_category_archived then raise exception 'category_archived'; end if;

  -- Optimistic concurrency, now scoped to the full conflict target
  -- (user, category, period kind, anchor): a caller editing the weekly
  -- row must not be serialised against the same-day monthly row.
  if p_expected_updated_at is not null then
    select updated_at into v_existing_updated_at
    from public.monthly_budgets
    where user_id = v_user_id and category_id = p_category_id
      and period_kind = p_period_kind and month_start = p_month_start
    for update;
    if v_existing_updated_at is not null
       and v_existing_updated_at is distinct from p_expected_updated_at then
      raise exception 'stale_write';
    end if;
  end if;

  insert into public.monthly_budgets (user_id, category_id, month_start, limit_minor, period_kind)
  values (v_user_id, p_category_id, p_month_start, p_limit_minor, p_period_kind)
  on conflict (user_id, category_id, period_kind, month_start)
  do update set limit_minor = excluded.limit_minor, updated_at = now()
  returning id into v_budget_id;
  return v_budget_id;
end;
$$;

revoke all on function public.upsert_monthly_budget(uuid, date, bigint, timestamptz, text) from public, anon;
grant execute on function public.upsert_monthly_budget(uuid, date, bigint, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------
-- budget_progress: the spend window is now period-aware — a weekly row
-- sums the 7 days [anchor, anchor + 7), a monthly row its calendar month
-- like before. `period_kind` is appended LAST: CREATE OR REPLACE VIEW
-- cannot rename or reorder existing positional columns (updated_at was
-- already appended at position 10 for the same reason).
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
  budget.updated_at,
  budget.period_kind
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
  and transaction_record.occurred_on <
    case
      when budget.period_kind = 'weekly' then budget.month_start + 7
      else (budget.month_start + interval '1 month')::date
    end
group by budget.id, budget.user_id, budget.category_id, category.name,
  category.icon, category.color, budget.month_start, budget.limit_minor,
  budget.updated_at, budget.period_kind;

revoke all on public.budget_progress from anon;
grant select on public.budget_progress to authenticated;

-- ---------------------------------------------------------------------------
-- get_dashboard_bundle: the budgets slice answers "this MONTH's budgets" —
-- now that a weekly row can legitimately anchor on a first-of-month Monday
-- (2026-06-01 is both), the anchor match alone is ambiguous. Scope the slice
-- to monthly rows explicitly, identical function otherwise.
-- ---------------------------------------------------------------------------

create or replace function public.get_dashboard_bundle(
  p_today date,
  p_transaction_start date,
  p_recent_limit integer default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_month_start date;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  -- Inputs are supplied by the server only to keep Vietnam calendar boundaries
  -- aligned with the UI. Bound them again in the database because every RPC is
  -- a public authenticated entrypoint and must not expose an unbounded history
  -- scan to a forged client.
  if p_today is null
    or p_today < current_date - 1
    or p_today > current_date + 1
  then
    raise exception 'invalid_dashboard_today';
  end if;

  -- The application's real window is the month-to-date comparison start,
  -- which reaches 2d-1 days back on day d of the month (max 61 for a 31-day
  -- month). The old -45 bound rejected every render from the 24th onward and
  -- silently forced the multi-query fallback; -62 covers the honest maximum
  -- while staying a bounded scan.
  if p_transaction_start is null
    or p_transaction_start < p_today - 62
    or p_transaction_start > p_today
  then
    raise exception 'invalid_dashboard_transaction_range';
  end if;

  if p_recent_limit is null or p_recent_limit < 1 or p_recent_limit > 20 then
    raise exception 'invalid_dashboard_recent_limit';
  end if;

  v_month_start := date_trunc('month', p_today::timestamp)::date;

  with recent_transaction_ids as (
    select feed.id
    from public.transaction_feed as feed
    where feed.user_id = v_user_id
    order by feed.occurred_on desc, feed.created_at desc, feed.id desc
    limit p_recent_limit
  ),
  selected_transactions as (
    select
      feed.id,
      feed.kind,
      feed.note,
      feed.occurred_on,
      feed.created_at,
      feed.amount_minor,
      feed.account_id,
      feed.account_name,
      feed.category_id,
      feed.category_name,
      feed.destination_account_id,
      feed.destination_account_name,
      feed.is_recurring_payment,
      feed.split_lines,
      feed.payee,
      feed.goal_id,
      feed.goal_name
    from public.transaction_feed as feed
    where feed.user_id = v_user_id
      and (
        feed.occurred_on >= p_transaction_start
        or feed.id in (select recent.id from recent_transaction_ids as recent)
      )
  )
  select jsonb_build_object(
    'transactions', coalesce((
      select jsonb_agg(
        to_jsonb(transaction_row)
        order by transaction_row.occurred_on desc,
          transaction_row.created_at desc,
          transaction_row.id desc
      )
      from selected_transactions as transaction_row
    ), '[]'::jsonb),
    'accounts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', account.id,
          'name', account.name,
          'currency_code', account.currency_code
        )
        order by account.created_at, account.id
      )
      from public.accounts as account
      where account.user_id = v_user_id and account.is_archived = false
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', category.id,
          'name', category.name,
          'kind', category.kind,
          'icon', category.icon,
          'color', category.color
        )
        order by category.created_at, category.id
      )
      from public.categories as category
      where category.user_id = v_user_id and category.is_archived = false
    ), '[]'::jsonb),
    'balances', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'account_id', balance.account_id,
          'balance_minor', balance.balance_minor,
          'currency_code', balance.currency_code
        )
        order by balance.account_id
      )
      from public.account_balances as balance
      where balance.user_id = v_user_id
    ), '[]'::jsonb),
    'budgets', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', budget.id,
          'category_id', budget.category_id,
          'category_name', budget.category_name,
          'category_icon', budget.category_icon,
          'category_color', budget.category_color,
          'month_start', budget.month_start,
          'limit_minor', budget.limit_minor,
          'spent_minor', budget.spent_minor
        )
        order by budget.category_name, budget.id
      )
      from public.budget_progress as budget
      where budget.user_id = v_user_id and budget.month_start = v_month_start
        and budget.period_kind = 'monthly'
    ), '[]'::jsonb),
    'commitments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', commitment.id,
          'name', commitment.name,
          'amount_minor', commitment.amount_minor,
          'due_day', commitment.due_day,
          'account_id', commitment.account_id,
          'account_name', commitment.account_name,
          'category_id', commitment.category_id,
          'category_name', commitment.category_name,
          'category_icon', commitment.category_icon,
          'category_color', commitment.category_color,
          'is_archived', commitment.is_archived
        )
        order by commitment.due_day, commitment.id
      )
      from public.recurring_commitment_feed as commitment
      where commitment.user_id = v_user_id
    ), '[]'::jsonb),
    'commitment_occurrences', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'commitment_id', occurrence.commitment_id,
          'transaction_id', occurrence.transaction_id
        )
        order by occurrence.commitment_id
      )
      from public.commitment_occurrences as occurrence
      where occurrence.user_id = v_user_id
        and occurrence.month_start = v_month_start
    ), '[]'::jsonb),
    'income_templates', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', template.id,
          'name', template.name,
          'amount_minor', template.amount_minor,
          'due_day', template.due_day,
          'account_id', template.account_id,
          'account_name', template.account_name,
          'category_id', template.category_id,
          'category_name', template.category_name,
          'category_icon', template.category_icon,
          'category_color', template.category_color,
          'is_archived', template.is_archived
        )
        order by template.due_day, template.id
      )
      from public.recurring_income_template_feed as template
      where template.user_id = v_user_id
    ), '[]'::jsonb),
    'income_occurrences', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'template_id', occurrence.template_id,
          'transaction_id', occurrence.transaction_id
        )
        order by occurrence.template_id
      )
      from public.income_template_occurrences as occurrence
      where occurrence.user_id = v_user_id
        and occurrence.month_start = v_month_start
    ), '[]'::jsonb),
    'goals', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', goal.id,
          'name', goal.name,
          'target_minor', goal.target_minor,
          'allocated_minor', goal.allocated_minor,
          'deadline', goal.deadline,
          'created_at', goal.created_at,
          'is_archived', goal.is_archived
        )
        order by goal.is_archived, goal.deadline nulls last, goal.id
      )
      from public.savings_goals as goal
      where goal.user_id = v_user_id
    ), '[]'::jsonb),
    'pending_inbox_count', (
      select count(*)
      from public.inbox_candidates as candidate
      where candidate.user_id = v_user_id and candidate.status = 'pending'
    ),
    'ledger_trust', (
      select to_jsonb(trust_row)
      from public.ledger_trust_summary() as trust_row
    ),
    'backup_state', (
      select jsonb_build_object(
        'last_backup_at', profile.last_backup_at::date,
        'created_at', profile.created_at::date
      )
      from public.profiles as profile
      where profile.id = v_user_id
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_dashboard_bundle(date, date, integer)
  from public, anon, authenticated;
grant execute on function public.get_dashboard_bundle(date, date, integer)
  to authenticated;
