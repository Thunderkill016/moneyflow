-- #586 / THU-54: derive a truthful ledger-trust boundary from existing
-- reconciliation and known-review state without claiming external source completeness.

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
security invoker
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

revoke all on function public.ledger_trust_summary() from public;
revoke all on function public.ledger_trust_summary() from anon;
grant execute on function public.ledger_trust_summary() to authenticated;

comment on function public.ledger_trust_summary() is
  'Returns the maximum date through which the caller''s known MoneyFlow ledger state is trusted from clean completed reconciliations and known unresolved ledger/review work. It does not assert external source completeness.';
