-- Real-use readiness hardening.
-- 1) Trigger-only SECURITY DEFINER functions must not be callable through Data API.
-- 2) Preserve the category archive invariant after recurring-income migration
--    replaced update_money_transaction.

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

create or replace function public.update_money_transaction(
  p_transaction_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_kind public.transaction_kind,
  p_amount_minor bigint,
  p_occurred_on date,
  p_note text default ''
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
