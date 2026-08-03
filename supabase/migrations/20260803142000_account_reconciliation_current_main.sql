-- Canonical account-reconciliation contract for current main.
--
-- Reconciliation belongs to a logical account leg: every entry sharing
-- (user_id, transaction_id, account_id) moves together. Transfer legs remain
-- independent because their account IDs differ. Completed statement summaries
-- use stored snapshots so later backdated activity cannot rewrite history.

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
  pending_account_leg_count bigint check (pending_account_leg_count is null or pending_account_leg_count >= 0),
  cleared_account_leg_count bigint check (cleared_account_leg_count is null or cleared_account_leg_count >= 0),
  reconciled_account_leg_count bigint check (reconciled_account_leg_count is null or reconciled_account_leg_count >= 0),
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
        and pending_account_leg_count is null
        and cleared_account_leg_count is null
        and reconciled_account_leg_count is null
      )
      or (
        status = 'completed'
        and completed_at is not null
        and calculated_balance_minor is not null
        and pending_account_leg_count is not null
        and cleared_account_leg_count is not null
        and reconciled_account_leg_count is not null
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
language sql
stable
security definer
set search_path = ''
as $$
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
  case
    when reconciliation.status = 'completed'
      then reconciliation.calculated_balance_minor
    else live_snapshot.cleared_balance_minor
  end as cleared_balance_minor,
  reconciliation.statement_balance_minor - case
    when reconciliation.status = 'completed'
      then reconciliation.calculated_balance_minor
    else live_snapshot.cleared_balance_minor
  end as difference_minor,
  case
    when reconciliation.status = 'completed'
      then reconciliation.pending_account_leg_count
    else live_snapshot.pending_account_leg_count
  end as pending_account_leg_count,
  case
    when reconciliation.status = 'completed'
      then reconciliation.cleared_account_leg_count
    else live_snapshot.cleared_account_leg_count
  end as cleared_account_leg_count,
  case
    when reconciliation.status = 'completed'
      then reconciliation.reconciled_account_leg_count
    else live_snapshot.reconciled_account_leg_count
  end as reconciled_account_leg_count
from public.account_reconciliations reconciliation
join public.accounts account
  on account.id = reconciliation.account_id
 and account.user_id = reconciliation.user_id
cross join lateral public.reconciliation_snapshot_for_user(
  reconciliation.user_id,
  reconciliation.account_id,
  reconciliation.statement_date
) live_snapshot;

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
  v_snapshot record;
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

  select * into strict v_snapshot
  from public.reconciliation_snapshot_for_user(
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
    v_snapshot.cleared_balance_minor,
    p_statement_balance_minor - v_snapshot.cleared_balance_minor
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
  v_snapshot record;
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

  select * into strict v_snapshot
  from public.reconciliation_snapshot_for_user(
    v_user_id,
    v_account_id,
    v_statement_date
  );

  if v_snapshot.cleared_balance_minor <> v_statement_balance then
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
      calculated_balance_minor = v_snapshot.cleared_balance_minor,
      pending_account_leg_count = v_snapshot.pending_account_leg_count,
      cleared_account_leg_count = 0,
      reconciled_account_leg_count =
        v_snapshot.reconciled_account_leg_count + v_snapshot.cleared_account_leg_count,
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
    v_snapshot.cleared_balance_minor,
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
      pending_account_leg_count = null,
      cleared_account_leg_count = null,
      reconciled_account_leg_count = null,
      completed_at = null,
      last_reopened_at = now()
  where id = p_reconciliation_id
    and user_id = v_user_id;

  return true;
end;
$$;

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
declare
  v_has_reconciled_entry boolean;
begin
  select exists (
    select 1
    from public.transaction_entries
    where transaction_id = old.id
      and user_id = old.user_id
      and reconciliation_state = 'reconciled'
  ) into v_has_reconciled_entry;

  if tg_op = 'DELETE' and v_has_reconciled_entry then
    raise exception 'transaction_reconciled';
  end if;

  if tg_op = 'UPDATE'
     and v_has_reconciled_entry
     and (
       to_jsonb(new) - 'review_status' - 'updated_at'
       is distinct from
       to_jsonb(old) - 'review_status' - 'updated_at'
     ) then
    raise exception 'transaction_reconciled';
  end if;

  if tg_op = 'UPDATE'
     and (
       new.kind is distinct from old.kind
       or new.occurred_on is distinct from old.occurred_on
       or new.deleted_at is distinct from old.deleted_at
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

revoke all privileges on
  public.account_reconciliations,
  public.account_reconciliation_events
from public, anon, authenticated;

grant select on
  public.account_reconciliations,
  public.account_reconciliation_events
to authenticated;

revoke all privileges on public.account_reconciliation_summaries
from public, anon, authenticated;

grant select on public.account_reconciliation_summaries
to authenticated;

revoke execute on function public.lock_reconciliation_account(uuid)
from public, anon, authenticated;
revoke execute on function public.reconciliation_snapshot_for_user(uuid, uuid, date)
from public, anon, authenticated;
revoke execute on function public.assert_reconciliation_account_leg_consistent()
from public, anon, authenticated;
revoke execute on function public.normalize_cleared_entry_financial_update()
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
