-- Collapse the authenticated dashboard's feature-by-feature PostgREST fan-out
-- into one bounded, RLS-aware read. This function intentionally remains
-- SECURITY INVOKER (the PostgreSQL default): the existing table policies and
-- security-invoker views continue to be the ownership boundary.

create or replace function public.get_dashboard_bundle(
  p_today date,
  p_transaction_start date,
  p_recent_limit integer default 5
)
returns jsonb
language plpgsql
stable
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

  if p_transaction_start is null
    or p_transaction_start < p_today - 45
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
      feed.split_lines
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
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_dashboard_bundle(date, date, integer)
  from public, anon, authenticated;
grant execute on function public.get_dashboard_bundle(date, date, integer)
  to authenticated;

comment on function public.get_dashboard_bundle(date, date, integer) is
  'Bounded RLS-aware dashboard read model; one Data API call per render.';
