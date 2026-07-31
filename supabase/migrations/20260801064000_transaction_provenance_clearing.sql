-- Transaction provenance belongs to the aggregate; statement matching belongs to
-- each account-side ledger entry so transfer sides can settle independently.

alter table public.financial_transactions
  add column source_kind text not null default 'manual',
  add column source_reference text;

alter table public.financial_transactions
  add constraint financial_transactions_source_kind_check
  check (source_kind in (
    'manual',
    'transfer',
    'split',
    'recurring_commitment',
    'recurring_income',
    'import'
  ));

alter table public.financial_transactions
  add constraint financial_transactions_source_reference_length_check
  check (source_reference is null or char_length(source_reference) <= 200);

alter table public.transaction_entries
  add column cleared_at timestamp with time zone;

-- Preserve the most specific existing provenance. Existing rows remain uncleared.
update public.financial_transactions as transaction_record
set source_kind = 'recurring_commitment'
where exists (
  select 1
  from public.commitment_occurrences as occurrence
  where occurrence.transaction_id = transaction_record.id
    and occurrence.user_id = transaction_record.user_id
);

update public.financial_transactions as transaction_record
set source_kind = 'recurring_income'
where exists (
  select 1
  from public.income_template_occurrences as occurrence
  where occurrence.transaction_id = transaction_record.id
    and occurrence.user_id = transaction_record.user_id
);

update public.financial_transactions
set source_kind = 'transfer'
where kind = 'transfer'
  and source_kind = 'manual';

update public.financial_transactions as transaction_record
set source_kind = 'split'
where transaction_record.kind = 'expense'
  and transaction_record.source_kind = 'manual'
  and (
    select count(*)
    from public.transaction_entries as entry
    where entry.transaction_id = transaction_record.id
      and entry.user_id = transaction_record.user_id
  ) > 1;

create or replace function public.create_money_transaction(
  p_account_id uuid,
  p_category_id uuid,
  p_kind public.transaction_kind,
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
    (user_id, kind, note, occurred_on, idempotency_key, source_kind)
  values
    (v_user_id, p_kind, coalesce(p_note, ''), p_occurred_on, p_idempotency_key, 'manual')
  returning id into v_transaction_id;

  insert into public.transaction_entries
    (transaction_id, user_id, account_id, category_id, amount_minor)
  values
    (v_transaction_id, v_user_id, p_account_id, p_category_id,
      case when p_kind = 'income' then p_amount_minor else -p_amount_minor end);

  return v_transaction_id;
end;
$$;

create or replace function public.create_account_transfer(
  p_source_account_id uuid,
  p_destination_account_id uuid,
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
  v_transaction_id uuid;
  v_source_currency text;
  v_destination_currency text;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_source_account_id is null or p_destination_account_id is null or p_source_account_id = p_destination_account_id then raise exception 'different_accounts_required'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_transfer_amount'; end if;
  if p_occurred_on is null then raise exception 'invalid_transfer_date'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;

  select id into v_transaction_id from public.financial_transactions
  where user_id = v_user_id and idempotency_key = p_idempotency_key;
  if v_transaction_id is not null then return v_transaction_id; end if;

  select currency_code into v_source_currency from public.accounts
  where id = p_source_account_id and user_id = v_user_id and not is_archived;
  select currency_code into v_destination_currency from public.accounts
  where id = p_destination_account_id and user_id = v_user_id and not is_archived;
  if v_source_currency is null or v_destination_currency is null then raise exception 'account_not_found'; end if;
  if v_source_currency <> v_destination_currency then raise exception 'currency_mismatch'; end if;

  insert into public.financial_transactions
    (user_id, kind, note, occurred_on, idempotency_key, source_kind)
  values
    (v_user_id, 'transfer', coalesce(nullif(trim(p_note), ''), 'Chuyển tiền'), p_occurred_on, p_idempotency_key, 'transfer')
  returning id into v_transaction_id;

  insert into public.transaction_entries
    (transaction_id, user_id, account_id, category_id, amount_minor)
  values
    (v_transaction_id, v_user_id, p_source_account_id, null, -p_amount_minor),
    (v_transaction_id, v_user_id, p_destination_account_id, null, p_amount_minor);
  return v_transaction_id;
end;
$$;

create or replace function public.create_split_expense(
  p_account_id uuid,
  p_lines jsonb,
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
    if v_amount_minor is null or v_amount_minor <= 0 or v_amount_minor > 9007199254740991 then raise exception 'invalid_split_amount'; end if;
    if v_category_id = any (v_seen) then raise exception 'duplicate_split_category'; end if;
    v_seen := array_append(v_seen, v_category_id);
    select kind into v_category_kind
    from public.categories
    where id = v_category_id and user_id = v_user_id and coalesce(is_archived, false) = false;
    if v_category_kind is null then raise exception 'category_not_found'; end if;
    if v_category_kind <> 'expense' then raise exception 'expense_category_required'; end if;
    v_total := v_total + v_amount_minor;
    if v_total > 9007199254740991 then raise exception 'unsafe_split_total'; end if;
  end loop;

  if v_line_count < 2 then raise exception 'too_few_split_lines'; end if;
  if v_total <= 0 then raise exception 'invalid_split_amount'; end if;

  insert into public.financial_transactions
    (user_id, kind, note, occurred_on, idempotency_key, source_kind)
  values
    (v_user_id, 'expense', coalesce(nullif(trim(p_note), ''), 'Khoản chi chia danh mục'), p_occurred_on, p_idempotency_key, 'split')
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
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || p_commitment_id::text || p_month_start::text, 0));
  select transaction_id into v_transaction_id from public.commitment_occurrences
  where user_id = v_user_id and commitment_id = p_commitment_id and month_start = p_month_start;
  if v_transaction_id is not null then return v_transaction_id; end if;
  select * into v_commitment from public.recurring_commitments
  where id = p_commitment_id and user_id = v_user_id and not is_archived;
  if v_commitment.id is null then raise exception 'commitment_not_found'; end if;
  if not exists (select 1 from public.accounts where id = v_commitment.account_id and user_id = v_user_id and not is_archived) then raise exception 'account_not_found'; end if;
  select kind, is_archived into v_category_kind, v_category_archived from public.categories
  where id = v_commitment.category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'expense' then raise exception 'expense_category_required'; end if;
  if v_category_archived then raise exception 'category_archived'; end if;
  insert into public.financial_transactions
    (user_id, kind, note, occurred_on, idempotency_key, source_kind, source_reference)
  values
    (v_user_id, 'expense', v_commitment.name, p_paid_on, p_idempotency_key, 'recurring_commitment', p_commitment_id::text)
  returning id into v_transaction_id;
  insert into public.transaction_entries (transaction_id, user_id, account_id, category_id, amount_minor)
  values (v_transaction_id, v_user_id, v_commitment.account_id, v_commitment.category_id, -v_commitment.amount_minor);
  insert into public.commitment_occurrences (user_id, commitment_id, month_start, transaction_id)
  values (v_user_id, p_commitment_id, p_month_start, v_transaction_id);
  return v_transaction_id;
end;
$$;

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
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || p_template_id::text || p_month_start::text || ':income', 0));
  select transaction_id into v_transaction_id from public.income_template_occurrences
  where user_id = v_user_id and template_id = p_template_id and month_start = p_month_start;
  if v_transaction_id is not null then return v_transaction_id; end if;
  select * into v_template from public.recurring_income_templates
  where id = p_template_id and user_id = v_user_id and not is_archived;
  if v_template.id is null then raise exception 'income_template_not_found'; end if;
  if not exists (select 1 from public.accounts where id = v_template.account_id and user_id = v_user_id and not is_archived) then raise exception 'account_not_found'; end if;
  select kind, is_archived into v_category_kind, v_category_archived from public.categories
  where id = v_template.category_id and user_id = v_user_id;
  if v_category_kind is null then raise exception 'category_not_found'; end if;
  if v_category_kind <> 'income' then raise exception 'income_category_required'; end if;
  if v_category_archived then raise exception 'category_archived'; end if;
  insert into public.financial_transactions
    (user_id, kind, note, occurred_on, idempotency_key, source_kind, source_reference)
  values
    (v_user_id, 'income', v_template.name, p_received_on, p_idempotency_key, 'recurring_income', p_template_id::text)
  returning id into v_transaction_id;
  insert into public.transaction_entries (transaction_id, user_id, account_id, category_id, amount_minor)
  values (v_transaction_id, v_user_id, v_template.account_id, v_template.category_id, v_template.amount_minor);
  insert into public.income_template_occurrences (user_id, template_id, month_start, transaction_id)
  values (v_user_id, p_template_id, p_month_start, v_transaction_id);
  return v_transaction_id;
end;
$$;

create or replace function public.set_transaction_entry_cleared(
  p_transaction_id uuid,
  p_account_id uuid,
  p_cleared boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_affected integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_transaction_id is null or p_account_id is null or p_cleared is null then
    raise exception 'invalid_clearing_request';
  end if;

  update public.transaction_entries as entry
  set cleared_at = case when p_cleared then now() else null end
  from public.financial_transactions as transaction_record
  where entry.transaction_id = transaction_record.id
    and entry.user_id = transaction_record.user_id
    and transaction_record.id = p_transaction_id
    and transaction_record.user_id = v_user_id
    and transaction_record.deleted_at is null
    and entry.account_id = p_account_id
    and (entry.cleared_at is not null) is distinct from p_cleared;

  get diagnostics v_affected = row_count;

  if v_affected > 0 then return true; end if;

  return exists (
    select 1
    from public.transaction_entries as entry
    join public.financial_transactions as transaction_record
      on transaction_record.id = entry.transaction_id
      and transaction_record.user_id = entry.user_id
    where transaction_record.id = p_transaction_id
      and transaction_record.user_id = v_user_id
      and transaction_record.deleted_at is null
      and entry.account_id = p_account_id
      and (entry.cleared_at is not null) = p_cleared
  );
end;
$$;

revoke all on function public.create_money_transaction(uuid, uuid, public.transaction_kind, bigint, date, text, uuid) from public, anon;
grant execute on function public.create_money_transaction(uuid, uuid, public.transaction_kind, bigint, date, text, uuid) to authenticated;
revoke all on function public.create_account_transfer(uuid, uuid, bigint, date, text, uuid) from public, anon;
grant execute on function public.create_account_transfer(uuid, uuid, bigint, date, text, uuid) to authenticated;
revoke all on function public.create_split_expense(uuid, jsonb, date, text, uuid) from public, anon;
grant execute on function public.create_split_expense(uuid, jsonb, date, text, uuid) to authenticated;
revoke all on function public.pay_recurring_commitment(uuid, date, date, uuid) from public, anon;
grant execute on function public.pay_recurring_commitment(uuid, date, date, uuid) to authenticated;
revoke all on function public.record_recurring_income_template(uuid, date, date, uuid) from public, anon;
grant execute on function public.record_recurring_income_template(uuid, date, date, uuid) to authenticated;
revoke all on function public.set_transaction_entry_cleared(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_transaction_entry_cleared(uuid, uuid, boolean) to authenticated;

create or replace view public.transaction_feed with (security_invoker = true) as
select
  transaction_record.id,
  transaction_record.user_id,
  transaction_record.kind,
  transaction_record.note,
  transaction_record.occurred_on,
  transaction_record.created_at,
  transaction_record.source_kind,
  transaction_record.source_reference,
  case
    when transaction_record.kind = 'transfer' then
      max(case when entry.amount_minor < 0 then -entry.amount_minor else abs(entry.amount_minor) end)
    else sum(abs(entry.amount_minor))
  end::bigint as amount_minor,
  (array_agg(account.id) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_id,
  (array_agg(account.name) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_name,
  (array_agg(category.id) filter (where category.id is not null))[1] as category_id,
  case
    when transaction_record.kind = 'expense'
      and count(distinct category.id) filter (where category.id is not null) > 1
    then 'Chia · ' || (count(distinct category.id) filter (where category.id is not null))::text || ' danh mục'
    else (array_agg(category.name) filter (where category.name is not null))[1]
  end as category_name,
  (array_agg(account.id) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_id,
  (array_agg(account.name) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_name,
  bool_or(commitment_occ.id is not null or income_occ.id is not null) as is_recurring_payment,
  coalesce(
    array_agg(distinct account.id) filter (where entry.cleared_at is not null),
    array[]::uuid[]
  ) as cleared_account_ids,
  case
    when transaction_record.kind = 'expense'
      and count(category.id) filter (where category.id is not null) > 1
    then jsonb_agg(
      jsonb_build_object(
        'category_id', category.id,
        'category_name', category.name,
        'amount_minor', abs(entry.amount_minor)
      ) order by abs(entry.amount_minor) desc
    ) filter (where category.id is not null)
    else null
  end as split_lines
from public.financial_transactions as transaction_record
join public.transaction_entries as entry
  on entry.transaction_id = transaction_record.id and entry.user_id = transaction_record.user_id
join public.accounts as account
  on account.id = entry.account_id and account.user_id = entry.user_id
left join public.categories as category
  on category.id = entry.category_id and category.user_id = entry.user_id
left join public.commitment_occurrences as commitment_occ
  on commitment_occ.transaction_id = transaction_record.id and commitment_occ.user_id = transaction_record.user_id
left join public.income_template_occurrences as income_occ
  on income_occ.transaction_id = transaction_record.id and income_occ.user_id = transaction_record.user_id
where transaction_record.deleted_at is null
group by transaction_record.id, transaction_record.user_id, transaction_record.kind,
  transaction_record.note, transaction_record.occurred_on, transaction_record.created_at,
  transaction_record.source_kind, transaction_record.source_reference;
