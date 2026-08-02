-- Account reconciliation is account-entry state, not a transaction-wide flag.
-- Transfer legs can clear and reconcile independently in their respective accounts.
-- Financial amounts remain integer minor units and account balances remain derived.

create type public.entry_reconciliation_state as enum (
  'pending',
  'cleared',
  'reconciled'
);

create type public.account_reconciliation_status as enum (
  'open',
  'completed'
);

create type public.account_reconciliation_event_kind as enum (
  'started',
  'completed',
  'reopened'
);

create table public.account_reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  statement_date date not null,
  statement_balance_minor bigint not null
    check (statement_balance_minor between -9007199254740991 and 9007199254740991),
  status public.account_reconciliation_status not null default 'open',
  calculated_balance_minor bigint
    check (
      calculated_balance_minor is null
      or calculated_balance_minor between -9007199254740991 and 9007199254740991
    ),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_reconciliations_account_owner_fkey
    foreign key (account_id, user_id)
    references public.accounts (id, user_id)
    on delete cascade,
  constraint account_reconciliations_identity_owner_key
    unique (id, user_id, account_id),
  constraint account_reconciliations_status_shape_check
    check (
      (
        status = 'open'
        and completed_at is null
        and calculated_balance_minor is null
      )
      or (
        status = 'completed'
        and completed_at is not null
        and calculated_balance_minor is not null
      )
    )
);

create unique index account_reconciliations_one_open_per_account_idx
  on public.account_reconciliations (user_id, account_id)
  where status = 'open';

create index account_reconciliations_account_history_idx
  on public.account_reconciliations (
    user_id,
    account_id,
    statement_date desc,
    created_at desc
  );

alter table public.transaction_entries
  add column reconciliation_state public.entry_reconciliation_state
    not null default 'pending',
  add column cleared_at timestamptz,
  add column reconciliation_id uuid,
  add constraint transaction_entries_identity_owner_account_key
    unique (id, user_id, account_id),
  add constraint transaction_entries_reconciliation_fkey
    foreign key (reconciliation_id, user_id, account_id)
    references public.account_reconciliations (id, user_id, account_id)
    on delete restrict,
  add constraint transaction_entries_reconciliation_shape_check
    check (
      (
        reconciliation_state = 'pending'
        and cleared_at is null
        and reconciliation_id is null
      )
      or (
        reconciliation_state = 'cleared'
        and cleared_at is not null
        and reconciliation_id is null
      )
      or (
        reconciliation_state = 'reconciled'
        and cleared_at is not null
        and reconciliation_id is not null
      )
    );

create index transaction_entries_reconciliation_account_idx
  on public.transaction_entries (
    user_id,
    account_id,
    reconciliation_state,
    reconciliation_id
  );

create table public.account_reconciliation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reconciliation_id uuid not null,
  account_id uuid not null,
  kind public.account_reconciliation_event_kind not null,
  statement_balance_minor bigint not null
    check (statement_balance_minor between -9007199254740991 and 9007199254740991),
  calculated_balance_minor bigint not null
    check (calculated_balance_minor between -9007199254740991 and 9007199254740991),
  difference_minor bigint not null
    check (difference_minor between -18014398509481982 and 18014398509481982),
  occurred_at timestamptz not null default now(),
  constraint account_reconciliation_events_session_owner_fkey
    foreign key (reconciliation_id, user_id, account_id)
    references public.account_reconciliations (id, user_id, account_id)
    on delete cascade
);

create index account_reconciliation_events_history_idx
  on public.account_reconciliation_events (
    user_id,
    account_id,
    occurred_at desc
  );

create trigger account_reconciliations_set_updated_at
before update on public.account_reconciliations
for each row execute function public.set_updated_at();

alter table public.account_reconciliations enable row level security;
alter table public.account_reconciliation_events enable row level security;

create policy account_reconciliations_select_own
on public.account_reconciliations
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy account_reconciliation_events_select_own
on public.account_reconciliation_events
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.reconciliation_cleared_balance(
  p_user_id uuid,
  p_account_id uuid,
  p_statement_date date
)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select (
    account.initial_balance_minor::numeric
    + coalesce(
        sum(entry.amount_minor::numeric) filter (
          where transaction_record.deleted_at is null
            and transaction_record.occurred_on <= p_statement_date
            and entry.reconciliation_state in ('cleared', 'reconciled')
        ),
        0::numeric
      )
  )::bigint
  from public.accounts account
  left join public.transaction_entries entry
    on entry.account_id = account.id
   and entry.user_id = account.user_id
  left join public.financial_transactions transaction_record
    on transaction_record.id = entry.transaction_id
   and transaction_record.user_id = entry.user_id
  where account.id = p_account_id
    and account.user_id = p_user_id
  group by account.id, account.initial_balance_minor;
$$;

create view public.account_reconciliation_summaries
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
  count(entry.id) filter (
    where transaction_record.deleted_at is null
      and transaction_record.occurred_on <= reconciliation.statement_date
      and entry.reconciliation_state = 'pending'
  )::bigint as pending_entry_count,
  count(entry.id) filter (
    where transaction_record.deleted_at is null
      and transaction_record.occurred_on <= reconciliation.statement_date
      and entry.reconciliation_state = 'cleared'
  )::bigint as cleared_entry_count,
  count(entry.id) filter (
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
  v_current_state public.entry_reconciliation_state;
  v_deleted_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_state is null or p_state = 'reconciled' then
    raise exception 'invalid_manual_reconciliation_state';
  end if;

  select entry.reconciliation_state, transaction_record.deleted_at
  into v_current_state, v_deleted_at
  from public.transaction_entries entry
  join public.financial_transactions transaction_record
    on transaction_record.id = entry.transaction_id
   and transaction_record.user_id = entry.user_id
  where entry.id = p_entry_id
    and entry.user_id = v_user_id
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
    and user_id = v_user_id;

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

  select account_id, statement_date, statement_balance_minor
  into v_account_id, v_statement_date, v_statement_balance
  from public.account_reconciliations
  where id = p_reconciliation_id
    and user_id = v_user_id
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

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger financial_transactions_guard_reconciled_mutation
before update or delete on public.financial_transactions
for each row execute function public.guard_reconciled_transaction_mutation();

create or replace function public.guard_reconciled_account_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and exists (
    select 1
    from public.account_reconciliations
    where account_id = old.id
      and user_id = old.user_id
  ) then
    raise exception 'reconciled_account_delete_locked';
  end if;

  if tg_op = 'UPDATE'
     and new.initial_balance_minor is distinct from old.initial_balance_minor
     and exists (
       select 1
       from public.account_reconciliations
       where account_id = old.id
         and user_id = old.user_id
     ) then
    raise exception 'reconciliation_requires_adjustment_transaction';
  end if;

  if tg_op = 'UPDATE'
     and new.is_archived
     and not old.is_archived
     and exists (
       select 1
       from public.account_reconciliations
       where account_id = old.id
         and user_id = old.user_id
         and status = 'open'
     ) then
    raise exception 'open_reconciliation_exists';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger accounts_guard_reconciled_mutation
before update or delete on public.accounts
for each row execute function public.guard_reconciled_account_mutation();

create or replace function public.purge_user_tenant_data(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
set lock_timeout = '5s'
set statement_timeout = '30s'
as $$
declare
  v_deleted bigint := 0;
  v_affected bigint := 0;
  v_remaining bigint := 0;
begin
  if p_user_id is null then
    raise exception 'user_id_required';
  end if;

  delete from public.transaction_entries where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.account_reconciliation_events where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.account_reconciliations where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.commitment_occurrences where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.income_template_occurrences where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.savings_goal_allocations where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.inbox_candidates where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.financial_transactions where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.monthly_budgets where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.recurring_commitments where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.recurring_income_templates where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.savings_goals where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.import_batches where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.accounts where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.categories where user_id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  delete from public.profiles where id = p_user_id;
  get diagnostics v_affected = row_count;
  v_deleted := v_deleted + v_affected;

  select
    (select count(*) from public.profiles where id = p_user_id)
    + (select count(*) from public.accounts where user_id = p_user_id)
    + (select count(*) from public.categories where user_id = p_user_id)
    + (select count(*) from public.financial_transactions where user_id = p_user_id)
    + (select count(*) from public.transaction_entries where user_id = p_user_id)
    + (select count(*) from public.account_reconciliations where user_id = p_user_id)
    + (select count(*) from public.account_reconciliation_events where user_id = p_user_id)
    + (select count(*) from public.monthly_budgets where user_id = p_user_id)
    + (select count(*) from public.recurring_commitments where user_id = p_user_id)
    + (select count(*) from public.commitment_occurrences where user_id = p_user_id)
    + (select count(*) from public.recurring_income_templates where user_id = p_user_id)
    + (select count(*) from public.income_template_occurrences where user_id = p_user_id)
    + (select count(*) from public.savings_goals where user_id = p_user_id)
    + (select count(*) from public.savings_goal_allocations where user_id = p_user_id)
    + (select count(*) from public.import_batches where user_id = p_user_id)
    + (select count(*) from public.inbox_candidates where user_id = p_user_id)
  into v_remaining;

  if v_remaining <> 0 then
    raise exception 'tenant_data_purge_incomplete';
  end if;

  return v_deleted;
end;
$$;

revoke all privileges on
  public.account_reconciliations,
  public.account_reconciliation_events
from anon, authenticated;

grant select on
  public.account_reconciliations,
  public.account_reconciliation_events
to authenticated;

revoke all privileges on public.account_reconciliation_summaries
from anon, authenticated;

grant select on public.account_reconciliation_summaries
to authenticated;

revoke execute on function public.reconciliation_cleared_balance(uuid, uuid, date)
from public, anon, authenticated;
revoke execute on function public.guard_reconciled_transaction_mutation()
from public, anon, authenticated;
revoke execute on function public.guard_reconciled_account_mutation()
from public, anon, authenticated;

revoke execute on function public.start_account_reconciliation(uuid, date, bigint)
from public, anon;
revoke execute on function public.set_account_entry_reconciliation_state(
  uuid,
  public.entry_reconciliation_state
) from public, anon;
revoke execute on function public.complete_account_reconciliation(uuid)
from public, anon;
revoke execute on function public.reopen_account_reconciliation(uuid)
from public, anon;

grant execute on function public.start_account_reconciliation(uuid, date, bigint)
to authenticated;
grant execute on function public.set_account_entry_reconciliation_state(
  uuid,
  public.entry_reconciliation_state
) to authenticated;
grant execute on function public.complete_account_reconciliation(uuid)
to authenticated;
grant execute on function public.reopen_account_reconciliation(uuid)
to authenticated;
