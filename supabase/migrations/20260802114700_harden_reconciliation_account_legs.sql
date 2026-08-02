-- Reconciliation state is account-leg state represented on all ledger entries
-- for the same transaction/account pair. Split expense lines therefore move
-- together, while transfer legs in different accounts remain independent.

create or replace function public.assert_reconciliation_account_leg_consistent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_distinct_states integer;
begin
  if tg_op <> 'INSERT' then
    select count(distinct row(
      entry.reconciliation_state,
      entry.cleared_at,
      entry.reconciliation_id
    ))::integer
    into v_distinct_states
    from public.transaction_entries entry
    where entry.transaction_id = old.transaction_id
      and entry.user_id = old.user_id
      and entry.account_id = old.account_id;

    if v_distinct_states > 1 then
      raise exception 'inconsistent_reconciliation_account_leg';
    end if;
  end if;

  if tg_op <> 'DELETE' then
    select count(distinct row(
      entry.reconciliation_state,
      entry.cleared_at,
      entry.reconciliation_id
    ))::integer
    into v_distinct_states
    from public.transaction_entries entry
    where entry.transaction_id = new.transaction_id
      and entry.user_id = new.user_id
      and entry.account_id = new.account_id;

    if v_distinct_states > 1 then
      raise exception 'inconsistent_reconciliation_account_leg';
    end if;
  end if;

  return null;
end;
$$;

create constraint trigger transaction_entries_reconciliation_account_leg_consistent
after insert or update or delete on public.transaction_entries
deferrable initially deferred
for each row execute function public.assert_reconciliation_account_leg_consistent();

create or replace function public.normalize_cleared_entry_financial_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.account_id is not distinct from old.account_id
     and new.category_id is not distinct from old.category_id
     and new.amount_minor is not distinct from old.amount_minor then
    return new;
  end if;

  if old.reconciliation_state = 'reconciled' then
    raise exception 'transaction_reconciled';
  end if;

  if old.reconciliation_state = 'cleared' then
    new.reconciliation_state := 'pending';
    new.cleared_at := null;
    new.reconciliation_id := null;
  end if;

  return new;
end;
$$;

create trigger transaction_entries_normalize_cleared_financial_update
before update of account_id, category_id, amount_minor
on public.transaction_entries
for each row execute function public.normalize_cleared_entry_financial_update();

create or replace function public.guard_reconciled_transaction_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.transaction_entries
    where transaction_id = old.id
      and user_id = old.user_id
      and reconciliation_state = 'reconciled'
  ) then
    raise exception 'transaction_reconciled';
  end if;

  if tg_op = 'UPDATE'
     and (
       new.kind is distinct from old.kind
       or new.occurred_on is distinct from old.occurred_on
       or (
         old.deleted_at is null
         and new.deleted_at is not null
       )
     ) then
    update public.transaction_entries
    set reconciliation_state = 'pending',
        cleared_at = null,
        reconciliation_id = null
    where transaction_id = old.id
      and user_id = old.user_id
      and reconciliation_state = 'cleared';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
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
  v_transaction_id uuid;
  v_account_id uuid;
  v_deleted_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_state is null or p_state = 'reconciled' then
    raise exception 'invalid_manual_reconciliation_state';
  end if;

  select entry.transaction_id, entry.account_id
  into v_transaction_id, v_account_id
  from public.transaction_entries entry
  where entry.id = p_entry_id
    and entry.user_id = v_user_id;

  if not found then
    raise exception 'entry_not_found';
  end if;

  perform public.lock_reconciliation_account(v_account_id);

  select transaction_record.deleted_at
  into v_deleted_at
  from public.financial_transactions transaction_record
  where transaction_record.id = v_transaction_id
    and transaction_record.user_id = v_user_id
  for update;

  if not found then
    raise exception 'transaction_not_found';
  end if;
  if v_deleted_at is not null then
    raise exception 'transaction_deleted';
  end if;
  if exists (
    select 1
    from public.transaction_entries entry
    where entry.transaction_id = v_transaction_id
      and entry.user_id = v_user_id
      and entry.account_id = v_account_id
      and entry.reconciliation_state = 'reconciled'
  ) then
    raise exception 'entry_reconciled';
  end if;

  update public.transaction_entries
  set reconciliation_state = p_state,
      cleared_at = case
        when p_state = 'cleared' then coalesce(cleared_at, now())
        else null
      end,
      reconciliation_id = null
  where transaction_id = v_transaction_id
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

  -- Serialize against every edit/delete RPC, which locks the parent financial
  -- transaction before changing its account entries.
  perform transaction_record.id
  from public.financial_transactions transaction_record
  where transaction_record.user_id = v_user_id
    and transaction_record.deleted_at is null
    and transaction_record.occurred_on <= v_statement_date
    and exists (
      select 1
      from public.transaction_entries entry
      where entry.transaction_id = transaction_record.id
        and entry.user_id = transaction_record.user_id
        and entry.account_id = v_account_id
        and entry.reconciliation_state in ('cleared', 'reconciled')
    )
  order by transaction_record.id
  for update;

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

create or replace view public.account_reconciliation_summaries
with (security_invoker = true)
as
select
  reconciliation.id,
  reconciliation.user_id,
  reconciliation.account_id,
  account.name as account_name,
  account.currency_code,
  reconciliation.statement_date,
  reconciliation.statement_balance_minor,
  reconciliation.status,
  reconciliation.calculated_balance_minor,
  reconciliation.started_at,
  reconciliation.completed_at,
  reconciliation.last_reopened_at,
  reconciliation.created_at,
  reconciliation.updated_at,
  (
    account.initial_balance_minor::numeric
    + coalesce(
        sum(entry.amount_minor::numeric) filter (
          where transaction_record.deleted_at is null
            and transaction_record.occurred_on <= reconciliation.statement_date
            and entry.reconciliation_state in ('cleared', 'reconciled')
        ),
        0::numeric
      )
  )::bigint as cleared_balance_minor,
  (
    reconciliation.statement_balance_minor::numeric
    - (
        account.initial_balance_minor::numeric
        + coalesce(
            sum(entry.amount_minor::numeric) filter (
              where transaction_record.deleted_at is null
                and transaction_record.occurred_on <= reconciliation.statement_date
                and entry.reconciliation_state in ('cleared', 'reconciled')
            ),
            0::numeric
          )
      )
  )::bigint as difference_minor,
  count(distinct transaction_record.id) filter (
    where transaction_record.deleted_at is null
      and transaction_record.occurred_on <= reconciliation.statement_date
      and entry.reconciliation_state = 'pending'
  )::bigint as pending_entry_count,
  count(distinct transaction_record.id) filter (
    where transaction_record.deleted_at is null
      and transaction_record.occurred_on <= reconciliation.statement_date
      and entry.reconciliation_state = 'cleared'
  )::bigint as cleared_entry_count,
  count(distinct transaction_record.id) filter (
    where transaction_record.deleted_at is null
      and transaction_record.occurred_on <= reconciliation.statement_date
      and entry.reconciliation_state = 'reconciled'
  )::bigint as reconciled_entry_count
from public.account_reconciliations reconciliation
join public.accounts account
  on account.id = reconciliation.account_id
 and account.user_id = reconciliation.user_id
left join public.transaction_entries entry
  on entry.account_id = reconciliation.account_id
 and entry.user_id = reconciliation.user_id
left join public.financial_transactions transaction_record
  on transaction_record.id = entry.transaction_id
 and transaction_record.user_id = entry.user_id
group by
  reconciliation.id,
  reconciliation.user_id,
  reconciliation.account_id,
  account.id,
  account.name,
  account.currency_code,
  account.initial_balance_minor,
  reconciliation.statement_date,
  reconciliation.statement_balance_minor,
  reconciliation.status,
  reconciliation.calculated_balance_minor,
  reconciliation.started_at,
  reconciliation.completed_at,
  reconciliation.last_reopened_at,
  reconciliation.created_at,
  reconciliation.updated_at;

revoke execute on function public.assert_reconciliation_account_leg_consistent()
from public, anon, authenticated;
revoke execute on function public.normalize_cleared_entry_financial_update()
from public, anon, authenticated;
