-- Split one expense across 2+ categories via multi-entry ledger.
-- One financial_transactions row; N transaction_entries (same account, different categories).
-- Account balance decreases by sum(lines); budget_progress already keys off entry.category_id.

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
    (user_id, kind, note, occurred_on, idempotency_key)
  values
    (v_user_id, 'expense', coalesce(nullif(trim(p_note), ''), 'Khoản chi chia danh mục'), p_occurred_on, p_idempotency_key)
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

revoke all on function public.create_split_expense(uuid, jsonb, date, text, uuid) from public, anon;
grant execute on function public.create_split_expense(uuid, jsonb, date, text, uuid) to authenticated;

-- Feed: sum multi-entry expense/income; expose split_lines jsonb when 2+ categories.
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
  end as split_lines
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
  transaction_record.note, transaction_record.occurred_on, transaction_record.created_at;
