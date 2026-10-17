-- D1: informal debt/loan tracking (vay / cho vay) — the top-ranked gap in
-- RESEARCH_TOP_FINANCE_APPS.md §10. A debt is a tracking record over real
-- ledger movements, never a second ledger: creating it posts nothing, and
-- every repayment is an explicit user action that writes a real
-- financial_transactions row linked through debt_repayments.
--
-- Direction semantics: 'payable' = I owe the counterparty (đi vay) — a
-- repayment posts an EXPENSE; 'receivable' = they owe me (cho vay) — a
-- collection posts an INCOME. Repayments are never transfers: they change
-- net worth, and the kind is server-derived from direction so a client can
-- never mislabel one.

create type public.debt_direction as enum ('payable', 'receivable');
create type public.debt_state as enum ('open', 'settled', 'archived');

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  counterparty text not null check (char_length(btrim(counterparty)) between 1 and 80),
  direction public.debt_direction not null,
  principal_minor bigint not null
    check (principal_minor > 0 and principal_minor <= 9007199254740991),
  remaining_minor bigint not null
    check (remaining_minor >= 0 and remaining_minor <= principal_minor),
  note text not null default '' check (char_length(note) <= 500),
  due_date date,
  state public.debt_state not null default 'open',
  -- An open row always owes something; settled-with-zero is the terminal
  -- paid state, so 'open' + remaining 0 can never coexist.
  check (state <> 'open'::public.debt_state or remaining_minor > 0),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id)
);

-- One row per applied repayment: the link between the debt and the ledger
-- fact it produced. transaction_id is unique per user — one transaction
-- serves at most one debt in v1.
create table public.debt_repayments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null,
  transaction_id uuid not null,
  amount_minor bigint not null
    check (amount_minor > 0 and amount_minor <= 9007199254740991),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  foreign key (debt_id, user_id)
    references public.debts(id, user_id) on delete restrict,
  foreign key (transaction_id, user_id)
    references public.financial_transactions(id, user_id) on delete restrict,
  unique (user_id, idempotency_key),
  -- transaction-first order so the unique index doubles as the left-prefix
  -- cover for the (transaction_id, user_id) FK.
  unique (transaction_id, user_id)
);

-- Full-coverage user index (the partial open index cannot cover the
-- user_id FK left-prefix — the FK-index catalog test excludes predicates).
create index debts_user_idx on public.debts(user_id);
create index debts_user_open_idx
  on public.debts(user_id, state, counterparty)
  where deleted_at is null;
-- Left-prefix cover for the (debt_id, user_id) FK; the catalog FK-index
-- contract fails closed without it.
create index debt_repayments_debt_idx
  on public.debt_repayments(debt_id, user_id);
create index debt_repayments_user_debt_idx
  on public.debt_repayments(user_id, debt_id);

-- Optimistic-concurrency token: any content change bumps version; the
-- tenant and creation stamp can never move.
create or replace function public.version_debt()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.counterparty, new.direction, new.principal_minor,
    new.remaining_minor, new.note, new.due_date, new.state, new.deleted_at
  ) is distinct from row(
    old.counterparty, old.direction, old.principal_minor,
    old.remaining_minor, old.note, old.due_date, old.state, old.deleted_at
  ) then
    new.version := old.version + 1;
  else
    new.version := old.version;
    -- No content change → keep the previous updated_at (a bare UPDATE that
    -- only fired triggers must not look like an edit).
    new.updated_at := old.updated_at;
  end if;
  new.created_at := old.created_at;
  new.user_id := old.user_id;
  return new;
end;
$$;

create trigger debts_version_changes before update on public.debts
for each row execute function public.version_debt();
create trigger debts_set_updated_at before update on public.debts
for each row execute function public.set_updated_at();

-- OAuth grants are read-only: every owned table carries the guard so even
-- privileged RPC writes cannot bypass it (20261002120000 convention —
-- new owned tables must add the trigger in their own migration).
create trigger guard_oauth_mutation before insert or update or delete
  on public.debts
for each row execute function public.guard_oauth_mutation();
create trigger guard_oauth_mutation before insert or update or delete
  on public.debt_repayments
for each row execute function public.guard_oauth_mutation();

alter table public.debts enable row level security;
alter table public.debt_repayments enable row level security;
create policy "debts_select_own" on public.debts
for select to authenticated using ((select auth.uid()) = user_id);
create policy "debt_repayments_select_own" on public.debt_repayments
for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.debts, public.debt_repayments from anon, authenticated;
grant select on public.debts, public.debt_repayments to authenticated;

create or replace function public.create_debt(
  p_direction public.debt_direction,
  p_counterparty text,
  p_principal_minor bigint,
  p_due_date date default null,
  p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_direction is null then raise exception 'invalid_debt_direction'; end if;
  if char_length(btrim(coalesce(p_counterparty, ''))) not between 1 and 80 then
    raise exception 'invalid_counterparty';
  end if;
  if p_principal_minor is null or p_principal_minor <= 0 then
    raise exception 'amount_must_be_positive';
  end if;
  if p_principal_minor > 9007199254740991 then
    raise exception 'amount_exceeds_safe_integer';
  end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;

  insert into public.debts
    (user_id, counterparty, direction, principal_minor, remaining_minor, note, due_date)
  values
    (v_user_id, btrim(p_counterparty), p_direction, p_principal_minor,
     p_principal_minor, coalesce(p_note, ''), p_due_date)
  returning id into v_id;
  return v_id;
end;
$$;

-- Atomically: validate ownership + open state + amount <= remaining, post
-- the real ledger transaction (expense for payable, income for
-- receivable — direction-derived, never caller-picked), link it through
-- debt_repayments, decrement remaining, settle at zero. The advisory lock
-- plus the (user, idempotency_key) replay check make a retried call after
-- a lost response return the SAME transaction, and the stored
-- creation_intent pins the original financial intent like
-- create_money_transaction (20261009160000).
create or replace function public.apply_debt_repayment(
  p_debt_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_amount_minor bigint,
  p_occurred_on date default current_date,
  p_note text default '',
  p_idempotency_key uuid default gen_random_uuid()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_debt public.debts%rowtype;
  v_kind public.transaction_kind;
  v_category_kind public.category_kind;
  v_category_archived boolean;
  v_transaction_id uuid;
  v_existing_intent jsonb;
  v_intent jsonb;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_idempotency_key is null then raise exception 'invalid_idempotency_key'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 then raise exception 'amount_must_be_positive'; end if;
  if p_amount_minor > 9007199254740991 then raise exception 'amount_exceeds_safe_integer'; end if;
  if p_occurred_on is null then raise exception 'invalid_date'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_idempotency_key::text, 719)
  );
  v_intent := jsonb_build_object(
    'debt_id', p_debt_id, 'account_id', p_account_id,
    'category_id', p_category_id, 'amount_minor', p_amount_minor,
    'occurred_on', p_occurred_on, 'note', coalesce(p_note, '')
  );

  select dr.transaction_id, ft.creation_intent
    into v_transaction_id, v_existing_intent
  from public.debt_repayments dr
  join public.financial_transactions ft
    on ft.id = dr.transaction_id and ft.user_id = dr.user_id
  where dr.user_id = v_user_id and dr.idempotency_key = p_idempotency_key;
  if v_transaction_id is not null then
    if v_existing_intent is null then raise exception 'idempotency_intent_unavailable'; end if;
    if v_existing_intent <> v_intent then raise exception 'idempotency_intent_mismatch'; end if;
    return v_transaction_id;
  end if;

  -- FOR UPDATE serializes concurrent repayments on the same debt so the
  -- remaining check and decrement can never interleave into an overpay.
  select * into v_debt from public.debts
  where id = p_debt_id and user_id = v_user_id and deleted_at is null
  for update;
  if v_debt.id is null then raise exception 'debt_not_found'; end if;
  if v_debt.state <> 'open' then raise exception 'debt_not_open'; end if;
  if p_amount_minor > v_debt.remaining_minor then
    raise exception 'repayment_exceeds_remaining';
  end if;

  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_user_id and not is_archived
  ) then raise exception 'account_not_found'; end if;

  v_kind := case v_debt.direction
    when 'payable' then 'expense'::public.transaction_kind
    else 'income'::public.transaction_kind
  end;
  select kind, is_archived into v_category_kind, v_category_archived
  from public.categories
  where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null or v_category_kind::text <> v_kind::text then
    raise exception 'category_kind_mismatch';
  end if;
  if v_category_archived then raise exception 'category_archived'; end if;

  insert into public.financial_transactions
    (user_id, kind, note, payee, occurred_on, idempotency_key, creation_intent)
  values
    (v_user_id, v_kind, coalesce(p_note, ''), v_debt.counterparty,
     p_occurred_on, p_idempotency_key, v_intent)
  returning id into v_transaction_id;

  insert into public.transaction_entries
    (transaction_id, user_id, account_id, category_id, amount_minor)
  values
    (v_transaction_id, v_user_id, p_account_id, p_category_id,
     case when v_kind = 'income' then p_amount_minor else -p_amount_minor end);

  insert into public.debt_repayments
    (user_id, debt_id, transaction_id, amount_minor, idempotency_key)
  values
    (v_user_id, v_debt.id, v_transaction_id, p_amount_minor, p_idempotency_key);

  update public.debts
  set remaining_minor = remaining_minor - p_amount_minor,
      state = case
        when remaining_minor - p_amount_minor = 0
          then 'settled'::public.debt_state
        else state
      end
  where id = v_debt.id and user_id = v_user_id;

  return v_transaction_id;
end;
$$;

-- open <-> settled (forgiven residual stays recorded on remaining_minor —
-- settling is a user assertion, not a fabricated payment), anything ->
-- archived and back. Requesting 'open' on a fully-repaid row normalizes
-- to 'settled': open + zero remaining is a contradiction the table check
-- forbids, so the honest no-op is returning false.
create or replace function public.set_debt_state(
  p_debt_id uuid,
  p_state public.debt_state
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_new_state public.debt_state;
  v_affected integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_state is null then raise exception 'invalid_debt_state'; end if;

  select case
      when p_state = 'open'::public.debt_state and remaining_minor = 0
        then 'settled'::public.debt_state
      else p_state
    end
    into v_new_state
  from public.debts
  where id = p_debt_id and user_id = v_user_id and deleted_at is null;
  if v_new_state is null then return false; end if;

  update public.debts set state = v_new_state
  where id = p_debt_id and user_id = v_user_id and deleted_at is null
    and state <> v_new_state;
  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

-- Soft delete: the tracking record leaves every list while the linked
-- ledger transactions stay — a debt delete must never erase money facts.
create or replace function public.soft_delete_debt(p_debt_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_affected integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  update public.debts set deleted_at = now()
  where id = p_debt_id and user_id = auth.uid() and deleted_at is null;
  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

revoke all on function public.create_debt(public.debt_direction, text, bigint, date, text) from public, anon;
grant execute on function public.create_debt(public.debt_direction, text, bigint, date, text) to authenticated;
revoke all on function public.apply_debt_repayment(uuid, uuid, uuid, bigint, date, text, uuid) from public, anon;
grant execute on function public.apply_debt_repayment(uuid, uuid, uuid, bigint, date, text, uuid) to authenticated;
revoke all on function public.set_debt_state(uuid, public.debt_state) from public, anon;
grant execute on function public.set_debt_state(uuid, public.debt_state) to authenticated;
revoke all on function public.soft_delete_debt(uuid) from public, anon;
grant execute on function public.soft_delete_debt(uuid) to authenticated;
