-- D13: exclude-from-report flag on ledger rows.
--
-- Money Manager / Monarch both offer a per-transaction "exclude from
-- reports" switch: the row stays in the ledger (account balance and
-- budget progress still count it — the money really moved) but report
-- aggregates skip it. Ours follows that contract exactly.
--
--   1. financial_transactions.excluded_from_reports — NOT NULL, default
--      false so every existing row keeps counting.
--   2. transaction_feed / deleted_transaction_feed re-emit the column
--      (appended last per CREATE OR REPLACE VIEW rules) so feed readers
--      can map and filter it.
--   3. update_money_transaction gains p_excluded_from_reports (null =
--      preserve) — the flag rides the row's single update seam instead
--      of a second RPC, so an edit+toggle stays one write behind one
--      optimistic-concurrency token. A standalone flag RPC was
--      considered and dropped: transactions_set_updated_at bumps
--      updated_at on every UPDATE, so a chained flag-write would have
--      to return and re-feed the rotated token for no gain.
--
--   Transfers keep their kind lock in the update RPC (transfers never
--   enter report math, so a flag on one would be dead UI). Recurring-
--   generated rows are NOT locked — excluding a commitment-generated
--   expense is a legitimate use (the flag changes no ledger fact).

alter table public.financial_transactions
  add column excluded_from_reports boolean not null default false;

-- Reconciled-row guard: the flag is report metadata, exempt like payee
-- and goal_id — a bank-confirmed row can still be scoped out of reports
-- without altering any ledger fact the reconciliation proved. Without
-- this exemption every flag write on a reconciled row would raise
-- transaction_reconciled.
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
       to_jsonb(new) - 'review_status' - 'updated_at' - 'payee' - 'goal_id'
         - 'excluded_from_reports'
       is distinct from
       to_jsonb(old) - 'review_status' - 'updated_at' - 'payee' - 'goal_id'
         - 'excluded_from_reports'
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

  return coalesce(new, old);
end;
$$;

create or replace view public.transaction_feed with (security_invoker = true) as
select
  transaction_record.id,
  transaction_record.user_id,
  transaction_record.kind,
  transaction_record.note,
  transaction_record.occurred_on,
  transaction_record.created_at,
  case
    when transaction_record.kind = 'transfer' then
      max(
        case
          when entry.amount_minor < 0 then -entry.amount_minor
          else abs(entry.amount_minor)
        end
      )
    else
      sum(abs(entry.amount_minor))
  end::bigint as amount_minor,
  (array_agg(account.id) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_id,
  (array_agg(account.name) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_name,
  (array_agg(category.id) filter (where category.id is not null))[1] as category_id,
  case
    when transaction_record.kind = 'expense'
      and count(distinct category.id) filter (where category.id is not null) > 1
    then
      'Chia · ' || (count(distinct category.id) filter (where category.id is not null))::text || ' danh mục'
    else
      (array_agg(category.name) filter (where category.name is not null))[1]
  end as category_name,
  (array_agg(account.id) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_id,
  (array_agg(account.name) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_name,
  bool_or(commitment_occ.id is not null or income_occ.id is not null) as is_recurring_payment,
  case
    when transaction_record.kind = 'expense'
      and count(category.id) filter (where category.id is not null) > 1
    then
      jsonb_agg(
        jsonb_build_object(
          'category_id', category.id,
          'category_name', category.name,
          'amount_minor', abs(entry.amount_minor)
        )
        order by abs(entry.amount_minor) desc
      ) filter (where category.id is not null)
    else null
  end as split_lines,
  transaction_record.payee,
  transaction_record.updated_at,
  transaction_record.goal_id,
  (array_agg(goal.name) filter (where goal.name is not null))[1] as goal_name,
  -- create or replace may only append columns; readers select by name.
  transaction_record.excluded_from_reports
from public.financial_transactions as transaction_record
join public.transaction_entries as entry
  on entry.transaction_id = transaction_record.id and entry.user_id = transaction_record.user_id
join public.accounts as account
  on account.id = entry.account_id and account.user_id = entry.user_id
left join public.categories as category
  on category.id = entry.category_id and category.user_id = entry.user_id
left join public.savings_goals as goal
  on goal.id = transaction_record.goal_id and goal.user_id = transaction_record.user_id
left join public.commitment_occurrences as commitment_occ
  on commitment_occ.transaction_id = transaction_record.id
  and commitment_occ.user_id = transaction_record.user_id
left join public.income_template_occurrences as income_occ
  on income_occ.transaction_id = transaction_record.id
  and income_occ.user_id = transaction_record.user_id
where transaction_record.deleted_at is null
group by transaction_record.id, transaction_record.user_id, transaction_record.kind,
  transaction_record.note, transaction_record.occurred_on, transaction_record.created_at,
  transaction_record.updated_at, transaction_record.payee, transaction_record.goal_id,
  transaction_record.excluded_from_reports;

revoke all on public.transaction_feed from public, anon;
grant select on public.transaction_feed to authenticated;

-- Trash mirror: the mobile trash read parses rows through the same
-- mapper, so the view must answer the column even though deleted rows
-- never enter report math.
create or replace view public.deleted_transaction_feed
with (security_invoker = true) as
select
  transaction_record.id,
  transaction_record.user_id,
  transaction_record.kind,
  transaction_record.note,
  transaction_record.occurred_on,
  transaction_record.created_at,
  case
    when transaction_record.kind = 'transfer' then
      max(
        case
          when entry.amount_minor < 0 then -entry.amount_minor
          else abs(entry.amount_minor)
        end
      )
    else
      sum(abs(entry.amount_minor))
  end::bigint as amount_minor,
  (array_agg(account.id) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_id,
  (array_agg(account.name) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_name,
  (array_agg(category.id) filter (where category.id is not null))[1] as category_id,
  case
    when transaction_record.kind = 'expense'
      and count(distinct category.id) filter (where category.id is not null) > 1
    then
      'Chia · ' || (count(distinct category.id) filter (where category.id is not null))::text || ' danh mục'
    else
      (array_agg(category.name) filter (where category.name is not null))[1]
  end as category_name,
  (array_agg(account.id) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_id,
  (array_agg(account.name) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_name,
  bool_or(commitment_occ.id is not null or income_occ.id is not null) as is_recurring_payment,
  case
    when transaction_record.kind = 'expense'
      and count(category.id) filter (where category.id is not null) > 1
    then
      jsonb_agg(
        jsonb_build_object(
          'category_id', category.id,
          'category_name', category.name,
          'amount_minor', abs(entry.amount_minor)
        )
        order by abs(entry.amount_minor) desc
      ) filter (where category.id is not null)
    else null
  end as split_lines,
  transaction_record.payee,
  transaction_record.deleted_at,
  transaction_record.goal_id,
  (array_agg(goal.name) filter (where goal.name is not null))[1] as goal_name,
  transaction_record.updated_at,
  transaction_record.excluded_from_reports
from public.financial_transactions as transaction_record
join public.transaction_entries as entry
  on entry.transaction_id = transaction_record.id and entry.user_id = transaction_record.user_id
join public.accounts as account
  on account.id = entry.account_id and account.user_id = entry.user_id
left join public.categories as category
  on category.id = entry.category_id and category.user_id = entry.user_id
left join public.savings_goals as goal
  on goal.id = transaction_record.goal_id and goal.user_id = transaction_record.user_id
left join public.commitment_occurrences as commitment_occ
  on commitment_occ.transaction_id = transaction_record.id
  and commitment_occ.user_id = transaction_record.user_id
left join public.income_template_occurrences as income_occ
  on income_occ.transaction_id = transaction_record.id
  and income_occ.user_id = transaction_record.user_id
where transaction_record.deleted_at is not null
group by transaction_record.id, transaction_record.user_id, transaction_record.kind,
  transaction_record.note, transaction_record.occurred_on, transaction_record.created_at,
  transaction_record.updated_at, transaction_record.payee, transaction_record.deleted_at,
  transaction_record.goal_id, transaction_record.excluded_from_reports
order by transaction_record.deleted_at desc;

revoke all on public.deleted_transaction_feed from public, anon;
grant select on public.deleted_transaction_feed to authenticated;

-- ---------------------------------------------------------------------------
-- update_money_transaction: + p_excluded_from_reports boolean default null
-- (null preserves, exactly like the other defaulted params). Same shape as
-- the 20260924120000 definition: authenticated-only SECURITY DEFINER, empty
-- search_path, identity from auth.uid(), the row locks before the stale
-- check, and recurring-generated rows stay write-locked.
-- ---------------------------------------------------------------------------

drop function if exists public.update_money_transaction(
  uuid, uuid, uuid, public.transaction_kind, bigint, date, text, text,
  timestamptz, uuid, boolean
);

create function public.update_money_transaction(
  p_transaction_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_kind public.transaction_kind,
  p_amount_minor bigint,
  p_occurred_on date,
  p_note text default '',
  p_payee text default '',
  p_expected_updated_at timestamptz default null,
  p_goal_id uuid default null,
  p_goal_id_is_set boolean default false,
  p_excluded_from_reports boolean default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_kind public.transaction_kind;
  v_existing_updated_at timestamptz;
  v_existing_goal_id uuid;
  v_category_kind public.category_kind;
  v_category_archived boolean;
  v_affected integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_kind not in ('income', 'expense') then raise exception 'invalid_transaction_kind'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_amount'; end if;
  if p_occurred_on is null then raise exception 'invalid_date'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;
  if char_length(coalesce(p_payee, '')) > 200 then raise exception 'payee_too_long'; end if;

  select kind, updated_at, goal_id
  into v_existing_kind, v_existing_updated_at, v_existing_goal_id
  from public.financial_transactions
  where id = p_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if v_existing_kind is null then raise exception 'transaction_not_found'; end if;
  if v_existing_kind = 'transfer' then raise exception 'transaction_kind_locked'; end if;

  -- Optimistic concurrency: fail closed before any validation or write when
  -- the caller's version is stale. The row is already locked, so the check is
  -- race-free; `is distinct from` also rejects a non-null expectation when
  -- the column were somehow null.
  if p_expected_updated_at is not null
     and v_existing_updated_at is distinct from p_expected_updated_at then
    raise exception 'stale_write';
  end if;

  if exists (
    select 1 from public.commitment_occurrences
    where user_id = v_user_id and transaction_id = p_transaction_id
  ) then
    raise exception 'recurring_payment_locked';
  end if;

  if exists (
    select 1 from public.income_template_occurrences
    where user_id = v_user_id and transaction_id = p_transaction_id
  ) then
    raise exception 'recurring_payment_locked';
  end if;

  if not exists (
    select 1 from public.accounts
    where id = p_account_id
      and user_id = v_user_id
      and not is_archived
  ) then
    raise exception 'account_not_found';
  end if;

  select kind, is_archived
  into v_category_kind, v_category_archived
  from public.categories
  where id = p_category_id and user_id = v_user_id;

  if v_category_kind is null or v_category_kind::text <> p_kind::text then
    raise exception 'category_kind_mismatch';
  end if;
  if v_category_archived then
    raise exception 'category_archived';
  end if;

  -- Goal tag: only validate when the caller intends to change it to a
  -- non-null value. Re-submitting the identical tag, preserving it, and
  -- clearing it never touch the goal table — so an archived goal keeps its
  -- history while staying out of new-assignment reach.
  -- An explicit NULL sentinel is a protocol error, not "preserve": the flag
  -- defaults to false, so NULL only arrives through a deliberately typed call.
  if p_goal_id_is_set is null then raise exception 'invalid_goal_flag'; end if;

  if p_goal_id_is_set
     and p_goal_id is distinct from v_existing_goal_id
     and p_goal_id is not null
     and not exists (
       select 1 from public.savings_goals
       where id = p_goal_id and user_id = v_user_id and not is_archived
       for share
     ) then
    raise exception 'goal_not_found_or_archived';
  end if;

  update public.financial_transactions
  set kind = p_kind,
      note = coalesce(p_note, ''),
      payee = btrim(coalesce(p_payee, '')),
      occurred_on = p_occurred_on,
      goal_id = case when p_goal_id_is_set then p_goal_id else goal_id end,
      excluded_from_reports = coalesce(p_excluded_from_reports, excluded_from_reports)
  where id = p_transaction_id and user_id = v_user_id;

  update public.transaction_entries
  set account_id = p_account_id,
      category_id = p_category_id,
      amount_minor = case when p_kind = 'income' then p_amount_minor else -p_amount_minor end
  where transaction_id = p_transaction_id and user_id = v_user_id;

  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'invalid_transaction_entries'; end if;
  return p_transaction_id;
end;
$$;

revoke all on function public.update_money_transaction(
  uuid, uuid, uuid, public.transaction_kind, bigint, date, text, text,
  timestamptz, uuid, boolean, boolean
) from public, anon;
grant execute on function public.update_money_transaction(
  uuid, uuid, uuid, public.transaction_kind, bigint, date, text, text,
  timestamptz, uuid, boolean, boolean
) to authenticated;
