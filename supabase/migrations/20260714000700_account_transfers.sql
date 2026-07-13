create or replace function public.create_account_transfer(
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_amount_minor bigint,
  p_occurred_on date default current_date,
  p_note text default '',
  p_idempotency_key uuid default gen_random_uuid()
)
returns uuid language plpgsql security definer set search_path = '' as $$
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

  insert into public.financial_transactions (user_id, kind, note, occurred_on, idempotency_key)
  values (v_user_id, 'transfer', coalesce(nullif(trim(p_note), ''), 'Chuyển tiền'), p_occurred_on, p_idempotency_key)
  returning id into v_transaction_id;
  insert into public.transaction_entries (transaction_id, user_id, account_id, category_id, amount_minor)
  values
    (v_transaction_id, v_user_id, p_source_account_id, null, -p_amount_minor),
    (v_transaction_id, v_user_id, p_destination_account_id, null, p_amount_minor);
  return v_transaction_id;
end;
$$;

revoke all on function public.create_account_transfer(uuid, uuid, bigint, date, text, uuid) from public, anon;
grant execute on function public.create_account_transfer(uuid, uuid, bigint, date, text, uuid) to authenticated;

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
  (array_agg(account.name) filter (where transaction_record.kind = 'transfer' and entry.amount_minor > 0))[1] as destination_account_name
from public.financial_transactions as transaction_record
join public.transaction_entries as entry on entry.transaction_id = transaction_record.id and entry.user_id = transaction_record.user_id
join public.accounts as account on account.id = entry.account_id and account.user_id = entry.user_id
left join public.categories as category on category.id = entry.category_id and category.user_id = entry.user_id
where transaction_record.deleted_at is null
group by transaction_record.id, transaction_record.user_id, transaction_record.kind,
  transaction_record.note, transaction_record.occurred_on, transaction_record.created_at;
