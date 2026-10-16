-- D2: event/occasion budgets (sự kiện) — date-ranged scoped spend limits
-- for Tết/đám cưới/du lịch, the D2 gap in RESEARCH_TOP_FINANCE_APPS.md
-- §10 (Money Lover's "Events & Travel Mode", ADAPT verdict: a budget
-- scoped by date range + optional category set — never a parallel
-- wallet or second ledger).
--
-- An event budget holds no money: creating/editing/deleting one writes
-- no financial_transactions row, and spent_minor is always a live
-- aggregate over real transaction_entries legs inside [start_date,
-- end_date] — the same per-entry accounting budget_progress uses, so
-- the progress figure and the transaction drill can never disagree.

create table public.event_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  limit_minor bigint not null
    check (limit_minor > 0 and limit_minor <= 9007199254740991),
  -- Idempotent create: the advisory lock + replay check mirror
  -- create_money_transaction (20261009160000); creation_intent pins the
  -- original payload so a same-key different-payload reuse fails closed.
  idempotency_key uuid not null,
  creation_intent jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  unique (user_id, idempotency_key)
);

-- Optional category scope: zero rows means every expense counts
-- ("Tất cả danh mục"); one or more rows restrict the event to those
-- categories' legs. RESTRICT on both references — a category in an
-- event scope cannot be deleted out from under it (delete_financial_
-- category already maps the violation to category_in_use), and an
-- event row cannot be hard-deleted while scoped.
create table public.event_budget_categories (
  event_budget_id uuid not null,
  user_id uuid not null,
  category_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (event_budget_id, category_id),
  foreign key (event_budget_id, user_id)
    references public.event_budgets(id, user_id) on delete restrict,
  foreign key (category_id, user_id)
    references public.categories(id, user_id) on delete restrict
);

-- Full-coverage user index (the partial live index cannot cover the
-- user_id FK left-prefix — the catalog FK-index contract excludes
-- predicates).
create index event_budgets_user_idx on public.event_budgets(user_id);
-- The list read is tenant + live rows ordered by window.
create index event_budgets_user_live_idx
  on public.event_budgets(user_id, end_date)
  where deleted_at is null;
-- Left-prefix covers for the composite FKs (the catalog contract fails
-- closed without them).
create index event_budget_categories_event_idx
  on public.event_budget_categories(event_budget_id, user_id);
create index event_budget_categories_category_idx
  on public.event_budget_categories(category_id, user_id);

create trigger event_budgets_set_updated_at before update
  on public.event_budgets
for each row execute function public.set_updated_at();

-- OAuth grants are read-only: every owned table carries the guard so even
-- privileged RPC writes cannot bypass it (20261002120000 convention —
-- new owned tables must add the trigger in their own migration).
create trigger guard_oauth_mutation before insert or update or delete
  on public.event_budgets
for each row execute function public.guard_oauth_mutation();
create trigger guard_oauth_mutation before insert or update or delete
  on public.event_budget_categories
for each row execute function public.guard_oauth_mutation();

alter table public.event_budgets enable row level security;
alter table public.event_budget_categories enable row level security;
create policy "event_budgets_select_own" on public.event_budgets
for select to authenticated using ((select auth.uid()) = user_id);
create policy "event_budget_categories_select_own" on public.event_budget_categories
for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.event_budgets, public.event_budget_categories
  from anon, authenticated;
grant select on public.event_budgets, public.event_budget_categories
  to authenticated;

-- The read model: event row + scope array + live spent aggregate.
-- Tombstoned events leave the view (the same transaction_feed
-- convention); clients read progress here, never a stored figure.
create view public.event_budget_progress
with (security_invoker = true)
as
select
  budget.id,
  budget.user_id,
  budget.name,
  budget.start_date,
  budget.end_date,
  budget.limit_minor,
  coalesce((
    select array_agg(scope.category_id order by scope.category_id)
    from public.event_budget_categories as scope
    where scope.event_budget_id = budget.id
      and scope.user_id = budget.user_id
  ), '{}'::uuid[]) as category_ids,
  coalesce((
    select sum(
      case
        when entry.amount_minor < 0 then -entry.amount_minor
        else 0
      end
    )
    from public.transaction_entries as entry
    join public.financial_transactions as transaction_record
      on transaction_record.id = entry.transaction_id
      and transaction_record.user_id = entry.user_id
    where entry.user_id = budget.user_id
      and transaction_record.kind = 'expense'
      and transaction_record.deleted_at is null
      and transaction_record.occurred_on >= budget.start_date
      and transaction_record.occurred_on <= budget.end_date
      and (
        not exists (
          select 1
          from public.event_budget_categories as scope
          where scope.event_budget_id = budget.id
            and scope.user_id = budget.user_id
        )
        or entry.category_id in (
          select scope.category_id
          from public.event_budget_categories as scope
          where scope.event_budget_id = budget.id
            and scope.user_id = budget.user_id
        )
      )
  ), 0)::bigint as spent_minor,
  budget.created_at,
  budget.updated_at
from public.event_budgets as budget
where budget.deleted_at is null;

revoke all on public.event_budget_progress from anon;
grant select on public.event_budget_progress to authenticated;

create or replace function public.create_event_budget(
  p_name text,
  p_start_date date,
  p_end_date date,
  p_limit_minor bigint,
  p_category_ids uuid[] default '{}'::uuid[],
  p_idempotency_key uuid default gen_random_uuid()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_existing_id uuid;
  v_existing_intent jsonb;
  v_intent jsonb;
  v_owned integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_idempotency_key is null then raise exception 'invalid_idempotency_key'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'invalid_event_name';
  end if;
  if p_start_date is null or p_end_date is null then
    raise exception 'invalid_event_dates';
  end if;
  if p_end_date < p_start_date then raise exception 'event_end_before_start'; end if;
  if p_limit_minor is null or p_limit_minor <= 0 then
    raise exception 'amount_must_be_positive';
  end if;
  if p_limit_minor > 9007199254740991 then
    raise exception 'amount_exceeds_safe_integer';
  end if;
  -- The scope is a set: a duplicated id is a caller bug, not a second
  -- vote — refuse instead of writing a redundant row.
  if p_category_ids is null
     or cardinality(p_category_ids) <> cardinality(
       (select array_agg(distinct c) from unnest(p_category_ids) as c)
     ) then
    raise exception 'invalid_category_scope';
  end if;

  -- Every scoped category must be the caller's own expense category —
  -- an occasion budget measures spend; income kinds can never join.
  select count(*) into v_owned
  from public.categories
  where user_id = v_user_id and id = any(p_category_ids);
  if v_owned <> cardinality(p_category_ids) then
    raise exception 'category_not_found';
  end if;
  if exists (
    select 1 from public.categories
    where user_id = v_user_id and id = any(p_category_ids)
      and kind <> 'expense'
  ) then
    raise exception 'expense_category_required';
  end if;

  -- Same advisory-lock + stored-intent replay contract as
  -- create_money_transaction: a retried call after a lost response
  -- returns the SAME event; a same-key different-payload reuse fails
  -- closed on the pinned intent.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_idempotency_key::text, 719)
  );
  v_intent := jsonb_build_object(
    'name', btrim(p_name),
    'start_date', p_start_date,
    'end_date', p_end_date,
    'limit_minor', p_limit_minor,
    'category_ids', (
      select coalesce(jsonb_agg(c order by c), '[]'::jsonb)
      from unnest(p_category_ids) as c
    )
  );

  select id, creation_intent into v_existing_id, v_existing_intent
  from public.event_budgets
  where user_id = v_user_id and idempotency_key = p_idempotency_key;
  if v_existing_id is not null then
    if v_existing_intent is null then raise exception 'idempotency_intent_unavailable'; end if;
    if v_existing_intent <> v_intent then raise exception 'idempotency_intent_mismatch'; end if;
    return v_existing_id;
  end if;

  insert into public.event_budgets
    (user_id, name, start_date, end_date, limit_minor,
     idempotency_key, creation_intent)
  values
    (v_user_id, btrim(p_name), p_start_date, p_end_date, p_limit_minor,
     p_idempotency_key, v_intent)
  returning id into v_id;

  insert into public.event_budget_categories
    (event_budget_id, user_id, category_id)
  select v_id, v_user_id, c from unnest(p_category_ids) as c;

  return v_id;
end;
$$;

-- Whole-row edit with the scope set replaced atomically. FOR UPDATE
-- serializes writers, then p_expected_updated_at fails closed on a
-- stale read before anything is written (the upsert_recurring_commitment
-- convention). Editing a closed event is allowed — correcting a record
-- is always legitimate.
create or replace function public.update_event_budget(
  p_event_id uuid,
  p_name text,
  p_start_date date,
  p_end_date date,
  p_limit_minor bigint,
  p_category_ids uuid[] default '{}'::uuid[],
  p_expected_updated_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_updated_at timestamptz;
  v_owned integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'invalid_event_name';
  end if;
  if p_start_date is null or p_end_date is null then
    raise exception 'invalid_event_dates';
  end if;
  if p_end_date < p_start_date then raise exception 'event_end_before_start'; end if;
  if p_limit_minor is null or p_limit_minor <= 0 then
    raise exception 'amount_must_be_positive';
  end if;
  if p_limit_minor > 9007199254740991 then
    raise exception 'amount_exceeds_safe_integer';
  end if;
  if p_category_ids is null
     or cardinality(p_category_ids) <> cardinality(
       (select array_agg(distinct c) from unnest(p_category_ids) as c)
     ) then
    raise exception 'invalid_category_scope';
  end if;
  select count(*) into v_owned
  from public.categories
  where user_id = v_user_id and id = any(p_category_ids);
  if v_owned <> cardinality(p_category_ids) then
    raise exception 'category_not_found';
  end if;
  if exists (
    select 1 from public.categories
    where user_id = v_user_id and id = any(p_category_ids)
      and kind <> 'expense'
  ) then
    raise exception 'expense_category_required';
  end if;

  select updated_at into v_existing_updated_at
  from public.event_budgets
  where id = p_event_id and user_id = v_user_id and deleted_at is null
  for update;
  if v_existing_updated_at is null then raise exception 'event_not_found'; end if;
  if p_expected_updated_at is not null
     and v_existing_updated_at is distinct from p_expected_updated_at then
    raise exception 'stale_write';
  end if;

  update public.event_budgets
  set name = btrim(p_name),
      start_date = p_start_date,
      end_date = p_end_date,
      limit_minor = p_limit_minor
  where id = p_event_id and user_id = v_user_id;

  delete from public.event_budget_categories
  where event_budget_id = p_event_id and user_id = v_user_id;
  insert into public.event_budget_categories
    (event_budget_id, user_id, category_id)
  select p_event_id, v_user_id, c from unnest(p_category_ids) as c;

  return true;
end;
$$;

-- Soft delete: the tracking record leaves every list while the ledger
-- stays — an event delete must never erase money facts. The scope rows
-- stay attached to the tombstone (RESTRICT keeps them consistent; the
-- row is recoverable in exactly the shape it had).
create or replace function public.soft_delete_event_budget(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_affected integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  update public.event_budgets set deleted_at = now()
  where id = p_event_id and user_id = auth.uid() and deleted_at is null;
  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

revoke all on function public.create_event_budget(text, date, date, bigint, uuid[], uuid) from public, anon;
grant execute on function public.create_event_budget(text, date, date, bigint, uuid[], uuid) to authenticated;
revoke all on function public.update_event_budget(uuid, text, date, date, bigint, uuid[], timestamptz) from public, anon;
grant execute on function public.update_event_budget(uuid, text, date, date, bigint, uuid[], timestamptz) to authenticated;
revoke all on function public.soft_delete_event_budget(uuid) from public, anon;
grant execute on function public.soft_delete_event_budget(uuid) to authenticated;
