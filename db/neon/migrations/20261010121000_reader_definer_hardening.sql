-- SECURITY PROPERTY CHANGE — reader RPCs move to SECURITY DEFINER.
--
-- Why: hosted Neon is RPC-only for authenticated callers. Its managed
-- `authenticated` role lacks USAGE on schema `auth`, so any SECURITY INVOKER
-- function that evaluates auth.uid()/auth.jwt() fails 42501 before it can
-- read a row. These four readers were dead on hosted Neon. Under SECURITY
-- DEFINER the body executes as the migration owner (which has auth schema
-- usage) while auth.uid() still resolves the *request* JWT's sub — so every
-- `user_id = v_user_id` predicate below remains the sole tenant boundary.
-- There is no RLS safety net under definer; a missing or altered predicate
-- leaks the entire table. The pgTAP cross-tenant suite
-- (write_path_rpcs.test.sql) is therefore required, not advisory.
--
-- `reconciliation_snapshot_for_user` deliberately reverses the #567 invoker
-- choice (20260910182000): invoker is correct where the caller can resolve
-- auth.uid(), but on hosted Neon it cannot — the function's own
-- `p_user_id is distinct from v_user_id` check plus owner-predicate reads are
-- the boundary now. Same trust posture as every other reviewed definer.
--
-- `export_user_archive_pre_goal` / `export_user_archive_pre_source_lineage`
-- stay SECURITY INVOKER: they resolve auth.uid() correctly when invoked as
-- owner inside the definer wrapper. They remain independently callable by
-- `authenticated` (and therefore dead on hosted Neon when called directly —
-- same failure mode this file fixes here). Their authenticated EXECUTE grant
-- is left unchanged pending owner sign-off; revoking it is a separate review
-- decision, not bundled into this flip.
--
-- TODO (verification debt): required pgTAP coverage for these flips —
--   * tenant B invoking each reader sees only B's rows (accounts, categories,
--     transactions, inbox counts) and never tenant A's;
--   * reconciliation_snapshot_for_user with p_user_id = A under a B session
--     raises reconciliation_snapshot_forbidden;
--   * security_definer_contract inventory updated for the new definer count
--     and the snapshot's prosecdef flip;
--   * hosted-Neon smoke evidence that a real JWT can execute each reader
--     (local pgTAP cannot reproduce the missing auth-schema USAGE grant).

create or replace function public.export_user_archive()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_archive jsonb;
  v_transactions jsonb;
  v_legacy_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  v_archive := public.export_user_archive_pre_goal();
  v_legacy_count := jsonb_array_length(v_archive #> '{tables,transactions}');

  select coalesce(
    jsonb_agg(
      (source_row.value || jsonb_build_object('goal_id', live.goal_id))
      order by source_row.ordinality
    ),
    '[]'::jsonb
  )
  into v_transactions
  from jsonb_array_elements(v_archive #> '{tables,transactions}')
    with ordinality as source_row(value, ordinality)
  join public.financial_transactions as live
    on live.id = (source_row.value ->> 'id')::uuid
    and live.user_id = v_user_id;

  if jsonb_array_length(v_transactions) <> v_legacy_count then
    raise exception 'archive_transaction_projection_mismatch';
  end if;

  v_archive := jsonb_set(
    v_archive,
    '{tables,transactions}',
    v_transactions,
    false
  );
  v_archive := jsonb_set(
    v_archive,
    '{schema_generation}',
    to_jsonb('20260924120000'::text),
    false
  );
  return v_archive;
end;
$$;

revoke all on function public.export_user_archive()
  from public, anon, authenticated;
grant execute on function public.export_user_archive() to authenticated;

comment on function public.export_user_archive() is
  'MoneyFlow archive v1 producer for schema generation 20260924120000; preserves transaction goal linkage.';

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

create or replace function public.ledger_trust_summary()
returns table (
  trusted_through date,
  base_reconciliation_through date,
  status text,
  reason text,
  active_account_count integer,
  clean_reconciled_account_count integer,
  pending_inbox_count bigint,
  needs_review_transaction_count bigint,
  unreconciled_account_leg_count bigint,
  earliest_unresolved_on date,
  coverage_scope text
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_active_account_count integer := 0;
  v_clean_reconciled_account_count integer := 0;
  v_base_reconciliation_through date;
  v_pending_inbox_count bigint := 0;
  v_needs_review_transaction_count bigint := 0;
  v_unreconciled_account_leg_count bigint := 0;
  v_earliest_pending_inbox date;
  v_earliest_needs_review date;
  v_earliest_unreconciled_leg date;
  v_earliest_unresolved date;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select count(*)::integer
  into v_active_account_count
  from public.accounts account
  where account.user_id = v_user_id
    and not account.is_archived;

  if v_active_account_count = 0 then
    return query
    select
      null::date,
      null::date,
      'blocked'::text,
      'no_active_accounts'::text,
      v_active_account_count,
      0::integer,
      0::bigint,
      0::bigint,
      0::bigint,
      null::date,
      'known_ledger_state_only'::text;
    return;
  end if;

  with active_accounts as (
    select account.id
    from public.accounts account
    where account.user_id = v_user_id
      and not account.is_archived
  ), latest_clean as (
    select
      active_account.id as account_id,
      max(reconciliation.statement_date) as statement_date
    from active_accounts active_account
    left join public.account_reconciliations reconciliation
      on reconciliation.user_id = v_user_id
     and reconciliation.account_id = active_account.id
     and reconciliation.status = 'completed'::public.account_reconciliation_status
     and reconciliation.statement_balance_minor = reconciliation.calculated_balance_minor
     and reconciliation.pending_account_leg_count = 0
    group by active_account.id
  )
  select
    count(*) filter (where latest_clean.statement_date is not null)::integer,
    min(latest_clean.statement_date)
  into
    v_clean_reconciled_account_count,
    v_base_reconciliation_through
  from latest_clean;

  if v_clean_reconciled_account_count <> v_active_account_count
     or v_base_reconciliation_through is null then
    return query
    select
      null::date,
      v_base_reconciliation_through,
      'blocked'::text,
      'missing_clean_reconciliation'::text,
      v_active_account_count,
      v_clean_reconciled_account_count,
      0::bigint,
      0::bigint,
      0::bigint,
      null::date,
      'known_ledger_state_only'::text;
    return;
  end if;

  select
    count(*)::bigint,
    min(candidate.occurred_on)
  into
    v_pending_inbox_count,
    v_earliest_pending_inbox
  from public.inbox_candidates candidate
  where candidate.user_id = v_user_id
    and candidate.status = 'pending'::public.inbox_candidate_status
    and candidate.occurred_on <= v_base_reconciliation_through;

  select
    count(*)::bigint,
    min(transaction.occurred_on)
  into
    v_needs_review_transaction_count,
    v_earliest_needs_review
  from public.financial_transactions transaction
  where transaction.user_id = v_user_id
    and transaction.deleted_at is null
    and transaction.review_status = 'needs_review'::public.transaction_review_status
    and transaction.occurred_on <= v_base_reconciliation_through;

  select
    count(*)::bigint,
    min(transaction.occurred_on)
  into
    v_unreconciled_account_leg_count,
    v_earliest_unreconciled_leg
  from public.transaction_entries entry
  join public.financial_transactions transaction
    on transaction.id = entry.transaction_id
   and transaction.user_id = entry.user_id
  join public.accounts account
    on account.id = entry.account_id
   and account.user_id = entry.user_id
  where entry.user_id = v_user_id
    and not account.is_archived
    and transaction.deleted_at is null
    and transaction.occurred_on <= v_base_reconciliation_through
    and entry.reconciliation_state <> 'reconciled'::public.entry_reconciliation_state;

  select min(unresolved_on)
  into v_earliest_unresolved
  from (values
    (v_earliest_pending_inbox),
    (v_earliest_needs_review),
    (v_earliest_unreconciled_leg)
  ) unresolved(unresolved_on);

  if v_earliest_unresolved is not null then
    return query
    select
      (v_earliest_unresolved - 1),
      v_base_reconciliation_through,
      'trusted_limited'::text,
      'known_unresolved_work'::text,
      v_active_account_count,
      v_clean_reconciled_account_count,
      v_pending_inbox_count,
      v_needs_review_transaction_count,
      v_unreconciled_account_leg_count,
      v_earliest_unresolved,
      'known_ledger_state_only'::text;
    return;
  end if;

  return query
  select
    v_base_reconciliation_through,
    v_base_reconciliation_through,
    'trusted'::text,
    'clean_reconciliation_boundary'::text,
    v_active_account_count,
    v_clean_reconciled_account_count,
    0::bigint,
    0::bigint,
    0::bigint,
    null::date,
    'known_ledger_state_only'::text;
end;
$function$;

revoke all on function public.ledger_trust_summary() from public, anon;
grant execute on function public.ledger_trust_summary() to authenticated;

comment on function public.ledger_trust_summary() is
  'Returns the maximum date through which the caller''s known MoneyFlow ledger state is trusted from clean completed reconciliations and known unresolved ledger/review work. It does not assert external source completeness.';

create or replace function public.reconciliation_snapshot_for_user(
  p_user_id uuid,
  p_account_id uuid,
  p_statement_date date
)
returns table (
  cleared_balance_minor bigint,
  pending_account_leg_count bigint,
  cleared_account_leg_count bigint,
  reconciled_account_leg_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_user_id is distinct from v_user_id then
    raise exception 'reconciliation_snapshot_forbidden';
  end if;

  return query
  select
    (
      account.initial_balance_minor::numeric
      + coalesce(
          sum(entry.amount_minor::numeric) filter (
            where transaction_record.deleted_at is null
              and transaction_record.occurred_on <= p_statement_date
              and entry.reconciliation_state in ('cleared', 'reconciled')
          ),
          0::numeric
        )
    )::bigint as cleared_balance_minor,
    count(distinct transaction_record.id) filter (
      where transaction_record.deleted_at is null
        and transaction_record.occurred_on <= p_statement_date
        and entry.reconciliation_state = 'pending'
    )::bigint as pending_account_leg_count,
    count(distinct transaction_record.id) filter (
      where transaction_record.deleted_at is null
        and transaction_record.occurred_on <= p_statement_date
        and entry.reconciliation_state = 'cleared'
    )::bigint as cleared_account_leg_count,
    count(distinct transaction_record.id) filter (
      where transaction_record.deleted_at is null
        and transaction_record.occurred_on <= p_statement_date
        and entry.reconciliation_state = 'reconciled'
    )::bigint as reconciled_account_leg_count
  from public.accounts account
  left join public.transaction_entries entry
    on entry.account_id = account.id
   and entry.user_id = account.user_id
  left join public.financial_transactions transaction_record
    on transaction_record.id = entry.transaction_id
   and transaction_record.user_id = entry.user_id
  where account.id = p_account_id
    and account.user_id = v_user_id
  group by account.id, account.initial_balance_minor;
end;
$$;

revoke execute on function public.reconciliation_snapshot_for_user(uuid, uuid, date)
from public, anon;

grant execute on function public.reconciliation_snapshot_for_user(uuid, uuid, date)
to authenticated;
