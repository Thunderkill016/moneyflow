-- Serialize reconciliation state transitions per account.
-- The lock is acquired before row locks in every RPC to avoid completion/state races
-- and to keep lock ordering consistent across start, clear, complete and reopen.

create or replace function public.lock_reconciliation_account(
  p_account_id uuid
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  select pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_account_id::text, 0)
  );
$$;

create or replace function public.start_account_reconciliation(
  p_account_id uuid,
  p_statement_date date,
  p_statement_balance_minor bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_reconciliation_id uuid;
  v_calculated_balance bigint;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_statement_date is null or p_statement_date > current_date then
    raise exception 'invalid_statement_date';
  end if;
  if p_statement_balance_minor is null
     or p_statement_balance_minor not between -9007199254740991 and 9007199254740991 then
    raise exception 'invalid_statement_balance';
  end if;

  if not exists (
    select 1
    from public.accounts
    where id = p_account_id
      and user_id = v_user_id
      and not is_archived
  ) then
    raise exception 'account_not_found';
  end if;

  perform public.lock_reconciliation_account(p_account_id);

  perform 1
  from public.accounts
  where id = p_account_id
    and user_id = v_user_id
    and not is_archived
  for update;

  if not found then
    raise exception 'account_not_found';
  end if;

  if exists (
    select 1
    from public.account_reconciliations
    where user_id = v_user_id
      and account_id = p_account_id
      and status = 'open'
  ) then
    raise exception 'open_reconciliation_exists';
  end if;

  if exists (
    select 1
    from public.account_reconciliations
    where user_id = v_user_id
      and account_id = p_account_id
      and status = 'completed'
      and statement_date >= p_statement_date
  ) then
    raise exception 'statement_date_not_after_previous_reconciliation';
  end if;

  insert into public.account_reconciliations (
    user_id,
    account_id,
    statement_date,
    statement_balance_minor
  )
  values (
    v_user_id,
    p_account_id,
    p_statement_date,
    p_statement_balance_minor
  )
  returning id into v_reconciliation_id;

  v_calculated_balance := public.reconciliation_cleared_balance(
    v_user_id,
    p_account_id,
    p_statement_date
  );

  insert into public.account_reconciliation_events (
    user_id,
    reconciliation_id,
    account_id,
    kind,
    statement_balance_minor,
    calculated_balance_minor,
    difference_minor
  )
  values (
    v_user_id,
    v_reconciliation_id,
    p_account_id,
    'started',
    p_statement_balance_minor,
    v_calculated_balance,
    p_statement_balance_minor - v_calculated_balance
  );

  return v_reconciliation_id;
end;
$$;

create or replace function public.set_account_entry_reconciliation_state(
  p_entry_id uuid,
  p_state public.entry_reconciliation_state
)
returns public.entry_reconciliation_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_current_state public.entry_reconciliation_state;
  v_deleted_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_state is null or p_state = 'reconciled' then
    raise exception 'invalid_manual_reconciliation_state';
  end if;

  select entry.account_id
  into v_account_id
  from public.transaction_entries entry
  where entry.id = p_entry_id
    and entry.user_id = v_user_id;

  if not found then
    raise exception 'entry_not_found';
  end if;

  perform public.lock_reconciliation_account(v_account_id);

  select entry.reconciliation_state, transaction_record.deleted_at
  into v_current_state, v_deleted_at
  from public.transaction_entries entry
  join public.financial_transactions transaction_record
    on transaction_record.id = entry.transaction_id
   and transaction_record.user_id = entry.user_id
  where entry.id = p_entry_id
    and entry.user_id = v_user_id
    and entry.account_id = v_account_id
  for update of entry;

  if not found then
    raise exception 'entry_not_found';
  end if;
  if v_deleted_at is not null then
    raise exception 'transaction_deleted';
  end if;
  if v_current_state = 'reconciled' then
    raise exception 'entry_reconciled';
  end if;

  update public.transaction_entries
  set reconciliation_state = p_state,
      cleared_at = case
        when p_state = 'cleared' then coalesce(cleared_at, now())
        else null
      end,
      reconciliation_id = null
  where id = p_entry_id
    and user_id = v_user_id
    and account_id = v_account_id;

  return p_state;
end;
$$;

create or replace function public.complete_account_reconciliation(
  p_reconciliation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_statement_date date;
  v_statement_balance bigint;
  v_calculated_balance bigint;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select account_id
  into v_account_id
  from public.account_reconciliations
  where id = p_reconciliation_id
    and user_id = v_user_id
    and status = 'open';

  if not found then
    raise exception 'open_reconciliation_not_found';
  end if;

  perform public.lock_reconciliation_account(v_account_id);

  select account_id, statement_date, statement_balance_minor
  into v_account_id, v_statement_date, v_statement_balance
  from public.account_reconciliations
  where id = p_reconciliation_id
    and user_id = v_user_id
    and account_id = v_account_id
    and status = 'open'
  for update;

  if not found then
    raise exception 'open_reconciliation_not_found';
  end if;

  v_calculated_balance := public.reconciliation_cleared_balance(
    v_user_id,
    v_account_id,
    v_statement_date
  );

  if v_calculated_balance <> v_statement_balance then
    raise exception 'reconciliation_difference_nonzero';
  end if;

  update public.transaction_entries entry
  set reconciliation_state = 'reconciled',
      reconciliation_id = p_reconciliation_id,
      cleared_at = coalesce(entry.cleared_at, now())
  from public.financial_transactions transaction_record
  where entry.transaction_id = transaction_record.id
    and entry.user_id = transaction_record.user_id
    and entry.user_id = v_user_id
    and entry.account_id = v_account_id
    and entry.reconciliation_state = 'cleared'
    and transaction_record.deleted_at is null
    and transaction_record.occurred_on <= v_statement_date;

  update public.account_reconciliations
  set status = 'completed',
      calculated_balance_minor = v_calculated_balance,
      completed_at = now()
  where id = p_reconciliation_id
    and user_id = v_user_id;

  insert into public.account_reconciliation_events (
    user_id,
    reconciliation_id,
    account_id,
    kind,
    statement_balance_minor,
    calculated_balance_minor,
    difference_minor
  )
  values (
    v_user_id,
    p_reconciliation_id,
    v_account_id,
    'completed',
    v_statement_balance,
    v_calculated_balance,
    0
  );

  return true;
end;
$$;

create or replace function public.reopen_account_reconciliation(
  p_reconciliation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_statement_date date;
  v_statement_balance bigint;
  v_calculated_balance bigint;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select account_id
  into v_account_id
  from public.account_reconciliations
  where id = p_reconciliation_id
    and user_id = v_user_id
    and status = 'completed';

  if not found then
    raise exception 'completed_reconciliation_not_found';
  end if;

  perform public.lock_reconciliation_account(v_account_id);

  select
    account_id,
    statement_date,
    statement_balance_minor,
    calculated_balance_minor
  into
    v_account_id,
    v_statement_date,
    v_statement_balance,
    v_calculated_balance
  from public.account_reconciliations
  where id = p_reconciliation_id
    and user_id = v_user_id
    and account_id = v_account_id
    and status = 'completed'
  for update;

  if not found then
    raise exception 'completed_reconciliation_not_found';
  end if;

  if exists (
    select 1
    from public.account_reconciliations
    where user_id = v_user_id
      and account_id = v_account_id
      and id <> p_reconciliation_id
      and (
        status = 'open'
        or (
          status = 'completed'
          and statement_date > v_statement_date
        )
      )
  ) then
    raise exception 'only_latest_reconciliation_can_reopen';
  end if;

  insert into public.account_reconciliation_events (
    user_id,
    reconciliation_id,
    account_id,
    kind,
    statement_balance_minor,
    calculated_balance_minor,
    difference_minor
  )
  values (
    v_user_id,
    p_reconciliation_id,
    v_account_id,
    'reopened',
    v_statement_balance,
    v_calculated_balance,
    v_statement_balance - v_calculated_balance
  );

  update public.transaction_entries
  set reconciliation_state = 'cleared',
      reconciliation_id = null
  where user_id = v_user_id
    and account_id = v_account_id
    and reconciliation_id = p_reconciliation_id
    and reconciliation_state = 'reconciled';

  update public.account_reconciliations
  set status = 'open',
      calculated_balance_minor = null,
      completed_at = null,
      last_reopened_at = now()
  where id = p_reconciliation_id
    and user_id = v_user_id;

  return true;
end;
$$;

revoke execute on function public.lock_reconciliation_account(uuid)
from public, anon, authenticated;
