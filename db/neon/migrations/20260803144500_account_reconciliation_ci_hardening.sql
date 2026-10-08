-- Close verification gaps found by the first ready-for-review database run.
--
-- The snapshot helper remains callable by the browser role only for the
-- authenticated user's own rows. Supporting indexes follow the exact left
-- prefixes of the new composite foreign keys.

create index account_reconciliations_account_owner_fkey_idx
  on public.account_reconciliations (account_id, user_id);

create index transaction_entries_reconciliation_fkey_idx
  on public.transaction_entries (reconciliation_id, user_id, account_id);

create index account_reconciliation_events_session_owner_fkey_idx
  on public.account_reconciliation_events (
    reconciliation_id,
    user_id,
    account_id
  );

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
