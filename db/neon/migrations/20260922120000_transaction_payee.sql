-- Payee (nơi giao dịch / đối tác) as a first-class ledger field.
--
-- `inbox_candidates.merchant` already carries the reviewed merchant name, but
-- `approve_inbox_candidate` historically flattened it into `note`, destroying
-- the payee at commit. This migration adds `financial_transactions.payee`,
-- carries it through every transaction-writing RPC, exposes it in
-- `transaction_feed`, and extends the archive contract with a new schema
-- generation so old backups still restore.
--
-- Semantics:
--   payee  = merchant / person / entity (descriptive, searchable, ≤200 chars)
--   note   = the user's contextual memo (unchanged behavior, ≤500 chars)
--   ''     = no payee recorded; never invented during backfill

alter table public.financial_transactions
  add column payee text not null default ''
    check (char_length(payee) <= 200);

-- ---------------------------------------------------------------------------
-- Reconciled-guard: payee is descriptive metadata, not reconciliation truth.
-- Amount/date/account/kind/category remain protected; a payee correction on a
-- reconciled row (e.g. normalizing "HIGHLANDS COFFEE" → "Highlands") no longer
-- forces un-reconciling. The archive-restore post-update relies on this too.
-- ---------------------------------------------------------------------------

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
       to_jsonb(new) - 'review_status' - 'updated_at' - 'payee'
       is distinct from
       to_jsonb(old) - 'review_status' - 'updated_at' - 'payee'
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

-- ---------------------------------------------------------------------------
-- create_money_transaction: + p_payee
-- ---------------------------------------------------------------------------

drop function if exists public.create_money_transaction(
  uuid, uuid, public.transaction_kind, bigint, date, text, uuid
);

create function public.create_money_transaction(
  p_account_id uuid,
  p_category_id uuid,
  p_kind public.transaction_kind,
  p_amount_minor bigint,
  p_occurred_on date default current_date,
  p_note text default '',
  p_idempotency_key uuid default gen_random_uuid(),
  p_payee text default ''
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

  insert into public.financial_transactions
    (user_id, kind, note, payee, occurred_on, idempotency_key)
  values
    (v_user_id, p_kind, coalesce(p_note, ''), btrim(coalesce(p_payee, '')),
     p_occurred_on, p_idempotency_key)
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
  uuid, uuid, public.transaction_kind, bigint, date, text, uuid, text
) from public, anon;
grant execute on function public.create_money_transaction(
  uuid, uuid, public.transaction_kind, bigint, date, text, uuid, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_money_transaction: + p_payee (overwrite semantics like note — '' clears)
-- ---------------------------------------------------------------------------

drop function if exists public.update_money_transaction(
  uuid, uuid, uuid, public.transaction_kind, bigint, date, text
);

create function public.update_money_transaction(
  p_transaction_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_kind public.transaction_kind,
  p_amount_minor bigint,
  p_occurred_on date,
  p_note text default '',
  p_payee text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_kind public.transaction_kind;
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

  select kind into v_existing_kind
  from public.financial_transactions
  where id = p_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if v_existing_kind is null then raise exception 'transaction_not_found'; end if;
  if v_existing_kind = 'transfer' then raise exception 'transaction_kind_locked'; end if;

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

  update public.financial_transactions
  set kind = p_kind,
      note = coalesce(p_note, ''),
      payee = btrim(coalesce(p_payee, '')),
      occurred_on = p_occurred_on
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
  uuid, uuid, uuid, public.transaction_kind, bigint, date, text, text
) from public, anon;
grant execute on function public.update_money_transaction(
  uuid, uuid, uuid, public.transaction_kind, bigint, date, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- create_split_expense: + p_payee
-- ---------------------------------------------------------------------------

drop function if exists public.create_split_expense(uuid, jsonb, date, text, uuid);

create function public.create_split_expense(
  p_account_id uuid,
  p_lines jsonb,
  p_occurred_on date default current_date,
  p_note text default '',
  p_idempotency_key uuid default gen_random_uuid(),
  p_payee text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_transaction_id uuid;
  v_line jsonb;
  v_category_id uuid;
  v_amount_minor bigint;
  v_category_kind public.category_kind;
  v_line_count integer := 0;
  v_total bigint := 0;
  v_seen uuid[] := array[]::uuid[];
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_account_id is null then raise exception 'account_not_found'; end if;
  if p_occurred_on is null then raise exception 'invalid_transfer_date'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;
  if char_length(coalesce(p_payee, '')) > 200 then raise exception 'payee_too_long'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then raise exception 'invalid_split_lines'; end if;

  select id into v_transaction_id
  from public.financial_transactions
  where user_id = v_user_id and idempotency_key = p_idempotency_key;
  if v_transaction_id is not null then return v_transaction_id; end if;

  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_user_id and not is_archived
  ) then raise exception 'account_not_found'; end if;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_line_count := v_line_count + 1;
    if v_line_count > 12 then raise exception 'too_many_split_lines'; end if;

    begin
      v_category_id := (v_line ->> 'category_id')::uuid;
    exception when others then
      raise exception 'invalid_split_category';
    end;
    if v_category_id is null then raise exception 'invalid_split_category'; end if;

    begin
      v_amount_minor := (v_line ->> 'amount_minor')::bigint;
    exception when others then
      raise exception 'invalid_split_amount';
    end;
    if v_amount_minor is null or v_amount_minor <= 0 or v_amount_minor > 9007199254740991 then
      raise exception 'invalid_split_amount';
    end if;

    if v_category_id = any (v_seen) then raise exception 'duplicate_split_category'; end if;
    v_seen := array_append(v_seen, v_category_id);

    select kind into v_category_kind
    from public.categories
    where id = v_category_id and user_id = v_user_id
      and coalesce(is_archived, false) = false;
    if v_category_kind is null then raise exception 'category_not_found'; end if;
    if v_category_kind <> 'expense' then raise exception 'expense_category_required'; end if;

    v_total := v_total + v_amount_minor;
    if v_total > 9007199254740991 then raise exception 'unsafe_split_total'; end if;
  end loop;

  if v_line_count < 2 then raise exception 'too_few_split_lines'; end if;
  if v_total <= 0 then raise exception 'invalid_split_amount'; end if;

  insert into public.financial_transactions
    (user_id, kind, note, payee, occurred_on, idempotency_key)
  values
    (v_user_id, 'expense', coalesce(nullif(trim(p_note), ''), 'Khoản chi chia danh mục'),
     btrim(coalesce(p_payee, '')), p_occurred_on, p_idempotency_key)
  returning id into v_transaction_id;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_category_id := (v_line ->> 'category_id')::uuid;
    v_amount_minor := (v_line ->> 'amount_minor')::bigint;
    insert into public.transaction_entries
      (transaction_id, user_id, account_id, category_id, amount_minor)
    values
      (v_transaction_id, v_user_id, p_account_id, v_category_id, -v_amount_minor);
  end loop;

  return v_transaction_id;
end;
$$;

revoke all on function public.create_split_expense(uuid, jsonb, date, text, uuid, text)
  from public, anon;
grant execute on function public.create_split_expense(uuid, jsonb, date, text, uuid, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Recurring writes: commitment/template name is the payee. The note keeps the
-- name too — existing display/test contracts depend on it and duplicating a
-- short name into both fields is honest, not redundant.
-- ---------------------------------------------------------------------------

create or replace function public.pay_recurring_commitment(
  p_commitment_id uuid,
  p_month_start date,
  p_paid_on date,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_commitment public.recurring_commitments%rowtype;
  v_transaction_id uuid;
  v_category_kind public.category_kind;
  v_category_archived boolean;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_month_start is null or p_month_start <> date_trunc('month', p_month_start)::date then raise exception 'invalid_commitment_month'; end if;
  if p_paid_on is null then raise exception 'invalid_paid_date'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || p_commitment_id::text || p_month_start::text, 0)
  );

  select transaction_id into v_transaction_id
  from public.commitment_occurrences
  where user_id = v_user_id
    and commitment_id = p_commitment_id
    and month_start = p_month_start;
  if v_transaction_id is not null then return v_transaction_id; end if;

  select * into v_commitment
  from public.recurring_commitments
  where id = p_commitment_id and user_id = v_user_id and not is_archived;
  if v_commitment.id is null then raise exception 'commitment_not_found'; end if;
  if not exists (
    select 1 from public.accounts
    where id = v_commitment.account_id and user_id = v_user_id and not is_archived
  ) then raise exception 'account_not_found'; end if;

  select kind, is_archived into v_category_kind, v_category_archived
  from public.categories
  where id = v_commitment.category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'expense' then raise exception 'expense_category_required'; end if;
  if v_category_archived then raise exception 'category_archived'; end if;

  insert into public.financial_transactions
    (user_id, kind, note, payee, occurred_on, idempotency_key)
  values
    (v_user_id, 'expense', v_commitment.name, left(v_commitment.name, 200),
     p_paid_on, p_idempotency_key)
  returning id into v_transaction_id;

  insert into public.transaction_entries
    (transaction_id, user_id, account_id, category_id, amount_minor)
  values
    (v_transaction_id, v_user_id, v_commitment.account_id, v_commitment.category_id, -v_commitment.amount_minor);

  insert into public.commitment_occurrences
    (user_id, commitment_id, month_start, transaction_id)
  values
    (v_user_id, p_commitment_id, p_month_start, v_transaction_id);
  return v_transaction_id;
end;
$$;

revoke all on function public.pay_recurring_commitment(uuid, date, date, uuid)
  from public, anon;
grant execute on function public.pay_recurring_commitment(uuid, date, date, uuid)
  to authenticated;

create or replace function public.record_recurring_income_template(
  p_template_id uuid,
  p_month_start date,
  p_received_on date,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_template public.recurring_income_templates%rowtype;
  v_transaction_id uuid;
  v_category_kind public.category_kind;
  v_category_archived boolean;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_month_start is null or p_month_start <> date_trunc('month', p_month_start)::date then raise exception 'invalid_income_template_month'; end if;
  if p_received_on is null then raise exception 'invalid_received_date'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || p_template_id::text || p_month_start::text || ':income', 0)
  );

  select transaction_id into v_transaction_id
  from public.income_template_occurrences
  where user_id = v_user_id
    and template_id = p_template_id
    and month_start = p_month_start;
  if v_transaction_id is not null then return v_transaction_id; end if;

  select * into v_template
  from public.recurring_income_templates
  where id = p_template_id and user_id = v_user_id and not is_archived;
  if v_template.id is null then raise exception 'income_template_not_found'; end if;
  if not exists (
    select 1 from public.accounts
    where id = v_template.account_id and user_id = v_user_id and not is_archived
  ) then raise exception 'account_not_found'; end if;

  select kind, is_archived into v_category_kind, v_category_archived
  from public.categories
  where id = v_template.category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'income' then raise exception 'income_category_required'; end if;
  if v_category_archived then raise exception 'category_archived'; end if;

  insert into public.financial_transactions
    (user_id, kind, note, payee, occurred_on, idempotency_key)
  values
    (v_user_id, 'income', v_template.name, left(v_template.name, 200),
     p_received_on, p_idempotency_key)
  returning id into v_transaction_id;

  insert into public.transaction_entries
    (transaction_id, user_id, account_id, category_id, amount_minor)
  values
    (v_transaction_id, v_user_id, v_template.account_id, v_template.category_id, v_template.amount_minor);

  insert into public.income_template_occurrences
    (user_id, template_id, month_start, transaction_id)
  values
    (v_user_id, p_template_id, p_month_start, v_transaction_id);
  return v_transaction_id;
end;
$$;

revoke all on function public.record_recurring_income_template(uuid, date, date, uuid)
  from public, anon;
grant execute on function public.record_recurring_income_template(uuid, date, date, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- approve_inbox_candidate: + p_payee (the reviewed merchant). The inner
-- _pre_source_lineage function keeps its signature and full validation; this
-- wrapper keeps the source-lineage duplicate guard and then writes payee onto
-- the new ledger row. Callers that omit p_payee (the batch path) fall back to
-- the persisted candidate merchant — the inner function never stores merchant
-- edits, so single-candidate approval passes the reviewed draft value.
-- ---------------------------------------------------------------------------

drop function if exists public.approve_inbox_candidate(
  uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean
);

create function public.approve_inbox_candidate(
  p_candidate_id uuid,
  p_kind public.transaction_kind,
  p_account_id uuid,
  p_category_id uuid,
  p_destination_account_id uuid,
  p_amount_minor bigint,
  p_occurred_on date,
  p_note text,
  p_idempotency_key uuid,
  p_allow_heuristic_duplicate boolean default false,
  p_payee text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan jsonb;
  v_reason text;
  v_transaction_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  if p_payee is not null and char_length(p_payee) > 200 then
    raise exception 'payee_too_long';
  end if;

  v_plan := public.plan_inbox_candidate(p_candidate_id);
  v_reason := v_plan ->> 'reason';

  if (v_plan ->> 'status') = 'duplicate'
    and v_reason in (
      'source_external_id_match',
      'source_external_id_lifecycle_changed',
      'source_external_id_changed',
      'source_external_id_deleted_match',
      'source_external_id_deleted_changed',
      'source_predecessor_match',
      'source_predecessor_deleted_match'
    ) then
    raise exception 'source_external_id_duplicate';
  end if;

  v_transaction_id := public.approve_inbox_candidate_pre_source_lineage(
    p_candidate_id,
    p_kind,
    p_account_id,
    p_category_id,
    p_destination_account_id,
    p_amount_minor,
    p_occurred_on,
    p_note,
    p_idempotency_key,
    p_allow_heuristic_duplicate
  );

  -- Transfers carry no merchant semantics; the column stays ''.
  if p_kind <> 'transfer' then
    update public.financial_transactions
    set payee = left(btrim(coalesce(
        p_payee,
        (
          select candidate.merchant
          from public.inbox_candidates as candidate
          where candidate.id = p_candidate_id
            and candidate.user_id = v_user_id
        ),
        ''
      )), 200)
    where id = v_transaction_id
      and user_id = v_user_id;
  end if;

  return v_transaction_id;
end;
$$;

revoke all on function public.approve_inbox_candidate(
  uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean, text
) from public, anon;
grant execute on function public.approve_inbox_candidate(
  uuid, public.transaction_kind, uuid, uuid, uuid, bigint, date, text, uuid, boolean, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- transaction_feed: append payee (create-or-replace only allows new trailing
-- columns; the group-by must name it too).
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
  transaction_record.payee
from public.financial_transactions as transaction_record
join public.transaction_entries as entry
  on entry.transaction_id = transaction_record.id and entry.user_id = transaction_record.user_id
join public.accounts as account
  on account.id = entry.account_id and account.user_id = entry.user_id
left join public.categories as category
  on category.id = entry.category_id and category.user_id = entry.user_id
left join public.commitment_occurrences as commitment_occ
  on commitment_occ.transaction_id = transaction_record.id
  and commitment_occ.user_id = transaction_record.user_id
left join public.income_template_occurrences as income_occ
  on income_occ.transaction_id = transaction_record.id
  and income_occ.user_id = transaction_record.user_id
where transaction_record.deleted_at is null
group by transaction_record.id, transaction_record.user_id, transaction_record.kind,
  transaction_record.note, transaction_record.occurred_on, transaction_record.created_at,
  transaction_record.payee;

-- The dashboard bundle carries its own explicit feed projection — payee must be
-- listed there too or dashboard rows silently drop the field.
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
      feed.payee
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
-- Archive schema generation 20260922120000: transactions rows carry `payee`.
-- The export/validate/restore functions are renamed to *_pre_payee and wrapped
-- exactly like the source-lineage generation before them: legacy archives keep
-- their proven path, current archives strip `payee` before delegating every
-- existing invariant to the proven validators, then the new field is applied
-- as an attributed post-step.
-- ---------------------------------------------------------------------------

alter function public.export_user_archive()
  rename to export_user_archive_pre_payee;

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

  v_archive := public.export_user_archive_pre_payee();
  v_legacy_count := jsonb_array_length(v_archive #> '{tables,transactions}');

  select coalesce(
    jsonb_agg(
      (source_row.value || jsonb_build_object('payee', live.payee))
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
    to_jsonb('20260922120000'::text),
    false
  );
  return v_archive;
end;
$$;

revoke all on function public.export_user_archive()
  from public, anon, authenticated;
grant execute on function public.export_user_archive() to authenticated;

comment on function public.export_user_archive() is
  'MoneyFlow archive v1 producer for schema generation 20260922120000; preserves transaction payee.';

-- The wrapped producer is read-only and remains invoker-scoped so the current
-- wrapper can reuse its tested projection under the caller's RLS.
revoke all on function public.export_user_archive_pre_payee()
  from public, anon;
grant execute on function public.export_user_archive_pre_payee()
  to authenticated;

alter function public.validate_archive_for_restore(jsonb)
  rename to validate_archive_for_restore_pre_payee;
revoke all on function public.validate_archive_for_restore_pre_payee(jsonb)
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

  if v_generation is distinct from '20260922120000' then
    -- Historical generations keep the proven validation path unchanged.
    perform public.validate_archive_for_restore_pre_payee(p_archive);
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
          to_jsonb('20260822094500'::text),
          false
        )
      else p_archive
    end;
    perform public.validate_archive_for_restore_pre_payee(v_legacy_archive);
    return;
  end if;

  -- Delegate every existing invariant on a copy without the new field, then
  -- check only the new field's shape on the original.
  select coalesce(
    jsonb_agg(
      (row_entry.value - 'payee') order by row_entry.ordinality
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
    to_jsonb('20260822094500'::text),
    false
  );

  perform public.validate_archive_for_restore_pre_payee(v_legacy_archive);

  if exists (
    select 1
    from jsonb_array_elements(
      coalesce(p_archive #> '{tables,transactions}', '[]'::jsonb)
    ) as row_entry
    where not (row_entry.value ? 'payee')
       or jsonb_typeof(row_entry.value -> 'payee') <> 'string'
       or char_length(row_entry.value ->> 'payee') > 200
  ) then
    raise exception 'archive_transaction_payee_invalid';
  end if;
end;
$$;

revoke all on function public.validate_archive_for_restore(jsonb)
  from public, anon, authenticated;

comment on function public.validate_archive_for_restore(jsonb) is
  'Validates archive generations 20260804160000, 20260822094500 and current 20260922120000 (transactions.payee).';

alter function public.restore_user_archive(jsonb)
  rename to restore_user_archive_pre_payee;
revoke all on function public.restore_user_archive_pre_payee(jsonb)
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

  if v_generation is distinct from '20260922120000' then
    return public.restore_user_archive_pre_payee(p_archive);
  end if;

  select coalesce(
    jsonb_agg(
      (row_entry.value - 'payee') order by row_entry.ordinality
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
    to_jsonb('20260822094500'::text),
    false
  );

  -- The legacy restore remains the authority for graph validation, empty-target
  -- locking, inserts, audit semantics and attribution. payee is applied as an
  -- attributed post-step; guard_reconciled_transaction_mutation excludes payee,
  -- so reconciled restored rows accept it without a bypass flag.
  v_result := public.restore_user_archive_pre_payee(v_legacy_archive);
  v_restore_batch_id := nullif(v_result ->> 'restore_batch_id', '')::uuid;

  update public.financial_transactions target
  set payee = left(btrim(coalesce(source.payee, '')), 200)
  from jsonb_to_recordset(p_archive #> '{tables,transactions}') as source(
    id uuid,
    payee text
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
  set schema_generation = '20260922120000'
  where id = v_restore_batch_id
    and user_id = v_user_id;

  return v_result;
end;
$$;

revoke all on function public.restore_user_archive(jsonb)
  from public, anon, authenticated;
grant execute on function public.restore_user_archive(jsonb) to authenticated;

comment on function public.restore_user_archive(jsonb) is
  'Restores MoneyFlow archive v1 for generations 20260804160000, 20260822094500 and 20260922120000; current generation preserves transaction payee atomically.';
