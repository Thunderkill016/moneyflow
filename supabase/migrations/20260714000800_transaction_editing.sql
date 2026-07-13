create or replace function public.update_money_transaction(
  p_transaction_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_kind public.transaction_kind,
  p_amount_minor bigint,
  p_occurred_on date,
  p_note text default ''
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_kind public.transaction_kind;
  v_category_kind public.category_kind;
  v_affected integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_kind not in ('income', 'expense') then raise exception 'invalid_transaction_kind'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_amount'; end if;
  if p_occurred_on is null then raise exception 'invalid_date'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;

  select kind into v_existing_kind from public.financial_transactions
  where id = p_transaction_id and user_id = v_user_id and deleted_at is null
  for update;
  if v_existing_kind is null then raise exception 'transaction_not_found'; end if;
  if v_existing_kind = 'transfer' then raise exception 'transaction_kind_locked'; end if;
  if exists (select 1 from public.commitment_occurrences where user_id = v_user_id and transaction_id = p_transaction_id) then
    raise exception 'recurring_payment_locked';
  end if;
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = v_user_id and not is_archived) then
    raise exception 'account_not_found';
  end if;
  select kind into v_category_kind from public.categories where id = p_category_id and user_id = v_user_id;
  if v_category_kind is null or v_category_kind::text <> p_kind::text then raise exception 'category_kind_mismatch'; end if;

  update public.financial_transactions
  set kind = p_kind, note = coalesce(p_note, ''), occurred_on = p_occurred_on
  where id = p_transaction_id and user_id = v_user_id;
  update public.transaction_entries
  set account_id = p_account_id, category_id = p_category_id,
      amount_minor = case when p_kind = 'income' then p_amount_minor else -p_amount_minor end
  where transaction_id = p_transaction_id and user_id = v_user_id;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'invalid_transaction_entries'; end if;
  return p_transaction_id;
end;
$$;

create or replace function public.update_account_transfer(
  p_transaction_id uuid,
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_amount_minor bigint,
  p_occurred_on date,
  p_note text default ''
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_kind public.transaction_kind;
  v_source_currency text;
  v_destination_currency text;
  v_affected integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_source_account_id is null or p_destination_account_id is null or p_source_account_id = p_destination_account_id then raise exception 'different_accounts_required'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_transfer_amount'; end if;
  if p_occurred_on is null then raise exception 'invalid_transfer_date'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;

  select kind into v_existing_kind from public.financial_transactions
  where id = p_transaction_id and user_id = v_user_id and deleted_at is null
  for update;
  if v_existing_kind is null then raise exception 'transaction_not_found'; end if;
  if v_existing_kind <> 'transfer' then raise exception 'transaction_kind_locked'; end if;
  if exists (select 1 from public.commitment_occurrences where user_id = v_user_id and transaction_id = p_transaction_id) then
    raise exception 'recurring_payment_locked';
  end if;

  select currency_code into v_source_currency from public.accounts
  where id = p_source_account_id and user_id = v_user_id and not is_archived;
  select currency_code into v_destination_currency from public.accounts
  where id = p_destination_account_id and user_id = v_user_id and not is_archived;
  if v_source_currency is null or v_destination_currency is null then raise exception 'account_not_found'; end if;
  if v_source_currency <> v_destination_currency then raise exception 'currency_mismatch'; end if;

  update public.financial_transactions
  set note = coalesce(nullif(trim(p_note), ''), 'Chuyển tiền'), occurred_on = p_occurred_on
  where id = p_transaction_id and user_id = v_user_id;
  update public.transaction_entries
  set account_id = p_source_account_id, category_id = null, amount_minor = -p_amount_minor
  where transaction_id = p_transaction_id and user_id = v_user_id and amount_minor < 0;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'invalid_transfer_entries'; end if;
  update public.transaction_entries
  set account_id = p_destination_account_id, category_id = null, amount_minor = p_amount_minor
  where transaction_id = p_transaction_id and user_id = v_user_id and amount_minor > 0;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'invalid_transfer_entries'; end if;
  return p_transaction_id;
end;
$$;

create or replace function public.soft_delete_money_transaction(p_transaction_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_affected integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if exists (select 1 from public.commitment_occurrences where user_id = auth.uid() and transaction_id = p_transaction_id) then
    raise exception 'recurring_payment_locked';
  end if;
  update public.financial_transactions set deleted_at = now()
  where id = p_transaction_id and user_id = auth.uid() and deleted_at is null;
  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

revoke all on function public.update_money_transaction(uuid, uuid, uuid, public.transaction_kind, bigint, date, text) from public, anon;
grant execute on function public.update_money_transaction(uuid, uuid, uuid, public.transaction_kind, bigint, date, text) to authenticated;
revoke all on function public.update_account_transfer(uuid, uuid, uuid, bigint, date, text) from public, anon;
grant execute on function public.update_account_transfer(uuid, uuid, uuid, bigint, date, text) to authenticated;

create or replace view public.transaction_feed with (security_invoker = true) as
select
  transaction_record.id,
  transaction_record.user_id,
  transaction_record.kind,
  transaction_record.note,
  transaction_record.occurred_on,
  transaction_record.created_at,
  max(case when transaction_record.kind = 'transfer' and entry.amount_minor < 0 then -entry.amount_minor else abs(entry.amount_minor) end)::bigint as amount_minor,
  (array_agg(account.id) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_id,
  (array_agg(account.name) filter (where transaction_record.kind <> 'transfer' or entry.amount_minor < 0))[1] as account_name,
  (array_agg(category.id) filter (where category.id is not null))[1] as category_id,
  (array_agg(category.name) filter (where category.name is not null))[1] as category_name,
  (array_agg(account.id) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_id,
  (array_agg(account.name) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_name,
  bool_or(occurrence.id is not null) as is_recurring_payment
from public.financial_transactions as transaction_record
join public.transaction_entries as entry on entry.transaction_id = transaction_record.id and entry.user_id = transaction_record.user_id
join public.accounts as account on account.id = entry.account_id and account.user_id = entry.user_id
left join public.categories as category on category.id = entry.category_id and category.user_id = entry.user_id
left join public.commitment_occurrences as occurrence on occurrence.transaction_id = transaction_record.id and occurrence.user_id = transaction_record.user_id
where transaction_record.deleted_at is null
group by transaction_record.id, transaction_record.user_id, transaction_record.kind,
  transaction_record.note, transaction_record.occurred_on, transaction_record.created_at;
