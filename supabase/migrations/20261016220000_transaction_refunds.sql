-- D15: refund net-off (RESEARCH_TOP_FINANCE_APPS.md §10 — Simplifi 5.7,
-- PocketGuard 7.3): "Hoàn tiền currently distorts category totals" — a
-- money-back row recorded as income inflated Thu and left the expense
-- category untouched, so Mua sắm still showed the full original spend.
--
-- Model: `is_refund` flags an INCOME row as money back against spending.
-- The ledger fact is unchanged — cash really arrived, so kind stays
-- income and account balance math is untouched — but the row carries
-- the EXPENSE category it reimburses, and report/budget aggregates net
-- it there: refund rows never count as income and subtract from their
-- category's spend. The row stays visible in the ledger (activity keeps
-- it, honestly labelled "Hoàn tiền").
--
--   1. financial_transactions.is_refund — NOT NULL default false; a
--      CHECK pins refund ⇒ kind='income' for direct table writes (RLS
--      already scopes to owner; the RPC's category rule below is the
--      same convention kind-match always used — enforced in the write
--      RPCs, not the table).
--   2. transaction_feed / deleted_transaction_feed re-emit the flag
--      (appended last per CREATE OR REPLACE VIEW rules).
--   3. create_money_transaction gains p_is_refund (default false):
--      a refund must be kind='income' AND carry an expense category —
--      the category IS the netting target, so an income category is
--      rejected outright rather than silently generic-bucketed.
--   4. update_money_transaction gains p_is_refund (null = preserve,
--      like p_excluded_from_reports). Validation reads the EFFECTIVE
--      flag after the coalesce so flagging an existing row re-runs the
--      category rule — a refund never keeps an income category, and
--      unflagging restores the ordinary kind match.
--   5. budget_progress / event_budget_progress: the join now also
--      admits is_refund income rows. Under that widened join every
--      participating entry contributes -amount_minor — expenses are
--      stored negative (+X to spent), refunds positive (-X, netting).
--      A refund to Mua sắm frees the Mua sắm budget, matching the
--      report's netted total instead of contradicting it.
--   6. guard_reconciled_transaction_mutation: is_refund is report-scope
--      metadata like excluded_from_reports — a bank-confirmed row can
--      still be flagged without altering the facts reconciliation
--      proved, so the flag is exempt from the reconciled-field diff.
--
--   Transfers stay out (kind-locked; a refund is never a transfer).
--   Recurring-generated rows remain write-locked as before.

alter table public.financial_transactions
  add column is_refund boolean not null default false;

-- Table-level pin for the part that is local to the row: a refund is
-- always money-in. The category-kind half lives in the write RPCs,
-- where the joined category row is available.
alter table public.financial_transactions
  add constraint financial_transactions_refund_is_income
  check (not is_refund or kind = 'income');

-- is_refund is exempt from the reconciled diff — same metadata class as
-- excluded_from_reports (report presentation, not a ledger fact).
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
         - 'excluded_from_reports' - 'is_refund'
       is distinct from
       to_jsonb(old) - 'review_status' - 'updated_at' - 'payee' - 'goal_id'
         - 'excluded_from_reports' - 'is_refund'
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

-- ---------------------------------------------------------------------------
-- transaction_feed + deleted_transaction_feed: expose is_refund last.
-- ---------------------------------------------------------------------------

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
  transaction_record.excluded_from_reports,
  -- create or replace may only append columns; readers select by name.
  transaction_record.is_refund
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
  transaction_record.excluded_from_reports, transaction_record.is_refund;

revoke all on public.transaction_feed from public, anon;
grant select on public.transaction_feed to authenticated;

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
  transaction_record.excluded_from_reports,
  transaction_record.is_refund
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
  transaction_record.goal_id, transaction_record.excluded_from_reports,
  transaction_record.is_refund
order by transaction_record.deleted_at desc;

revoke all on public.deleted_transaction_feed from public, anon;
grant select on public.deleted_transaction_feed to authenticated;

-- ---------------------------------------------------------------------------
-- create_money_transaction: + p_is_refund boolean default false, built on
-- the 20261009160000 body (advisory-lock dedupe + creation_intent pin —
-- the flag joins the intent object so a same-key replay with a flipped
-- flag fails closed like any other intent drift).
-- A refund is income-kind money back against an EXPENSE category — the
-- category is the netting target, so income categories are refused
-- (refund_requires_expense_category), non-income kinds are refused
-- (refund_requires_income_kind). Unflagged rows keep the unchanged
-- kind-match rule.
-- ---------------------------------------------------------------------------

drop function if exists public.create_money_transaction(
  uuid, uuid, public.transaction_kind, bigint, date, text, uuid, text, uuid
);

create function public.create_money_transaction(
  p_account_id uuid,
  p_category_id uuid,
  p_kind public.transaction_kind,
  p_amount_minor bigint,
  p_occurred_on date default current_date,
  p_note text default '',
  p_idempotency_key uuid default gen_random_uuid(),
  p_payee text default '',
  p_goal_id uuid default null,
  p_is_refund boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_transaction_id uuid;
  v_category_kind public.category_kind;
  v_category_archived boolean;
  v_existing_intent jsonb;
  v_intent jsonb;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_idempotency_key is null then raise exception 'invalid_idempotency_key'; end if;
  if p_kind not in ('income', 'expense') then raise exception 'unsupported_transaction_kind'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 then raise exception 'amount_must_be_positive'; end if;
  if p_amount_minor > 9007199254740991 then raise exception 'amount_exceeds_safe_integer'; end if;
  if p_occurred_on is null then raise exception 'invalid_date'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;
  if char_length(coalesce(p_payee, '')) > 200 then raise exception 'payee_too_long'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_idempotency_key::text, 719)
  );
  v_intent := jsonb_build_object(
    'account_id', p_account_id, 'category_id', p_category_id,
    'kind', p_kind, 'amount_minor', p_amount_minor,
    'occurred_on', p_occurred_on, 'note', coalesce(p_note, ''),
    'payee', btrim(coalesce(p_payee, '')), 'goal_id', p_goal_id,
    'is_refund', coalesce(p_is_refund, false)
  );
  select id, creation_intent into v_transaction_id, v_existing_intent
  from public.financial_transactions
  where user_id = v_user_id and idempotency_key = p_idempotency_key;
  if v_transaction_id is not null then
    if v_existing_intent is null then raise exception 'idempotency_intent_unavailable'; end if;
    if v_existing_intent <> v_intent then raise exception 'idempotency_intent_mismatch'; end if;
    return v_transaction_id;
  end if;

  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_user_id and not is_archived
  ) then raise exception 'account_not_found'; end if;

  select kind, is_archived into v_category_kind, v_category_archived
  from public.categories
  where id = p_category_id and user_id = v_user_id;
  if coalesce(p_is_refund, false) then
    if p_kind <> 'income' then raise exception 'refund_requires_income_kind'; end if;
    if v_category_kind is distinct from 'expense' then
      raise exception 'refund_requires_expense_category';
    end if;
  elsif v_category_kind is null or v_category_kind::text <> p_kind::text then
    raise exception 'category_kind_mismatch';
  end if;
  if v_category_archived then raise exception 'category_archived'; end if;

  -- Goal tag: must be the caller's own, non-archived goal. FOR SHARE blocks a
  -- concurrent archive between validation and insert.
  if p_goal_id is not null and not exists (
    select 1 from public.savings_goals
    where id = p_goal_id and user_id = v_user_id and not is_archived
    for share
  ) then
    raise exception 'goal_not_found_or_archived';
  end if;

  insert into public.financial_transactions
    (user_id, kind, note, payee, occurred_on, idempotency_key, goal_id,
     creation_intent, is_refund)
  values
    (v_user_id, p_kind, coalesce(p_note, ''), btrim(coalesce(p_payee, '')),
     p_occurred_on, p_idempotency_key, p_goal_id, v_intent,
     coalesce(p_is_refund, false))
  returning id into v_transaction_id;

  insert into public.transaction_entries
    (transaction_id, user_id, account_id, category_id, amount_minor)
  values
    (v_transaction_id, v_user_id, p_account_id, p_category_id,
      case when p_kind = 'income' then p_amount_minor else -p_amount_minor end);

  return v_transaction_id;
end;
$$;

revoke all on function public.create_money_transaction(
  uuid, uuid, public.transaction_kind, bigint, date, text, uuid, text, uuid,
  boolean
) from public, anon;
grant execute on function public.create_money_transaction(
  uuid, uuid, public.transaction_kind, bigint, date, text, uuid, text, uuid,
  boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_money_transaction: + p_is_refund boolean default null — the flag
-- rides the same single update seam as p_excluded_from_reports, null
-- preserves. Validation uses the EFFECTIVE flag (coalesce with the stored
-- value) so flag-on re-checks the category and flag-off re-checks the
-- ordinary kind match.
-- ---------------------------------------------------------------------------

drop function if exists public.update_money_transaction(
  uuid, uuid, uuid, public.transaction_kind, bigint, date, text, text,
  timestamptz, uuid, boolean, boolean
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
  p_excluded_from_reports boolean default null,
  p_is_refund boolean default null
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
  v_existing_is_refund boolean;
  v_category_kind public.category_kind;
  v_category_archived boolean;
  v_affected integer;
  v_is_refund boolean;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_kind not in ('income', 'expense') then raise exception 'invalid_transaction_kind'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_amount'; end if;
  if p_occurred_on is null then raise exception 'invalid_date'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;
  if char_length(coalesce(p_payee, '')) > 200 then raise exception 'payee_too_long'; end if;

  select kind, updated_at, goal_id, is_refund
  into v_existing_kind, v_existing_updated_at, v_existing_goal_id,
       v_existing_is_refund
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

  -- Refund contract on the EFFECTIVE flag: a refund row is income-kind
  -- money back against an expense category; unflagged rows keep the
  -- ordinary category-kind match.
  v_is_refund := coalesce(p_is_refund, v_existing_is_refund);
  if v_is_refund then
    if p_kind <> 'income' then raise exception 'refund_requires_income_kind'; end if;
    if v_category_kind is distinct from 'expense' then
      raise exception 'refund_requires_expense_category';
    end if;
  elsif v_category_kind is null or v_category_kind::text <> p_kind::text then
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
      excluded_from_reports = coalesce(p_excluded_from_reports, excluded_from_reports),
      is_refund = v_is_refund
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
  timestamptz, uuid, boolean, boolean, boolean
) from public, anon;
grant execute on function public.update_money_transaction(
  uuid, uuid, uuid, public.transaction_kind, bigint, date, text, text,
  timestamptz, uuid, boolean, boolean, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- budget_progress: the join widens to admit refund income rows. Every
-- joined entry then contributes -amount_minor — expense entries are
-- negative (+X to spent), refund income entries positive (-X, netting
-- the category budget the refund reimburses). Same window/category
-- predicates, so a refund outside the budget's window or scope changes
-- nothing — it is not spend there.
-- ---------------------------------------------------------------------------

create or replace view public.budget_progress
with (security_invoker = true)
as
select
  budget.id,
  budget.user_id,
  budget.category_id,
  category.name as category_name,
  category.icon as category_icon,
  category.color as category_color,
  budget.month_start,
  budget.limit_minor,
  coalesce(sum(
    case
      -- Expense entries are stored negative → +X to spent. Refund
      -- income entries are positive → -X, netting the reimbursed
      -- category. A malformed positive non-refund entry still earns 0,
      -- exactly the old guard's rule.
      when transaction_record.id is not null and entry.amount_minor < 0
        then -entry.amount_minor
      when transaction_record.id is not null and transaction_record.is_refund
        then -entry.amount_minor
      else 0
    end
  ), 0)::bigint as spent_minor,
  budget.updated_at,
  budget.period_kind
from public.monthly_budgets as budget
join public.categories as category
  on category.id = budget.category_id and category.user_id = budget.user_id
left join public.transaction_entries as entry
  on entry.category_id = budget.category_id and entry.user_id = budget.user_id
left join public.financial_transactions as transaction_record
  on transaction_record.id = entry.transaction_id
  and transaction_record.user_id = entry.user_id
  and (
    transaction_record.kind = 'expense'
    or transaction_record.is_refund
  )
  and transaction_record.deleted_at is null
  and transaction_record.occurred_on >= budget.month_start
  and transaction_record.occurred_on <
    case
      when budget.period_kind = 'weekly' then budget.month_start + 7
      else (budget.month_start + interval '1 month')::date
    end
group by budget.id, budget.user_id, budget.category_id, category.name,
  category.icon, category.color, budget.month_start, budget.limit_minor,
  budget.updated_at, budget.period_kind;

revoke all on public.budget_progress from anon;
grant select on public.budget_progress to authenticated;

-- event_budget_progress: identical netting — a refund inside the event
-- window and category scope frees that event's spent total.
create or replace view public.event_budget_progress
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
        when transaction_record.kind = 'expense' and entry.amount_minor < 0
          then -entry.amount_minor
        when transaction_record.is_refund
          then -entry.amount_minor  -- refund income entry (+X) nets spend
        else 0
      end
    )
    from public.transaction_entries as entry
    join public.financial_transactions as transaction_record
      on transaction_record.id = entry.transaction_id
      and transaction_record.user_id = entry.user_id
    where entry.user_id = budget.user_id
      and (
        transaction_record.kind = 'expense'
        or transaction_record.is_refund
      )
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
