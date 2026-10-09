-- Class 3: serialize same-key creates and pin the original financial intent.
-- Existing pre-migration keys fail closed rather than comparing mutable current ledger fields.
alter table public.financial_transactions add column if not exists creation_intent jsonb;

create or replace function public.create_money_transaction(
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
    'payee', btrim(coalesce(p_payee, '')), 'goal_id', p_goal_id
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
    (user_id, kind, note, payee, occurred_on, idempotency_key, goal_id, creation_intent)
  values
    (v_user_id, p_kind, coalesce(p_note, ''), btrim(coalesce(p_payee, '')),
     p_occurred_on, p_idempotency_key, p_goal_id, v_intent)
  returning id into v_transaction_id;

  insert into public.transaction_entries
    (transaction_id, user_id, account_id, category_id, amount_minor)
  values
    (v_transaction_id, v_user_id, p_account_id, p_category_id,
      case when p_kind = 'income' then p_amount_minor else -p_amount_minor end);

  return v_transaction_id;
end;
$$;
