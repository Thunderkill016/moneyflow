-- Goal ↔ transaction linkage: an optional, annotation-only goal tag on
-- income/expense transactions (docs/plans/active/goal-transaction-linkage.md,
-- external review applied).
--
-- Semantics: `financial_transactions.goal_id` answers "which goal did this
-- transaction relate to?" It is history/provenance, never funding truth —
-- `savings_goal_allocations` stays the single authority for goal progress and
-- the tag changes no amount, kind, balance or category total. Transfers keep
-- their own writers and are out of this slice.
--
-- Contract notes:
-- * The tag is optional; NULL means no association.
-- * New/change assignment requires an own, non-archived goal, validated under
--   a FOR SHARE row lock so a concurrent archive cannot slip between check
--   and write. Keeping an existing archived tag on unrelated edits and
--   clearing a tag stay allowed.
-- * update_money_transaction uses an explicit sentinel
--   (p_goal_id_is_set) instead of a defaulted NULL: PostgreSQL defaults
--   cannot distinguish "argument omitted" from "explicit null", and letting
--   omission mean clear would let an older client silently erase tags.
-- * The composite FK is ON DELETE RESTRICT (mirroring
--   savings_goal_allocations): a referenced goal cannot be hard-deleted and
--   provenance cannot silently vanish.
-- * Reconciled rows accept a goal-only edit — the tag is descriptive
--   metadata like payee, not reconciliation truth.
-- * Archive generation 20260924120000 carries goal_id so backup/restore
--   preserves linkage, validated and restored through the proven
--   strip-delegate-apply wrapper pattern.

-- ---------------------------------------------------------------------------
-- 1. Column + tenant-safe composite FK + covering index
-- ---------------------------------------------------------------------------

alter table public.financial_transactions
  add column goal_id uuid null;

alter table public.financial_transactions
  add constraint financial_transactions_goal_fk
  foreign key (goal_id, user_id)
  references public.savings_goals (id, user_id)
  on delete restrict;

-- Partial index: (goal_id, user_id) left-prefix covers the FK and the
-- related-count lookup (equality on both columns); NULL rows — the majority —
-- stay out of the index.
create index financial_transactions_goal_idx
  on public.financial_transactions (goal_id, user_id)
  where goal_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Reconciled guard: goal_id is descriptive metadata, exempt like payee.
-- ---------------------------------------------------------------------------

create or replace function public.guard_reconciled_transaction_mutation()
returns trigger
language plpgsql
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
       is distinct from
       to_jsonb(old) - 'review_status' - 'updated_at' - 'payee' - 'goal_id'
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
-- 3. create_money_transaction: + p_goal_id (plain default; on create NULL
--    unambiguously means "no goal", so no sentinel is needed).
-- ---------------------------------------------------------------------------

drop function if exists public.create_money_transaction(
  uuid, uuid, public.transaction_kind, bigint, date, text, uuid, text
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
  p_goal_id uuid default null
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
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_kind not in ('income', 'expense') then raise exception 'unsupported_transaction_kind'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 then raise exception 'amount_must_be_positive'; end if;
  if p_amount_minor > 9007199254740991 then raise exception 'amount_exceeds_safe_integer'; end if;
  if p_occurred_on is null then raise exception 'invalid_date'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;
  if char_length(coalesce(p_payee, '')) > 200 then raise exception 'payee_too_long'; end if;

  select id into v_transaction_id
  from public.financial_transactions
  where user_id = v_user_id and idempotency_key = p_idempotency_key;
  if v_transaction_id is not null then return v_transaction_id; end if;

  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_user_id and not is_archived
  ) then raise exception 'account_not_found'; end if;

  select kind, is_archived into v_category_kind, v_category_archived
  from public.categories
  where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null or v_category_kind::text <> p_kind::text then
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
    (user_id, kind, note, payee, occurred_on, idempotency_key, goal_id)
  values
    (v_user_id, p_kind, coalesce(p_note, ''), btrim(coalesce(p_payee, '')),
     p_occurred_on, p_idempotency_key, p_goal_id)
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
  uuid, uuid, public.transaction_kind, bigint, date, text, uuid, text, uuid
) from public, anon;
grant execute on function public.create_money_transaction(
  uuid, uuid, public.transaction_kind, bigint, date, text, uuid, text, uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. update_money_transaction: + p_goal_id + p_goal_id_is_set sentinel.
--    false preserves, true+null clears, true+uuid sets/changes.
-- ---------------------------------------------------------------------------

drop function if exists public.update_money_transaction(
  uuid, uuid, uuid, public.transaction_kind, bigint, date, text, text,
  timestamptz
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
  p_goal_id_is_set boolean default false
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
      goal_id = case when p_goal_id_is_set then p_goal_id else goal_id end
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
  timestamptz, uuid, boolean
) from public, anon;
grant execute on function public.update_money_transaction(
  uuid, uuid, uuid, public.transaction_kind, bigint, date, text, text,
  timestamptz, uuid, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. transaction_feed: expose goal_id + goal_name (left join keeps untagged
--    rows and archived-goal history visible).
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
  (array_agg(goal.name) filter (where goal.name is not null))[1] as goal_name
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
  transaction_record.updated_at, transaction_record.payee, transaction_record.goal_id;

-- The deleted mirror must expose the tag too: the trash read path selects the
-- same column list plus deleted_at. Columns append at the end per
-- CREATE OR REPLACE VIEW rules.
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
  (array_agg(goal.name) filter (where goal.name is not null))[1] as goal_name
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
  transaction_record.payee, transaction_record.deleted_at, transaction_record.goal_id
order by transaction_record.deleted_at desc;

revoke all on public.deleted_transaction_feed from public, anon;
grant select on public.deleted_transaction_feed to authenticated;

-- ---------------------------------------------------------------------------
-- 6. get_dashboard_bundle: the explicit transaction projection must carry the
--    tag too — the feed alone does not reach the one-RPC dashboard path.
--    Body identical to 20260923120000 except goal_id/goal_name.
-- ---------------------------------------------------------------------------

create or replace function public.get_dashboard_bundle(
  p_today date,
  p_transaction_start date,
  p_recent_limit integer default 5
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_month_start date;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  -- Inputs are supplied by the server only to keep Vietnam calendar boundaries
  -- aligned with the UI. Bound them again in the database because every RPC is
  -- a public authenticated entrypoint and must not expose an unbounded history
  -- scan to a forged client.
  if p_today is null
    or p_today < current_date - 1
    or p_today > current_date + 1
  then
    raise exception 'invalid_dashboard_today';
  end if;

  -- The application's real window is the month-to-date comparison start,
  -- which reaches 2d-1 days back on day d of the month (max 61 for a 31-day
  -- month). The old -45 bound rejected every render from the 24th onward and
  -- silently forced the multi-query fallback; -62 covers the honest maximum
  -- while staying a bounded scan.
  if p_transaction_start is null
    or p_transaction_start < p_today - 62
    or p_transaction_start > p_today
  then
    raise exception 'invalid_dashboard_transaction_range';
  end if;

  if p_recent_limit is null or p_recent_limit < 1 or p_recent_limit > 20 then
    raise exception 'invalid_dashboard_recent_limit';
  end if;

  v_month_start := date_trunc('month', p_today::timestamp)::date;

  with recent_transaction_ids as (
    select feed.id
    from public.transaction_feed as feed
    where feed.user_id = v_user_id
    order by feed.occurred_on desc, feed.created_at desc, feed.id desc
    limit p_recent_limit
  ),
  selected_transactions as (
    select
      feed.id,
      feed.kind,
      feed.note,
      feed.occurred_on,
      feed.created_at,
      feed.amount_minor,
      feed.account_id,
      feed.account_name,
      feed.category_id,
      feed.category_name,
      feed.destination_account_id,
      feed.destination_account_name,
      feed.is_recurring_payment,
      feed.split_lines,
      feed.payee,
      feed.goal_id,
      feed.goal_name
    from public.transaction_feed as feed
    where feed.user_id = v_user_id
      and (
        feed.occurred_on >= p_transaction_start
        or feed.id in (select recent.id from recent_transaction_ids as recent)
      )
  )
  select jsonb_build_object(
    'transactions', coalesce((
      select jsonb_agg(
        to_jsonb(transaction_row)
        order by transaction_row.occurred_on desc,
          transaction_row.created_at desc,
          transaction_row.id desc
      )
      from selected_transactions as transaction_row
    ), '[]'::jsonb),
    'accounts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', account.id,
          'name', account.name,
          'currency_code', account.currency_code
        )
        order by account.created_at, account.id
      )
      from public.accounts as account
      where account.user_id = v_user_id and account.is_archived = false
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', category.id,
          'name', category.name,
          'kind', category.kind,
          'icon', category.icon,
          'color', category.color
        )
        order by category.created_at, category.id
      )
      from public.categories as category
      where category.user_id = v_user_id and category.is_archived = false
    ), '[]'::jsonb),
    'balances', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'account_id', balance.account_id,
          'balance_minor', balance.balance_minor,
          'currency_code', balance.currency_code
        )
        order by balance.account_id
      )
      from public.account_balances as balance
      where balance.user_id = v_user_id
    ), '[]'::jsonb),
    'budgets', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', budget.id,
          'category_id', budget.category_id,
          'category_name', budget.category_name,
          'category_icon', budget.category_icon,
          'category_color', budget.category_color,
          'month_start', budget.month_start,
          'limit_minor', budget.limit_minor,
          'spent_minor', budget.spent_minor
        )
        order by budget.category_name, budget.id
      )
      from public.budget_progress as budget
      where budget.user_id = v_user_id and budget.month_start = v_month_start
    ), '[]'::jsonb),
    'commitments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', commitment.id,
          'name', commitment.name,
          'amount_minor', commitment.amount_minor,
          'due_day', commitment.due_day,
          'account_id', commitment.account_id,
          'account_name', commitment.account_name,
          'category_id', commitment.category_id,
          'category_name', commitment.category_name,
          'category_icon', commitment.category_icon,
          'category_color', commitment.category_color,
          'is_archived', commitment.is_archived
        )
        order by commitment.due_day, commitment.id
      )
      from public.recurring_commitment_feed as commitment
      where commitment.user_id = v_user_id
    ), '[]'::jsonb),
    'commitment_occurrences', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'commitment_id', occurrence.commitment_id,
          'transaction_id', occurrence.transaction_id
        )
        order by occurrence.commitment_id
      )
      from public.commitment_occurrences as occurrence
      where occurrence.user_id = v_user_id
        and occurrence.month_start = v_month_start
    ), '[]'::jsonb),
    'income_templates', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', template.id,
          'name', template.name,
          'amount_minor', template.amount_minor,
          'due_day', template.due_day,
          'account_id', template.account_id,
          'account_name', template.account_name,
          'category_id', template.category_id,
          'category_name', template.category_name,
          'category_icon', template.category_icon,
          'category_color', template.category_color,
          'is_archived', template.is_archived
        )
        order by template.due_day, template.id
      )
      from public.recurring_income_template_feed as template
      where template.user_id = v_user_id
    ), '[]'::jsonb),
    'income_occurrences', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'template_id', occurrence.template_id,
          'transaction_id', occurrence.transaction_id
        )
        order by occurrence.template_id
      )
      from public.income_template_occurrences as occurrence
      where occurrence.user_id = v_user_id
        and occurrence.month_start = v_month_start
    ), '[]'::jsonb),
    'goals', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', goal.id,
          'name', goal.name,
          'target_minor', goal.target_minor,
          'allocated_minor', goal.allocated_minor,
          'deadline', goal.deadline,
          'created_at', goal.created_at,
          'is_archived', goal.is_archived
        )
        order by goal.is_archived, goal.deadline nulls last, goal.id
      )
      from public.savings_goals as goal
      where goal.user_id = v_user_id
    ), '[]'::jsonb),
    'pending_inbox_count', (
      select count(*)
      from public.inbox_candidates as candidate
      where candidate.user_id = v_user_id and candidate.status = 'pending'
    ),
    'ledger_trust', (
      select to_jsonb(trust_row)
      from public.ledger_trust_summary() as trust_row
    ),
    'backup_state', (
      select jsonb_build_object(
        'last_backup_at', profile.last_backup_at::date,
        'created_at', profile.created_at::date
      )
      from public.profiles as profile
      where profile.id = v_user_id
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_dashboard_bundle(date, date, integer)
  from public, anon, authenticated;
grant execute on function public.get_dashboard_bundle(date, date, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Archive generation 20260924120000: transaction rows carry `goal_id`.
--    Same wrapper shape as the payee generation: current functions become
--    *_pre_goal, legacy archives keep their proven path, current archives
--    strip `goal_id` before delegating every existing invariant, then the
--    tag is applied as an attributed post-step (the reconciled guard's
--    goal_id exemption lets restored reconciled rows accept it).
-- ---------------------------------------------------------------------------

alter function public.export_user_archive()
  rename to export_user_archive_pre_goal;

create or replace function public.export_user_archive()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_archive jsonb;
  v_transactions jsonb;
  v_legacy_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  v_archive := public.export_user_archive_pre_goal();
  v_legacy_count := jsonb_array_length(v_archive #> '{tables,transactions}');

  select coalesce(
    jsonb_agg(
      (source_row.value || jsonb_build_object('goal_id', live.goal_id))
      order by source_row.ordinality
    ),
    '[]'::jsonb
  )
  into v_transactions
  from jsonb_array_elements(v_archive #> '{tables,transactions}')
    with ordinality as source_row(value, ordinality)
  join public.financial_transactions as live
    on live.id = (source_row.value ->> 'id')::uuid
    and live.user_id = v_user_id;

  if jsonb_array_length(v_transactions) <> v_legacy_count then
    raise exception 'archive_transaction_projection_mismatch';
  end if;

  v_archive := jsonb_set(
    v_archive,
    '{tables,transactions}',
    v_transactions,
    false
  );
  v_archive := jsonb_set(
    v_archive,
    '{schema_generation}',
    to_jsonb('20260924120000'::text),
    false
  );
  return v_archive;
end;
$$;

revoke all on function public.export_user_archive()
  from public, anon, authenticated;
grant execute on function public.export_user_archive() to authenticated;

comment on function public.export_user_archive() is
  'MoneyFlow archive v1 producer for schema generation 20260924120000; preserves transaction goal linkage.';

revoke all on function public.export_user_archive_pre_goal()
  from public, anon;
grant execute on function public.export_user_archive_pre_goal()
  to authenticated;

alter function public.validate_archive_for_restore(jsonb)
  rename to validate_archive_for_restore_pre_goal;
revoke all on function public.validate_archive_for_restore_pre_goal(jsonb)
  from public, anon, authenticated;

create or replace function public.validate_archive_for_restore(p_archive jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_generation text;
  v_legacy_archive jsonb;
  v_legacy_transactions jsonb;
begin
  v_generation := case
    when jsonb_typeof(p_archive) = 'object' then p_archive ->> 'schema_generation'
    else null
  end;

  if v_generation is distinct from '20260924120000' then
    -- Historical generations keep the proven validation path unchanged.
    perform public.validate_archive_for_restore_pre_goal(p_archive);
    return;
  end if;

  -- If the outer structure is malformed, delegate to the prior validator after
  -- only swapping generation so it preserves its established rejection.
  if jsonb_typeof(p_archive) <> 'object'
    or jsonb_typeof(p_archive -> 'tables') <> 'object'
    or jsonb_typeof(p_archive #> '{tables,transactions}') <> 'array' then
    v_legacy_archive := case
      when jsonb_typeof(p_archive) = 'object' then
        jsonb_set(
          p_archive,
          '{schema_generation}',
          to_jsonb('20260922120000'::text),
          false
        )
      else p_archive
    end;
    perform public.validate_archive_for_restore_pre_goal(v_legacy_archive);
    return;
  end if;

  -- Delegate every existing invariant on a copy without the new field, then
  -- check only the new field's shape and references on the original.
  select coalesce(
    jsonb_agg(
      (row_entry.value - 'goal_id') order by row_entry.ordinality
    ),
    '[]'::jsonb
  )
  into v_legacy_transactions
  from jsonb_array_elements(
    coalesce(p_archive #> '{tables,transactions}', '[]'::jsonb)
  ) with ordinality as row_entry(value, ordinality);

  v_legacy_archive := jsonb_set(
    p_archive,
    '{tables,transactions}',
    v_legacy_transactions,
    false
  );
  v_legacy_archive := jsonb_set(
    v_legacy_archive,
    '{schema_generation}',
    to_jsonb('20260922120000'::text),
    false
  );

  perform public.validate_archive_for_restore_pre_goal(v_legacy_archive);

  if exists (
    select 1
    from jsonb_array_elements(
      coalesce(p_archive #> '{tables,transactions}', '[]'::jsonb)
    ) as row_entry
    where not (row_entry.value ? 'goal_id')
       or (
         jsonb_typeof(row_entry.value -> 'goal_id') not in ('string', 'null')
       )
       or (
         jsonb_typeof(row_entry.value -> 'goal_id') = 'string'
         and (row_entry.value ->> 'goal_id') !~
             '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       )
  ) then
    raise exception 'archive_transaction_goal_invalid';
  end if;

  -- A tagged goal must exist in the archive's savingsGoals collection; the
  -- composite FK would otherwise reject the post-step write, or worse, leave
  -- a dangling tag if the constraint were ever relaxed.
  if exists (
    select 1
    from jsonb_array_elements(
      coalesce(p_archive #> '{tables,transactions}', '[]'::jsonb)
    ) as row_entry
    where (row_entry.value ->> 'goal_id') is not null
      and not exists (
        select 1
        from jsonb_array_elements(
          coalesce(p_archive #> '{tables,savingsGoals}', '[]'::jsonb)
        ) as goal_row
        where goal_row.value ->> 'id' = row_entry.value ->> 'goal_id'
      )
  ) then
    raise exception 'reference_not_found';
  end if;
end;
$$;

revoke all on function public.validate_archive_for_restore(jsonb)
  from public, anon, authenticated;

comment on function public.validate_archive_for_restore(jsonb) is
  'Validates archive generations 20260804160000, 20260822094500, 20260922120000 and current 20260924120000 (transactions.goal_id).';

alter function public.restore_user_archive(jsonb)
  rename to restore_user_archive_pre_goal;
revoke all on function public.restore_user_archive_pre_goal(jsonb)
  from public, anon, authenticated;

create or replace function public.restore_user_archive(p_archive jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_generation text;
  v_legacy_archive jsonb;
  v_legacy_transactions jsonb;
  v_result jsonb;
  v_restore_batch_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  perform public.validate_archive_for_restore(p_archive);
  v_generation := p_archive ->> 'schema_generation';

  if v_generation is distinct from '20260924120000' then
    return public.restore_user_archive_pre_goal(p_archive);
  end if;

  select coalesce(
    jsonb_agg(
      (row_entry.value - 'goal_id') order by row_entry.ordinality
    ),
    '[]'::jsonb
  )
  into v_legacy_transactions
  from jsonb_array_elements(
    coalesce(p_archive #> '{tables,transactions}', '[]'::jsonb)
  ) with ordinality as row_entry(value, ordinality);

  v_legacy_archive := jsonb_set(
    p_archive,
    '{tables,transactions}',
    v_legacy_transactions,
    false
  );
  v_legacy_archive := jsonb_set(
    v_legacy_archive,
    '{schema_generation}',
    to_jsonb('20260922120000'::text),
    false
  );

  -- The legacy restore remains the authority for graph validation, empty-target
  -- locking, inserts, audit semantics and attribution. goal_id is applied as
  -- an attributed post-step; guard_reconciled_transaction_mutation excludes
  -- goal_id, so reconciled restored rows accept it without a bypass flag.
  v_result := public.restore_user_archive_pre_goal(v_legacy_archive);
  v_restore_batch_id := nullif(v_result ->> 'restore_batch_id', '')::uuid;

  update public.financial_transactions target
  set goal_id = (source.goal_id)::uuid
  from jsonb_to_recordset(p_archive #> '{tables,transactions}') as source(
    id uuid,
    goal_id uuid
  )
  where target.id = source.id
    and target.user_id = v_user_id;

  -- Refresh the restore-row hashes for the collection this post-step touched,
  -- so later pristine-removal checks compare against the committed row.
  update public.archive_restore_rows restore_row
  set row_hash = md5(to_jsonb(transaction.*)::text)
  from public.financial_transactions transaction
  where restore_row.batch_id = v_restore_batch_id
    and restore_row.user_id = v_user_id
    and restore_row.table_name = 'financial_transactions'
    and transaction.user_id = v_user_id
    and transaction.id = restore_row.row_id;

  update public.archive_restore_batches
  set schema_generation = '20260924120000'
  where id = v_restore_batch_id
    and user_id = v_user_id;

  return v_result;
end;
$$;

revoke all on function public.restore_user_archive(jsonb)
  from public, anon, authenticated;
grant execute on function public.restore_user_archive(jsonb) to authenticated;
