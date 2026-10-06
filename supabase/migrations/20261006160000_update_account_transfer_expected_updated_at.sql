-- update_account_transfer: optional optimistic-concurrency precondition.
--
-- Current truth (docs/operations/multi-device-write-semantics.md): update RPCs
-- lock the row but accept no version precondition, so a stale device silently
-- overwrites a newer edit. This mirrors migration
-- 20260923160000_update_money_transaction_expected_updated_at.sql for the
-- transfer sibling: adds `p_expected_updated_at` — when supplied, a mismatched
-- `updated_at` raises `stale_write` instead of overwriting. `null` keeps the
-- previous last-write-wins behavior for callers that do not pass a
-- precondition (bulk tools, older clients).
--
-- The old 6-argument signature is dropped; named-argument RPC calls with the
-- original six parameters resolve to the new signature via the default.

drop function if exists public.update_account_transfer(
  uuid, uuid, uuid, bigint, date, text
);

create function public.update_account_transfer(
  p_transaction_id uuid,
  p_source_account_id uuid,
  p_destination_account_id uuid,
  p_amount_minor bigint,
  p_occurred_on date,
  p_note text default '',
  p_expected_updated_at timestamptz default null
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
  v_source_currency text;
  v_destination_currency text;
  v_affected integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_source_account_id is null or p_destination_account_id is null or p_source_account_id = p_destination_account_id then raise exception 'different_accounts_required'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'invalid_transfer_amount'; end if;
  if p_occurred_on is null then raise exception 'invalid_transfer_date'; end if;
  if char_length(coalesce(p_note, '')) > 500 then raise exception 'note_too_long'; end if;

  select kind, updated_at into v_existing_kind, v_existing_updated_at
  from public.financial_transactions
  where id = p_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if v_existing_kind is null then raise exception 'transaction_not_found'; end if;
  if v_existing_kind <> 'transfer' then raise exception 'transaction_kind_locked'; end if;

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

revoke all on function public.update_account_transfer(
  uuid, uuid, uuid, bigint, date, text, timestamptz
) from public, anon;
grant execute on function public.update_account_transfer(
  uuid, uuid, uuid, bigint, date, text, timestamptz
) to authenticated;
